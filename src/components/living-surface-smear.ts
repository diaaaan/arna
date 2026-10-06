// Variant D of the Living Surface: viscous colour smears, like oil paint or
// marbled ink. A domain-warped field is mapped straight to a colour ramp, so
// the depth comes from colour, not from relief or lighting: no bulges, no
// dark gaps. The loop closes exactly because time only enters through
// orbits with integer harmonics.
export const SMEAR_SOURCE = `
uniform float2 resolution;
uniform float motionPhase;
uniform float3 backgroundColor;
uniform float3 s0;
uniform float3 s1;
uniform float3 s2;
uniform float3 s3;
uniform float3 s4;
uniform float3 s5;
uniform float3 s6;
uniform float3 s7;
uniform float noiseScale;
uniform float warpStrength;
uniform float2 orbitRadius;
uniform float grainAmount;
uniform float glowAmount;
uniform float cycleAmount;
uniform float textureAmount;
uniform float tonePower;
uniform float mode;
uniform float slowPhase;

// Lattice-free smooth noise (sines only, no hashing).
float smoothNoise(float2 p) {
  float a = sin(p.x * 1.07 + sin(p.y * 0.83 + 1.7) * 1.1);
  float b = sin(p.y * 1.21 + sin(p.x * 0.91 + 0.3) * 1.3);
  float c = sin((p.x + p.y) * 0.73 + sin((p.x - p.y) * 0.57 + 2.1) * 0.9);
  return 0.5 + 0.2333 * (a + b + c);
}

float fbm(float2 p) {
  float sum = 0.0;
  float amp = 0.5;
  float2x2 rot = float2x2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 3; i++) {
    sum += amp * smoothNoise(p);
    p = rot * p * 1.97 + float2(1.7, 0.9);
    amp *= 0.5;
  }
  return sum;
}

float2 orbit(float angle, float harmonic) {
  return float2(cos(angle * harmonic), sin(angle * harmonic));
}

// Two-level domain warp. Space is stretched along y so smears run vertically.
float field(float2 p, float a, float seed) {
  float2 q = p * noiseScale + float2(seed * 3.1, seed * 1.7);
  float2 w1 = float2(
    fbm(q + orbitRadius.x * orbit(a + seed, 1.0)),
    fbm(q + float2(5.2, 1.3) + orbitRadius.x * orbit(a + 2.1 + seed, 1.0))
  );
  float2 base = q + warpStrength * w1;
  float2 w2 = float2(
    fbm(base + float2(1.7, 9.2) + orbitRadius.y * orbit(0.7 - a, 2.0)),
    fbm(base + float2(8.3, 2.8) + orbitRadius.y * orbit(3.9 - a, 2.0))
  );
  return fbm(q + (warpStrength + 0.2) * w2);
}

float3 ramp(float t) {
  float x = clamp(t, 0.0, 1.0) * 7.0;
  float3 c = mix(s0, s1, smoothstep(0.0, 1.0, x));
  c = mix(c, s2, smoothstep(1.0, 2.0, x));
  c = mix(c, s3, smoothstep(2.0, 3.0, x));
  c = mix(c, s4, smoothstep(3.0, 4.0, x));
  c = mix(c, s5, smoothstep(4.0, 5.0, x));
  c = mix(c, s6, smoothstep(5.0, 6.0, x));
  c = mix(c, s7, smoothstep(6.0, 7.0, x));
  return c;
}

// Lava-lamp masses: six big blobs plus five small independent ones. They rise
// and sink well past the top and bottom edges (and drift past the sides), so
// elements leave the screen and come back. They run on their own slow clock
// (slowPhase) and each mixes two integer harmonics, so masses gather and part
// differently on every pass while the clock still closes its own loop.
int imod(int a, int m) {
  return a - (a / m) * m;
}

float lavaField(float2 p, float b) {
  float f = 0.0;
  for (int i = 0; i < 11; i++) {
    float fi = float(i);
    bool small = i >= 6;
    float k1 = 1.0 + float(imod(i, 3));
    float k2 = 2.0 + float(imod(i * 2 + 1, 4));
    float k3 = 1.0 + float(imod(i + 1, 3));
    float x0 = 0.19 * sin(fi * 2.399 + 0.7);
    float r0 = small
      ? 0.040 + 0.022 * (0.5 + 0.5 * sin(fi * 2.3))
      : 0.095 + 0.040 * (0.5 + 0.5 * sin(fi * 1.9));
    float swayX = small ? 0.16 : 0.07;
    float ampY = small ? 0.60 : 0.44;
    float2 c = float2(
      x0 + swayX * sin(b * k3 + fi * 2.1),
      0.45 + ampY * sin(b * k1 + fi * 1.7) + 0.14 * sin(b * k2 + fi * 4.3)
    );
    float2 d = p - c;
    d.y *= small ? 0.8 : 0.62;
    float r = r0 * (1.0 + 0.18 * sin(b * (k1 + 1.0) + fi * 1.3));
    f += exp(-dot(d, d) / (r * r));
  }
  return f;
}

half4 main(float2 position) {
  float2 uv = position / resolution;
  float aspect = resolution.x / resolution.y;
  float a = motionPhase * 6.28318530718;
  float2 p = float2((uv.x - 0.5) * aspect * 1.1, uv.y * 0.9);

  float h = field(p, a, 0.0);
  float v0 = field(p * 0.8, a, 4.0);
  float u = clamp((h - 0.24) / 0.46, 0.0, 1.0);

  // Colours travel: the ramp is cyclic and advances by whole cycles per loop,
  // so every region slowly passes through the palette (shimmer), and the
  // loop still closes because the winding number is an integer.
  float x = u * 0.85 + 0.25 * (v0 - 0.5) + cycleAmount * motionPhase;
  float t = 0.5 - 0.5 * cos(6.28318530718 * x);

  // Mode 1: lava-lamp masses fused with the smear (same palette and light).
  if (mode > 0.5 && mode < 1.5) {
    float f = lavaField(p, slowPhase * 6.28318530718);
    float body = smoothstep(0.30, 1.15, f);
    t = clamp(0.42 * t + 0.54 * pow(body, 0.9) + 0.14 * smoothstep(1.6, 2.8, f), 0.0, 1.0);
  }

  t = pow(t, tonePower);
  float3 col = ramp(t);

  // Second, independent field modulates brightness: soft light and shade
  // inside the paint, no relief.
  float v = v0;
  float vb = smoothstep(0.25, 0.75, v);
  col *= 0.58 + 0.52 * vb;

  // Glow: broad luminous haze where the second field peaks, tinted by the
  // local colour toward white, plus a halo on the brightest crests.
  float haze = smoothstep(0.55, 0.92, v);
  col += mix(col, float3(1.0), 0.45) * haze * glowAmount;
  float crest = smoothstep(0.72, 1.0, t);
  col += col * crest * glowAmount * 0.5;

  // Paint texture: fine streaks that follow the vertical smear direction.
  float streak = smoothNoise(position * float2(0.55, 0.12) + float2(a * 0.0, 3.0));
  float fine = smoothNoise(position * 1.35 + float2(7.0, 2.0));
  col *= 1.0 + textureAmount * ((streak - 0.5) * 0.7 + (fine - 0.5) * 0.9);

  // Keep the lower screen quieter, but never dead black.
  float lower = smoothstep(0.55, 1.0, uv.y);
  col = mix(col, mix(backgroundColor, col, 0.35), lower);

  // Fine static grain.
  float g = fract(sin(dot(position, float2(12.9898, 78.233))) * 43758.5453);
  col += (g - 0.5) * grainAmount;

  return half4(clamp(col, 0.0, 1.0), 1.0);
}
`;
