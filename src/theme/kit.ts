// UI kit v0.1 tokens, mirrored from the Figma file (Foundations page, variables
// and local styles). DRAFT: the kit is not reviewed yet, so nothing in the app
// reads these values for now. Existing screens keep using ./tokens.
// Figma: https://www.figma.com/design/IsaCDIIck0fzfbpouhvexw/arna

type Rgba = readonly [number, number, number, number];

export const primitives = {
  ink: {
    1000: '#07060B',
    950: '#0C0B12',
    900: '#13121B',
    850: '#1A1924',
    800: '#22212E',
    700: '#2E2D3C',
    600: '#45445A',
    500: '#6A6980',
    400: '#9594AB',
    300: '#BDBCCF',
    200: '#DCDBE8',
    100: '#EEEDF5',
    50: '#F7F6FB',
  },
  violet: { 300: '#C9B8FF', 400: '#A88BFF', 500: '#8A63FF', 600: '#6E45F0', 700: '#5531C9' },
  blue: { 300: '#9CC3FF', 400: '#6FA3FF', 500: '#3F7BFF', 600: '#2A5BE0' },
  peach: { 300: '#FFD0B5', 400: '#FFAA85', 500: '#FF8A5C' },
  rose: { 300: '#FFB8D2', 400: '#FF8DB5', 500: '#F2659A' },
  lime: { 300: '#E4FFA0', 400: '#D2F56B', 500: '#B8E03A' },
  amber: { 300: '#FFE89A', 400: '#FFD66B' },
  mint: { 300: '#A8F0DE', 400: '#6FE3C8' },
  white: {
    a4: 'rgba(255, 255, 255, 0.04)',
    a8: 'rgba(255, 255, 255, 0.08)',
    a12: 'rgba(255, 255, 255, 0.12)',
    a16: 'rgba(255, 255, 255, 0.16)',
    a24: 'rgba(255, 255, 255, 0.24)',
    a40: 'rgba(255, 255, 255, 0.40)',
    a64: 'rgba(255, 255, 255, 0.64)',
    solid: '#FFFFFF',
  },
  black: { a40: 'rgba(0, 0, 0, 0.40)', a64: 'rgba(0, 0, 0, 0.64)' },
} as const;

const p = primitives;

// Semantic colors (Figma collection "Color", mode Dark).
export const kitColors = {
  bg: { base: p.ink[1000], raised: p.ink[900], elevated: p.ink[850], overlay: p.black.a64 },
  surface: {
    glass: p.white.a8,
    glassStrong: p.white.a12,
    glassPressed: p.white.a16,
    inverse: p.ink[50],
  },
  text: {
    primary: p.ink[50],
    secondary: p.ink[300],
    tertiary: p.ink[500],
    disabled: p.ink[600],
    inverse: p.ink[1000],
    accent: p.violet[300],
  },
  border: { subtle: p.white.a8, default: p.white.a12, strong: p.white.a24, focus: p.violet[400] },
  accent: {
    primary: p.violet[500],
    primaryPressed: p.violet[600],
    onPrimary: p.white.solid,
    soft: p.violet[300],
    lime: p.lime[400],
    onLime: p.ink[1000],
  },
  // Color of each thought type.
  thought: {
    task: p.blue[400],
    shopping: p.lime[400],
    idea: p.amber[400],
    project: p.violet[400],
    note: p.ink[300],
    quote: p.rose[400],
    reminder: p.peach[400],
  },
  status: { success: p.mint[400], warning: p.amber[400], error: p.rose[500], info: p.blue[400] },
} as const;

export const kitSpace = {
  0: 0,
  '2xs': 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
  '7xl': 80,
} as const;

export const kitLayout = {
  screenX: kitSpace.xl,
  screenTop: kitSpace.lg,
  sectionGap: kitSpace['3xl'],
  stackGap: kitSpace.md,
  cardPadding: kitSpace.xl,
  controlPaddingX: kitSpace.xl,
  inlineGap: kitSpace.sm,
} as const;

export const kitRadius = {
  none: 0,
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 40,
  full: 999,
} as const;

// Font families as they will be registered with expo-font. Fonts are NOT loaded
// yet; until then these names fall back to the system font.
export const kitFonts = {
  brand: 'Outfit_600SemiBold',
  light: 'Geologica_300Light',
  regular: 'Geologica_400Regular',
  medium: 'Geologica_500Medium',
  semiBold: 'Geologica_600SemiBold',
} as const;

