import type { Session } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { supabase } from '@/lib/supabase';

// ── Types ────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  role: 'student' | 'faculty' | 'staff' | 'super_admin';
  state: 'active' | 'archived_read_only';
}

interface AuthContextValue {
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isProfileLoading: boolean;
  profileError: string | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
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

// ── Provider ─────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const requestRef = useRef<{ userId: string; promise: Promise<ProfileResult> } | null>(null);
  const generationRef = useRef(0);

  // ── Supabase profile helpers ──────────────────────────────

  const fetchProfile = useCallback((userId: string): Promise<ProfileResult> => {
    if (requestRef.current?.userId === userId) return requestRef.current.promise;
    const promise = (async (): Promise<ProfileResult> => {
      try {
        const { data, error } = await supabase
          .from('users_account_registry')
          .select('id, email, display_name, role, state')
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

  const loadAuthenticatedProfile = useCallback(async (nextSession: Session): Promise<ProfileResult> => {
    const generation = generationRef.current;
    setIsProfileLoading(true);
    setProfileError(null);
    const result = await fetchProfile(nextSession.user.id);
    if (generation !== generationRef.current) return result;
    if (result.ok) {
      setSession(nextSession);
      setProfile(result.profile);
      setIsProfileLoading(false);
    } else {
      await clearLocalAuth(result.message);
    }
    return result;
  }, [clearLocalAuth, fetchProfile]);

  // Called once after sign-up to create the registry row.
  async function createProfile(
    userId: string,
    email: string,
    displayName: string,
  ): Promise<ProfileResult> {
    const { data, error } = await supabase
      .from('users_account_registry')
      .upsert(
        { id: userId, email, display_name: displayName, role: 'student', state: 'active' },
        { onConflict: 'id', ignoreDuplicates: false },
      )
      .select('id, email, display_name, role, state')
      .single();

    if (error || !data) return { ok: false, message: safeProfileError(error) };
    return { ok: true, profile: data as UserProfile };
  }

  // ── Bootstrap: restore session on app launch ──────────────

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(async ({ data: { session: restoredSession }, error }) => {
      if (!active) return;
      if (error || !restoredSession) {
        setSession(null);
        setProfile(null);
      } else {
        await loadAuthenticatedProfile(restoredSession);
      }
      if (active) setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      if (!nextSession) {
        generationRef.current += 1;
        setSession(null);
        setProfile(null);
        setIsProfileLoading(false);
        return;
      }
      void loadAuthenticatedProfile(nextSession);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadAuthenticatedProfile]);

  // ── Auth actions ─────────────────────────────────────────

  async function signIn(email: string, password: string): Promise<{ error: string | null }> {
    setProfileError(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    if (!data.session) return { error: 'Sign in did not create a valid session. Please try again.' };
    const result = await loadAuthenticatedProfile(data.session);
    return { error: result.ok ? null : result.message };
  }

  async function signUp(
    email: string,
    password: string,
    displayName: string,
  ): Promise<{ error: string | null; needsConfirmation: boolean }> {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message, needsConfirmation: false };

    const needsConfirmation = !data.session;

    if (data.session && data.user) {
      const result = await createProfile(data.user.id, email, displayName);
      if (!result.ok) {
        await clearLocalAuth(result.message);
        return { error: result.message, needsConfirmation: false };
      }
      setSession(data.session);
      setProfile(result.profile);
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

    // On web the Expo Router navigator holds stale render state after
    // session is cleared, so the overlay never surfaces. A full reload
    // is the reliable fix: localStorage token is already gone, so the
    // app boots straight to the login screen.
    if (typeof window !== 'undefined') {
      window.location.reload();
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
