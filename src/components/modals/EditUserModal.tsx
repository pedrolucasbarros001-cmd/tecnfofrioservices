import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { humanizeError } from '@/utils/errorMessages';
import { AppRole } from '@/types/database';

const formSchema = z.object({
  full_name: z.string().min(1, 'Nome é obrigatório'),
  phone: z.string().optional(),
  role: z.enum(['dono', 'secretaria', 'tecnico', 'monitor']),
  specialization: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface UserData {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: AppRole | null;
  specialization?: string | null;
}

interface EditUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserData | null;
  onSuccess?: () => void;
}

export function EditUserModal({ open, onOpenChange, user, onSuccess }: EditUserModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showRoleConfirm, setShowRoleConfirm] = useState(false);
  const [pendingRole, setPendingRole] = useState<AppRole | null>(null);
  const [technicianData, setTechnicianData] = useState<{ id: string; specialization: string | null } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: '',
      phone: '',
      role: 'tecnico',
      specialization: '',
    },
  });

  const currentRole = form.watch('role');

  // Load technician data if user is a technician
  useEffect(() => {
    if (user && user.role === 'tecnico') {
      loadTechnicianData();
    }
  }, [user]);

  const loadTechnicianData = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('technicians')
      .select('id, specialization')
      .eq('profile_id', user.id)
      .maybeSingle();

    if (!error && data) {
      setTechnicianData(data);
      form.setValue('specialization', data.specialization || '');
    }
  };

  // Reset form when user changes
  useEffect(() => {
    if (user) {
      form.reset({
        full_name: user.full_name || '',
        phone: user.phone || '',
        role: user.role || 'tecnico',
        specialization: technicianData?.specialization || '',
      });
    }
  }, [user, technicianData, form]);

  const handleRoleChange = (newRole: AppRole) => {
    if (user && newRole !== user.role) {
      setPendingRole(newRole);
      setShowRoleConfirm(true);
    } else {
      form.setValue('role', newRole);
    }
  };

  const confirmRoleChange = () => {
    if (pendingRole) {
      form.setValue('role', pendingRole);
    }
    setShowRoleConfirm(false);
    setPendingRole(null);
  };

  const handleSubmit = async (values: FormValues) => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: values.full_name,
          phone: values.phone || null,
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Update role if changed
      if (values.role !== user.role) {
        // Delete old role
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', user.user_id);

        // Insert new role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: user.user_id,
            role: values.role,
          });

        if (roleError) throw roleError;

        // Handle technician record
        if (values.role === 'tecnico' && !technicianData) {
          // Create technician record
          await supabase
            .from('technicians')
            .insert({
              profile_id: user.id,
              specialization: values.specialization || null,
            });
        } else if (values.role !== 'tecnico' && technicianData) {
          // Deactivate technician record
          await supabase
            .from('technicians')
            .update({ active: false })
            .eq('id', technicianData.id);
        }
      }

      // Update technician specialization if still a technician
      if (values.role === 'tecnico' && technicianData) {
        await supabase
          .from('technicians')
          .update({ specialization: values.specialization || null })
          .eq('id', technicianData.id);
      }

      toast.success('Perfil atualizado com sucesso.');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(humanizeError(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    form.reset();
    setTechnicianData(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg max-w-[95vw] max-h-[90vh] flex flex-col overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
            <DialogTitle>Editar Utilizador</DialogTitle>
            <p className="text-sm text-muted-foreground">Altere os dados do perfil. O nível de acesso define as permissões no sistema.</p>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
             <div className="flex-1 overflow-y-auto min-h-0 px-6">
              <div className="space-y-4 py-4">
              {/* Email (read-only) */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Email
                </label>
                <p className="text-sm bg-muted px-3 py-2 rounded-md">
                  {user?.email || '-'}
                </p>
              </div>

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
                    <Select
                      value={field.value}
                      onValueChange={(value) => handleRoleChange(value as AppRole)}
                    >
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

              {currentRole === 'tecnico' && (
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
                  {isLoading ? 'A guardar...' : 'Guardar Alterações'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Role Change Confirmation */}
      <AlertDialog open={showRoleConfirm} onOpenChange={setShowRoleConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterar Nível de Acesso</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja alterar o nível de acesso deste utilizador?
              Esta ação pode afetar as permissões e funcionalidades disponíveis.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingRole(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChange}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
