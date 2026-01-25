import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Service, ServiceStatus } from '@/types/database';
import { toast } from 'sonner';

interface UseServicesOptions {
  status?: ServiceStatus | 'all';
  location?: 'cliente' | 'oficina' | 'all';
  technicianId?: string;
}

export function useServices(options: UseServicesOptions = {}) {
  const { status = 'all', location = 'all', technicianId } = options;

  return useQuery({
    queryKey: ['services', status, location, technicianId],
    queryFn: async () => {
      let query = supabase
        .from('services')
        .select(`
          *,
          customer:customers(*),
          technician:technicians!services_technician_id_fkey(*, profile:profiles(*))
        `)
        .order('created_at', { ascending: false });

      if (status !== 'all') {
        query = query.eq('status', status);
      }

      if (location !== 'all') {
        query = query.eq('service_location', location);
      }

      if (technicianId) {
        query = query.eq('technician_id', technicianId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data as unknown as Service[]) || [];
    },
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (serviceData: Partial<Service>) => {
      const { data, error } = await supabase
        .from('services')
        .insert(serviceData as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Serviço criado com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating service:', error);
      toast.error('Erro ao criar serviço');
    },
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Service> & { id: string }) => {
      const { data, error } = await supabase
        .from('services')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Serviço atualizado!');
    },
    onError: (error) => {
      console.error('Error updating service:', error);
      toast.error('Erro ao atualizar serviço');
    },
  });
}

export function useDeleteService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Serviço eliminado!');
    },
    onError: (error) => {
      console.error('Error deleting service:', error);
      toast.error('Erro ao eliminar serviço');
    },
  });
}
