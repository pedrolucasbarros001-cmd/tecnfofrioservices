import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { queryClient } from '@/App';
import type { AppRole, Profile } from '@/types/database';

function withTimeout<T>(thenable: PromiseLike<T>, ms: number, label = 'Query'): Promise<T> {
  const promise = new Promise<T>((resolve, reject) => thenable.then(resolve, reject));
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`TIMEOUT: ${label} excedeu ${ms}ms`)), ms)
    ),
  ]);
}

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
  const fetchingRef = useRef<string | null>(null);
  const fetchPromiseRef = useRef<Promise<{ profile: Profile | null; role: AppRole | null }> | null>(null);
  const lastUserIdRef = useRef<string | null>(null);
  const bootstrappedRef = useRef(false);

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

  async function hydrateSession(nextSession: Session | null) {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);

    if (!nextSession?.user) {
      setProfile(null);
      setRole(null);
      fetchingRef.current = null;
      fetchPromiseRef.current = null;
      lastUserIdRef.current = null;
      setLoading(false);
      return;
    }

    if (lastUserIdRef.current && lastUserIdRef.current !== nextSession.user.id) {
      console.log('[AuthContext] User switch detected, clearing cache');
      queryClient.clear();
    }

    lastUserIdRef.current = nextSession.user.id;
    setLoading(true);
    await fetchUserData(nextSession.user.id);
  }

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, nextSession) => {
        console.log('[AuthContext] Auth state changed:', event);
        await hydrateSession(nextSession);
      }
    );

    if (!bootstrappedRef.current) {
      bootstrappedRef.current = true;
      supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
        await hydrateSession(initialSession);
      });
    }

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

  async function fetchUserDataOnce(userId: string): Promise<{ profile: Profile | null; role: AppRole | null }> {
    console.log('[AuthContext] Fetching profile for:', userId);

    let profileData: Profile | null = null;
    let userRole: AppRole | null = null;

    // FIX: removed Promise.resolve() wrapper so timeout actually works on HTTP request
    try {
      const result = await withTimeout(
        supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
        8000,
        'profiles'
      );
      if (result.error) {
        console.error('[AuthContext] Error fetching profile:', result.error);
      }
      profileData = result.data as Profile | null;
    } catch (e) {
      console.warn('[AuthContext] Profile fetch failed:', e);
    }

    try {
      const result = await withTimeout(
        supabase.from('user_roles').select('role').eq('user_id', userId).order('created_at', { ascending: true }).limit(1).maybeSingle(),
        8000,
        'user_roles'
      );
      if (result.error) {
        console.error('[AuthContext] Error fetching role:', result.error);
      }
      userRole = (result.data?.role as AppRole) ?? null;
    } catch (e) {
      console.warn('[AuthContext] Role fetch failed:', e);
    }

    return { profile: profileData, role: userRole };
  }

  async function fetchUserData(userId: string): Promise<{ profile: Profile | null; role: AppRole | null }> {
    if (fetchingRef.current === userId && fetchPromiseRef.current) {
      return fetchPromiseRef.current;
    }

    fetchingRef.current = userId;

    const fetchPromise = (async () => {
      try {
        let result = await fetchUserDataOnce(userId);

        if (!result.role) {
          await new Promise((r) => setTimeout(r, 300));
          result = await fetchUserDataOnce(userId);
        }

        setProfile(result.profile);
        setRole(result.role);
        return result;
      } catch (error) {
        console.error('[AuthContext] Error in fetchUserData:', error);
        return { profile: null, role: null };
      } finally {
        fetchingRef.current = null;
        fetchPromiseRef.current = null;
        setLoading(false);
      }
    })();

    fetchPromiseRef.current = fetchPromise;
    return fetchPromise;
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

  async function signIn(email: string, password: string) {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (_) {
      // ignore cleanup errors
    }

    clearSupabaseLocalStorage();
    queryClient.clear();

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error };

      const { data: { session: activeSession }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !activeSession?.user) {
        return { error: new Error('Sessão não foi estabelecida após login.') };
      }

      const userData = await fetchUserData(activeSession.user.id);
      if (!userData.role) {
        return { error: new Error('Perfil sem permissões atribuídas. Contacte o administrador.') };
      }

      return { error: null };
    } catch (error) {
      const err = error as Error;
      if (isServerError(err)) {
        return { error: new Error('Falha de ligação ao serviço de autenticação.') };
      }
      return { error: err };
    }
  }

  async function signOut() {
    // 1. Sign out from Supabase
    await supabase.auth.signOut({ scope: 'local' });

    // 2. Clear React state
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
    lastUserIdRef.current = null;

    // 3. Clear React Query cache (prevents data leaking to next user)
    queryClient.clear();

    clearSupabaseLocalStorage();

    // 5. Hard redirect to ensure completely fresh state
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
