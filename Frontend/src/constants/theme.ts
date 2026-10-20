/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Palette = {
  mist: '#EEF4F1',
  sage: '#C8DDD6',
  aqua: '#0B7D77',
  slate: '#173F3D',
  mint: '#72DED5',
} as const;

export const Colors = {
  light: {
    primary: Palette.aqua,
    primaryPressed: '#096A65',
    text: '#132523',
    textTertiary: '#879590',
    navy: Palette.slate,
    background: '#F5F7F6',
    backgroundElement: 'rgba(255,255,255,0.96)',
    card: 'rgba(255,255,255,0.90)',
    surface: '#FFFFFF',
    surfaceMuted: '#E8F0ED',
    backgroundSelected: 'rgba(11,125,119,0.11)',
    softBlue: 'rgba(11,125,119,0.10)',
    muted: 'rgba(225,234,230,0.88)',
    border: 'rgba(19,62,59,0.11)',
    borderStrong: 'rgba(19,62,59,0.19)',
    textSecondary: '#60706D',
    success: '#167A4A',
    successBg: '#E8F6EF',
    warning: '#A85F08',
    warningBg: '#FFF4DE',
    error: '#C53B31',
    errorBg: '#FCECEA',
  },
  dark: {
    primary: '#5ED1C8',
    primaryPressed: '#8AE2DA',
    text: '#F2F7F5',
    textTertiary: '#829691',
    navy: '#F2F7F5',
    background: '#0C1716',
    backgroundElement: 'rgba(24,40,38,0.96)',
    card: 'rgba(24,40,38,0.90)',
    surface: '#182826',
    surfaceMuted: 'rgba(126,157,151,0.14)',
    backgroundSelected: 'rgba(94,209,200,0.16)',
    softBlue: 'rgba(94,209,200,0.13)',
    muted: 'rgba(126,157,151,0.14)',
    border: 'rgba(211,237,231,0.11)',
    borderStrong: 'rgba(211,237,231,0.20)',
    textSecondary: '#A7B8B4',
    success: '#62D99B',
    successBg: 'rgba(98,217,155,0.14)',
    warning: '#F4BF67',
    warningBg: 'rgba(244,191,103,0.16)',
    error: '#FF8B82',
    errorBg: 'rgba(255,139,130,0.16)',
  },
} as const;

export const BrandColors = {
  primary: Palette.aqua,
  navy: Palette.slate,
  background: '#F5F7F6',
  card: 'rgba(255,255,255,0.90)',
  muted: 'rgba(225,234,230,0.88)',
  textSecondary: '#60706D',
  border: 'rgba(19,62,59,0.11)',
  softBlue: 'rgba(11,125,119,0.10)',
  mist: Palette.mist,
  sage: Palette.sage,
  aqua: Palette.aqua,
  slate: Palette.slate,
  mint: Palette.mint,
  warningBg: '#FFF4DE',
  warningText: '#A85F08',
  successBg: '#E8F6EF',
  success: '#167A4A',
  errorBg: '#FCECEA',
  error: '#C53B31',
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    display: 'system-ui',
    serif: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'sans-serif',
    display: 'sans-serif',
    serif: 'sans-serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-sans)',
    display: 'var(--font-sans)',
    serif: 'var(--font-sans)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const TypeScale = {
  caption: 12,
  body: 14,
  control: 15,
  section: 18,
  title: 26,
  display: 32,
} as const;

export const Shadows = {
  card: {
    shadowColor: '#123936',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  elevated: {
    shadowColor: '#123936',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
} as const;

export const Layout = {
  compactBreakpoint: 720,
  wideBreakpoint: 980,
  contentPadding: Spacing.three,
  contentPaddingWide: Spacing.four,
  minTouchTarget: 44,
} as const;

export const Radius = {
  control: 10,
  card: 14,
  panel: 18,
  pill: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 1440;
