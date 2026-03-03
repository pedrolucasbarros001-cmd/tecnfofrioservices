import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { queryClient } from '@/lib/queryClient';
import type { AppRole, Profile } from '@/types/database';

interface SignInResult {
  error: Error | null;
  role?: AppRole | null;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const hydrationPromiseRef = useRef<{ userId: string; promise: Promise<AppRole | null> } | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        void hydrateUser(nextSession.user.id);
      } else {
        setProfile(null);
        setRole(null);
        setLoading(false);
      }
    });

    const handleSessionRequest = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'REQUEST_SUPABASE_SESSION') return;

      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!currentSession || !event.source) return;

        (event.source as Window).postMessage(
          {
            type: 'SUPABASE_SESSION',
            access_token: currentSession.access_token,
            refresh_token: currentSession.refresh_token,
          },
          window.location.origin
        );
      } catch (err) {
        console.error('[AuthContext] Session bridge error:', err);
      }
    };

    window.addEventListener('message', handleSessionRequest);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener('message', handleSessionRequest);
    };
  }, []);

  async function hydrateUser(userId: string): Promise<AppRole | null> {
    if (hydrationPromiseRef.current?.userId === userId) {
      console.log('[AuthContext] Reusing existing hydration promise for:', userId);
      return hydrationPromiseRef.current.promise;
    }

    console.log('[AuthContext] Starting hydration for user:', userId);
    const promise = (async () => {
      try {
        const [profileRes, roleRpcRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
          supabase.rpc('get_user_role', { _user_id: userId }),
        ]);

        if (profileRes.error) {
          console.error('[AuthContext] Profile fetch error:', profileRes.error);
        }
        if (roleRpcRes.error) {
          console.error('[AuthContext] Role RPC error:', roleRpcRes.error);
        }

        const profileData = profileRes.data as Profile | null;
        const userRole = (roleRpcRes.data as AppRole | null) ?? null;

        console.log('[AuthContext] Hydration result:', {
          hasProfile: !!profileData,
          role: userRole,
          userId
        });

        setProfile(profileData);
        setRole(userRole);
        return userRole;
      } catch (error) {
        console.error('[AuthContext] Unexpected hydrateUser error:', error);
        setProfile(null);
        setRole(null);
        return null;
      } finally {
        hydrationPromiseRef.current = null;
        setLoading(false);
      }
    })();

    hydrationPromiseRef.current = { userId, promise };
    return promise;
  }

  async function signIn(email: string, password: string): Promise<SignInResult> {
    setLoading(true);
    console.log('[AuthContext] Attempting signIn for:', email);

    try {
      queryClient.clear();

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error('[AuthContext] signIn error:', error.message);
        setLoading(false);
        return { error };
      }

      if (!data.user || !data.session) {
        console.error('[AuthContext] Session invalid after login:', { user: !!data.user, session: !!data.session });
        setLoading(false);
        return { error: new Error('Sessão inválida após login') };
      }

      console.log('[AuthContext] Supabase auth successful, hydrating user...');
      setSession(data.session);
      setUser(data.user);

      const hydratedRole = await hydrateUser(data.user.id);
      console.log('[AuthContext] Login complete. Final role:', hydratedRole);

      return { error: null, role: hydratedRole };
    } catch (error) {
      console.error('[AuthContext] Critical signIn exception:', error);
      setLoading(false);
      return { error: error as Error };
    }
  }

  async function signOut() {
    await supabase.auth.signOut({ scope: 'local' });
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
    queryClient.clear();
    setLoading(false);
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
    case 'dono': return '/dashboard';
    case 'secretaria': return '/geral';
    case 'tecnico': return '/servicos';
    case 'monitor': return '/tv-monitor';
    default: return '/login';
  }
}
