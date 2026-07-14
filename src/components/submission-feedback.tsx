import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../theme/tokens';

export type SubmissionFeedbackMessage = {
  id: number;
  message: string;
  tone: 'success' | 'error';
};

type SubmissionFeedbackProps = {
  feedback: SubmissionFeedbackMessage | null;
  onDismiss: (id: number) => void;
};

const visibleDuration = 1700;

export function SubmissionFeedback({
  feedback,
  onDismiss,
}: SubmissionFeedbackProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    opacity.stopAnimation();

    if (!feedback) {
      opacity.setValue(0);
      return;
    }

    opacity.setValue(0);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 160,
      useNativeDriver: true,
    }).start();

    const hideTimer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          onDismiss(feedback.id);
        }
      });
    }, visibleDuration);

    return () => {
      clearTimeout(hideTimer);
      opacity.stopAnimation();
    };
  }, [feedback, onDismiss, opacity]);

  return (
    <View pointerEvents="none" style={styles.slot}>
      {feedback ? (
        <Animated.View
          style={[
            styles.message,
            feedback.tone === 'success'
              ? styles.successMessage
              : styles.errorMessage,
            { opacity },
          ]}
        >
          <Text
            accessibilityLiveRegion="polite"
            style={[
              styles.messageText,
              feedback.tone === 'success'
                ? styles.successText
                : styles.errorText,
            ]}
          >
            {feedback.message}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    minHeight: spacing.xl + spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  successMessage: {
    backgroundColor: colors.successSurface,
  },
  errorMessage: {
    backgroundColor: colors.errorSurface,
  },
  messageText: {
    ...typography.caption,
    fontWeight: '600',
  },
  successText: {
    color: colors.success,
  },
  errorText: {
    color: colors.error,
  },
});
