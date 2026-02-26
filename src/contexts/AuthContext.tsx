import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { queryClient } from '@/App';
import type { AppRole, Profile } from '@/types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const lastUserIdRef = useRef<string | null>(null);
  const bootstrappedRef = useRef(false);
  // Flag to suppress onAuthStateChange during explicit signIn
  const signInActiveRef = useRef(false);

  function clearSupabaseLocalStorage() {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }

  /**
   * Fetch profile and role in PARALLEL — no artificial timeouts.
   * Let the browser's natural network timeout (~30s) handle slow connections.
   * Returns { profile, role, networkError } to distinguish network failures from missing data.
   */
  async function fetchUserData(userId: string): Promise<{
    profile: Profile | null;
    role: AppRole | null;
    networkError: boolean;
  }> {
    console.log('[AuthContext] Fetching profile+role in parallel for:', userId);

    const [profileResult, roleResult] = await Promise.allSettled([
      supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', userId).order('created_at', { ascending: true }).limit(1).maybeSingle(),
    ]);

    let profileData: Profile | null = null;
    let userRole: AppRole | null = null;
    let networkError = false;

    if (profileResult.status === 'fulfilled') {
      if (profileResult.value.error) {
        console.error('[AuthContext] Profile query error:', profileResult.value.error);
        networkError = true;
      } else {
        profileData = profileResult.value.data as Profile | null;
      }
    } else {
      console.error('[AuthContext] Profile fetch rejected:', profileResult.reason);
      networkError = true;
    }

    if (roleResult.status === 'fulfilled') {
      if (roleResult.value.error) {
        console.error('[AuthContext] Role query error:', roleResult.value.error);
        networkError = true;
      } else {
        userRole = (roleResult.value.data?.role as AppRole) ?? null;
      }
    } else {
      console.error('[AuthContext] Role fetch rejected:', roleResult.reason);
      networkError = true;
    }

    // If role is null but no network error, retry once (trigger may be slow to create the row)
    if (!userRole && !networkError) {
      await new Promise((r) => setTimeout(r, 500));
      try {
        const retryResult = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        if (!retryResult.error) {
          userRole = (retryResult.data?.role as AppRole) ?? null;
        }
      } catch (e) {
        console.warn('[AuthContext] Role retry failed:', e);
      }
    }

    return { profile: profileData, role: userRole, networkError };
  }

  async function hydrateSession(nextSession: Session | null) {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);

    if (!nextSession?.user) {
      setProfile(null);
      setRole(null);
      lastUserIdRef.current = null;
      setLoading(false);
      return;
    }

    // Detect user switch — clear stale cache
    if (lastUserIdRef.current && lastUserIdRef.current !== nextSession.user.id) {
      console.log('[AuthContext] User switch detected, clearing cache');
      queryClient.clear();
    }

    lastUserIdRef.current = nextSession.user.id;
    setLoading(true);

    const result = await fetchUserData(nextSession.user.id);
    setProfile(result.profile);
    setRole(result.role);
    setLoading(false);
  }

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, nextSession) => {
        console.log('[AuthContext] Auth state changed:', event);
        // Skip if signIn is handling hydration explicitly
        if (signInActiveRef.current) {
          console.log('[AuthContext] Skipping hydration — signIn is active');
          return;
        }
        try {
          await hydrateSession(nextSession);
        } catch (err) {
          console.error('[AuthContext] hydrateSession failed:', err);
          setLoading(false);
        }
      }
    );

    // No separate getSession() bootstrap — onAuthStateChange fires INITIAL_SESSION automatically

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
          console.error('[AuthContext] Error responding to session request:', err);
        }
      }
    };

    window.addEventListener('message', handleSessionRequest);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('message', handleSessionRequest);
    };
  }, []);

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

  async function signIn(email: string, password: string) {
    // 1. Suppress onAuthStateChange BEFORE cleanup to prevent SIGNED_OUT triggering hydrateSession
    signInActiveRef.current = true;

    // 2. Purge previous session completely
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (_) {
      // ignore cleanup errors
    }
    clearSupabaseLocalStorage();
    queryClient.clear();

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        signInActiveRef.current = false;
        return { error };
      }

      const { data: { session: activeSession }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !activeSession?.user) {
        signInActiveRef.current = false;
        return { error: new Error('Sessão não foi estabelecida após login.') };
      }

      // 3. Hydrate state with parallel fetch
      const userData = await fetchUserData(activeSession.user.id);

      // 4. Distinguish network error from genuinely missing role
      if (userData.networkError && !userData.role) {
        signInActiveRef.current = false;
        return { error: new Error('Falha de rede ao carregar perfil. Verifique a sua ligação e tente novamente.') };
      }

      if (!userData.role) {
        signInActiveRef.current = false;
        return { error: new Error('Perfil sem permissões atribuídas. Contacte o administrador.') };
      }

      // 5. Set all state atomically
      setSession(activeSession);
      setUser(activeSession.user);
      setProfile(userData.profile);
      setRole(userData.role);
      lastUserIdRef.current = activeSession.user.id;
      setLoading(false);

      signInActiveRef.current = false;
      return { error: null };
    } catch (error) {
      signInActiveRef.current = false;
      const err = error as Error;
      if (isServerError(err)) {
        return { error: new Error('Falha de ligação ao serviço de autenticação.') };
      }
      return { error: err };
    }
  }

  async function signOut() {
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
    user,
    session,
    profile,
    role,
    loading,
    signIn,
    signOut,
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
    case 'dono':
      return '/dashboard';
    case 'secretaria':
      return '/geral';
    case 'tecnico':
      return '/servicos';
    case 'monitor':
      return '/tv-monitor';
    default:
      return '/login';
  }
}
