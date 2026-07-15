import AsyncStorage from '@react-native-async-storage/async-storage';

import { isQuoteItem, type QuoteItem } from '../entities/quote-item/quote-item';

export const QUOTES_STORAGE_KEY = 'arna.quotes.v1';

let writeQueue: Promise<void> = Promise.resolve();

export async function loadQuoteItems(): Promise<QuoteItem[]> {
  const storedValue = await AsyncStorage.getItem(QUOTES_STORAGE_KEY);

  if (storedValue === null) {
    return [];
  }

  const parsedValue: unknown = JSON.parse(storedValue);

  if (!Array.isArray(parsedValue) || !parsedValue.every(isQuoteItem)) {
    throw new Error('Stored quotes have an invalid format.');
  }

  return parsedValue;
}

export function appendQuoteItem(quote: QuoteItem): Promise<void> {
  const operation = writeQueue.then(async () => {
    const quotes = await loadQuoteItems();

    await AsyncStorage.setItem(
      QUOTES_STORAGE_KEY,
      JSON.stringify([...quotes, quote]),
    );
  });

  writeQueue = operation.catch(() => undefined);

  return operation;
}
