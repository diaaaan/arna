// Sections of the orb menu in the same "ripples" style as the orb: each section
// is a small set of rings on the surface around its icon, and a faint line of
// light along the arc links them. The section under the finger grows and its
// rings run faster and brighter.
export const RIPPLE_NODES_SOURCE = `
uniform float3 n0;
uniform float3 n1;
uniform float3 n2;
uniform float3 weights;
uniform float time;
uniform float alpha;
uniform float2 arcCenter;
uniform float3 arc;
uniform float arcAlpha;

float node(float2 p, float3 n, float w) {
  float len = length(p - n.xy);
  float R = n.z;
  float fade = 1.0 - smoothstep(R * 0.5, R, len);
  float phase = len * 0.34 - time * 6.2831853 * (1.0 + 1.5 * w);
  float ring = pow(0.5 + 0.5 * sin(phase), 8.0);
  float rings = ring * fade * (0.2 + 0.4 * w);
  // A faint disc so the section reads as a place to land on.
  float disc = (1.0 - smoothstep(R * 0.32, R * 0.5, len)) * (0.07 + 0.08 * w);
  return rings + disc;
}

half4 main(float2 p) {
  float a = node(p, n0, weights.x) + node(p, n1, weights.y) + node(p, n2, weights.z);

  // The link: a thin line of light along the arc between the outer sections.
  float2 v = p - arcCenter;
  float ang = atan(v.y, v.x);
  if (ang >= arc.y && ang <= arc.z) {
    float line = 1.0 - smoothstep(0.0, 1.3, abs(length(v) - arc.x));
    a += line * 0.3 * arcAlpha;
  }

  a = clamp(a, 0.0, 1.0) * alpha;
  return half4(float3(0.92, 0.9, 1.0) * a, a);
}
`;
