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
      let query = supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true });

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,nif.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      return (data as Customer[]) || [];
    },
  });
}

export function usePaginatedCustomers({ page = 1, pageSize = 50, searchTerm }: UsePaginatedCustomersOptions = {}) {
  return useQuery({
    queryKey: ['customers-paginated', page, pageSize, searchTerm],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Build base query
      let countQuery = supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      let dataQuery = supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true })
        .range(from, to);

      // Apply search filter to both queries
      if (searchTerm) {
        const searchFilter = `name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,nif.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`;
        countQuery = countQuery.or(searchFilter);
        dataQuery = dataQuery.or(searchFilter);
      }

      // Execute both queries in parallel
      const [{ count, error: countError }, { data, error: dataError }] = await Promise.all([
        countQuery,
        dataQuery,
      ]);

      if (countError) throw countError;
      if (dataError) throw dataError;

      return {
        data: (data as Customer[]) || [],
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    },
    placeholderData: (prev) => prev,
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
      // Hard delete as the schema doesn't support soft delete (no deleted_at column)
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;
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
