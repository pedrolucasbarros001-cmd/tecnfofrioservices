import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, ensureValidSession, isSessionOrRlsError } from '@/integrations/supabase/client';
import type { Customer } from '@/types/database';
import { toast } from 'sonner';

interface UsePaginatedCustomersOptions {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
}

export function useCustomers(searchTerm?: string) {
  return useQuery({
    queryKey: ['customers', searchTerm],
    queryFn: async () => {
      await ensureValidSession();

      let query = supabase
        .from('customers')
        .select('*')
        .is('deleted_at', null)
        .order('name', { ascending: true });

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,nif.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      let { data, error } = await query;

      // if the backend hasn't been migrated the deleted_at column won't exist
      // and the query returns an error. retry without that filter so the page
      // continues to function until the database is upgraded.
      if (error && error.message?.toLowerCase().includes('deleted_at')) {
        console.warn('Customer query failed due to missing deleted_at, retrying without filter');
        const { data: data2, error: err2 } = await supabase
          .from('customers')
          .select('*')
          .order('name', { ascending: true });
        if (err2) throw err2;
        return (data2 as Customer[]) || [];
      }

      if (error) throw error;
      return (data as Customer[]) || [];
    },
    onError: (err: unknown) => {
      console.error('Error fetching customers:', err);
      toast.error('Erro ao carregar clientes.');
    },
  });
}

export function usePaginatedCustomers({ page = 1, pageSize = 50, searchTerm }: UsePaginatedCustomersOptions = {}) {
  return useQuery({
    queryKey: ['customers-paginated', page, pageSize, searchTerm],
    queryFn: async () => {
      await ensureValidSession();

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .is('deleted_at', null)
        .order('name', { ascending: true })
        .range(from, to);

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,nif.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      let { data, error, count } = await query;

      if (error && error.message?.toLowerCase().includes('deleted_at')) {
        console.warn('Paginated customer query failed due to missing deleted_at, retrying without filter');
        const { data: data2, error: err2, count: count2 } = await supabase
          .from('customers')
          .select('*', { count: 'exact' })
          .order('name', { ascending: true })
          .range(from, to);
        if (err2) throw err2;
        return {
          data: (data2 as Customer[]) || [],
          totalCount: count2 || 0,
          totalPages: Math.ceil((count2 || 0) / pageSize),
        };
      }

      if (error) throw error;
      return {
        data: (data as Customer[]) || [],
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    },
    placeholderData: (prev) => prev,
    onError: (err: unknown) => {
      console.error('Error fetching paginated customers:', err);
      toast.error('Erro ao carregar clientes.');
    },
  });
}

export function useCustomerSearch() {
  return useMutation({
    mutationFn: async (searchTerm: string) => {
      if (!searchTerm || searchTerm.length < 2) return [];

      const { data, error } = await supabase
        .from('customers')
        .select('*')        .is('deleted_at', null)        .or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,nif.ilike.%${searchTerm}%`)
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
      await ensureValidSession();
      
      const { data, error } = await supabase
        .from('customers')
        .insert(customerData as any)
        .select()
        .single();

      if (error) throw error;
      return data as Customer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-paginated'] });
      toast.success('Cliente criado com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Error creating customer:', error);
      if (isSessionOrRlsError(error)) {
        toast.error('Sessão expirada. Por favor, faça login novamente.');
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
      queryClient.invalidateQueries({ queryKey: ['customers-paginated'] });
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
      // perform soft-delete by setting deleted_at, fallback to hard-delete if necessary
      const { error } = await supabase
        .from('customers')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) {
        // if update failed for some reason, try hard delete as last resort
        const { error: hardError } = await supabase
          .from('customers')
          .delete()
          .eq('id', id);
        if (hardError) throw hardError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-paginated'] });
      toast.success('Cliente eliminado!');
    },
    onError: (error) => {
      console.error('Error deleting customer:', error);
      toast.error('Erro ao eliminar cliente');
    },
  });
}
