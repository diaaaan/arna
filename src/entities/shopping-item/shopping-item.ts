export type ShoppingItem = {
  id: string;
  originThoughtId: string;
  title: string;
  quantity: number | null;
  checked: boolean;
  createdAt: string;
  updatedAt: string;
};

type CreateShoppingItemInput = {
  originThoughtId: string;
  title: string;
  quantity: number | null;
};

export function createShoppingItem({
  originThoughtId,
  title,
  quantity,
}: CreateShoppingItemInput): ShoppingItem {
  const timestamp = new Date().toISOString();

  return {
    id: `shopping-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
    originThoughtId,
    title,
    quantity,
    checked: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function isShoppingItem(value: unknown): value is ShoppingItem {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const shoppingItem = value as Record<string, unknown>;

  return (
    typeof shoppingItem.id === 'string' &&
    typeof shoppingItem.originThoughtId === 'string' &&
    typeof shoppingItem.title === 'string' &&
    (shoppingItem.quantity === null ||
      (typeof shoppingItem.quantity === 'number' &&
        Number.isFinite(shoppingItem.quantity))) &&
    typeof shoppingItem.checked === 'boolean' &&
    typeof shoppingItem.createdAt === 'string' &&
    typeof shoppingItem.updatedAt === 'string'
  );
}
