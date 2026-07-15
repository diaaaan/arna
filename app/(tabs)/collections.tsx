import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import type { IdeaItem } from '../../src/entities/idea-item/idea-item';
import type { QuoteItem } from '../../src/entities/quote-item/quote-item';
import type { ShoppingItem } from '../../src/entities/shopping-item/shopping-item';
import type { Task } from '../../src/entities/task/task';
import type { UnsortedThought } from '../../src/entities/unsorted-thought/unsorted-thought';
import {
  CollectionList,
  type CollectionListItem,
} from '../../src/features/collections/collection-list';
import { ShoppingCollectionList } from '../../src/features/collections/shopping-collection-list';
import { TaskCollectionList } from '../../src/features/collections/task-collection-list';
import { loadIdeaItems } from '../../src/storage/idea-storage';
import { loadQuoteItems } from '../../src/storage/quote-storage';
import {
  loadShoppingItems,
  toggleShoppingChecked,
} from '../../src/storage/shopping-storage';
import {
  loadTasks,
  toggleTaskCompleted,
} from '../../src/storage/task-storage';
import { loadUnsortedThoughts } from '../../src/storage/unsorted-storage';
import {
  colors,
  navigation,
  radius,
  spacing,
  typography,
} from '../../src/theme/tokens';

const filters = [
  { id: 'all', label: 'Все' },
  { id: 'tasks', label: 'Задачи' },
  { id: 'shopping', label: 'Покупки' },
  { id: 'ideas', label: 'Идеи' },
  { id: 'quotes', label: 'Цитаты' },
  { id: 'unsorted', label: 'Неразобранные' },
] as const;

type Filter = (typeof filters)[number]['id'];
type LoadState = 'loading' | 'ready' | 'error';
type MixedCollectionItem = CollectionListItem & {
  typeLabel: 'Задача' | 'Покупка' | 'Идея' | 'Цитата' | 'Неразобранное';
  text: string;
};

function sortNewestFirst<Item extends CollectionListItem>(items: Item[]) {
  return [...items].sort((firstItem, secondItem) =>
    secondItem.createdAt.localeCompare(firstItem.createdAt),
  );
}

function getIdeaText(idea: IdeaItem) {
  return idea.title;
}

function getQuoteText(quote: QuoteItem) {
  return quote.text;
}

function getUnsortedText(thought: UnsortedThought) {
  return thought.text;
}

function getMixedText(item: MixedCollectionItem) {
  return item.text;
}

function getMixedLabel(item: MixedCollectionItem) {
  return item.typeLabel;
}

