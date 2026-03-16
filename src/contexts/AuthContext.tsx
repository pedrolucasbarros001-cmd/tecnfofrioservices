import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
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
  const suppressAuthEventsRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    // Immediately fetch session to unblock loading state if event is delayed
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (mounted) {
          if (initialSession?.user) {
            setSession(initialSession);
            setUser(initialSession.user);
            await hydrateUser(initialSession.user.id);
          } else {
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('[AuthContext] Initialization error:', error);
        if (mounted) setLoading(false);
      }
    };

    void initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      if (suppressAuthEventsRef.current) return;

      // On SIGNED_IN events, if we already have the same user hydrated, skip re-hydration.
      // This prevents the race where signIn() + onAuthStateChange both call hydrateUser.
      if (event === 'SIGNED_IN' && nextSession?.user) {
        const alreadyHydrated =
          hydrationPromiseRef.current?.userId === nextSession.user.id;
        setSession(nextSession);
        setUser(nextSession.user);
        if (!alreadyHydrated) {
          hydrateUser(nextSession.user.id).catch(err => {
            console.error('[AuthContext] Background hydration error:', err);
          });
        }
        return;
      }

      // TOKEN_REFRESHED: update session tokens only, no re-hydration needed
      if (event === 'TOKEN_REFRESHED' && nextSession?.user) {
        setSession(nextSession);
        return;
      }

      // SIGNED_OUT or USER_DELETED etc.
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (!nextSession?.user) {
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
      mounted = false;
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
        let profileData: Profile | null = null;
        let userRole: AppRole | null = null;
        let fetchError: any = null;

        // Tentar obter perfil com retries curtos
        for (let i = 0; i < 3; i++) {
          const profileRes = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle();
          if (!profileRes.error) {
            profileData = profileRes.data as Profile | null;
            break;
          }
          if (i < 2) await new Promise(r => setTimeout(r, 800));
        }

        // Tentar obter role com retries e fallback
        for (let i = 0; i < 3; i++) {
          // Attempt 1: RPC
          const roleRpcRes = await supabase.rpc('get_user_role', { _user_id: userId });
          if (!roleRpcRes.error && roleRpcRes.data) {
            userRole = roleRpcRes.data as AppRole;
            break;
          }
          
          if (roleRpcRes.error) {
            fetchError = roleRpcRes.error;
            console.warn('[AuthContext] RPC error fetching role, attempting fallback...', roleRpcRes.error);
          }

          // Attempt 2: Direct Table Select (Fallback)
          const { data: roleData, error: roleError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId)
            .maybeSingle();

          if (!roleError && roleData) {
            userRole = roleData.role;
            break;
          }

          if (roleError) {
            fetchError = roleError;
            console.warn('[AuthContext] Fallback error fetching role...', roleError);
          }

          // If no error but data is just null, the user genuinely has no role. No need to retry.
          if (!roleRpcRes.error && !roleError && !roleRpcRes.data && !roleData) {
            break;
          }

          if (i < 2) await new Promise(r => setTimeout(r, 1000));
        }

        console.log('[AuthContext] Hydration result:', {
          hasProfile: !!profileData,
          role: userRole,
          userId,
          hadErrors: !!fetchError
        });

        // Se o userRole for nulo E houve erros de fetch, lançamos erro para o signIn não assumir "sem permissões"
        if (!userRole && fetchError) {
          throw new Error('Falha de ligação ao confirmar permissões. Tente novamente.');
        }

        setProfile(profileData);
        setRole(userRole);
        return userRole;
      } catch (error) {
        console.error('[AuthContext] Unexpected hydrateUser error:', error);
        // Do not clear existing profile/role on transient network errors during token refresh
        setLoading(false);
        throw error; // Let the caller decide how to handle it
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
      // 1. Clear stale query cache
      queryClient.clear();

      // 2. Clean previous auth session (preserve technician draft keys)
      // Suppress auth events during cleanup to prevent race condition
      suppressAuthEventsRef.current = true;
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch (cleanupErr) {
        console.warn('[AuthContext] Pre-login cleanup warning:', cleanupErr);
      }
      // Let supabase.auth.signOut() handle localStorage cleanup natively.
      // Manual sb-* key deletion can corrupt token state and cause race conditions.

      // 3. Attempt login with retry on network errors
      let lastError: Error | null = null;
      let data: Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>['data'] | null = null;
      const MAX_RETRIES = 2;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const result = await supabase.auth.signInWithPassword({ email, password });
        if (!result.error) {
          data = result.data;
          lastError = null;
          break;
        }
        const msg = result.error.message.toLowerCase();
        const isNetworkError = msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('timeout');
        if (!isNetworkError || attempt === MAX_RETRIES) {
          lastError = result.error;
          break;
        }
        console.warn(`[AuthContext] Network error on attempt ${attempt + 1}, retrying...`);
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }

      if (lastError) {
        console.error('[AuthContext] signIn error:', lastError.message);
        setLoading(false);
        return { error: lastError };
      }

      if (!data?.user || !data?.session) {
        console.error('[AuthContext] Session invalid after login:', { user: !!data?.user, session: !!data?.session });
        setLoading(false);
        return { error: new Error('Sessão inválida após login') };
      }

      console.log('[AuthContext] Supabase auth successful, hydrating user...');
      setSession(data.session);
      setUser(data.user);

      const hydratedRole = await hydrateUser(data.user.id);
      console.log('[AuthContext] Login complete. Final role:', hydratedRole);
      suppressAuthEventsRef.current = false;

      return { error: null, role: hydratedRole };
    } catch (error) {
      console.error('[AuthContext] Critical signIn exception:', error);
      suppressAuthEventsRef.current = false;
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
