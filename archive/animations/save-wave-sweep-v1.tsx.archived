import { Ionicons } from '@expo/vector-icons';
import { Canvas, Fill, Shader, Skia } from '@shopify/react-native-skia';
import type { Uniforms } from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { kitColors } from '../theme/kit';
import { colors, typography } from '../theme/tokens';

// Confirmation after a thought is sent (ref: Arna/refs/2026-11-22_save-
// confirmation-wave.mp4). A wide band of light sweeps up the screen, then the
// light settles into a glowing rim along the screen edges and fades out.
// Green (status/success) when the thought is saved, red (status/error) when it
// is not, so the result reads from the colour alone.

export type SaveWaveEvent = {
  id: number;
  tone: 'success' | 'error';
  message: string;
};

const DURATION = 1700;

const WAVE_SOURCE = `
uniform float2 size;
uniform float progress;
uniform float3 tint;

half4 main(float2 p) {
  float2 uv = p / size;
  float t = progress;
  float wave = clamp(t / 0.5, 0.0, 1.0);
  wave = 1.0 - pow(1.0 - wave, 2.2);
  float front = mix(1.25, -0.35, wave) + 0.48 * (uv.x - 0.5) * (uv.x - 0.5);
  float dy = uv.y - front;
  float core = exp(-dy * dy / 0.0018);
  float glow = exp(-dy * dy / 0.02);
  float trail = dy > 0.0 ? exp(-dy / 0.22) * 0.35 : 0.0;
  float waveFade = 1.0 - smoothstep(0.42, 0.6, t);
  float waveA = (core * 0.85 + glow * 0.45 + trail) * waveFade;
  float wobble = 1.0 + 0.3 * sin(uv.y * 9.0 + t * 6.0) * sin(uv.x * 7.0 - t * 4.0);
  float k = 12.0 * wobble;
  float2 dl = p;
  float2 dr = size - p;
  float rimShape = exp(-dl.x / k) + exp(-dr.x / k) + exp(-dl.y / k) + exp(-dr.y / k);
  rimShape += 0.3 * (exp(-dl.x / 44.0) + exp(-dr.x / 44.0) + exp(-dl.y / 44.0) + exp(-dr.y / 44.0));
  float rimIn = smoothstep(0.3, 0.5, t);
  float rimOut = 1.0 - smoothstep(0.62, 1.0, t);
  float rimA = rimShape * rimIn * rimOut * 0.65;
  float a = clamp(waveA + rimA, 0.0, 1.0);
  float3 col = mix(tint, float3(1.0), core * 0.55 * waveFade);
  return half4(col * a, a);
}
`;

const WAVE_EFFECT = (() => {
  try {
    return Skia.RuntimeEffect.Make(WAVE_SOURCE);
  } catch {
    return null;
  }
})();

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

const TINTS = {
  success: hexToRgb(kitColors.status.success),
  error: hexToRgb(kitColors.status.error),
} as const;

type SaveWaveProps = {
  event: SaveWaveEvent | null;
};

export function SaveWave({ event }: SaveWaveProps) {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(1);
  const tone = event?.tone ?? 'success';

  useEffect(() => {
    if (!event) {
      return;
    }
    progress.set(0);
    progress.set(
      withTiming(1, {
        duration: reduceMotion ? 900 : DURATION,
        easing: Easing.linear,
      }),
    );
    void Haptics.notificationAsync(
      event.tone === 'success'
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error,
    ).catch(() => undefined);
  }, [event, progress, reduceMotion]);

  const tint = TINTS[tone];
  const uniforms = useDerivedValue<Uniforms>(() => ({
    size: [width, height],
    // With reduced motion only the rim shows, without the sweep.
    progress: reduceMotion ? 0.45 + progress.value * 0.55 : progress.value,
    tint,
  }));

  const badgeStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const show =
      interpolate(p, [0.28, 0.42], [0, 1], 'clamp') *
      (1 - interpolate(p, [0.8, 1], [0, 1], 'clamp'));
    return {
      opacity: show,
      transform: [{ scale: 0.7 + 0.3 * interpolate(p, [0.28, 0.48], [0, 1], 'clamp') }],
    };
  });

  const canvasStyle = useAnimatedStyle(() => ({
    opacity: progress.value >= 1 ? 0 : 1,
  }));

  if (!event || !WAVE_EFFECT) {
    return null;
  }

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, canvasStyle]}>
        <Canvas style={StyleSheet.absoluteFill}>
          <Fill>
            <Shader source={WAVE_EFFECT} uniforms={uniforms} />
          </Fill>
        </Canvas>
      </Animated.View>
      <Animated.View style={[styles.badge, badgeStyle]}>
        <View
          style={[
            styles.badgeIcon,
            { backgroundColor: tone === 'success' ? kitColors.status.success : kitColors.status.error },
          ]}
        >
          <Ionicons
            name={tone === 'success' ? 'checkmark' : 'close'}
            size={26}
            color={colors.background}
          />
        </View>
        <Text style={styles.badgeText}>{event.message}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  badgeIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    ...typography.button,
    color: colors.textPrimary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
