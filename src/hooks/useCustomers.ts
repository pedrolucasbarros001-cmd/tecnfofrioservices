import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Customer } from '@/types/database';
import { toast } from 'sonner';

export function useCustomers(searchTerm?: string) {
  return useQuery({
    queryKey: ['customers', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true });

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,nif.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data as Customer[]) || [];
    },
  });
}

export function useCustomerSearch() {
  return useMutation({
    mutationFn: async (searchTerm: string) => {
      if (!searchTerm || searchTerm.length < 2) return [];

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,nif.ilike.%${searchTerm}%`)
        .limit(10);

      if (error) throw error;
      return (data as Customer[]) || [];
    },
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customerData: Partial<Customer>) => {
      // Verificar sessão antes de tentar inserir
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw new Error('Erro ao verificar sessão. Por favor, faça login novamente.');
      }
      
      if (!session) {
        console.error('No active session - user needs to re-authenticate');
        throw new Error('Sessão expirada. Por favor, faça login novamente.');
      }
      
      console.log('Creating customer with user:', session.user.id);
      
      const { data, error } = await supabase
        .from('customers')
        .insert(customerData as any)
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }
      return data as Customer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Cliente criado com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Error creating customer:', error);
      if (error.message.includes('Sessão expirada') || error.message.includes('login novamente')) {
        toast.error(error.message);
      } else {
        toast.error('Erro ao criar cliente');
      }
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Customer> & { id: string }) => {
      const { data, error } = await supabase
        .from('customers')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Customer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Cliente atualizado!');
    },
    onError: (error) => {
      console.error('Error updating customer:', error);
      toast.error('Erro ao atualizar cliente');
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Cliente eliminado!');
    },
    onError: (error) => {
      console.error('Error deleting customer:', error);
      toast.error('Erro ao eliminar cliente');
    },
  });
}
