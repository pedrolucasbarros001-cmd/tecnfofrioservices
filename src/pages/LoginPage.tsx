import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, AlertTriangle } from 'lucide-react';
import tecnofrioLogoIcon from '@/assets/tecnofrio-logo-icon.png';
import { useAuth, getDefaultRouteForRole } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const loginSchema = z.object({
  email: z.string().email('Email inválido').min(1, 'Email é obrigatório'),
  password: z.string().min(1, 'Palavra-passe é obrigatória'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

type ServerStatus = 'checking' | 'ok' | 'slow' | 'down';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, role, isAuthenticated, loading } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState<ServerStatus>('checking');
  const [loadingText, setLoadingText] = useState('A entrar...');
  const lastSubmittedData = useRef<LoginFormValues | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // Health check on mount
  useEffect(() => {
    const controller = new AbortController();
    const start = Date.now();

    const check = async () => {
      try {
        const { error } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .limit(0)
          .abortSignal(controller.signal);

        const elapsed = Date.now() - start;
        if (error) {
          setServerStatus('down');
        } else if (elapsed > 3000) {
          setServerStatus('slow');
        } else {
          setServerStatus('ok');
        }
      } catch {
        setServerStatus('down');
      }
    };

    const timeout = setTimeout(() => {
      if (serverStatus === 'checking') {
        setServerStatus('slow');
      }
    }, 5000);

    check();
    return () => { controller.abort(); clearTimeout(timeout); };
  }, []);

  // Progressive loading text
  useEffect(() => {
    if (!isLoading) {
      setLoadingText('A entrar...');
      return;
    }

    setLoadingText('A entrar...');
    const t1 = setTimeout(() => setLoadingText('A conectar ao servidor...'), 3000);
    const t2 = setTimeout(() => setLoadingText('O servidor está lento, por favor aguarde...'), 8000);

    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [isLoading]);

  // Redirect when authenticated
  useEffect(() => {
    if (isAuthenticated && role && !loading) {
      const from = location.state?.from?.pathname;
      if (from && from !== '/login') {
        navigate(from, { replace: true });
      } else {
        navigate(getDefaultRouteForRole(role), { replace: true });
      }
    }
  }, [isAuthenticated, role, loading, navigate, location.state]);

  // No role loaded after auth
  useEffect(() => {
    if (isAuthenticated && !loading && !role) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar perfil',
        description: 'Não foi possível carregar as suas permissões. Recarregue a página ou tente novamente.',
      });
      setIsLoading(false);
    }
  }, [isAuthenticated, loading, role]);

  function isServerError(msg: string): boolean {
    const lower = msg.toLowerCase();
    return lower.includes('database error') ||
      lower.includes('timeout') ||
      lower.includes('context canceled') ||
      lower.includes('500') ||
      lower.includes('504') ||
      lower.includes('load failed') ||
      lower.includes('failed to fetch') ||
      lower.includes('networkerror');
  }

  async function onSubmit(data: LoginFormValues) {
    lastSubmittedData.current = data;
    setIsLoading(true);

    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), 30000)
      );

      const { error } = await Promise.race([signIn(data.email, data.password), timeoutPromise]);

      if (error) {
        const msg = error.message || '';

        if (isServerError(msg)) {
          toast({
            variant: 'destructive',
            title: 'Servidor temporariamente indisponível',
            description: 'O servidor está sobrecarregado. A sua tentativa incluiu retry automático. Tente novamente em alguns segundos.',
          });
        } else if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('credentials')) {
          toast({
            variant: 'destructive',
            title: 'Credenciais inválidas',
            description: 'Email ou palavra-passe incorretos.',
          });
        } else if (msg.toLowerCase().includes('email') && msg.toLowerCase().includes('confirm')) {
          toast({
            variant: 'destructive',
            title: 'Email não confirmado',
            description: 'Confirme o seu email antes de entrar.',
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Erro de autenticação',
            description: msg || 'Erro ao fazer login.',
          });
        }
        setIsLoading(false);
        return;
      }

      // Safety timeout for role loading
      setTimeout(() => setIsLoading(false), 20000);
    } catch (error: any) {
      const isTimeout = error?.message === 'TIMEOUT';
      toast({
        variant: 'destructive',
        title: isTimeout ? 'Tempo esgotado' : 'Erro de ligação',
        description: isTimeout
          ? 'O servidor demorou a responder. Tente novamente.'
          : 'Ocorreu um erro de rede. Verifique a sua ligação à internet.',
      });
      setIsLoading(false);
    }
  }

  function handleRetry() {
    if (lastSubmittedData.current) {
      onSubmit(lastSubmittedData.current);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/10 backdrop-blur-xl">
        <CardHeader className="space-y-4 text-center pb-8">
          {/* Server status banner */}
          {(serverStatus === 'slow' || serverStatus === 'down') && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/20 border border-yellow-500/40 text-yellow-200 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                {serverStatus === 'down'
                  ? 'O servidor está inacessível. O login pode falhar ou demorar.'
                  : 'O servidor está lento. O login pode demorar mais que o normal.'}
              </span>
            </div>
          )}

          <div className="mx-auto p-4 rounded-2xl bg-white/10 backdrop-blur-sm">
            <img src={tecnofrioLogoIcon} alt="TECNOFRIO" className="h-20 w-20 object-contain" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold tracking-tight">
              <span className="text-blue-400">TECNO</span>
              <span className="text-slate-200">FRIO</span>
            </CardTitle>
            <CardDescription className="text-base mt-2 text-slate-400">
              Sistema de Gestão de Serviços
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="seu@email.com"
                        autoComplete="email"
                        disabled={isLoading}
                        className="bg-white/10 border-white/20 text-white placeholder:text-slate-500 focus:border-blue-400"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Palavra-passe</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        disabled={isLoading}
                        className="bg-white/10 border-white/20 text-white placeholder:text-slate-500 focus:border-blue-400"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full h-11 text-base bg-blue-600 hover:bg-blue-700 transition-all duration-200"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {loadingText}
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>

              {/* Retry button after failure */}
              {!isLoading && lastSubmittedData.current && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRetry}
                  className="w-full border-white/20 text-slate-300 hover:bg-white/10"
                >
                  Tentar novamente
                </Button>
              )}
            </form>
          </Form>
          <div className="mt-6 pt-6 border-t border-white/10 text-center">
            <button
              onClick={() => { localStorage.clear(); window.location.reload(); }}
              className="text-xs text-slate-500 hover:text-slate-400 underline underline-offset-4"
            >
              Problemas ao entrar? Limpar sessão local
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
