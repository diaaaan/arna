import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  isShoppingItem,
  type ShoppingItem,
} from '../entities/shopping-item/shopping-item';

export const SHOPPING_ITEMS_STORAGE_KEY = 'arna.shopping-items.v1';

let writeQueue: Promise<void> = Promise.resolve();

export async function loadShoppingItems(): Promise<ShoppingItem[]> {
  const storedValue = await AsyncStorage.getItem(SHOPPING_ITEMS_STORAGE_KEY);

  if (storedValue === null) {
    return [];
  }

  const parsedValue: unknown = JSON.parse(storedValue);

  if (!Array.isArray(parsedValue) || !parsedValue.every(isShoppingItem)) {
    throw new Error('Stored shopping items have an invalid format.');
  }

  return parsedValue;
}

export function appendShoppingItems(
  shoppingItems: ShoppingItem[],
): Promise<void> {
  const operation = writeQueue.then(async () => {
    const storedShoppingItems = await loadShoppingItems();

    await AsyncStorage.setItem(
      SHOPPING_ITEMS_STORAGE_KEY,
      JSON.stringify([...storedShoppingItems, ...shoppingItems]),
    );
  });

  writeQueue = operation.catch(() => undefined);

  return operation;
}

export function toggleShoppingChecked(
  shoppingItemId: string,
): Promise<void> {
  const operation = writeQueue.then(async () => {
    const shoppingItems = await loadShoppingItems();
    const itemIndex = shoppingItems.findIndex(
      (shoppingItem) => shoppingItem.id === shoppingItemId,
    );

    if (itemIndex === -1) {
      throw new Error('Shopping item was not found.');
    }

    const updatedShoppingItems = [...shoppingItems];
    updatedShoppingItems[itemIndex] = {
      ...shoppingItems[itemIndex],
      checked: !shoppingItems[itemIndex].checked,
      updatedAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem(
      SHOPPING_ITEMS_STORAGE_KEY,
      JSON.stringify(updatedShoppingItems),
    );
  });

  writeQueue = operation.catch(() => undefined);

  return operation;
}
