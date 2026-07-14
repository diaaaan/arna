export type ThoughtSource = 'manual';
export type ThoughtStatus = 'raw';

export type Thought = {
  id: string;
  rawText: string;
  createdAt: string;
  updatedAt: string;
  source: ThoughtSource;
  status: ThoughtStatus;
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
    thought.status === 'raw'
  );
}
