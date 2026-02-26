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

  // Single-flight hydration per userId to avoid Supabase overload
  const hydrationPromiseRef = useRef<{ userId: string; promise: Promise<void> } | null>(null);

  useEffect(() => {
    console.log('[AuthContext] Inicializando provedor de estado de autenticação...');

    // O onAuthStateChange do Supabase v2 dispara 'INITIAL_SESSION' automaticamente na inscrição
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthContext] Evento de estado de auth:', event);

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchUserData(session.user.id);
        } else {
          setProfile(null);
          setRole(null);
          setLoading(false);
        }
      }
    );

    // Listener para o bridge de sessão (usado por páginas de impressão)
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
          console.error('[AuthContext] Erro ao responder pedido de sessão:', err);
        }
      }
    };

    window.addEventListener('message', handleSessionRequest);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('message', handleSessionRequest);
    };
  }, []);

  async function fetchUserData(userId: string, isRetry = false) {
    // Evita chamadas redundantes se já houver uma busca em curso para este usuário
    if (hydrationPromiseRef.current?.userId === userId && !isRetry) {
      return hydrationPromiseRef.current.promise;
    }

    const promise = (async () => {
      try {
        console.log(`[AuthContext] Carregando dados do usuário: ${userId} (retry: ${isRetry})`);

        // Busca perfil e cargo em paralelo - mais eficiente
        const [profileRes, roleRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
          supabase.from('user_roles').select('role').eq('user_id', userId).order('created_at', { ascending: true }).maybeSingle()
        ]);

        if (profileRes.error) console.error('[AuthContext] Erro ao carregar perfil:', profileRes.error);
        if (roleRes.error) console.error('[AuthContext] Erro ao carregar cargo:', roleRes.error);

        const profileData = profileRes.data as Profile | null;
        const userRole = (roleRes.data?.role as AppRole) ?? null;

        // Caso o cargo ainda não exista (ex: delay após signup), tenta uma vez após 3 segundos
        if (!userRole && !isRetry) {
          console.warn('[AuthContext] Cargo não encontrado, tentando novamente em 3s...');
          setTimeout(() => fetchUserData(userId, true), 3000);
          return;
        }

        setProfile(profileData);
        setRole(userRole);
        console.log('[AuthContext] Dados carregados. Cargo:', userRole);
      } catch (error) {
        console.error('[AuthContext] Erro inesperado em fetchUserData:', error);
      } finally {
        hydrationPromiseRef.current = null;
        setLoading(false);
      }
    })();

    hydrationPromiseRef.current = { userId, promise };
    return promise;
  }

  async function signIn(email: string, password: string): Promise<SignInResult> {
    try {
      // Limpeza prévia para evitar conflitos de sessão
      await supabase.auth.signOut({ scope: 'local' });
      queryClient.clear();

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error };
    } catch (error) {
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
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
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
