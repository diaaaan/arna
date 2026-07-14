import { StyleSheet, Text, View } from 'react-native';

import type { Thought } from '../entities/thought/thought';
import { colors, spacing, typography } from '../theme/tokens';
import { ThoughtAnalysis } from './thought-analysis';

type ThoughtItemProps = {
  thought: Thought;
  onRetryAnalysis: (thought: Thought) => void;
};

function formatCreatedAt(createdAt: string) {
  return new Date(createdAt).toLocaleString([], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ThoughtItem({ thought, onRetryAnalysis }: ThoughtItemProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.rawText}>{thought.rawText}</Text>
      <Text style={styles.createdAt}>{formatCreatedAt(thought.createdAt)}</Text>
      <ThoughtAnalysis
        analysis={thought.analysis}
        onRetry={() => onRetryAnalysis(thought)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rawText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  createdAt: {
    ...typography.caption,
    marginTop: spacing.sm,
    color: colors.textSecondary,
  },
});
