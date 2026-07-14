export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const colors = {
  background: '#F6F6F3',
  surface: '#FFFFFF',
  textPrimary: '#171716',
  textSecondary: '#6F6F6A',
  border: '#E3E3DE',
  accent: '#292927',
  accentDisabled: '#C9C9C3',
  onAccent: '#FFFFFF',
  success: '#356B48',
  successSurface: '#E4F0E7',
  error: '#A33A32',
  errorSurface: '#F6E5E2',
} as const;

export const typography = {
  appName: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 38,
    lineHeight: 46,
    fontWeight: '500',
    letterSpacing: -0.6,
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
  },
  button: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
} as const;

export const radius = {
  md: 16,
  lg: 20,
  full: 999,
} as const;
