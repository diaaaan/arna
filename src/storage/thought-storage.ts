import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ThoughtInterpretation } from '../mind/types/interpretation';
import {
  normalizeStoredThought,
  type Thought,
} from '../entities/thought/thought';

import { readCollection } from './json-collection';

export const THOUGHTS_STORAGE_KEY = 'arna.thoughts.v1';

let writeQueue: Promise<void> = Promise.resolve();

export async function loadThoughts(): Promise<Thought[]> {
  return readCollection(THOUGHTS_STORAGE_KEY, normalizeStoredThought);
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

export function updateThoughtAnalysis(
  thoughtId: string,
  analysis: ThoughtInterpretation,
): Promise<void> {
  const operation = writeQueue.then(async () => {
    const thoughts = await loadThoughts();
    const thoughtIndex = thoughts.findIndex((thought) => thought.id === thoughtId);

    if (thoughtIndex === -1) {
      throw new Error('Thought was not found.');
    }

    const currentThought = thoughts[thoughtIndex];
    const updatedThought: Thought = {
      ...currentThought,
      updatedAt: new Date().toISOString(),
      analysis,
    };
    const updatedThoughts = [...thoughts];
    updatedThoughts[thoughtIndex] = updatedThought;

    await AsyncStorage.setItem(
      THOUGHTS_STORAGE_KEY,
      JSON.stringify(updatedThoughts),
    );
  });

  writeQueue = operation.catch(() => undefined);

  return operation;
}
