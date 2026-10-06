import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  isUnsortedThought,
  type UnsortedThought,
} from '../entities/unsorted-thought/unsorted-thought';

import { readCollection } from './json-collection';

export const UNSORTED_STORAGE_KEY = 'arna.unsorted.v1';

let writeQueue: Promise<void> = Promise.resolve();

export async function loadUnsortedThoughts(): Promise<UnsortedThought[]> {
  return readCollection(UNSORTED_STORAGE_KEY, (value) =>
    isUnsortedThought(value) ? value : null,
  );
}

export function appendUnsortedThought(thought: UnsortedThought): Promise<void> {
  const operation = writeQueue.then(async () => {
    const thoughts = await loadUnsortedThoughts();

    if (
      thoughts.some((stored) => stored.originThoughtId === thought.originThoughtId)
    ) {
      return;
    }

    await AsyncStorage.setItem(
      UNSORTED_STORAGE_KEY,
      JSON.stringify([...thoughts, thought]),
    );
  });

  writeQueue = operation.catch(() => undefined);

  return operation;
}
