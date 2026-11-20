// The open state of the navigation orb: a soft glass blob made of a core and
// three lobes. Circles are merged with a smooth minimum, the same idea as the
// lava metaballs of the Living Surface, so the joints stay round and viscous.
export const ORB_BLOB_SOURCE = `
uniform float2 size;
uniform float3 c0;
uniform float3 c1;
uniform float3 c2;
uniform float3 c3;
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

  float inside = 1.0 - smoothstep(-0.8, 0.8, d);
  float t = clamp(p.y / size.y, 0.0, 1.0);

  // Frosted dark-violet glass, a touch lighter at the top.
  float3 body = mix(float3(0.17, 0.15, 0.26), float3(0.08, 0.07, 0.12), t);
  float bodyAlpha = 0.86 * inside;

  // Soft light gathering toward the edges (fresnel-like) and a thin rim.
  float inner = smoothstep(-22.0, 0.0, d) * inside;
  float rim = 1.0 - smoothstep(0.0, 1.4, abs(d + 0.9));
  float rimStrength = mix(0.42, 0.12, t);

  float3 col = body * bodyAlpha + float3(1.0) * (inner * 0.07 + rim * rimStrength);
  float a = clamp(bodyAlpha + rim * rimStrength, 0.0, 1.0);

  return half4(col * alpha, a * alpha);
}
`;
