import { StyleSheet, Text, View } from 'react-native';

import type { Thought } from '../entities/thought/thought';
import { colors, radius, spacing, typography } from '../theme/tokens';

type ThoughtItemProps = {
  thought: Thought;
};

function formatCreatedAt(createdAt: string) {
  return new Date(createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ThoughtItem({ thought }: ThoughtItemProps) {
  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        <Text style={styles.rawText}>{thought.rawText}</Text>
        <Text style={styles.createdAt}>{formatCreatedAt(thought.createdAt)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-end',
    marginLeft: spacing.xl * 2,
  },
  bubble: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  rawText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  createdAt: {
    ...typography.caption,
    alignSelf: 'flex-end',
    marginTop: spacing.xs,
    color: colors.textSecondary,
  },
});
