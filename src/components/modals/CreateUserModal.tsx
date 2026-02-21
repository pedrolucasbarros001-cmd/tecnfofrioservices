import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Key } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { humanizeError } from '@/utils/errorMessages';

const formSchema = z.object({
  full_name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string()
    .min(8, 'Palavra-passe deve ter pelo menos 8 caracteres')
    .regex(/[A-Z]/, 'Deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'Deve conter pelo menos um número'),
  phone: z.string().optional(),
  role: z.enum(['dono', 'secretaria', 'tecnico']),
  specialization: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface CreatedUserCredentials {
  email: string;
  role: 'dono' | 'secretaria' | 'tecnico';
}

export function CreateUserModal({ open, onOpenChange, onSuccess }: CreateUserModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<CreatedUserCredentials | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
      phone: '',
      role: 'tecnico',
      specialization: '',
    },
  });

  const selectedRole = form.watch('role');

  const handleSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Sessão expirada. Por favor, faça login novamente.');
        return;
      }

      // Call the invite-user edge function
      const response = await fetch(
        `https://flialeqlwrtfnonxtsnx.supabase.co/functions/v1/invite-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email: values.email,
            full_name: values.full_name,
            password: values.password,
            role: values.role,
            phone: values.phone || undefined,
            specialization: values.specialization || undefined,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar utilizador');
      }

      // Show credentials to admin
      setCreatedCredentials({
        email: result.email,
        role: values.role,
      });

      toast.success('Utilizador criado! Credenciais disponíveis abaixo.');
      form.reset();
      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(humanizeError(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setCreatedCredentials(null);
    onOpenChange(false);
    form.reset();
  };

  // If credentials were created, show the success view
  if (createdCredentials) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg w-[95vw] max-h-[90vh] flex flex-col overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-green-600" />
              Utilizador Criado com Sucesso
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0 px-6">
          <Alert className="border-green-200 bg-green-50">
            <AlertTitle className="text-green-800">Credenciais de Acesso</AlertTitle>
            <AlertDescription className="mt-3 space-y-3">
              <p className="text-sm text-green-700">
                Guarde estas credenciais e comunique-as ao novo utilizador de forma segura.
              </p>
              
              <div className="bg-white rounded-lg p-4 border border-green-200 space-y-3">
                <div>
                  <span className="text-xs text-muted-foreground uppercase">Email</span>
                  <p className="font-mono font-medium">{createdCredentials.email}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground uppercase">Palavra-passe</span>
                  <p className="text-green-700 font-medium">Definida pelo administrador</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground uppercase">Nível de Acesso</span>
                  <p className="font-medium">
                    {createdCredentials.role === 'dono' ? 'Administrador' : 
                     createdCredentials.role === 'secretaria' ? 'Secretária' : 'Técnico'}
                  </p>
                </div>
                <div className="pt-2 border-t border-green-200">
                  <span className="text-xs text-muted-foreground">
                    Após login, será redirecionado para:{' '}
                    <strong className="text-green-700">
                      {createdCredentials.role === 'dono' ? '/dashboard' : 
                       createdCredentials.role === 'secretaria' ? '/geral' : '/servicos'}
                    </strong>
                  </span>
                </div>
              </div>
            </AlertDescription>
          </Alert>
          </div>

          <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
            <Button onClick={handleClose}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg w-[95vw] max-h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle>Criar Utilizador</DialogTitle>
          <p className="text-sm text-muted-foreground">Este perfil terá acesso ao sistema de acordo com o nível selecionado.</p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
           <div className="flex-1 overflow-y-auto min-h-0 px-6">
            <div className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do colaborador" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="email@exemplo.com" {...field} />
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
                  <FormLabel>Palavra-passe *</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Mínimo 8 caracteres" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input placeholder="Telefone" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nível de Acesso *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar nível" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="dono">Administrador</SelectItem>
                      <SelectItem value="secretaria">Secretária</SelectItem>
                      <SelectItem value="tecnico">Técnico</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedRole === 'tecnico' && (
              <FormField
                control={form.control}
                name="specialization"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Especialização</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Ar Condicionado, Refrigeração" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            </div>
           </div>
            <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'A criar...' : 'Criar Utilizador'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
