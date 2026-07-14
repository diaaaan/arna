import { useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors, radius, spacing, typography } from '../theme/tokens';

type ThoughtInputProps = {
  onSubmit: (rawText: string) => Promise<boolean>;
};

export function ThoughtInput({ onSubmit }: ThoughtInputProps) {
  const [rawText, setRawText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const canSubmit = rawText.trim().length > 0 && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);

    try {
      const submittedText = rawText;
      const wasSaved = await onSubmit(submittedText);

      if (wasSaved) {
        setRawText((currentText) => {
          if (currentText === submittedText) {
            return '';
          }

          return currentText.startsWith(submittedText)
            ? currentText.slice(submittedText.length)
            : currentText;
        });
      }
    } finally {
      setIsSubmitting(false);

      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        ref={inputRef}
        value={rawText}
        onChangeText={setRawText}
        placeholder="Запишите мысль…"
        placeholderTextColor={colors.textSecondary}
        multiline
        autoFocus
        blurOnSubmit={false}
        submitBehavior="newline"
        textAlignVertical="top"
        style={styles.input}
        accessibilityLabel="Новая мысль"
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Отправить мысль"
        disabled={!canSubmit}
        onPress={() => void handleSubmit()}
        style={({ pressed }) => [
          styles.submitButton,
          !canSubmit && styles.submitButtonDisabled,
          pressed && canSubmit && styles.submitButtonPressed,
        ]}
      >
        <Text style={styles.submitButtonText}>Отправить</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    width: '100%',
  },
  input: {
    ...typography.body,
    minHeight: spacing.xl * 6,
    maxHeight: spacing.xl * 9,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  submitButton: {
    minHeight: spacing.xl + spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
  },
  submitButtonDisabled: {
    backgroundColor: colors.accentDisabled,
  },
  submitButtonPressed: {
    opacity: 0.8,
  },
  submitButtonText: {
    ...typography.button,
    color: colors.onAccent,
  },
});
