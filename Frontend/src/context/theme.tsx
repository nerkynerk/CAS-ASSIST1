import 'expo-sqlite/localStorage/install';

import type { ReactNode } from 'react';
import { createContext, use, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

type ThemeContextValue = {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  colors: typeof Colors.light | typeof Colors.dark;
  setPreference: (preference: ThemePreference) => void;
};

const STORAGE_KEY = 'cas-assist.theme-preference';
const ThemePreferenceContext = createContext<ThemeContextValue | null>(null);

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const deviceScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('light');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (isThemePreference(stored)) setPreferenceState(stored);
    } catch {
      // Keep the light default if device storage is unavailable.
    }
  }, []);

  const setPreference = (nextPreference: ThemePreference) => {
    setPreferenceState(nextPreference);
    try {
      localStorage.setItem(STORAGE_KEY, nextPreference);
    } catch {
      // The in-memory selection still applies for the current session.
    }
  };

  const resolvedTheme: ResolvedTheme = preference === 'system'
    ? deviceScheme === 'dark' ? 'dark' : 'light'
    : preference;

  const value = useMemo<ThemeContextValue>(() => ({
    preference,
    resolvedTheme,
    colors: Colors[resolvedTheme],
    setPreference,
  }), [preference, resolvedTheme]);

  return <ThemePreferenceContext value={value}>{children}</ThemePreferenceContext>;
}

export function useAppTheme() {
  const context = use(ThemePreferenceContext);
  if (!context) throw new Error('useAppTheme must be used within AppThemeProvider.');
  return context;
}
