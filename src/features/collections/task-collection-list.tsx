import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';

import type { Task } from '../../entities/task/task';
import { colors, spacing, typography } from '../../theme/tokens';

type TaskCollectionListProps = {
  tasks: Task[];
  bottomPadding: number;
  onToggle: (taskId: string) => void;
};

type TaskSection = {
  title: 'Выполнено' | null;
  data: Task[];
};

function formatDueDate(dueDate: string) {
  const [year, month, day] = dueDate.split('-').map(Number);

  return new Date(year, month - 1, day).toLocaleDateString();
}

export function TaskCollectionList({
  tasks,
  bottomPadding,
  onToggle,
}: TaskCollectionListProps) {
  const activeTasks = tasks.filter((task) => !task.completed);
  const completedTasks = tasks.filter((task) => task.completed);
  const sections: TaskSection[] = [
    ...(activeTasks.length > 0
      ? [{ title: null, data: activeTasks } satisfies TaskSection]
      : []),
    ...(completedTasks.length > 0
      ? [{ title: 'Выполнено', data: completedTasks } satisfies TaskSection]
      : []),
  ];

  return (
    <SectionList
      sections={sections}
      keyExtractor={(task) => task.id}
      ListEmptyComponent={
        <View style={styles.stateContainer}>
          <Text style={styles.stateText}>Пока задач нет.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: item.completed }}
          accessibilityLabel={item.title}
          onPress={() => onToggle(item.id)}
          style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
        >
          <Text
            style={[styles.checkbox, item.completed && styles.completedText]}
          >
            {item.completed ? '✓' : '○'}
          </Text>
          <View style={styles.itemContent}>
            <Text
              style={[
                styles.itemTitle,
                item.completed && styles.completedTitle,
              ]}
            >
              {item.title}
            </Text>
            {item.dueDate ? (
              <Text
                style={[
                  styles.itemMeta,
                  item.completed && styles.completedText,
                ]}
              >
                До {formatDueDate(item.dueDate)}
              </Text>
            ) : null}
          </View>
        </Pressable>
      )}
      renderSectionHeader={({ section }) =>
        section.title ? (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
        ) : null
      }
      contentContainerStyle={[
        styles.listContent,
        sections.length === 0 && styles.emptyListContent,
        { paddingBottom: bottomPadding },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: spacing.xl,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  stateText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  sectionHeader: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  sectionTitle: {
    ...typography.button,
    color: colors.textSecondary,
  },
  item: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  itemPressed: {
    opacity: 0.7,
  },
  checkbox: {
    ...typography.body,
    width: spacing.xl,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    ...typography.body,
    color: colors.textPrimary,
  },
  itemMeta: {
    ...typography.caption,
    marginTop: spacing.sm,
    color: colors.textSecondary,
  },
  completedTitle: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  completedText: {
    color: colors.textSecondary,
    opacity: 0.7,
  },
});
