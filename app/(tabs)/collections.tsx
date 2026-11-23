import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import type { InterpretationCategory } from '../../src/mind/types/interpretation';
import {
  CollectionList,
  type CollectionListItem,
} from '../../src/features/collections/collection-list';
import {
  CATEGORY_WHEEL_WIDTH,
  CategoryWheel,
  type CategoryWheelItem,
} from '../../src/features/collections/category-wheel';
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
import { loadThoughts } from '../../src/storage/thought-storage';
import { loadUnsortedThoughts } from '../../src/storage/unsorted-storage';
import {
  colors,
  navigation,
  spacing,
  typography,
} from '../../src/theme/tokens';

const filters = [
  { id: 'all', label: 'all', icon: 'apps-outline' },
  { id: 'tasks', label: 'tasks', icon: 'checkbox-outline' },
  { id: 'shopping', label: 'shopping', icon: 'bag-handle-outline' },
  { id: 'ideas', label: 'ideas', icon: 'bulb-outline' },
  { id: 'quotes', label: 'quotes', icon: 'chatbox-ellipses-outline' },
  { id: 'unsorted', label: 'unsorted', icon: 'help-circle-outline' },
] as const satisfies readonly CategoryWheelItem[];

type Filter = (typeof filters)[number]['id'];
type LoadState = 'loading' | 'ready' | 'error';
type MixedCollectionItem = CollectionListItem & {
  typeLabel: 'task' | 'shopping' | 'idea' | 'quote' | 'unsorted';
  categoryLabel: string;
  text: string;
};

const categoryLabels: Record<InterpretationCategory, string> = {
  work: 'work',
  home: 'home',
  health: 'health',
  finance: 'finance',
  learning: 'learning',
  creativity: 'creativity',
  personal: 'personal',
  unknown: 'no category',
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
  return `${item.typeLabel} · ${item.categoryLabel}`;
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
  const [categoriesByThoughtId, setCategoriesByThoughtId] = useState<
    Record<string, InterpretationCategory>
  >({});
  const insets = useSafeAreaInsets();
  const [navHeight, setNavHeight] = useState(0);

  const selectedLabel =
    filters.find((filter) => filter.id === selectedFilter)?.label ?? 'all';

  const loadCollections = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoadState('loading');
    }

    try {
      const [
        storedTasks,
        storedShopping,
        storedIdeas,
        storedQuotes,
        unsorted,
        storedThoughts,
      ] = await Promise.all([
        loadTasks(),
        loadShoppingItems(),
        loadIdeaItems(),
        loadQuoteItems(),
        loadUnsortedThoughts(),
        loadThoughts(),
      ]);

      setTasks(sortNewestFirst(storedTasks));
      setShoppingItems(sortNewestFirst(storedShopping));
      setIdeas(sortNewestFirst(storedIdeas));
      setQuotes(sortNewestFirst(storedQuotes));
      setUnsortedThoughts(sortNewestFirst(unsorted));
      setCategoriesByThoughtId(
        storedThoughts.reduce<Record<string, InterpretationCategory>>(
          (categories, thought) => {
            categories[thought.id] = thought.analysis?.category ?? 'unknown';
            return categories;
          },
          {},
        ),
      );
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
    () => {
      const getCategoryLabel = (originThoughtId: string) =>
        categoryLabels[categoriesByThoughtId[originThoughtId] ?? 'unknown'];

      return sortNewestFirst([
        ...tasks.map((task) => ({
          id: task.id,
          createdAt: task.createdAt,
          typeLabel: 'task' as const,
          categoryLabel: getCategoryLabel(task.originThoughtId),
          text: task.title,
        })),
        ...shoppingItems.map((shoppingItem) => ({
          id: shoppingItem.id,
          createdAt: shoppingItem.createdAt,
          typeLabel: 'shopping' as const,
          categoryLabel: getCategoryLabel(shoppingItem.originThoughtId),
          text: `${shoppingItem.title}${
            shoppingItem.quantity === null
              ? ''
              : ` ×${shoppingItem.quantity}`
          }`,
        })),
        ...ideas.map((idea) => ({
          id: idea.id,
          createdAt: idea.createdAt,
          typeLabel: 'idea' as const,
          categoryLabel: getCategoryLabel(idea.originThoughtId),
          text: idea.title,
        })),
        ...quotes.map((quote) => ({
          id: quote.id,
          createdAt: quote.createdAt,
          typeLabel: 'quote' as const,
          categoryLabel: getCategoryLabel(quote.originThoughtId),
          text: quote.text,
        })),
        ...unsortedThoughts.map((thought) => ({
          id: thought.id,
          createdAt: thought.createdAt,
          typeLabel: 'unsorted' as const,
          categoryLabel: getCategoryLabel(thought.originThoughtId),
          text: thought.text,
        })),
      ]);
    },
    [
      categoriesByThoughtId,
      ideas,
      quotes,
      shoppingItems,
      tasks,
      unsortedThoughts,
    ],
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
          <Text style={styles.stateText}>loading…</Text>
        </View>
      );
    }

    if (loadState === 'error') {
      return (
        <View style={styles.stateContainer}>
          <Text style={styles.stateText}>couldn’t load your collections.</Text>
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
            emptyMessage="your ideas will show up here."
            bottomPadding={bottomPadding}
            getText={getIdeaText}
          />
        );
      case 'quotes':
        return (
          <CollectionList
            items={quotes}
            emptyMessage="saved quotes will show up here."
            bottomPadding={bottomPadding}
            getText={getQuoteText}
          />
        );
      case 'unsorted':
        return (
          <CollectionList
            items={unsortedThoughts}
            emptyMessage="thoughts arna couldn’t sort yet will show up here."
            bottomPadding={bottomPadding}
            getText={getUnsortedText}
          />
        );
      default:
        return (
          <CollectionList
            items={mixedItems}
            emptyMessage="what arna makes from your thoughts will show up here."
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
        <View style={styles.headerText}>
          <Text style={styles.headerOverline}>collections</Text>
          <Text style={styles.headerTitle}>{selectedLabel}</Text>
        </View>
      </View>
      <View
        style={styles.content}
        onLayout={(event) => setNavHeight(event.nativeEvent.layout.height - bottomPadding)}
      >
        <View style={[styles.list, { marginRight: CATEGORY_WHEEL_WIDTH - spacing.md }]}>
          {renderCollection()}
        </View>
        {navHeight > 0 ? (
          <CategoryWheel
            items={filters}
            selectedId={selectedFilter}
            onSelect={(id) => setSelectedFilter(id as Filter)}
            height={navHeight}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  headerText: {
    gap: spacing.xxs,
  },
  headerOverline: {
    ...typography.navigationLabel,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'lowercase',
    color: colors.textSecondary,
  },
  headerTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
  },
  list: {
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
