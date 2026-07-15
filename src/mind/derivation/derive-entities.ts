import { createIdeaItem } from '../../entities/idea-item/idea-item';
import { createQuoteItem } from '../../entities/quote-item/quote-item';
import { createShoppingItem } from '../../entities/shopping-item/shopping-item';
import { createTask } from '../../entities/task/task';
import type { Thought } from '../../entities/thought/thought';
import { createUnsortedThought } from '../../entities/unsorted-thought/unsorted-thought';
import { appendIdeaItem } from '../../storage/idea-storage';
import { appendQuoteItem } from '../../storage/quote-storage';
import { appendShoppingItems } from '../../storage/shopping-storage';
import { appendTask } from '../../storage/task-storage';
import { appendUnsortedThought } from '../../storage/unsorted-storage';
import type { ThoughtInterpretation } from '../types/interpretation';

export async function deriveEntities(
  thought: Thought,
  interpretation: ThoughtInterpretation,
): Promise<void> {
  if (interpretation.status !== 'success') {
    return;
  }

  if (interpretation.type === 'task') {
    const title = interpretation.summary.trim() || thought.rawText;

    await appendTask(
      createTask({
        originThoughtId: thought.id,
        title,
        dueDate: interpretation.dueDate,
      }),
    );
    return;
  }

  if (interpretation.type === 'shopping_list') {
    const shoppingItems = interpretation.items.map((item) =>
      createShoppingItem({
        originThoughtId: thought.id,
        title: item.title,
        quantity: item.quantity,
      }),
    );

    if (shoppingItems.length > 0) {
      await appendShoppingItems(shoppingItems);
    }
    return;
  }

  if (interpretation.type === 'unknown') {
    await appendUnsortedThought(
      createUnsortedThought({
        originThoughtId: thought.id,
        text: thought.rawText,
      }),
    );
    return;
  }

  if (interpretation.type === 'quote') {
    await appendQuoteItem(
      createQuoteItem({
        originThoughtId: thought.id,
        text: thought.rawText,
      }),
    );
    return;
  }

  if (interpretation.type === 'idea') {
    await appendIdeaItem(
      createIdeaItem({
        originThoughtId: thought.id,
        title: interpretation.summary.trim() || thought.rawText,
      }),
    );
  }
}
