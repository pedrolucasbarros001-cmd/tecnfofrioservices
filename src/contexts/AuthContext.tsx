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

  // Tracks whether signIn is driving the hydration — so onAuthStateChange skips duplicate work
  const signInActiveRef = useRef(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // If signIn() is active, it handles hydration itself — skip here
          if (signInActiveRef.current) return;
          await hydrateUser(session.user.id);
        } else {
          setProfile(null);
          setRole(null);
          setLoading(false);
        }
      }
    );

    // Session bridge for print pages
    const handleSessionRequest = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'REQUEST_SUPABASE_SESSION') {
        try {
          const { data: { session: s } } = await supabase.auth.getSession();
          if (s && event.source) {
            (event.source as Window).postMessage(
              { type: 'SUPABASE_SESSION', access_token: s.access_token, refresh_token: s.refresh_token },
              window.location.origin
            );
          }
        } catch (err) {
          console.error('[AuthContext] Session bridge error:', err);
        }
      }
    };

    window.addEventListener('message', handleSessionRequest);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener('message', handleSessionRequest);
    };
  }, []);

  /** Fetches profile + role and sets state. Returns the role. */
  async function hydrateUser(userId: string): Promise<AppRole | null> {
    try {
      const [profileRes, roleRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', userId).order('created_at', { ascending: true }).maybeSingle()
      ]);

      if (profileRes.error) console.error('[AuthContext] Profile error:', profileRes.error);
      if (roleRes.error) console.error('[AuthContext] Role error:', roleRes.error);

      const profileData = profileRes.data as Profile | null;
      const userRole = (roleRes.data?.role as AppRole) ?? null;

      setProfile(profileData);
      setRole(userRole);
      return userRole;
    } catch (error) {
      console.error('[AuthContext] hydrateUser error:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }

  /**
   * Signs in and returns { error, role }.
   * Does NOT call signOut first — signInWithPassword replaces the session natively.
   * Awaits hydration so the caller gets the role immediately.
   */
  async function signIn(email: string, password: string): Promise<SignInResult> {
    try {
      signInActiveRef.current = true;
      queryClient.clear();

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        signInActiveRef.current = false;
        return { error };
      }

      const userId = data.user?.id;
      if (!userId) {
        signInActiveRef.current = false;
        return { error: new Error('No user returned from auth') };
      }

      // Set session/user immediately
      setSession(data.session);
      setUser(data.user);

      // Hydrate and get role
      const userRole = await hydrateUser(userId);

      signInActiveRef.current = false;
      return { error: null, role: userRole };
    } catch (error) {
      signInActiveRef.current = false;
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
    user, session, profile, role, loading, signIn, signOut,
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
