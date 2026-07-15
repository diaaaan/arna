import AsyncStorage from '@react-native-async-storage/async-storage';

import { isIdeaItem, type IdeaItem } from '../entities/idea-item/idea-item';

export const IDEAS_STORAGE_KEY = 'arna.ideas.v1';

let writeQueue: Promise<void> = Promise.resolve();

export async function loadIdeaItems(): Promise<IdeaItem[]> {
  const storedValue = await AsyncStorage.getItem(IDEAS_STORAGE_KEY);

  if (storedValue === null) {
    return [];
  }

  const parsedValue: unknown = JSON.parse(storedValue);

  if (!Array.isArray(parsedValue) || !parsedValue.every(isIdeaItem)) {
    throw new Error('Stored ideas have an invalid format.');
  }

  return parsedValue;
}

export function appendIdeaItem(idea: IdeaItem): Promise<void> {
  const operation = writeQueue.then(async () => {
    const ideas = await loadIdeaItems();

    await AsyncStorage.setItem(
      IDEAS_STORAGE_KEY,
      JSON.stringify([...ideas, idea]),
    );
  });

  writeQueue = operation.catch(() => undefined);

  return operation;
}
