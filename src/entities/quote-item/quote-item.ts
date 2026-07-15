export type QuoteItem = {
  id: string;
  originThoughtId: string;
  text: string;
  createdAt: string;
  updatedAt: string;
};

type CreateQuoteItemInput = {
  originThoughtId: string;
  text: string;
};

export function createQuoteItem({
  originThoughtId,
  text,
}: CreateQuoteItemInput): QuoteItem {
  const timestamp = new Date().toISOString();

  return {
    id: `quote-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
    originThoughtId,
    text,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function isQuoteItem(value: unknown): value is QuoteItem {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const quote = value as Record<string, unknown>;

  return (
    typeof quote.id === 'string' &&
    typeof quote.originThoughtId === 'string' &&
    typeof quote.text === 'string' &&
    typeof quote.createdAt === 'string' &&
    typeof quote.updatedAt === 'string'
  );
}
