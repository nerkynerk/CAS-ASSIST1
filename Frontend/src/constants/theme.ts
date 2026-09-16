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
} as const;

export const Colors = {
  light: {
    primary: Palette.aqua,
    text: '#132523',
    navy: Palette.slate,
    background: '#F3F6F4',
    backgroundElement: 'rgba(255,255,255,0.84)',
    card: 'rgba(255,255,255,0.84)',
    backgroundSelected: 'rgba(11,125,119,0.11)',
    softBlue: 'rgba(11,125,119,0.10)',
    muted: 'rgba(225,234,230,0.72)',
    border: 'rgba(19,62,59,0.12)',
    textSecondary: '#60706D',
  },
  dark: {
    primary: '#5ED1C8',
    text: '#F2F7F5',
    navy: '#F2F7F5',
    background: '#0C1716',
    backgroundElement: 'rgba(24,40,38,0.86)',
    card: 'rgba(24,40,38,0.86)',
    backgroundSelected: 'rgba(94,209,200,0.16)',
    softBlue: 'rgba(94,209,200,0.13)',
    muted: 'rgba(126,157,151,0.14)',
    border: 'rgba(211,237,231,0.13)',
    textSecondary: '#A7B8B4',
  },
} as const;

export const BrandColors = {
  primary: Palette.aqua,
  navy: Palette.slate,
  background: '#F3F6F4',
  card: 'rgba(255,255,255,0.86)',
  muted: 'rgba(225,234,230,0.72)',
  textSecondary: '#60706D',
  border: 'rgba(19,62,59,0.12)',
  softBlue: 'rgba(11,125,119,0.10)',
  mist: Palette.mist,
  sage: Palette.sage,
  aqua: Palette.aqua,
  slate: Palette.slate,
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
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'sans-serif',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-sans)',
    serif: 'var(--font-serif)',
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

export const Radius = {
  control: 14,
  card: 22,
  panel: 28,
  pill: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 1120;
