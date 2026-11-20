// Frosted glass "bubbles" that flow into each other: up to six circles merged
// with a smooth minimum, the same idea as the lava metaballs of the Living
// Surface. Used by the orb menu and the collections wheel.
//
// Each circle is float3(x, y, radius) in canvas points. Unused slots use
// HIDDEN_CIRCLE.
export const GLASS_BLOB_SOURCE = `
uniform float2 size;
uniform float3 c0;
uniform float3 c1;
uniform float3 c2;
uniform float3 c3;
uniform float3 c4;
uniform float3 c5;
uniform float smoothness;
uniform float alpha;

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

float circle(float2 p, float3 c) {
  return length(p - c.xy) - c.z;
}

half4 main(float2 p) {
  float d = circle(p, c0);
  d = smin(d, circle(p, c1), smoothness);
  d = smin(d, circle(p, c2), smoothness);
  d = smin(d, circle(p, c3), smoothness);
  d = smin(d, circle(p, c4), smoothness);
  d = smin(d, circle(p, c5), smoothness);

  float inside = 1.0 - smoothstep(-0.8, 0.8, d);
  float t = clamp(p.y / size.y, 0.0, 1.0);

  // Translucent dark-violet glass, a touch lighter at the top.
  float3 body = mix(float3(0.19, 0.17, 0.29), float3(0.09, 0.08, 0.14), t);
  float bodyAlpha = 0.62 * inside;

  // Light gathering toward the edges (fresnel-like) and a thin bright rim.
  float inner = smoothstep(-20.0, 0.0, d) * inside;
  float rim = 1.0 - smoothstep(0.0, 1.4, abs(d + 0.9));
  float rimStrength = mix(0.5, 0.16, t);

  float3 col = body * bodyAlpha + float3(1.0) * (inner * 0.1 + rim * rimStrength);
  float a = clamp(bodyAlpha + inner * 0.1 + rim * rimStrength, 0.0, 1.0);

  return half4(col * alpha, a * alpha);
}
`;

export const HIDDEN_CIRCLE = [-10000, -10000, 1] as const;
