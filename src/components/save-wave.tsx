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
// confirmation-wave.mp4). A ring of light runs out from the text field in all
// directions, rippling the Living Surface under it; where it reaches the
// screen edges, the light settles into a glowing rim that fades out.
// Green (status/success) when saved, red (status/error) when not.
// Earlier bottom-to-top sweep: archive/animations/save-wave-sweep-v1.tsx.archived.

export type SaveWaveEvent = {
  id: number;
  tone: 'success' | 'error';
  message: string;
  // Where the ripple starts, in screen points (the text field).
  origin?: [number, number];
};

const DURATION = 1900;
// Share of the animation the ring needs to reach the farthest corner.
const RING_SHARE = 0.55;
const SURFACE_PUSH = 22;

const WAVE_SOURCE = `
uniform float2 size;
uniform float2 origin;
uniform float maxR;
uniform float progress;
uniform float3 tint;

half4 main(float2 p) {
  float t = progress;
  float ringT = clamp(t / ${RING_SHARE.toFixed(2)}, 0.0, 1.0);
  float r = maxR * (1.0 - pow(1.0 - ringT, 2.0));
  float dist = length(p - origin);
  float dr = dist - r;

  // 1. The ring and a few faint wavelets behind it.
  float core = exp(-dr * dr / 70.0);
  float glow = exp(-dr * dr / 1600.0);
  float wavelets = dr < 0.0 ? exp(dr / 110.0) * pow(0.5 + 0.5 * cos(dr * 0.11), 6.0) * 0.4 : 0.0;
  float ringFade = 1.0 - smoothstep(0.42, 0.62, t);
  float ringA = (core * 0.85 + glow * 0.4 + wavelets) * ringFade;

  // 2. The rim: an edge lights up once the ring has reached it, then fades.
  float wobble = 1.0 + 0.3 * sin(p.y * 0.02 + t * 6.0) * sin(p.x * 0.025 - t * 4.0);
  float k = 12.0 * wobble;
  float2 dl = p;
  float2 drr = size - p;
  float rimShape = exp(-dl.x / k) + exp(-drr.x / k) + exp(-dl.y / k) + exp(-drr.y / k);
  rimShape += 0.3 * (exp(-dl.x / 44.0) + exp(-drr.x / 44.0) + exp(-dl.y / 44.0) + exp(-drr.y / 44.0));
  float reached = smoothstep(-30.0, 60.0, r - dist);
  float rimOut = 1.0 - smoothstep(0.6, 1.0, t);
  float rimA = rimShape * reached * rimOut * 0.65;

  float a = clamp(ringA + rimA, 0.0, 1.0);
  float3 col = mix(tint, float3(1.0), core * 0.5 * ringFade);
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
  const origin: [number, number] = event?.origin ?? [width / 2, height * 0.45];
  const maxR = Math.max(
    Math.hypot(origin[0], origin[1]),
    Math.hypot(width - origin[0], origin[1]),
    Math.hypot(origin[0], height - origin[1]),
    Math.hypot(width - origin[0], height - origin[1]),
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
  const { rippleOrigin, rippleRadius, rippleAmp } = surfaceSignal;
  useDerivedValue(() => {
    const t = progress.value;
    if (reduceMotion || t >= 1) {
      rippleAmp.set(0);
      return;
    }
    const ringT = Math.min(1, t / RING_SHARE);
    rippleOrigin.set(origin);
    rippleRadius.set(maxR * (1 - (1 - ringT) * (1 - ringT)));
    rippleAmp.set(SURFACE_PUSH * (1 - t));
  });

  const tint = TINTS[tone];
  const uniforms = useDerivedValue<Uniforms>(() => ({
    size: [width, height],
    origin,
    maxR,
    // With reduced motion only the rim shows, without the ring.
    progress: reduceMotion ? 0.55 + progress.value * 0.45 : progress.value,
    tint,
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
