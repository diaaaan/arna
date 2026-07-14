import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ThoughtInterpretation } from '../mind/types/interpretation';
import {
  normalizeStoredThought,
  type Thought,
} from '../entities/thought/thought';

export const THOUGHTS_STORAGE_KEY = 'arna.thoughts.v1';

let writeQueue: Promise<void> = Promise.resolve();

export async function loadThoughts(): Promise<Thought[]> {
  const storedValue = await AsyncStorage.getItem(THOUGHTS_STORAGE_KEY);

  if (storedValue === null) {
    return [];
  }

  const parsedValue: unknown = JSON.parse(storedValue);

  if (!Array.isArray(parsedValue)) {
    throw new Error('Stored thoughts have an invalid format.');
  }

  const normalizedThoughts = parsedValue.map(normalizeStoredThought);

  if (normalizedThoughts.some((thought) => thought === null)) {
    throw new Error('Stored thoughts have an invalid format.');
  }

  return normalizedThoughts as Thought[];
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
