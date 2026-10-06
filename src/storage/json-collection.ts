import AsyncStorage from '@react-native-async-storage/async-storage';

// Signatures of corrupted data that was already copied to a backup key in this
// session, so repeated reads do not rewrite the same backup.
const backedUpSignatures = new Set<string>();

async function backupCorruptedData(key: string, data: unknown): Promise<void> {
  const serialized = typeof data === 'string' ? data : JSON.stringify(data);
  const signature = `${key}:${serialized}`;

  if (backedUpSignatures.has(signature)) {
    return;
  }

  backedUpSignatures.add(signature);

  try {
    await AsyncStorage.setItem(`${key}.corrupt-${Date.now()}`, serialized);
  } catch (error: unknown) {
    // A failed backup must not block saving new data.
    console.warn(`Failed to back up corrupted data for ${key}.`, error);
  }
}

/**
 * Reads a JSON array collection tolerantly. Records that fail normalization
 * are skipped, and are copied to `<key>.corrupt-<timestamp>` before they can
 * be overwritten by a later save. An unreadable blob is backed up and treated
 * as empty. Real storage errors (getItem failing) are still thrown.
 */
export async function readCollection<T>(
  key: string,
  normalize: (value: unknown) => T | null,
): Promise<T[]> {
  const storedValue = await AsyncStorage.getItem(key);

  if (storedValue === null) {
    return [];
  }

  let parsedValue: unknown;

  try {
    parsedValue = JSON.parse(storedValue);
  } catch {
    await backupCorruptedData(key, storedValue);
    return [];
  }

  if (!Array.isArray(parsedValue)) {
    await backupCorruptedData(key, storedValue);
    return [];
  }

  const validItems: T[] = [];
  const rejectedItems: unknown[] = [];

  for (const record of parsedValue) {
    const normalized = normalize(record);

    if (normalized === null) {
      rejectedItems.push(record);
    } else {
      validItems.push(normalized);
    }
  }

  if (rejectedItems.length > 0) {
    console.warn(`Skipped ${rejectedItems.length} invalid record(s) in ${key}.`);
    await backupCorruptedData(key, rejectedItems);
  }

  return validItems;
}
