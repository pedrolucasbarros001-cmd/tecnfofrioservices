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
  const [initStarted, setInitStarted] = useState(false);
  const fetchingRef = useRef<string | null>(null);
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const safetyTimeout = setTimeout(() => {
      if (loading) {
        console.warn('[AuthContext] Auth initialization safety timeout reached');
        setLoading(false);
      }
    }, 15000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthContext] Auth state changed:', event);

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Detect user switch — clear stale cache from previous user
          if (lastUserIdRef.current && lastUserIdRef.current !== session.user.id) {
            console.log('[AuthContext] User switch detected, clearing cache');
            queryClient.clear();
          }
          lastUserIdRef.current = session.user.id;
          fetchUserData(session.user.id);
        } else {
          setProfile(null);
          setRole(null);
          setLoading(false);
        }
      }
    );

    if (!initStarted) {
      setInitStarted(true);
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          lastUserIdRef.current = session.user.id;
          fetchUserData(session.user.id);
        } else {
          setLoading(false);
        }
      });
    }

    // Session bridge listener for print pages
    const handleSessionRequest = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'REQUEST_SUPABASE_SESSION') {
        console.log('[AuthContext] Received session request from new tab');
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
      clearTimeout(safetyTimeout);
    };
  }, [initStarted]);

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

  async function fetchUserData(userId: string) {
    // Avoid redundant fetching for the same user
    if (fetchingRef.current === userId) {
      console.log('[AuthContext] Already fetching data for user:', userId);
      return;
    }
    fetchingRef.current = userId;

    try {
      let result = await fetchUserDataOnce(userId);

      if (!result.role) {
        console.warn('[AuthContext] Role not loaded, retrying in 3s...');
        await new Promise(r => setTimeout(r, 3000));
        result = await fetchUserDataOnce(userId);
      }

      setProfile(result.profile);
      setRole(result.role);
      console.log('[AuthContext] Loaded role:', result.role);
    } catch (error) {
      console.error('[AuthContext] Error in fetchUserData:', error);
    } finally {
      fetchingRef.current = null;
      setLoading(false);
    }
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
    // Clear any stale session/tokens before attempting login
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (_) {
      // Ignore errors during cleanup
    }

    // Clear previous user's cache
    queryClient.clear();

    // Attempt 1
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error && isServerError(error)) {
        console.warn('[AuthContext] Server error on signIn attempt 1, retrying in 2s...', error.message);
        await new Promise(r => setTimeout(r, 2000));

        try {
          const { error: error2 } = await supabase.auth.signInWithPassword({ email, password });
          return { error: error2 };
        } catch (retryErr) {
          return { error: retryErr as Error };
        }
      }

      return { error };
    } catch (error) {
      const err = error as Error;
      if (isServerError(err)) {
        console.warn('[AuthContext] Network error on signIn attempt 1, retrying in 2s...');
        await new Promise(r => setTimeout(r, 2000));
        try {
          const { error: error2 } = await supabase.auth.signInWithPassword({ email, password });
          return { error: error2 };
        } catch (retryErr) {
          return { error: retryErr as Error };
        }
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

    // 4. Clear all Supabase localStorage keys (stale tokens)
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));

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
