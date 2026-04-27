// src/theme/tokens.ts
export const tokens = {
  // surfaces
  bg: '#000000',
  surface: '#0c0c0e',
  surface2: '#141418',
  surface3: '#1c1c22',

  // borders
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.14)',

  // text
  text: '#f5f5f7',
  textDim: 'rgba(245,245,247,0.6)',
  textFaint: 'rgba(245,245,247,0.36)',

  // accents (RN doesn't support oklch; precomputed sRGB)
  accent1: '#5B8CFF',          // electric blue
  accent2: '#A855F7',          // violet
  accentSoft: 'rgba(91,140,255,0.18)',
  accentGradient: ['#5B8CFF', '#A855F7'] as const,

  danger: '#FF5D5D',
  online: '#22C55E',
} as const;

export const tokensLight: typeof tokens = {
  ...tokens,
  bg: '#FAFAFA',
  surface: '#FFFFFF',
  surface2: '#F4F4F5',
  surface3: '#ECECEF',
  border: 'rgba(0,0,0,0.07)',
  borderStrong: 'rgba(0,0,0,0.12)',
  text: '#0A0A0C',
  textDim: 'rgba(10,10,12,0.6)',
  textFaint: 'rgba(10,10,12,0.36)',
};

export type Theme = typeof tokens;

export const fonts = {
  sans: 'Inter',          // add to ios/android via react-native-asset
  mono: 'JetBrainsMono',
} as const;

export const radii = {
  sm: 8,
  md: 14,
  lg: 18,
  xl: 22,
  pill: 999,
} as const;

export const space = (n: number) => n * 8;
