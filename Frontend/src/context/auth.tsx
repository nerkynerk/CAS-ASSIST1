import type { Session } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { supabase } from '@/lib/supabase';

// ── Types ────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  student_number: string | null;
  role: 'student' | 'faculty' | 'staff' | 'super_admin';
  state: 'active' | 'archived_read_only';
}

export type LoginCategory = 'student' | 'institutional';

interface AuthContextValue {
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isProfileLoading: boolean;
  profileError: string | null;
  signIn: (email: string, password: string, category?: LoginCategory) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
    studentNumber: string,
  ) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
}

// ── Context ──────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

type ProfileResult =
  | { ok: true; profile: UserProfile }
  | { ok: false; message: string };

function safeProfileError(error: { code?: string; message?: string } | null): string {
  const message = error?.message?.toLowerCase() ?? '';
  if (error?.code === 'PGRST116') {
    return 'Your account is signed in, but no CAS Assist profile was found. Please contact an administrator.';
  }
  if (error?.code === '42501' || message.includes('row-level security') || message.includes('permission denied')) {
    return 'CAS Assist could not access your account profile. Please contact an administrator.';
  }
  return 'We could not load your CAS Assist profile. Check your connection and try signing in again.';
}

function categoryAllowsRole(category: LoginCategory, role: UserProfile['role']): boolean {
  return category === 'student'
    ? role === 'student'
    : role === 'faculty' || role === 'staff' || role === 'super_admin';
}

const CATEGORY_MISMATCH_MESSAGE =
  'This account does not match the selected sign-in category. Choose the other account type or use a different account.';

// ── Provider ─────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const requestRef = useRef<{ userId: string; promise: Promise<ProfileResult> } | null>(null);
  const generationRef = useRef(0);
  const pendingLoginRef = useRef<{ userId: string | null; category: LoginCategory } | null>(null);

  // ── Supabase profile helpers ──────────────────────────────

  const fetchProfile = useCallback((userId: string): Promise<ProfileResult> => {
    if (requestRef.current?.userId === userId) return requestRef.current.promise;
    const promise = (async (): Promise<ProfileResult> => {
      try {
        const { data, error } = await supabase
          .from('users_account_registry')
          .select('id, email, display_name, student_number, role, state')
          .eq('id', userId)
          .maybeSingle();
        if (error) return { ok: false, message: safeProfileError(error) };
        if (!data) {
          return { ok: false, message: 'Your account is signed in, but no CAS Assist profile was found. Please contact an administrator.' };
        }
        return { ok: true, profile: data as UserProfile };
      } catch {
        return { ok: false, message: 'We could not load your CAS Assist profile. Check your connection and try signing in again.' };
      }
    })().finally(() => {
      if (requestRef.current?.promise === promise) requestRef.current = null;
    });
    requestRef.current = { userId, promise };
    return promise;
  }, []);

  const clearLocalAuth = useCallback(async (message?: string) => {
    generationRef.current += 1;
    pendingLoginRef.current = null;
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // State is still cleared locally below.
    }
    setSession(null);
    setProfile(null);
    setIsProfileLoading(false);
    if (message) setProfileError(message);
  }, []);

  const loadAuthenticatedProfile = useCallback(async (
    nextSession: Session,
    expectedCategory?: LoginCategory,
  ): Promise<ProfileResult> => {
    const generation = generationRef.current;
    setIsProfileLoading(true);
    setProfileError(null);
    const result = await fetchProfile(nextSession.user.id);
    if (generation !== generationRef.current) return result;
    if (result.ok) {
      if (expectedCategory && !categoryAllowsRole(expectedCategory, result.profile.role)) {
        await clearLocalAuth(CATEGORY_MISMATCH_MESSAGE);
        return { ok: false, message: CATEGORY_MISMATCH_MESSAGE };
      }
      setSession(nextSession);
      setProfile(result.profile);
      setIsProfileLoading(false);
    } else {
      await clearLocalAuth(result.message);
    }
    return result;
  }, [clearLocalAuth, fetchProfile]);

  // ── Bootstrap: restore session on app launch ──────────────

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession()
      .then(async ({ data: { session: restoredSession }, error }) => {
        if (!active) return;
        if (error || !restoredSession) {
          setSession(null);
          setProfile(null);
        } else {
          await loadAuthenticatedProfile(restoredSession);
        }
      })
      .catch(() => {
        if (!active) return;
        setSession(null);
        setProfile(null);
        setProfileError('CAS Assist could not restore your session. Check your connection and sign in again.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      if (!nextSession) {
        generationRef.current += 1;
        pendingLoginRef.current = null;
        setSession(null);
        setProfile(null);
        setIsProfileLoading(false);
        return;
      }
      const pendingLogin = pendingLoginRef.current;
      const expectedCategory = pendingLogin
        && (!pendingLogin.userId || pendingLogin.userId === nextSession.user.id)
        ? pendingLogin.category
        : undefined;
      void loadAuthenticatedProfile(nextSession, expectedCategory);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadAuthenticatedProfile]);

  // ── Auth actions ─────────────────────────────────────────

  async function signIn(
    email: string,
    password: string,
    category?: LoginCategory,
  ): Promise<{ error: string | null }> {
    setProfileError(null);
    pendingLoginRef.current = category ? { userId: null, category } : null;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      pendingLoginRef.current = null;
      return { error: error.message };
    }
    if (!data.session) {
      pendingLoginRef.current = null;
      return { error: 'Sign in did not create a valid session. Please try again.' };
    }
    if (category) pendingLoginRef.current = { userId: data.session.user.id, category };
    const result = await loadAuthenticatedProfile(data.session, category);
    return { error: result.ok ? null : result.message };
  }

  async function signUp(
    email: string,
    password: string,
    displayName: string,
    studentNumber: string,
  ): Promise<{ error: string | null; needsConfirmation: boolean }> {
    pendingLoginRef.current = null;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName, student_number: studentNumber } },
    });
    if (error) return { error: error.message, needsConfirmation: false };

    const needsConfirmation = !data.session;

    if (data.session && data.user) {
      const result = await loadAuthenticatedProfile(data.session);
      if (!result.ok) {
        return { error: result.message, needsConfirmation: false };
      }
    }

    return { error: null, needsConfirmation };
  }

  async function signOut(): Promise<void> {
    try {
      await clearLocalAuth();
    } catch {
      // ignore — we still clear state below
    }
    setSession(null);
    setProfile(null);

    // Clear both the document and router URL. Reloading the current URL
    // (for example /profile) would otherwise make the next user inherit it.
    if (typeof window !== 'undefined') {
      window.location.replace('/');
    }
  }

  return (
    <AuthContext.Provider
      value={{ session, profile, isLoading, isProfileLoading, profileError, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
