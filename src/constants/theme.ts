// Dark-first design tokens. Mirrors V1's spirit but stripped to what V2 needs today.
// Keep this in sync with tailwind.config.js so NativeWind classes and JS-side
// consumers (StatusBar, native nav themes) agree.

export const Colors = {
  bg: '#000000',
  bgElevated: '#0f1011',
  bgSurface: '#16181a',
  bgSelected: '#1f2226',
  fg: '#ffffff',
  fgMuted: '#b0b4ba',
  fgSubtle: '#60646c',
  accent: '#7c8cf8',
  accentMuted: '#3a4470',
  border: '#22252a',
  borderMuted: '#16181a',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;
