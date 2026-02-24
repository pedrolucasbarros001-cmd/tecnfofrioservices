import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { AppRole, Profile } from '@/types/database';

function withTimeout<T>(promise: Promise<T>, ms: number, label = 'Query'): Promise<T> {
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
  const fetchingRef = React.useRef<string | null>(null);

  useEffect(() => {
    // Safety timeout: never hang forever
    const safetyTimeout = setTimeout(() => {
      if (loading) {
        console.warn('[AuthContext] Auth initialization safety timeout reached');
        setLoading(false);
      }
    }, 15000); // 15 seconds

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthContext] Auth state changed:', event);

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          fetchUserData(session.user.id);
        } else {
          setProfile(null);
          setRole(null);
          setLoading(false);
        }
      }
    );

    // Only perform initial check once
    if (!initStarted) {
      setInitStarted(true);
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          fetchUserData(session.user.id);
        } else {
          setLoading(false);
        }
      });
    }

    // Session bridge listener: respond to print pages requesting session
    const handleSessionRequest = async (event: MessageEvent) => {
      // Security: only accept messages from same origin
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === 'REQUEST_SUPABASE_SESSION') {
        console.log('[AuthContext] Received session request from new tab');

        try {
          const { data: { session: currentSession } } = await supabase.auth.getSession();

          if (currentSession && event.source) {
            console.log('[AuthContext] Sending session to new tab');
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

  async function fetchUserData(userId: string) {
    // Avoid redundant fetching for the same user
    if (fetchingRef.current === userId) {
      console.log('[AuthContext] Already fetching data for user:', userId);
      return;
    }
    fetchingRef.current = userId;

    try {
      console.log('[AuthContext] Fetching profile for:', userId);

      // Fetch profile with timeout
      const { data: profileData, error: profileError } = await withTimeout(
        Promise.resolve(supabase.from('profiles').select('*').eq('user_id', userId).single()),
        10000,
        'profiles'
      );
      if (profileError) {
        if (profileError.code !== 'PGRST116') {
          console.error('[AuthContext] Error fetching profile:', profileError);
        } else {
          console.warn('[AuthContext] No profile found for user');
        }
      }
      setProfile(profileData as Profile | null);

      // Fetch role with timeout
      const { data: roleData, error: roleError } = await withTimeout(
        Promise.resolve(supabase.from('user_roles').select('role').eq('user_id', userId).order('created_at', { ascending: true }).limit(1).maybeSingle()),
        10000,
        'user_roles'
      );

      if (roleError) {
        console.error('[AuthContext] Error fetching role:', roleError);
      }

      const userRole = (roleData?.role as AppRole) ?? null;
      console.log('[AuthContext] Loaded role:', userRole);
      setRole(userRole);

    } catch (error) {
      console.error('[AuthContext] Error in fetchUserData:', error);
    } finally {
      fetchingRef.current = null;
      setLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
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
