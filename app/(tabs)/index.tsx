import { useCallback, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  SubmissionFeedback,
  type SubmissionFeedbackMessage,
} from '../../src/components/submission-feedback';
import { AmbientBackground } from '../../src/components/ambient-background';
import { ThoughtInput } from '../../src/components/thought-input';
import { analyzeThought } from '../../src/mind/mind-engine';
import { createThought } from '../../src/entities/thought/thought';
import { appendThought } from '../../src/storage/thought-storage';
import { colors, spacing, typography } from '../../src/theme/tokens';

export default function CaptureScreen() {
  const [feedback, setFeedback] = useState<SubmissionFeedbackMessage | null>(
    null,
  );
  const feedbackIdRef = useRef(0);

  const showFeedback = useCallback(
    (message: string, tone: SubmissionFeedbackMessage['tone']) => {
      feedbackIdRef.current += 1;
      setFeedback({ id: feedbackIdRef.current, message, tone });
    },
    [],
  );

  const handleSubmit = useCallback(async (rawText: string) => {
    const thought = createThought(rawText);

    try {
      await appendThought(thought);
      showFeedback('Мысль сохранена', 'success');
      requestAnimationFrame(() => {
        void analyzeThought(thought).catch(() => {
          // Analysis is best-effort and must never interrupt thought capture.
        });
      });
      return true;
    } catch (error: unknown) {
      console.error('Failed to save thought.', error);
      showFeedback('Не удалось сохранить мысль', 'error');
      return false;
    }
  }, [showFeedback]);

  const handleFeedbackDismiss = useCallback((id: number) => {
    setFeedback((currentFeedback) =>
      currentFeedback?.id === id ? null : currentFeedback,
    );
  }, []);

  return (
    <View style={styles.root}>
      <View pointerEvents="none" style={styles.backgroundLayer}>
        <AmbientBackground />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.foreground}
      >
        <SafeAreaView
          edges={['top', 'left', 'right']}
          style={styles.safeArea}
        >
          <View style={styles.appHeader}>
            <Text style={styles.appName}>Arna</Text>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.captureArea}
            keyboardDismissMode="none"
            keyboardShouldPersistTaps="always"
          >
            <Text style={styles.title}>Что у вас на уме?</Text>

            <View style={styles.inputArea}>
              <ThoughtInput onSubmit={handleSubmit} />
              <SubmissionFeedback
                feedback={feedback}
                onDismiss={handleFeedbackDismiss}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  foreground: {
    position: 'relative',
    zIndex: 1,
    flex: 1,
  },
  appHeader: {
    zIndex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  appName: {
    ...typography.appName,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  captureArea: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  inputArea: {
    width: '100%',
    marginTop: spacing.xxl,
  },
});
