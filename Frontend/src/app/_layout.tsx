import { DarkTheme, DefaultTheme, ThemeProvider, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import AuthenticatedErrorBoundary from '@/components/authenticated-error-boundary';
import LoginScreen from '@/components/auth/login-screen';
import RegisterScreen from '@/components/auth/register-screen';
import { Academic, FloatingChatButton } from '@/components/ui/academic-ui';
import { AuthProvider, useAuth } from '@/context/auth';
import { AppThemeProvider, useAppTheme } from '@/context/theme';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { publicConfigError } from '@/lib/config';

type AuthView = 'login' | 'register';

const styles = StyleSheet.create({
  // Must be above AnimatedSplashOverlay (zIndex 1000) on native,
  // and above everything on web.
  authContainer: { flex: 1, backgroundColor: Academic.background },
  configTitle: { color: Academic.navy, fontSize: 22, fontWeight: '900', textAlign: 'center' },
  configMessage: { color: Academic.textSecondary, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  configButton: {
    minWidth: 180,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: Academic.primary,
  },
  configButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  loading: {
    zIndex: 1001,
    elevation: 1001,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.background,
  },
});

// ── Auth overlay ──────────────────────────────────────────────
// AppTabs stays mounted at all times so the Expo Router navigator
// is never torn down. When there is no session we cover it with a
// full-screen overlay. Signing out makes session null → overlay
// appears. Signing in makes session non-null → overlay disappears.

function PushSetup() {
  const { profile } = useAuth();
  usePushNotifications(profile?.id);
  return null;
}

function AuthenticatedWorkspace({
  userId,
  onSignOut,
}: {
  userId: string;
  onSignOut: () => Promise<void>;
}) {
  const router = useRouter();
  const resetUserRef = useRef<string | null>(null);

  useEffect(() => {
    // A new authenticated identity must never inherit the previous user's
    // active tab or nested route (for example, /profile).
    if (resetUserRef.current === userId) return;
    resetUserRef.current = userId;
    router.replace('/');
  }, [router, userId]);

  return (
    <AuthenticatedErrorBoundary onSignOut={onSignOut}>
      <AppTabs key={userId} />
      <FloatingChatButton />
      <PushSetup />
    </AuthenticatedErrorBoundary>
  );
}

function AppGate() {
  const { session, profile, isLoading, isProfileLoading, signOut } = useAuth();
  const [authView, setAuthView] = useState<AuthView>('login');

  if (publicConfigError) {
    return (
      <View style={[styles.authContainer, styles.loading]}>
        <Text style={styles.configTitle}>CAS Assist needs configuration</Text>
        <Text style={styles.configMessage}>{publicConfigError}</Text>
        <Pressable style={styles.configButton} onPress={() => {
          if (typeof window !== 'undefined') window.location.reload();
        }}>
          <Text style={styles.configButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  // While restoring the session from storage, show nothing —
  // the AnimatedSplashOverlay above handles the loading moment.
  if (isLoading || isProfileLoading) {
    return (
      <View style={[StyleSheet.absoluteFill, styles.loading]}>
        <ActivityIndicator size="large" color={Academic.primary} />
      </View>
    );
  }

  if (session && profile) {
    return <AuthenticatedWorkspace userId={session.user.id} onSignOut={signOut} />;
  }

  return (
    <View style={styles.authContainer}>
      {authView === 'login' ? (
        <LoginScreen onNavigateToRegister={() => setAuthView('register')} />
      ) : (
        <RegisterScreen onNavigateToLogin={() => setAuthView('login')} />
      )}
    </View>
  );
}

// ── Root layout ───────────────────────────────────────────────

function ThemedApplication() {
  const { colors, resolvedTheme } = useAppTheme();
  const navigationTheme = useMemo(() => {
    const base = resolvedTheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.backgroundElement,
        text: colors.text,
        border: colors.border,
      },
    };
  }, [colors, resolvedTheme]);

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
      <AppGate />
      {Platform.OS !== 'web' && <AnimatedSplashOverlay />}
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <AuthProvider>
        <ThemedApplication />
      </AuthProvider>
    </AppThemeProvider>
  );
}
