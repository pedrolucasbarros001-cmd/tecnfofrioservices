import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import tecnofrioLogoIcon from '@/assets/tecnofrio-logo-icon.png';
import { useAuth, getDefaultRouteForRole } from '@/contexts/AuthContext';
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

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, role, isAuthenticated, loading } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    if (isAuthenticated && role && !loading) {
      const from = location.state?.from?.pathname;
      navigate(from && from !== '/login' ? from : getDefaultRouteForRole(role), { replace: true });
    }
  }, [isAuthenticated, role, loading, navigate, location.state]);

  async function onSubmit(data: LoginFormValues) {
    if (isLoading) return;
    setIsLoading(true);
    console.group('[LoginPage] Login attempt');
    console.log('Email:', data.email);

    try {
      const { error, role: userRole } = await signIn(data.email, data.password);

      if (error) {
        console.error('Login error:', error);
        const msg = error.message.toLowerCase();
        if (msg.includes('database error') || msg.includes('failed to fetch')) {
          toast({
            variant: 'destructive',
            title: 'Servidor indisponível',
            description: 'Não foi possível conectar ao servidor. Verifique a sua ligação e tente novamente.',
          });
        } else if (msg.includes('invalid') || msg.includes('credentials')) {
          toast({
            variant: 'destructive',
            title: 'Credenciais inválidas',
            description: 'Email ou palavra-passe incorretos.',
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Erro ao entrar',
            description: `Erro: ${error.message}`,
          });
        }
        return;
      }

      console.log('User role identified:', userRole);

      if (!userRole) {
        console.warn('Authentication successful but user has no role assigned.');
        toast({
          variant: 'destructive',
          title: 'Sem permissões',
          description: 'Conta autenticada, mas sem nível de acesso associado (role). Contacte o administrador.',
        });
        return;
      }

      const from = location.state?.from?.pathname;
      const targetRoute = from && from !== '/login' ? from : getDefaultRouteForRole(userRole);
      console.log('Redirecting to:', targetRoute);
      navigate(targetRoute, { replace: true });
    } catch (err) {
      console.error('Critical submission error:', err);
      toast({
        variant: 'destructive',
        title: 'Erro de ligação',
        description: 'Ocorreu um erro de rede. Verifique a sua ligação à internet.',
      });
    } finally {
      setIsLoading(false);
      console.groupEnd();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/10 backdrop-blur-xl">
        <CardHeader className="space-y-4 text-center pb-8">
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
                render={({ field }) => {
                  const { ref: _emailRef, ...emailField } = field;
                  return (
                    <FormItem>
                      <FormLabel className="text-slate-300">Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="seu@email.com"
                          autoComplete="email"
                          disabled={isLoading}
                          className="bg-white/10 border-white/20 text-white placeholder:text-slate-500 focus:border-blue-400"
                          {...emailField}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => {
                  const { ref: _passwordRef, ...passwordField } = field;
                  return (
                    <FormItem>
                      <FormLabel className="text-slate-300">Palavra-passe</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          autoComplete="current-password"
                          disabled={isLoading}
                          className="bg-white/10 border-white/20 text-white placeholder:text-slate-500 focus:border-blue-400"
                          {...passwordField}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <Button
                type="submit"
                className="w-full h-11 text-base bg-blue-600 hover:bg-blue-700 transition-all duration-200"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    A entrar...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-6 pt-6 border-t border-white/10 text-center">
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
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
