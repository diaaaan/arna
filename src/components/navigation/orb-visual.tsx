import { Canvas, Fill, Shader, Skia } from '@shopify/react-native-skia';
import type { Uniforms } from '@shopify/react-native-skia';
import {
  useDerivedValue,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

// The navigation orb, "ripples" look: there is no object, only faint rings on
// the surface and a small point, like a touch on water. At rest the rings stay
// still and barely show; while the user interacts (activity > 0) they run
// outward. Other looks tried on 2026-11-21 (liquid glass, piece of lava, aura)
// are in archive/animations/orb-visual-4-variants-v1.tsx.archived.
const RIPPLES_SOURCE = `
uniform float2 size;
uniform float2 center;
uniform float radius;
uniform float time;
uniform float wobble;
uniform float alpha;

half4 main(float2 p) {
  float2 v = p - center;
  float len = length(v);
  float maxR = min(size.x, size.y) * 0.5;
  float fade = 1.0 - smoothstep(maxR * 0.45, maxR, len);
  // Rings are thin crisp lines (about 2 pt, antialiased over 1 pt) with a
  // faint halo, not soft gradients, so the orb reads sharp.
  float period = 6.2831853 / 0.15;
  float phase = len * 0.15 - time * 6.2831853 * 2.0;
  float u = fract((phase - 1.5707963) / 6.2831853 + 0.5) - 0.5;
  float dpt = abs(u) * period;
  float ring = (1.0 - smoothstep(0.6, 1.6, dpt)) + 0.22 * exp(-dpt * dpt / 14.0);
  float strength = 0.2 + 0.35 * wobble;
  float dotR = radius * 0.16;
  float core = (1.0 - smoothstep(dotR - 1.0, dotR + 0.5, len)) * 0.45;
  float a = clamp(ring * fade * strength + core, 0.0, 1.0);
  return half4(float3(0.92, 0.9, 1.0) * a * alpha, a * alpha);
}
`;

const EFFECT = (() => {
  try {
    return Skia.RuntimeEffect.Make(RIPPLES_SOURCE);
  } catch {
    return null;
  }
})();

type OrbVisualProps = {
  size: number;
  radius: number;
  // 0 = at rest (no redraws), 1 = fully alive.
  activity: SharedValue<number>;
};

const PERIOD_MS = 4200;

export function OrbVisual({ size, radius, activity }: OrbVisualProps) {
  const reduceMotion = useReducedMotion();
  const time = useSharedValue(0);

  useFrameCallback((frame) => {
    'worklet';
    if (reduceMotion || activity.value < 0.001) {
      return;
    }
    const dt = frame.timeSincePreviousFrame ?? 0;
    time.set((time.get() + dt / PERIOD_MS) % 1);
  });

  const uniforms = useDerivedValue<Uniforms>(() => ({
    size: [size, size],
    center: [size / 2, size / 2],
    radius,
    time: time.value,
    wobble: reduceMotion ? 0 : Math.min(1, activity.value),
    alpha: 1,
  }));

  if (!EFFECT) {
    return null;
  }

  return (
    <Canvas pointerEvents="none" style={{ width: size, height: size }}>
      <Fill>
        <Shader source={EFFECT} uniforms={uniforms} />
      </Fill>
    </Canvas>
  );
}