export default function CollectionsScreen() {
  const [selectedFilter, setSelectedFilter] = useState<Filter>('all');
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [ideas, setIdeas] = useState<IdeaItem[]>([]);
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [unsortedThoughts, setUnsortedThoughts] = useState<UnsortedThought[]>(
    [],
  );
  const insets = useSafeAreaInsets();

  const loadCollections = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoadState('loading');
    }

    try {
      const [storedTasks, storedShopping, storedIdeas, storedQuotes, unsorted] =
        await Promise.all([
          loadTasks(),
          loadShoppingItems(),
          loadIdeaItems(),
          loadQuoteItems(),
          loadUnsortedThoughts(),
        ]);

      setTasks(sortNewestFirst(storedTasks));
      setShoppingItems(sortNewestFirst(storedShopping));
      setIdeas(sortNewestFirst(storedIdeas));
      setQuotes(sortNewestFirst(storedQuotes));
      setUnsortedThoughts(sortNewestFirst(unsorted));
      setLoadState('ready');
    } catch (error: unknown) {
      console.error('Failed to load collections.', error);
      setLoadState('error');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadCollections();
    }, [loadCollections]),
  );

  const mixedItems = useMemo<MixedCollectionItem[]>(
    () =>
      sortNewestFirst([
        ...tasks.map((task) => ({
          id: task.id,
          createdAt: task.createdAt,
          typeLabel: 'Задача' as const,
          text: task.title,
        })),
        ...shoppingItems.map((shoppingItem) => ({
          id: shoppingItem.id,
          createdAt: shoppingItem.createdAt,
          typeLabel: 'Покупка' as const,
          text: `${shoppingItem.title}${
            shoppingItem.quantity === null
              ? ''
              : ` ×${shoppingItem.quantity}`
          }`,
        })),
        ...ideas.map((idea) => ({
          id: idea.id,
          createdAt: idea.createdAt,
          typeLabel: 'Идея' as const,
          text: idea.title,
        })),
        ...quotes.map((quote) => ({
          id: quote.id,
          createdAt: quote.createdAt,
          typeLabel: 'Цитата' as const,
          text: quote.text,
        })),
        ...unsortedThoughts.map((thought) => ({
          id: thought.id,
          createdAt: thought.createdAt,
          typeLabel: 'Неразобранное' as const,
          text: thought.text,
        })),
      ]),
    [ideas, quotes, shoppingItems, tasks, unsortedThoughts],
  );

  const handleTaskToggle = useCallback(
    (taskId: string) => {
      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === taskId ? { ...task, completed: !task.completed } : task,
        ),
      );

      void toggleTaskCompleted(taskId).catch((error: unknown) => {
        console.error('Failed to update task.', error);
        void loadCollections(false);
      });
    },
    [loadCollections],
  );

  const handleShoppingToggle = useCallback(
    (shoppingItemId: string) => {
      setShoppingItems((currentItems) =>
        currentItems.map((shoppingItem) =>
          shoppingItem.id === shoppingItemId
            ? { ...shoppingItem, checked: !shoppingItem.checked }
            : shoppingItem,
        ),
      );

      void toggleShoppingChecked(shoppingItemId).catch((error: unknown) => {
        console.error('Failed to update shopping item.', error);
        void loadCollections(false);
      });
    },
    [loadCollections],
  );

  const bottomPadding =
    insets.bottom +
    navigation.tabBarBottomInset +
    navigation.tabBarHeight +
    spacing.lg;

  const renderCollection = () => {
    if (loadState === 'loading') {
      return (
        <View style={styles.stateContainer}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.stateText}>Загрузка…</Text>
        </View>
      );
    }

    if (loadState === 'error') {
      return (
        <View style={styles.stateContainer}>
          <Text style={styles.stateText}>Не удалось загрузить коллекции.</Text>
        </View>
      );
    }

    switch (selectedFilter) {
      case 'tasks':
        return (
          <TaskCollectionList
            tasks={tasks}
            bottomPadding={bottomPadding}
            onToggle={handleTaskToggle}
          />
        );
      case 'shopping':
        return (
          <ShoppingCollectionList
            shoppingItems={shoppingItems}
            bottomPadding={bottomPadding}
            onToggle={handleShoppingToggle}
          />
        );
      case 'ideas':
        return (
          <CollectionList
            items={ideas}
            emptyMessage="Здесь появятся ваши идеи."
            bottomPadding={bottomPadding}
            getText={getIdeaText}
          />
        );
      case 'quotes':
        return (
          <CollectionList
            items={quotes}
            emptyMessage="Здесь появятся сохранённые цитаты."
            bottomPadding={bottomPadding}
            getText={getQuoteText}
          />
        );
      case 'unsorted':
        return (
          <CollectionList
            items={unsortedThoughts}
            emptyMessage="Здесь появятся мысли, которые Arna пока не смогла понять."
            bottomPadding={bottomPadding}
            getText={getUnsortedText}
          />
        );
      default:
        return (
          <CollectionList
            items={mixedItems}
            emptyMessage="Здесь появятся результаты, которые Arna создаёт из ваших мыслей."
            bottomPadding={bottomPadding}
            getText={getMixedText}
            getLabel={getMixedLabel}
          />
        );
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Коллекции</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
        style={styles.filtersScroll}
      >
        {filters.map((filter) => {
          const isSelected = selectedFilter === filter.id;

          return (
            <Pressable
              key={filter.id}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => setSelectedFilter(filter.id)}
              style={({ pressed }) => [
                styles.filter,
                isSelected && styles.filterSelected,
                pressed && styles.filterPressed,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  isSelected && styles.filterTextSelected,
                ]}
              >
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={styles.content}>{renderCollection()}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  filtersScroll: {
    flexGrow: 0,
  },
  filters: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  filter: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
  },
  filterSelected: {
    borderColor: colors.navigationActive,
    backgroundColor: colors.navigationActive,
  },
  filterPressed: {
    opacity: 0.7,
  },
  filterText: {
    ...typography.button,
    color: colors.textSecondary,
  },
  filterTextSelected: {
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  stateText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
