import { Canvas, Fill, Shader, Skia } from '@shopify/react-native-skia';
import type { Uniforms } from '@shopify/react-native-skia';
import {
  useDerivedValue,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { SURFACE_EFFECT, surfaceUniforms } from '../surface-uniforms';

// A round "liquid glass" orb. It refracts the Living Surface behind it: the
// middle is slightly magnified, the rim bends the picture inward with a touch
// of colour fringing. At rest it is a clean circle; while the user interacts
// with it (activity > 0) the outline starts to wobble like a drop.
const LIQUID_ORB_SOURCE = `
uniform shader surface;
uniform float2 center;
uniform float2 screenOrigin;
uniform float radius;
uniform float time;
uniform float wobble;
uniform float alpha;

half4 main(float2 p) {
  float2 v = p - center;
  float len = length(v);
  float ang = atan(v.y, v.x);
  float t = time * 6.2831853;
  float shape = 1.0 + wobble * (
      0.026 * sin(3.0 * ang + t)
    + 0.017 * sin(5.0 * ang - 2.0 * t)
    + 0.012 * sin(2.0 * ang + 3.0 * t));
  float R = radius * shape;
  float d = len - R;
  float inside = 1.0 - smoothstep(-0.9, 0.9, d);
  if (inside <= 0.0) {
    return half4(0.0);
  }

  float r = clamp(len / R, 0.0, 1.0);
  float2 dir = len > 0.001 ? v / len : float2(0.0, -1.0);
  float2 base = screenOrigin + center;

  // Lens: slight magnification inside, strong inward bend at the rim.
  float bend = 0.84 + 0.62 * pow(r, 4.0);
  float fringe = 0.04 * pow(r, 3.0);
  float3 c = float3(
    surface.eval(base + v * (bend + fringe)).r,
    surface.eval(base + v * bend).g,
    surface.eval(base + v * (bend - fringe)).b
  );

  // Clear glass: a little brighter and cooler than what is behind it.
  c = c * 1.14 + float3(0.04, 0.04, 0.06);

  // Thin bright rim, strongest toward the light (top left).
  float light = max(0.0, dot(dir, normalize(float2(-0.55, -0.83))));
  float rim = 1.0 - smoothstep(0.0, 2.4, -d);
  c += rim * (0.2 + 0.55 * light);

  // Light passing through and gathering along the lower rim.
  c += smoothstep(0.55, 1.0, r) * max(0.0, dir.y) * 0.09;

  // Specular highlight.
  float2 sp = v / R - float2(-0.3, -0.5);
  c += 0.34 * exp(-dot(sp, sp) * 20.0);

  return half4(c * inside * alpha, inside * alpha);
}
`;

const ORB_EFFECT = (() => {
  try {
    return Skia.RuntimeEffect.Make(LIQUID_ORB_SOURCE);
  } catch {
    return null;
  }
})();

type LiquidOrbProps = {
  // Canvas size (square) and where its top-left corner sits on the screen.
  size: number;
  screenX: number;
  screenY: number;
  radius: number;
  // 0 = at rest (clean circle, no redraws), 1 = fully alive.
  activity: SharedValue<number>;
};

const WOBBLE_PERIOD_MS = 4200;

export function LiquidOrb({ size, screenX, screenY, radius, activity }: LiquidOrbProps) {
  const reduceMotion = useReducedMotion();
  const time = useSharedValue(0);

  // The drop only moves while it is being used.
  useFrameCallback((frame) => {
    'worklet';
    if (reduceMotion || activity.value < 0.001) {
      return;
    }
    const dt = frame.timeSincePreviousFrame ?? 0;
    time.set((time.get() + dt / WOBBLE_PERIOD_MS) % 1);
  });

  const surface = useDerivedValue<Uniforms>(() => surfaceUniforms());
  const uniforms = useDerivedValue<Uniforms>(() => ({
    center: [size / 2, size / 2],
    screenOrigin: [screenX, screenY],
    radius,
    time: time.value,
    wobble: reduceMotion ? 0 : Math.min(1, activity.value),
    alpha: 1,
  }));

  if (!ORB_EFFECT || !SURFACE_EFFECT) {
    return null;
  }

  return (
    <Canvas pointerEvents="none" style={{ width: size, height: size }}>
      <Fill>
        <Shader source={ORB_EFFECT} uniforms={uniforms}>
          <Shader source={SURFACE_EFFECT} uniforms={surface} />
        </Shader>
      </Fill>
    </Canvas>
  );
}
