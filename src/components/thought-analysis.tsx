import { Pressable, StyleSheet, Text, View } from 'react-native';

import type {
  InterpretationCategory,
  InterpretationType,
  InterpretationUrgency,
  ThoughtInterpretation,
} from '../mind/types/interpretation';
import { colors, radius, spacing, typography } from '../theme/tokens';

type ThoughtAnalysisProps = {
  analysis: ThoughtInterpretation | undefined;
  onRetry: () => void;
};

const typeLabels: Record<InterpretationType, string> = {
  task: 'Task',
  shopping_list: 'Shopping list',
  idea: 'Idea',
  note: 'Note',
  quote: 'Quote',
  reminder: 'Reminder',
  project: 'Project',
  unknown: 'Unclear',
};

const categoryLabels: Record<InterpretationCategory, string> = {
  work: 'Work',
  home: 'Home',
  health: 'Health',
  finance: 'Finance',
  learning: 'Learning',
  creativity: 'Creativity',
  personal: 'Personal',
  unknown: 'Unclear',
};

const urgencyLabels: Record<InterpretationUrgency, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  unknown: 'Unclear',
};

function formatDueDate(dueDate: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    const [year, month, day] = dueDate.split('-').map(Number);

    return new Date(year, month - 1, day).toLocaleDateString();
  }

  return new Date(dueDate).toLocaleString();
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <Text style={styles.detail}>
      <Text style={styles.detailLabel}>{label}: </Text>
      {value}
    </Text>
  );
}

export function ThoughtAnalysis({ analysis, onRetry }: ThoughtAnalysisProps) {
  if (!analysis) {
    return <Text style={styles.neutralStatus}>Not sorted yet</Text>;
  }

  if (analysis.status === 'pending') {
    return <Text style={styles.pendingStatus}>Making sense of it…</Text>;
  }

  if (analysis.status === 'failed') {
    return (
      <View style={styles.failedContainer}>
        <Text style={styles.failedStatus}>Couldn’t sort this one out</Text>
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={({ pressed }) => [
            styles.retryButton,
            pressed && styles.retryButtonPressed,
          ]}
        >
          <Text style={styles.retryButtonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.successContainer}>
      <Detail label="Type" value={typeLabels[analysis.type]} />
      <Detail label="Category" value={categoryLabels[analysis.category]} />
      <Detail label="Urgency" value={urgencyLabels[analysis.urgency]} />
      <Detail label="Summary" value={analysis.summary} />
      {analysis.dueDate ? (
        <Detail label="Due" value={formatDueDate(analysis.dueDate)} />
      ) : null}
      {analysis.items.length > 0 ? (
        <View style={styles.itemsContainer}>
          <Text style={styles.detailLabel}>Items:</Text>
          {analysis.items.map((item, index) => (
            <Text key={`${index}-${item.title}`} style={styles.item}>
              • {item.title}
              {item.quantity === null ? '' : ` ×${item.quantity}`}
            </Text>
          ))}
        </View>
      ) : null}
      <Detail
        label="Confidence"
        value={`${Math.round(analysis.confidence * 100)}%${
          analysis.promptVersion
            ? ` · Prompt v${analysis.promptVersion}`
            : ''
        }`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  neutralStatus: {
    ...typography.caption,
    marginTop: spacing.md,
    color: colors.textSecondary,
  },
  pendingStatus: {
    ...typography.caption,
    marginTop: spacing.md,
    color: colors.textSecondary,
  },
  failedContainer: {
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  failedStatus: {
    ...typography.caption,
    color: colors.error,
  },
  retryButton: {
    minHeight: spacing.xl + spacing.md,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.errorSurface,
  },
  retryButtonPressed: {
    opacity: 0.8,
  },
  retryButtonText: {
    ...typography.captionStrong,
    color: colors.error,
  },
  successContainer: {
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingLeft: spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: colors.successSurface,
  },
  detail: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  detailLabel: {
    fontFamily: typography.captionStrong.fontFamily,
    color: colors.textSecondary,
  },
  itemsContainer: {
    gap: spacing.xs,
  },
  item: {
    ...typography.caption,
    paddingLeft: spacing.sm,
    color: colors.textPrimary,
  },
});
