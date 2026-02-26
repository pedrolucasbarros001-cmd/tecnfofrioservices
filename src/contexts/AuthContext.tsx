import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { queryClient } from '@/lib/queryClient';
import type { AppRole, Profile } from '@/types/database';

/* ────────────── Types ────────────── */

interface SignInResult {
  error: Error | null;
  role?: AppRole | null;
  redirectPath?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/* ────────────── Helpers ────────────── */

function clearSupabaseLocalStorage() {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('sb-')) keysToRemove.push(key);
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
}

let reqCounter = 0;
function rid() { return `R${++reqCounter}`; }

function ts() {
  return new Date().toISOString().slice(11, 23);
}

function isServerError(error: { message?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  return msg.includes('database error') ||
    msg.includes('timeout') ||
    msg.includes('context canceled') ||
    msg.includes('context deadline') ||
    msg.includes('500') ||
    msg.includes('504') ||
    msg.includes('load failed') ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror');
}

/** Race a promise against a timeout. Returns the promise result or throws on timeout. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label}_TIMEOUT`)), ms)
    ),
  ]);
}

/* ────────────── Provider ────────────── */

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const lastUserIdRef = useRef<string | null>(null);

  // Single-flight hydration per userId
  const hydrationPromiseRef = useRef<{ userId: string; promise: Promise<{ profile: Profile | null; role: AppRole | null; networkError: boolean }> } | null>(null);

  // Selective suppression: only suppress SIGNED_OUT during signIn cleanup
  const suppressSignedOutRef = useRef(false);

  // Guard to prevent signIn re-entrance
  const signInActiveRef = useRef(false);
  const signInPromiseRef = useRef<Promise<SignInResult> | null>(null);

  /**
   * Fetch profile + role in parallel with single-flight dedup.
   */
  function fetchUserData(userId: string) {
    if (hydrationPromiseRef.current?.userId === userId) {
      console.log(`[Auth ${ts()}] Reusing in-flight hydration for ${userId.slice(0, 8)}`);
      return hydrationPromiseRef.current.promise;
    }

    console.log(`[Auth ${ts()}] Starting hydration fetch for ${userId.slice(0, 8)}`);

    const promise = (async () => {
      const [profileResult, roleResult] = await Promise.allSettled([
        supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', userId).order('created_at', { ascending: true }).limit(1).maybeSingle(),
      ]);

      let profileData: Profile | null = null;
      let userRole: AppRole | null = null;
      let networkError = false;

      if (profileResult.status === 'fulfilled') {
        if (profileResult.value.error) {
          console.error('[Auth] Profile query error:', profileResult.value.error);
          networkError = true;
        } else {
          profileData = profileResult.value.data as Profile | null;
        }
      } else {
        console.error('[Auth] Profile fetch rejected:', profileResult.reason);
        networkError = true;
      }

      if (roleResult.status === 'fulfilled') {
        if (roleResult.value.error) {
          console.error('[Auth] Role query error:', roleResult.value.error);
          networkError = true;
        } else {
          userRole = (roleResult.value.data?.role as AppRole) ?? null;
        }
      } else {
        console.error('[Auth] Role fetch rejected:', roleResult.reason);
        networkError = true;
      }

      // Retry role once if null without network error (trigger may be slow)
      if (!userRole && !networkError) {
        await new Promise((r) => setTimeout(r, 500));
        try {
          const retryResult = await supabase
            .from('user_roles').select('role').eq('user_id', userId)
            .order('created_at', { ascending: true }).limit(1).maybeSingle();
          if (!retryResult.error) {
            userRole = (retryResult.data?.role as AppRole) ?? null;
          }
        } catch (e) {
          console.warn('[Auth] Role retry failed:', e);
        }
      }

      return { profile: profileData, role: userRole, networkError };
    })();

    hydrationPromiseRef.current = { userId, promise };
    promise.finally(() => {
      if (hydrationPromiseRef.current?.userId === userId) {
        hydrationPromiseRef.current = null;
      }
    });

    return promise;
  }

  /**
   * Apply session + user data to React state.
   */
  async function hydrateSession(nextSession: Session | null) {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);

    if (!nextSession?.user) {
      setProfile(null);
      setRole(null);
      lastUserIdRef.current = null;
      setLoading(false);
      return { profile: null, role: null };
    }

    // Detect user switch — clear stale cache
    if (lastUserIdRef.current && lastUserIdRef.current !== nextSession.user.id) {
      console.log('[Auth] User switch detected, clearing cache');
      queryClient.clear();
    }

    lastUserIdRef.current = nextSession.user.id;
    setLoading(true);

    const result = await fetchUserData(nextSession.user.id);
    setProfile(result.profile);
    setRole(result.role);
    setLoading(false);
    return result;
  }

  /* ────────── Auth state listener ────────── */

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, nextSession) => {
        console.log(`[Auth ${ts()}] onAuthStateChange: ${event}`);

        // Suppress SIGNED_OUT from the cleanup inside signIn
        if (event === 'SIGNED_OUT' && suppressSignedOutRef.current) {
          console.log('[Auth] Suppressing SIGNED_OUT (signIn cleanup)');
          return;
        }

        // If signIn is active and we get SIGNED_IN/INITIAL_SESSION, skip —
        // signIn will handle state commits itself to avoid double-hydration races
        if (signInActiveRef.current && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
          console.log(`[Auth] signIn active, skipping listener hydration for ${event}`);
          return;
        }

        try {
          await hydrateSession(nextSession);
        } catch (err) {
          console.error('[Auth] hydrateSession failed:', err);
          setLoading(false);
        }
      }
    );

    // postMessage bridge for print pages
    const handleSessionRequest = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'REQUEST_SUPABASE_SESSION') {
        try {
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (currentSession && event.source) {
            (event.source as Window).postMessage(
              {
                type: 'SUPABASE_SESSION',
                access_token: currentSession.access_token,
                refresh_token: currentSession.refresh_token,
              },
              window.location.origin
            );
          }
        } catch (err) {
          console.error('[Auth] Error responding to session request:', err);
        }
      }
    };

    window.addEventListener('message', handleSessionRequest);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('message', handleSessionRequest);
    };
  }, []);

  /* ────────── signIn ────────── */

  async function signIn(email: string, password: string): Promise<SignInResult> {
    const id = rid();
    console.log(`[Auth ${ts()}] [${id}] signIn START`);

    // Reuse in-flight login instead of throwing "already in progress"
    if (signInPromiseRef.current) {
      console.warn(`[Auth ${ts()}] [${id}] signIn already active, reusing in-flight promise`);
      return signInPromiseRef.current;
    }

    const run = (async (): Promise<SignInResult> => {
      signInActiveRef.current = true;
      suppressSignedOutRef.current = true;

      try {
        // 1. Resilient cleanup — never blocks login for more than 2s
        console.log(`[Auth ${ts()}] [${id}] cleanup_start`);
        try {
          await withTimeout(
            supabase.auth.signOut({ scope: 'local' }),
            2000,
            'CLEANUP'
          );
        } catch (_) {
          console.warn(`[Auth ${ts()}] [${id}] cleanup timed out or failed, continuing`);
        }
        clearSupabaseLocalStorage();
        queryClient.clear();
        suppressSignedOutRef.current = false;
        console.log(`[Auth ${ts()}] [${id}] cleanup_end`);

        // 2. Authenticate (bounded timeout to avoid indefinite pending)
        console.log(`[Auth ${ts()}] [${id}] signInWithPassword_start`);
        const { error } = await withTimeout(
          supabase.auth.signInWithPassword({ email, password }),
          20_000,
          'SIGNIN'
        );

        if (error) {
          console.log(`[Auth ${ts()}] [${id}] signInWithPassword error: ${error.message}`);
          return { error };
        }
        console.log(`[Auth ${ts()}] [${id}] signInWithPassword_ok`);

        // 3. Get confirmed session
        const { data: { session: activeSession }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !activeSession?.user) {
          console.error(`[Auth ${ts()}] [${id}] getSession failed`);
          return { error: new Error('Sessão não foi estabelecida após login.') };
        }
        console.log(`[Auth ${ts()}] [${id}] getSession OK user=${activeSession.user.id.slice(0, 8)}`);

        // 4. Hydrate with 20s timeout
        console.log(`[Auth ${ts()}] [${id}] hydrate_start`);
        let userData: { profile: Profile | null; role: AppRole | null; networkError: boolean };

        try {
          userData = await withTimeout(fetchUserData(activeSession.user.id), 20_000, 'HYDRATION');
        } catch {
          console.error(`[Auth ${ts()}] [${id}] hydration timed out, attempting fallback getSession`);
          // Fallback: try one more getSession + fresh fetch
          try {
            const { data: { session: fallbackSession } } = await supabase.auth.getSession();
            if (fallbackSession?.user) {
              // Clear stale hydration cache
              hydrationPromiseRef.current = null;
              userData = await withTimeout(fetchUserData(fallbackSession.user.id), 10_000, 'HYDRATION_FALLBACK');
            } else {
              return { error: new Error('O servidor demorou demasiado a responder. Tente novamente.') };
            }
          } catch {
            return { error: new Error('O servidor demorou demasiado a responder. Tente novamente.') };
          }
        }

        console.log(`[Auth ${ts()}] [${id}] hydrate_end role=${userData.role} networkError=${userData.networkError}`);

        // 5. Distinguish network error from missing role
        if (userData.networkError && !userData.role) {
          return { error: new Error('Falha de rede ao carregar perfil. Verifique a sua ligação e tente novamente.') };
        }

        if (!userData.role) {
          return { error: new Error('Perfil sem permissões atribuídas. Contacte o administrador.') };
        }

        // 6. Commit state atomically
        setSession(activeSession);
        setUser(activeSession.user);
        setProfile(userData.profile);
        setRole(userData.role);
        lastUserIdRef.current = activeSession.user.id;
        setLoading(false);

        const redirectPath = getDefaultRouteForRole(userData.role);
        console.log(`[Auth ${ts()}] [${id}] signIn SUCCESS → redirect=${redirectPath}`);

        return { error: null, role: userData.role, redirectPath };
      } catch (error) {
        const err = error as Error;
        console.error(`[Auth ${ts()}] [${id}] signIn CATCH:`, err.message);
        if (err.message.includes('SIGNIN_TIMEOUT')) {
          return { error: new Error('O login demorou demasiado. Tente novamente.') };
        }
        if (isServerError(err)) {
          return { error: new Error('Falha de ligação ao serviço de autenticação.') };
        }
        return { error: err };
      } finally {
        // ALWAYS release guards — no stuck state possible
        signInActiveRef.current = false;
        suppressSignedOutRef.current = false;
        signInPromiseRef.current = null;
        console.log(`[Auth ${ts()}] [${id}] signIn FINALLY (guards released)`);
      }
    })();

    signInPromiseRef.current = run;
    return run;
  }

  /* ────────── signOut ────────── */

  async function handleSignOut() {
    await supabase.auth.signOut({ scope: 'local' });
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
    lastUserIdRef.current = null;
    queryClient.clear();
    clearSupabaseLocalStorage();
    window.location.href = '/login';
  }

  const value: AuthContextType = {
    user, session, profile, role, loading, signIn, signOut: handleSignOut,
    isAuthenticated: !!session,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function getDefaultRouteForRole(role: AppRole | null): string {
  switch (role) {
    case 'dono': return '/dashboard';
    case 'secretaria': return '/geral';
    case 'tecnico': return '/servicos';
    case 'monitor': return '/tv-monitor';
    default: return '/login';
  }
}
