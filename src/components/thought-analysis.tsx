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
  task: 'Задача',
  shopping_list: 'Список покупок',
  idea: 'Идея',
  note: 'Заметка',
  quote: 'Цитата',
  reminder: 'Напоминание',
  project: 'Проект',
  unknown: 'Не определено',
};

const categoryLabels: Record<InterpretationCategory, string> = {
  work: 'Работа',
  home: 'Дом',
  health: 'Здоровье',
  finance: 'Финансы',
  learning: 'Обучение',
  creativity: 'Творчество',
  personal: 'Личное',
  unknown: 'Не определено',
};

const urgencyLabels: Record<InterpretationUrgency, string> = {
  low: 'Низкая',
  medium: 'Средняя',
  high: 'Высокая',
  unknown: 'Не определена',
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
    return <Text style={styles.neutralStatus}>Анализ ещё не выполнялся</Text>;
  }

  if (analysis.status === 'pending') {
    return <Text style={styles.pendingStatus}>Анализируется…</Text>;
  }

  if (analysis.status === 'failed') {
    return (
      <View style={styles.failedContainer}>
        <Text style={styles.failedStatus}>Не удалось разобрать</Text>
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={({ pressed }) => [
            styles.retryButton,
            pressed && styles.retryButtonPressed,
          ]}
        >
          <Text style={styles.retryButtonText}>Повторить анализ</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.successContainer}>
      <Detail label="Тип" value={typeLabels[analysis.type]} />
      <Detail label="Категория" value={categoryLabels[analysis.category]} />
      <Detail label="Срочность" value={urgencyLabels[analysis.urgency]} />
      <Detail label="Кратко" value={analysis.summary} />
      {analysis.dueDate ? (
        <Detail label="Срок" value={formatDueDate(analysis.dueDate)} />
      ) : null}
      {analysis.items.length > 0 ? (
        <View style={styles.itemsContainer}>
          <Text style={styles.detailLabel}>Пункты:</Text>
          {analysis.items.map((item, index) => (
            <Text key={`${index}-${item.title}`} style={styles.item}>
              • {item.title}
              {item.quantity === null ? '' : ` ×${item.quantity}`}
            </Text>
          ))}
        </View>
      ) : null}
      <Detail
        label="Уверенность"
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
    ...typography.caption,
    fontWeight: '600',
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
    fontWeight: '600',
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
