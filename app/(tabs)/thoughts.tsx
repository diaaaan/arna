import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { ThoughtItem } from '../../src/components/thought-item';
import { analyzeThought } from '../../src/mind/mind-engine';
import { createPendingInterpretation } from '../../src/mind/types/interpretation';
import type { Thought } from '../../src/entities/thought/thought';
import { loadThoughts } from '../../src/storage/thought-storage';
import {
  colors,
  navigation,
  radius,
  spacing,
  typography,
} from '../../src/theme/tokens';

type LoadState = 'loading' | 'ready' | 'error';

function sortNewestFirst(thoughts: Thought[]) {
  return [...thoughts].sort((firstThought, secondThought) =>
    secondThought.createdAt.localeCompare(firstThought.createdAt),
  );
}

export default function ThoughtsScreen() {
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const loadRequestRef = useRef(0);
  const insets = useSafeAreaInsets();

  const loadThoughtLibrary = useCallback(async (showLoading = true) => {
    loadRequestRef.current += 1;
    const requestId = loadRequestRef.current;

    if (showLoading) {
      setLoadState('loading');
    }

    try {
      const storedThoughts = await loadThoughts();

      if (loadRequestRef.current === requestId) {
        setThoughts(sortNewestFirst(storedThoughts));
        setLoadState('ready');
      }
    } catch (error: unknown) {
      console.error('Failed to load thoughts.', error);

      if (loadRequestRef.current === requestId) {
        setLoadState('error');
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadThoughtLibrary();

      return () => {
        loadRequestRef.current += 1;
      };
    }, [loadThoughtLibrary]),
  );

  const retryLoad = () => {
    void loadThoughtLibrary();
  };

  const retryAnalysis = useCallback(
    (thought: Thought) => {
      setThoughts((currentThoughts) =>
        currentThoughts.map((currentThought) =>
          currentThought.id === thought.id
            ? {
                ...currentThought,
                analysis: createPendingInterpretation(),
              }
            : currentThought,
        ),
      );

      void analyzeThought(thought)
        .catch(() => undefined)
        .finally(() => {
          void loadThoughtLibrary(false);
        });
    },
    [loadThoughtLibrary],
  );

  const renderContent = () => {
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
          <Text style={styles.stateText}>Не удалось загрузить мысли.</Text>
          <Pressable
            accessibilityRole="button"
            onPress={retryLoad}
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.retryButtonPressed,
            ]}
          >
            <Text style={styles.retryButtonText}>Повторить</Text>
          </Pressable>
        </View>
      );
    }

    if (thoughts.length === 0) {
      return (
        <View style={styles.stateContainer}>
          <Text style={styles.stateText}>
            Здесь появятся сохранённые мысли.
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={thoughts}
        keyExtractor={(thought) => thought.id}
        renderItem={({ item }) => (
          <ThoughtItem thought={item} onRetryAnalysis={retryAnalysis} />
        )}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingBottom:
              insets.bottom +
              navigation.tabBarBottomInset +
              navigation.tabBarHeight +
              spacing.lg,
          },
        ]}
      />
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Мысли</Text>
      </View>
      <View style={styles.content}>{renderContent()}</View>
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
    paddingVertical: spacing.lg,
  },
  headerTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
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
  retryButton: {
    minHeight: spacing.xl + spacing.xl,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
  },
  retryButtonPressed: {
    opacity: 0.8,
  },
  retryButtonText: {
    ...typography.button,
    color: colors.onAccent,
  },
});
