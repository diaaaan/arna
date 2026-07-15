import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import {
  colors,
  control,
  motion,
  radius,
  spacing,
  typography,
} from '../theme/tokens';

export type SubmissionFeedbackMessage = {
  id: number;
  message: string;
  tone: 'success' | 'error';
};

type SubmissionFeedbackProps = {
  feedback: SubmissionFeedbackMessage | null;
  onDismiss: (id: number) => void;
};

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
      duration: motion.duration.fast,
      easing: Easing.bezier(...motion.easing.gentle),
      useNativeDriver: true,
    }).start();

    const hideTimer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: motion.duration.normal,
        easing: Easing.bezier(...motion.easing.standard),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          onDismiss(feedback.id);
        }
      });
    }, motion.duration.feedbackVisible);

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
    borderWidth: control.strokeWidth,
    borderRadius: radius.full,
  },
  successMessage: {
    borderColor: colors.successGlow,
    backgroundColor: colors.successSurface,
    shadowColor: colors.success,
    shadowOpacity: 0.16,
    shadowRadius: spacing.md,
    elevation: spacing.xs,
  },
  errorMessage: {
    borderColor: colors.errorGlow,
    backgroundColor: colors.errorSurface,
    shadowColor: colors.error,
    shadowOpacity: 0.16,
    shadowRadius: spacing.md,
    elevation: spacing.xs,
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
