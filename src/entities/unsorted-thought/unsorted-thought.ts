export type UnsortedThought = {
  id: string;
  originThoughtId: string;
  text: string;
  createdAt: string;
  updatedAt: string;
};

type CreateUnsortedThoughtInput = {
  originThoughtId: string;
  text: string;
};

export function createUnsortedThought({
  originThoughtId,
  text,
}: CreateUnsortedThoughtInput): UnsortedThought {
  const timestamp = new Date().toISOString();

  return {
    id: `unsorted-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
    originThoughtId,
    text,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function isUnsortedThought(value: unknown): value is UnsortedThought {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const thought = value as Record<string, unknown>;

  return (
    typeof thought.id === 'string' &&
    typeof thought.originThoughtId === 'string' &&
    typeof thought.text === 'string' &&
    typeof thought.createdAt === 'string' &&
    typeof thought.updatedAt === 'string'
  );
}
