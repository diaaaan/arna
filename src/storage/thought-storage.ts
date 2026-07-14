import AsyncStorage from '@react-native-async-storage/async-storage';

import { isThought, type Thought } from '../entities/thought/thought';

export const THOUGHTS_STORAGE_KEY = 'arna.thoughts.v1';

let writeQueue: Promise<void> = Promise.resolve();

export async function loadThoughts(): Promise<Thought[]> {
  const storedValue = await AsyncStorage.getItem(THOUGHTS_STORAGE_KEY);

  if (storedValue === null) {
    return [];
  }

  const parsedValue: unknown = JSON.parse(storedValue);

  if (!Array.isArray(parsedValue) || !parsedValue.every(isThought)) {
    throw new Error('Stored thoughts have an invalid format.');
  }

  return parsedValue;
}

export function appendThought(thought: Thought): Promise<void> {
  const operation = writeQueue.then(async () => {
    const thoughts = await loadThoughts();

    if (thoughts.some((storedThought) => storedThought.id === thought.id)) {
      return;
    }

    await AsyncStorage.setItem(
      THOUGHTS_STORAGE_KEY,
      JSON.stringify([...thoughts, thought]),
    );
  });

  writeQueue = operation.catch(() => undefined);

  return operation;
}