// letterSpacing in Figma is a percentage of the font size; here it is in points.
function textStyle(
  fontFamily: string | undefined,
  fontSize: number,
  lineHeight: number,
  trackingPercent = 0,
  uppercase = false,
) {
  return {
    ...(fontFamily ? { fontFamily } : null),
    fontSize,
    lineHeight,
    letterSpacing: Math.round(fontSize * trackingPercent) / 100,
    ...(uppercase ? { textTransform: 'uppercase' as const } : null),
  };
}

export const kitType = {
  brandLogo: textStyle(kitFonts.brand, 28, 34, -2),
  displayXl: textStyle(kitFonts.light, 44, 50, -3),
  displayL: textStyle(kitFonts.light, 34, 40, -2),
  displayM: textStyle(kitFonts.light, 26, 32, -1),
  titleL: textStyle(kitFonts.semiBold, 28, 34, -2),
  titleM: textStyle(kitFonts.semiBold, 22, 28, -1),
  titleS: textStyle(kitFonts.medium, 18, 24, -1),
  bodyL: textStyle(kitFonts.regular, 17, 24),
  bodyM: textStyle(kitFonts.regular, 15, 22),
  bodyS: textStyle(kitFonts.regular, 13, 18),
  labelL: textStyle(kitFonts.medium, 17, 22),
  labelM: textStyle(kitFonts.medium, 15, 20),
  labelS: textStyle(kitFonts.medium, 13, 16),
  overlineM: textStyle(kitFonts.medium, 12, 16, 6, true),
  overlineS: textStyle(kitFonts.medium, 10, 14, 8, true),
  // Text fields use the platform font (Roboto on Android, SF Pro on iOS).
  fieldInput: textStyle(undefined, 20, 28),
} as const;

// Gradient stops as [position, [r, g, b, a]] with a in 0..1.
type GradientStops = readonly (readonly [number, Rgba])[];

export const kitGradients = {
  dusk: [[0, [110, 69, 240, 1]], [0.45, [42, 91, 224, 1]], [1, [7, 6, 11, 1]]],
  aurora: [[0, [255, 170, 133, 1]], [0.35, [255, 141, 181, 1]], [0.7, [138, 99, 255, 1]], [1, [63, 123, 255, 1]]],
  holo: [[0, [228, 255, 160, 1]], [0.25, [168, 240, 222, 1]], [0.5, [156, 195, 255, 1]], [0.75, [201, 184, 255, 1]], [1, [255, 184, 210, 1]]],
  ember: [[0, [7, 6, 11, 1]], [0.45, [85, 49, 201, 1]], [0.8, [255, 138, 92, 1]], [1, [255, 232, 154, 1]]],
  // Radial.
  orb: [[0, [255, 232, 154, 1]], [0.22, [255, 170, 133, 1]], [0.48, [255, 141, 181, 1]], [0.75, [138, 99, 255, 1]], [1, [85, 49, 201, 1]]],
  // Radial.
  orbCool: [[0, [228, 255, 160, 1]], [0.3, [168, 240, 222, 1]], [0.6, [111, 163, 255, 1]], [1, [42, 91, 224, 1]]],
  sheen: [[0, [255, 255, 255, 0.18]], [1, [255, 255, 255, 0.03]]],
  edge: [[0, [255, 255, 255, 0.4]], [0.5, [255, 255, 255, 0.06]], [1, [255, 255, 255, 0.2]]],
  scrimBottom: [[0, [7, 6, 11, 0]], [1, [7, 6, 11, 1]]],
  limePop: [[0, [228, 255, 160, 1]], [1, [111, 227, 200, 1]]],
} as const satisfies Record<string, GradientStops>;

export const kitEffects = {
  glowViolet: { color: 'rgba(138, 99, 255, 0.55)', blur: 32, offsetY: 8 },
  glowPeach: { color: 'rgba(255, 138, 92, 0.5)', blur: 40, offsetY: 8 },
  glowLime: { color: 'rgba(210, 245, 107, 0.45)', blur: 24, offsetY: 4 },
  glassDefault: { backdropBlur: 24, innerHighlight: 'rgba(255, 255, 255, 0.14)' },
  glassStrong: { backdropBlur: 48, innerHighlight: 'rgba(255, 255, 255, 0.2)' },
  shadowFloat: { color: 'rgba(0, 0, 0, 0.5)', blur: 40, offsetY: 16, spread: -8 },
} as const;
