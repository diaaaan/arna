import AsyncStorage from '@react-native-async-storage/async-storage';

import { isQuoteItem, type QuoteItem } from '../entities/quote-item/quote-item';

import { readCollection } from './json-collection';

export const QUOTES_STORAGE_KEY = 'arna.quotes.v1';

let writeQueue: Promise<void> = Promise.resolve();

export async function loadQuoteItems(): Promise<QuoteItem[]> {
  return readCollection(QUOTES_STORAGE_KEY, (value) =>
    isQuoteItem(value) ? value : null,
  );
}

export function appendQuoteItem(quote: QuoteItem): Promise<void> {
  const operation = writeQueue.then(async () => {
    const quotes = await loadQuoteItems();

    if (quotes.some((stored) => stored.originThoughtId === quote.originThoughtId)) {
      return;
    }

    await AsyncStorage.setItem(
      QUOTES_STORAGE_KEY,
      JSON.stringify([...quotes, quote]),
    );
  });

  writeQueue = operation.catch(() => undefined);

  return operation;
}
