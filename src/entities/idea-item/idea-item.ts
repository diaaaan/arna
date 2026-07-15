export type IdeaItem = {
  id: string;
  originThoughtId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

type CreateIdeaItemInput = {
  originThoughtId: string;
  title: string;
};

export function createIdeaItem({
  originThoughtId,
  title,
}: CreateIdeaItemInput): IdeaItem {
  const timestamp = new Date().toISOString();

  return {
    id: `idea-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
    originThoughtId,
    title,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function isIdeaItem(value: unknown): value is IdeaItem {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const idea = value as Record<string, unknown>;

  return (
    typeof idea.id === 'string' &&
    typeof idea.originThoughtId === 'string' &&
    typeof idea.title === 'string' &&
    typeof idea.createdAt === 'string' &&
    typeof idea.updatedAt === 'string'
  );
}
