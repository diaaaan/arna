import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  isUnsortedThought,
  type UnsortedThought,
} from '../entities/unsorted-thought/unsorted-thought';

export const UNSORTED_STORAGE_KEY = 'arna.unsorted.v1';

let writeQueue: Promise<void> = Promise.resolve();

export async function loadUnsortedThoughts(): Promise<UnsortedThought[]> {
  const storedValue = await AsyncStorage.getItem(UNSORTED_STORAGE_KEY);

  if (storedValue === null) {
    return [];
  }

  const parsedValue: unknown = JSON.parse(storedValue);

  if (!Array.isArray(parsedValue) || !parsedValue.every(isUnsortedThought)) {
    throw new Error('Stored unsorted thoughts have an invalid format.');
  }

  return parsedValue;
}

export function appendUnsortedThought(thought: UnsortedThought): Promise<void> {
  const operation = writeQueue.then(async () => {
    const thoughts = await loadUnsortedThoughts();

    await AsyncStorage.setItem(
      UNSORTED_STORAGE_KEY,
      JSON.stringify([...thoughts, thought]),
    );
  });

  writeQueue = operation.catch(() => undefined);

  return operation;
}
