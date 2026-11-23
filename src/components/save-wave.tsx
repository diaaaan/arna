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
import { surfaceSignal } from '../theme/surface-signal';
import { colors, typography } from '../theme/tokens';

// Confirmation after a thought is sent (ref: Arna/refs/2026-11-22_save-
// confirmation-wave.mp4). A ripple runs out from the text field (in its
// rounded-rectangle shape) through the Living Surface itself: the matter is pushed and takes the colour as the ring
// passes (smear shader, via surfaceSignal.ripple*). Where it reaches the screen
// edges, the light settles into a glowing rim that fades out.
// Green (status/success) when saved, red (status/error) when not.
// Earlier bottom-to-top sweep: archive/animations/save-wave-sweep-v1.tsx.archived.

export type SaveWaveEvent = {
  id: number;
  tone: 'success' | 'error';
  message: string;
  // Fallback start point, screen points, if the text field is not measured.
  origin?: [number, number];
};

const DURATION = 1900;
// Share of the animation the ring needs to reach the farthest corner.
const RING_SHARE = 0.55;
const SURFACE_PUSH = 48;

const WAVE_SOURCE = `
uniform float2 size;
uniform float4 rect;
uniform float rad;
uniform float maxR;
uniform float progress;
uniform float3 tint;
uniform float rimStrength;

half4 main(float2 p) {
  float t = progress;
  float ringT = clamp(t / ${RING_SHARE.toFixed(2)}, 0.0, 1.0);
  float r = maxR * (1.0 - pow(1.0 - ringT, 2.0));
  float2 c = rect.xy + rect.zw * 0.5;
  float2 q = abs(p - c) - rect.zw * 0.5 + rad;
  float dist = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - rad;

  // 1. The ring itself is the Living Surface moving and changing colour (see
  // the smear shader); this overlay draws only the rim.

  // 2. The rim: an edge lights up once the ring has reached it, then fades.
  float wobble = 1.0 + 0.3 * sin(p.y * 0.02 + t * 6.0) * sin(p.x * 0.025 - t * 4.0);
  float k = 12.0 * wobble;
  float2 dl = p;
  float2 drr = size - p;
  float rimShape = exp(-dl.x / k) + exp(-drr.x / k) + exp(-dl.y / k) + exp(-drr.y / k);
  rimShape += 0.3 * (exp(-dl.x / 44.0) + exp(-drr.x / 44.0) + exp(-dl.y / 44.0) + exp(-drr.y / 44.0));
  float reached = smoothstep(-30.0, 60.0, r - dist);
  float rimOut = 1.0 - smoothstep(0.6, 1.0, t);
  float rimA = rimShape * reached * rimOut * rimStrength;

  float a = clamp(rimA, 0.0, 1.0);
  float3 col = tint;
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

// How much colour each outcome brings: kept low so it tints, not floods; red
// a little quieter still, so an error does not alarm.
const STRENGTH = {
  success: { surface: 0.85, rim: 0.4 },
  error: { surface: 0.65, rim: 0.32 },
} as const;

type SaveWaveProps = {
  event: SaveWaveEvent | null;
};

export function SaveWave({ event }: SaveWaveProps) {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(1);
  const tone = event?.tone ?? 'success';
  // The wave starts from the outline of the text field and keeps its shape.
  const field = surfaceSignal.fieldRect.get();
  const fallback = event?.origin ?? [width / 2, height * 0.45];
  const rect: [number, number, number, number] =
    field[2] > 0 ? field : [fallback[0] - 60, fallback[1] - 24, 120, 48];
  const maxR = Math.max(
    ...[
      [0, 0],
      [width, 0],
      [0, height],
      [width, height],
    ].map(([px, py]) =>
      Math.hypot(
        Math.max(Math.abs(px - (rect[0] + rect[2] / 2)) - rect[2] / 2, 0),
        Math.max(Math.abs(py - (rect[1] + rect[3] / 2)) - rect[3] / 2, 0),
      ),
    ),
  );

  useEffect(() => {
    if (!event) {
      return;
    }
    progress.set(0);
    progress.set(
      withTiming(1, { duration: reduceMotion ? 900 : DURATION, easing: Easing.linear }),
    );
    void Haptics.notificationAsync(
      event.tone === 'success'
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error,
    ).catch(() => undefined);
  }, [event, progress, reduceMotion]);

  // Ripple the living surface along with the ring of light.
  const { rippleRect, rippleRadius, rippleAmp, rippleTint, rippleGlow } =
    surfaceSignal;
  const tint = TINTS[tone];
  useDerivedValue(() => {
    const t = progress.value;
    if (t >= 1) {
      rippleAmp.set(0);
      rippleGlow.set(0);
      return;
    }
    const ringT = Math.min(1, t / RING_SHARE);
    rippleRect.set(rect);
    rippleTint.set(tint);
    rippleRadius.set(maxR * (1 - (1 - ringT) * (1 - ringT)));
    rippleAmp.set(reduceMotion ? 0 : SURFACE_PUSH * (1 - t));
    // The colour lingers a little after the ring has passed, then fades.
    rippleGlow.set(
      STRENGTH[tone].surface *
        Math.min(1, t * 8) *
        (1 - Math.min(1, Math.max(0, (t - 0.3) / 0.45))),
    );
  });

  const uniforms = useDerivedValue<Uniforms>(() => ({
    size: [width, height],
    rect,
    rad: surfaceSignal.fieldRadius.get(),
    maxR,
    // With reduced motion only the rim shows, without the ring.
    progress: reduceMotion ? 0.55 + progress.value * 0.45 : progress.value,
    tint,
    rimStrength: STRENGTH[tone].rim,
  }));

  const badgeStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const show =
      interpolate(p, [0.18, 0.32], [0, 1], 'clamp') *
      (1 - interpolate(p, [0.8, 1], [0, 1], 'clamp'));
    return {
      opacity: show,
      transform: [{ scale: 0.7 + 0.3 * interpolate(p, [0.18, 0.4], [0, 1], 'clamp') }],
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
            {
              backgroundColor:
                tone === 'success' ? kitColors.status.success : kitColors.status.error,
            },
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
