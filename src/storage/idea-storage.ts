import AsyncStorage from '@react-native-async-storage/async-storage';

import { isIdeaItem, type IdeaItem } from '../entities/idea-item/idea-item';

import { readCollection } from './json-collection';

export const IDEAS_STORAGE_KEY = 'arna.ideas.v1';

let writeQueue: Promise<void> = Promise.resolve();

export async function loadIdeaItems(): Promise<IdeaItem[]> {
  return readCollection(IDEAS_STORAGE_KEY, (value) =>
    isIdeaItem(value) ? value : null,
  );
}

export function appendIdeaItem(idea: IdeaItem): Promise<void> {
  const operation = writeQueue.then(async () => {
    const ideas = await loadIdeaItems();

    if (ideas.some((stored) => stored.originThoughtId === idea.originThoughtId)) {
      return;
    }

    await AsyncStorage.setItem(
      IDEAS_STORAGE_KEY,
      JSON.stringify([...ideas, idea]),
    );
  });

  writeQueue = operation.catch(() => undefined);

  return operation;
}
