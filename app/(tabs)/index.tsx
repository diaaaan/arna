import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
import { ThoughtInput } from '../../src/components/thought-input';
import { analyzeThought } from '../../src/mind/mind-engine';
import { createThought } from '../../src/entities/thought/thought';
import { appendThought } from '../../src/storage/thought-storage';
import { surfaceSignal } from '../../src/theme/surface-signal';
import {
  colors,
  navigation,
  SMEAR_MODE_DEFAULT,
  smearModes,
  spacing,
  typography,
  type SmearModeName,
} from '../../src/theme/tokens';

const SURFACE_MODE_STORAGE_KEY = 'arna.ui.surface-mode';
const SURFACE_MODES = Object.keys(smearModes) as SmearModeName[];
const TITLE_TAP_COUNT = 3;
const TITLE_TAP_WINDOW_MS = 900;

export default function CaptureScreen() {
  const [feedback, setFeedback] = useState<SubmissionFeedbackMessage | null>(
    null,
  );
  const feedbackIdRef = useRef(0);
  const [surfaceMode, setSurfaceMode] = useState<SmearModeName>(
    SMEAR_MODE_DEFAULT,
  );
  const titleTapsRef = useRef({ count: 0, lastTapAt: 0 });

  // The background lives in the tab layout; tell it which mode to show.
  useEffect(() => {
    surfaceSignal.mode.set(smearModes[surfaceMode].value);
  }, [surfaceMode]);

  useEffect(() => {
    AsyncStorage.getItem(SURFACE_MODE_STORAGE_KEY)
      .then((stored) => {
        if (stored && (SURFACE_MODES as string[]).includes(stored)) {
          setSurfaceMode(stored as SmearModeName);
        }
      })
      .catch(() => undefined);
  }, []);

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
      showFeedback('Saved', 'success');
      requestAnimationFrame(() => {
        void analyzeThought(thought).catch(() => {
          // Analysis is best-effort and must never interrupt thought capture.
        });
      });
      return true;
    } catch (error: unknown) {
      console.error('Failed to save thought.', error);
      showFeedback("Couldn't save this one · Try again", 'error');
      return false;
    }
  }, [showFeedback]);

  const handleTitlePress = useCallback(() => {
    const now = Date.now();
    const taps = titleTapsRef.current;
    taps.count = now - taps.lastTapAt < TITLE_TAP_WINDOW_MS ? taps.count + 1 : 1;
    taps.lastTapAt = now;

    if (taps.count < TITLE_TAP_COUNT) {
      return;
    }

    taps.count = 0;
    setSurfaceMode((current) => {
      const next =
        SURFACE_MODES[
          (SURFACE_MODES.indexOf(current) + 1) % SURFACE_MODES.length
        ];
      AsyncStorage.setItem(SURFACE_MODE_STORAGE_KEY, next).catch(
        () => undefined,
      );
      return next;
    });
  }, []);

  const surfaceLabel = smearModes[surfaceMode].label;


  const handleFeedbackDismiss = useCallback((id: number) => {
    setFeedback((currentFeedback) =>
      currentFeedback?.id === id ? null : currentFeedback,
    );
  }, []);

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.foreground}
      >
        <SafeAreaView
          edges={['top', 'left', 'right']}
          style={styles.safeArea}
        >
          <View style={styles.appHeader}>
            <Pressable
              accessibilityLabel={`Arna. Background: ${surfaceLabel}`}
              hitSlop={spacing.md}
              onPress={handleTitlePress}
            >
              <Text style={styles.appName}>arna</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.captureArea,
              { paddingBottom: navigation.tabBarHeight + spacing.lg },
            ]}
            keyboardDismissMode="none"
            keyboardShouldPersistTaps="always"
          >
            <Text style={styles.title}>What’s on your mind?</Text>

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
  },
  safeArea: {
    flex: 1,
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
