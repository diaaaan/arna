import { Canvas, Fill, Shader, Skia } from '@shopify/react-native-skia';
import type { Uniforms } from '@shopify/react-native-skia';
import {
  useDerivedValue,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import type { OrbStyle } from '../../theme/orb-style';
import { SURFACE_EFFECT, SURFACE_SIZE, surfaceUniforms } from '../surface-uniforms';

// Looks for the navigation orb (an experiment, switched with a long press on
// the logo). All are calm at rest and come alive while the user interacts
// (activity > 0).

// Liquid glass: refracts the Living Surface behind it.
const GLASS_SOURCE = `
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

// A piece of lava: a soft-edged window onto the most active part of the
// surface, a little hotter and more saturated, with a glow around it.
const LAVA_SOURCE = `
uniform shader surface;
uniform float2 center;
uniform float2 sampleCenter;
uniform float radius;
uniform float time;
uniform float wobble;
uniform float alpha;

half4 main(float2 p) {
  float2 v = p - center;
  float len = length(v);
  float ang = atan(v.y, v.x);
  float t = time * 6.2831853;
  float R = radius * (1.0 + wobble * (0.03 * sin(3.0 * ang + t) + 0.02 * sin(4.0 * ang - 2.0 * t)));
  float d = len - R;
  float r = clamp(len / R, 0.0, 1.0);

  // Slow swirl inside while alive.
  float s = wobble * 0.6 * sin(t) * (1.0 - r);
  float cs = cos(s);
  float sn = sin(s);
  float2 w = float2(v.x * cs - v.y * sn, v.x * sn + v.y * cs);
  float3 c = surface.eval(sampleCenter + w * 1.7).rgb;

  // Hotter: more saturated and brighter, darker toward the rim.
  float l = dot(c, float3(0.299, 0.587, 0.114));
  c = mix(float3(l), c, 1.4) * 1.3;
  c *= 0.78 + 0.4 * (1.0 - r * r);

  float inside = 1.0 - smoothstep(-5.0, 1.5, d);
  float halo = (1.0 - smoothstep(0.0, 28.0, d)) * (1.0 - inside) * 0.4;
  float3 haloColor = surface.eval(sampleCenter).rgb * 1.3;
  float a = clamp(inside + halo, 0.0, 1.0);
  return half4((c * inside + haloColor * halo) * alpha, a * alpha);
}
`;

// Aura: an abstract soft orb of slowly turning colour, no hard edge.
const AURA_SOURCE = `
uniform float2 center;
uniform float radius;
uniform float time;
uniform float wobble;
uniform float alpha;

half4 main(float2 p) {
  float2 v = p - center;
  float len = length(v);
  float ang = atan(v.y, v.x);
  float t = time * 6.2831853;
  float R = radius * (1.0 + wobble * 0.04 * sin(3.0 * ang + t));
  float r = len / R;

  float a1 = ang + 0.7 * sin(r * 3.0 - t);
  float m1 = 0.5 + 0.5 * sin(a1 + t);
  float m2 = 0.5 + 0.5 * sin(2.0 * a1 - t + 1.7);
  float3 blue = float3(0.25, 0.42, 1.0);
  float3 violet = float3(0.56, 0.4, 1.0);
  float3 peach = float3(1.0, 0.56, 0.4);
  float3 c = mix(blue, violet, m1);
  c = mix(c, peach, m2 * smoothstep(0.2, 0.95, r) * 0.55);
  c += float3(1.0, 0.93, 0.82) * exp(-r * r * 7.0) * 0.4;

  float body = 1.0 - smoothstep(0.7, 1.0, r);
  float glow = exp(-max(r - 0.85, 0.0) * 5.0) * 0.3 * (1.0 - body);
  float a = clamp(body * 0.85 + glow, 0.0, 1.0);
  return half4(c * a * alpha, a * alpha);
}
`;

// Ripples: nothing but faint rings on the surface, like a touch on water.
// At rest they barely show; while alive they run outward.
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
  float phase = len * 0.15 - time * 6.2831853 * 2.0;
  float ring = pow(0.5 + 0.5 * sin(phase), 10.0);
  float strength = 0.14 + 0.3 * wobble;
  float core = (1.0 - smoothstep(radius * 0.12, radius * 0.2, len)) * 0.35;
  float a = clamp(ring * fade * strength + core, 0.0, 1.0);
  return half4(float3(0.92, 0.9, 1.0) * a * alpha, a * alpha);
}
`;

function make(source: string) {
  try {
    return Skia.RuntimeEffect.Make(source);
  } catch {
    return null;
  }
}

const EFFECTS = {
  glass: make(GLASS_SOURCE),
  lava: make(LAVA_SOURCE),
  aura: make(AURA_SOURCE),
  ripples: make(RIPPLES_SOURCE),
};

// The lava sample comes from the lively middle of the screen.
const LAVA_SAMPLE = [SURFACE_SIZE.width / 2, SURFACE_SIZE.height * 0.42];

type OrbVisualProps = {
  variant: OrbStyle;
  // Canvas size (square) and where its top-left corner sits on the screen.
  size: number;
  screenX: number;
  screenY: number;
  radius: number;
  // 0 = at rest (no redraws), 1 = fully alive.
  activity: SharedValue<number>;
};

const PERIOD_MS = 4200;

export function OrbVisual({
  variant,
  size,
  screenX,
  screenY,
  radius,
  activity,
}: OrbVisualProps) {
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

  const surface = useDerivedValue<Uniforms>(() => surfaceUniforms());
  const uniforms = useDerivedValue<Uniforms>(() => {
    const wobble = reduceMotion ? 0 : Math.min(1, activity.value);
    const common = {
      center: [size / 2, size / 2],
      radius,
      time: time.value,
      wobble,
      alpha: 1,
    };
    if (variant === 'glass') {
      return { ...common, screenOrigin: [screenX, screenY] };
    }
    if (variant === 'lava') {
      return { ...common, sampleCenter: LAVA_SAMPLE };
    }
    if (variant === 'ripples') {
      return { ...common, size: [size, size] };
    }
    return common;
  });

  const effect = EFFECTS[variant];
  const needsSurface = variant === 'glass' || variant === 'lava';
  if (!effect || (needsSurface && !SURFACE_EFFECT)) {
    return null;
  }

  return (
    <Canvas pointerEvents="none" style={{ width: size, height: size }}>
      <Fill>
        <Shader source={effect} uniforms={uniforms}>
          {needsSurface && SURFACE_EFFECT ? (
            <Shader source={SURFACE_EFFECT} uniforms={surface} />
          ) : null}
        </Shader>
      </Fill>
    </Canvas>
  );
}
