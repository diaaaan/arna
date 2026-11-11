import { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Easing, withTiming } from 'react-native-reanimated';

import {
  colors,
  control,
  gradients,
  radius,
  shadows,
  spacing,
  surfaceReaction,
  typography,
  visual,
} from '../theme/tokens';
import { surfaceSignal } from '../theme/surface-signal';

function setSurfaceFocus(focused: boolean) {
  surfaceSignal.focus.value = withTiming(focused ? 1 : 0, {
    duration: surfaceReaction.focusDuration,
    easing: Easing.out(Easing.cubic),
  });
}

type ThoughtInputProps = {
  onSubmit: (rawText: string) => Promise<boolean>;
};

export function ThoughtInput({ onSubmit }: ThoughtInputProps) {
  const [rawText, setRawText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const canSubmit = rawText.trim().length > 0 && !isSubmitting;

  useEffect(() => {
    // Android keeps the field focused after the keyboard is hidden with the
    // back button; blur it so the surface can relax too.
    const subscription = Keyboard.addListener('keyboardDidHide', () => {
      inputRef.current?.blur();
    });

    return () => {
      subscription.remove();
      setSurfaceFocus(false);
    };
  }, []);

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
      <Pressable
        accessible={false}
        onPress={() => inputRef.current?.focus()}
        style={[styles.inputFrame, isFocused && styles.inputFrameFocused]}
      >
        <LinearGradient
          pointerEvents="none"
          colors={isFocused ? gradients.inputFocus : gradients.inputIdle}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.inputFrameDecoration}
        />
        <View style={styles.inputSurface}>
          <TextInput
            ref={inputRef}
            value={rawText}
            onChangeText={setRawText}
            onFocus={() => {
              setIsFocused(true);
              setSurfaceFocus(true);
            }}
            onBlur={() => {
              setIsFocused(false);
              setSurfaceFocus(false);
            }}
            onPressIn={() => inputRef.current?.focus()}
            placeholder="Запишите мысль…"
            placeholderTextColor={colors.textSecondary}
            selectionColor={colors.focus}
            cursorColor={colors.focus}
            multiline
            blurOnSubmit={false}
            submitBehavior="newline"
            textAlignVertical="top"
            style={styles.input}
            accessibilityLabel="Новая мысль"
          />
        </View>
      </Pressable>
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
    ...typography.input,
    width: '100%',
    minHeight: control.inputMinHeight,
    maxHeight: control.inputMaxHeight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    color: colors.textPrimary,
  },
  inputFrame: {
    padding: control.strokeWidth,
    borderRadius: radius.lg,
  },
  inputFrameDecoration: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: radius.lg,
  },
  inputFrameFocused: {
    ...shadows.focusGlow,
  },
  inputSurface: {
    overflow: 'hidden',
    borderRadius: radius.lg,
    backgroundColor: colors.inputSurface,
  },
  submitButton: {
    minHeight: control.buttonMinHeight,
    alignSelf: 'flex-end',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    borderWidth: control.strokeWidth,
    borderColor: colors.focusMuted,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
  },
  submitButtonDisabled: {
    backgroundColor: colors.surfaceElevated,
    opacity: visual.opacity.disabled,
  },
  submitButtonPressed: {
    opacity: visual.opacity.pressed,
  },
  submitButtonText: {
    ...typography.button,
    color: colors.focus,
  },
});
