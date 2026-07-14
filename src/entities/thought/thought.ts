import type { ThoughtInterpretation } from '../../mind/types/interpretation';
import {
  isThoughtInterpretation,
  normalizeStoredThoughtInterpretation,
} from '../../mind/validation/interpretation-validator';

export type ThoughtSource = 'manual';
export type ThoughtStatus = 'raw';

export type Thought = {
  id: string;
  rawText: string;
  createdAt: string;
  updatedAt: string;
  source: ThoughtSource;
  status: ThoughtStatus;
  analysis?: ThoughtInterpretation;
};

export function createThought(rawText: string): Thought {
  const timestamp = new Date().toISOString();

  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
    rawText,
    createdAt: timestamp,
    updatedAt: timestamp,
    source: 'manual',
    status: 'raw',
  };
}

export function isThought(value: unknown): value is Thought {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const thought = value as Record<string, unknown>;

  return (
    typeof thought.id === 'string' &&
    typeof thought.rawText === 'string' &&
    typeof thought.createdAt === 'string' &&
    typeof thought.updatedAt === 'string' &&
    thought.source === 'manual' &&
    thought.status === 'raw' &&
    (thought.analysis === undefined || isThoughtInterpretation(thought.analysis))
  );
}

export function normalizeStoredThought(value: unknown): Thought | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const storedThought = value as Record<string, unknown>;
  const analysis =
    storedThought.analysis === undefined
      ? undefined
      : normalizeStoredThoughtInterpretation(storedThought.analysis);

  if (storedThought.analysis !== undefined && analysis === null) {
    return null;
  }

  const normalizedThought = {
    ...storedThought,
    analysis,
  };

  return isThought(normalizedThought) ? normalizedThought : null;
}
