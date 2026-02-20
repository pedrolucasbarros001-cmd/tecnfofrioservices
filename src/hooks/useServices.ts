import { useQuery, useMutation, useQueryClient, QueryClient } from '@tanstack/react-query';
import { supabase, ensureValidSession, isSessionOrRlsError } from '@/integrations/supabase/client';
import type { Service, ServiceStatus } from '@/types/database';
import { toast } from 'sonner';

// Helper para invalidar TODAS as queries de serviços
function invalidateAllServiceQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['services'] });
  queryClient.invalidateQueries({ queryKey: ['services-paginated'] });
  queryClient.invalidateQueries({ queryKey: ['technician-services'] });
  queryClient.invalidateQueries({ queryKey: ['technician-office-services'] });
  queryClient.invalidateQueries({ queryKey: ['available-workshop-services'] });
}

interface UseServicesOptions {
  status?: ServiceStatus | 'all' | 'pending_pricing';
  location?: 'cliente' | 'oficina' | 'all';
  technicianId?: string;
}

interface UsePaginatedServicesOptions extends UseServicesOptions {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
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
        .order('scheduled_date', { ascending: true, nullsFirst: false })
        .order('scheduled_shift', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (status === 'pending_pricing') {
        query = query.eq('pending_pricing', true);
      } else if (status !== 'all') {
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
    refetchInterval: 30000,
  });
}

export function useFullServiceData(serviceId: string | undefined, enabled: boolean = true) {
  return useQuery({
    queryKey: ['service-full', serviceId],
    queryFn: async () => {
      if (!serviceId) return null;

      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          customer:customers(*),
          technician:technicians!services_technician_id_fkey(*, profile:profiles(*)),
          parts:service_parts(*),
          photos:service_photos(*),
          signatures:service_signatures(*),
          payments:service_payments(*),
          logs:activity_logs(*, actor:profiles!activity_logs_actor_id_fkey(full_name))
        `)
        .eq('id', serviceId)
        .single();

      if (error) throw error;

      // Ensure arrays are initialized even if empty
      const result = data as any;
      return {
        ...result,
        parts: result.parts || [],
        photos: (result.photos || []).sort((a: any, b: any) =>
          new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
        ),
        signatures: (result.signatures || []).sort((a: any, b: any) =>
          new Date(a.signed_at).getTime() - new Date(b.signed_at).getTime()
        ),
        payments: (result.payments || []).sort((a: any, b: any) =>
          new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
        ),
        logs: (result.logs || []).sort((a: any, b: any) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ),
      } as Service & {
        parts: ServicePart[],
        photos: ServicePhoto[],
        signatures: ServiceSignature[],
        payments: (ServicePayment & { receiver?: { full_name: string | null } })[],
        logs: any[]
      };
    },
    enabled: !!serviceId && enabled,
    staleTime: 1000 * 30, // Keep for 30s as it's a "heavy" but critical query
  });
}

export function prefetchFullServiceData(queryClient: QueryClient, serviceId: string) {
  return queryClient.prefetchQuery({
    queryKey: ['service-full', serviceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          customer:customers(*),
          technician:technicians!services_technician_id_fkey(*, profile:profiles(*)),
          parts:service_parts(*),
          photos:service_photos(*),
          signatures:service_signatures(*),
          payments:service_payments(*),
          logs:activity_logs(*, actor:profiles!activity_logs_actor_id_fkey(full_name))
        `)
        .eq('id', serviceId)
        .single();

      if (error) throw error;

      const result = data as any;
      return {
        ...result,
        parts: result.parts || [],
        photos: (result.photos || []).sort((a: any, b: any) =>
          new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
        ),
        signatures: (result.signatures || []).sort((a: any, b: any) =>
          new Date(a.signed_at).getTime() - new Date(b.signed_at).getTime()
        ),
        payments: (result.payments || []).sort((a: any, b: any) =>
          new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
        ),
        logs: (result.logs || []).sort((a: any, b: any) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ),
      };
    },
    staleTime: 1000 * 30,
  });
}

export function usePaginatedServices(options: UsePaginatedServicesOptions = {}) {
  const { status = 'all', location = 'all', technicianId, page = 1, pageSize = 50, searchTerm } = options;

  return useQuery({
    queryKey: ['services-paginated', status, location, technicianId, page, pageSize, searchTerm],
    queryFn: async () => {
      // Build base filters
      let baseQuery = supabase
        .from('services')
        .select(`
          *,
          customer:customers(*),
          technician:technicians!services_technician_id_fkey(*, profile:profiles(*))
        `);

      if (status === 'pending_pricing') {
        baseQuery = baseQuery.eq('pending_pricing', true);
      } else if (status !== 'all') {
        baseQuery = baseQuery.eq('status', status);
      }

      if (location !== 'all') {
        baseQuery = baseQuery.eq('service_location', location);
      }

      if (technicianId) {
        baseQuery = baseQuery.eq('technician_id', technicianId);
      }

      let allServices: Service[] = [];
      let totalCount = 0;

      if (searchTerm) {
        // First, search for customers matching the search term
        let customerIds: string[] = [];
        try {
          const { data: matchingCustomers, error: customerError } = await supabase
            .from('customers')
            .select('id')
            .or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);

          if (!customerError && matchingCustomers) {
            customerIds = matchingCustomers.map(c => c.id);
          }
        } catch (err) {
          // If customer search fails, continue with service field search only
          console.warn('Error searching customers:', err);
        }

        // Helper function to build a fresh query with all filters
        const buildFilteredQuery = () => {
          let query = supabase
            .from('services')
            .select(`
              *,
              customer:customers(*),
              technician:technicians!services_technician_id_fkey(*, profile:profiles(*))
            `);

          if (status === 'pending_pricing') {
            query = query.eq('pending_pricing', true);
          } else if (status !== 'all') {
            query = query.eq('status', status);
          }

          if (location !== 'all') {
            query = query.eq('service_location', location);
          }

          if (technicianId) {
            query = query.eq('technician_id', technicianId);
          }

          return query;
        };

        // Query 1: Services matching searchTerm in service fields
        let serviceFieldsQuery = buildFilteredQuery()
          .or(`code.ilike.%${searchTerm}%,appliance_type.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%,fault_description.ilike.%${searchTerm}%`);

        const { data: servicesByFields, error: error1 } = await serviceFieldsQuery;
        if (error1) throw error1;

        // Query 2: Services with matching customer_id (if any customers matched)
        let servicesByCustomer: Service[] = [];
        if (customerIds.length > 0) {
          let customerQuery = buildFilteredQuery().in('customer_id', customerIds);
          const { data: servicesByCustomerData, error: error2 } = await customerQuery;
          if (error2) throw error2;
          servicesByCustomer = (servicesByCustomerData as unknown as Service[]) || [];
        }

        // Combine and deduplicate results
        const serviceMap = new Map<string, Service>();
        (servicesByFields || []).forEach(s => serviceMap.set(s.id, s as Service));
        servicesByCustomer.forEach(s => serviceMap.set(s.id, s));

        allServices = Array.from(serviceMap.values());
        totalCount = allServices.length;

        // Sort combined results
        allServices.sort((a, b) => {
          // Sort by scheduled_date first
          if (a.scheduled_date && b.scheduled_date) {
            const dateDiff = new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime();
            if (dateDiff !== 0) return dateDiff;
          } else if (a.scheduled_date) return -1;
          else if (b.scheduled_date) return 1;

          // Then by scheduled_shift
          if (a.scheduled_shift && b.scheduled_shift) {
            const shiftOrder = { manha: 1, tarde: 2, noite: 3 };
            const shiftDiff = (shiftOrder[a.scheduled_shift as keyof typeof shiftOrder] || 0) -
              (shiftOrder[b.scheduled_shift as keyof typeof shiftOrder] || 0);
            if (shiftDiff !== 0) return shiftDiff;
          }

          // Finally by created_at
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        // Apply pagination
        const from = (page - 1) * pageSize;
        const to = from + pageSize;
        allServices = allServices.slice(from, to);
      } else {
        // No search term - use simple pagination
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        // Rebuild query with count
        let paginatedQuery = supabase
          .from('services')
          .select(`
            *,
            customer:customers(*),
            technician:technicians!services_technician_id_fkey(*, profile:profiles(*))
          `, { count: 'exact' })
          .order('scheduled_date', { ascending: true, nullsFirst: false })
          .order('scheduled_shift', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: false })
          .range(from, to);

        if (status === 'pending_pricing') {
          paginatedQuery = paginatedQuery.eq('pending_pricing', true);
        } else if (status !== 'all') {
          paginatedQuery = paginatedQuery.eq('status', status);
        }

        if (location !== 'all') {
          paginatedQuery = paginatedQuery.eq('service_location', location);
        }

        if (technicianId) {
          paginatedQuery = paginatedQuery.eq('technician_id', technicianId);
        }

        const { data, error, count } = await paginatedQuery;
        if (error) throw error;

        allServices = (data as unknown as Service[]) || [];
        totalCount = count || 0;
      }

      return {
        data: allServices,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      };
    },
    refetchInterval: 30000,
    placeholderData: (prev) => prev,
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (serviceData: Partial<Service>) => {
      await ensureValidSession();

      const { data, error } = await supabase
        .from('services')
        .insert(serviceData as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateAllServiceQueries(queryClient);
      toast.success('Serviço criado com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Error creating service:', error);
      if (isSessionOrRlsError(error)) {
        toast.error('Sessão expirada. Por favor, faça login novamente.');
      } else {
        toast.error('Erro ao criar serviço');
      }
    },
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, skipToast, shouldSelect = true, ...updates }: Partial<Service> & { id: string; skipToast?: boolean; shouldSelect?: boolean }) => {
      const query = supabase
        .from('services')
        .update(updates as any)
        .eq('id', id);

      if (shouldSelect) {
        const { data, error } = await query.select().single();
        if (error) throw error;
        return { data, skipToast };
      } else {
        const { error } = await query;
        if (error) throw error;
        return { data: null, skipToast };
      }
    },
    onMutate: async (newService) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['service', newService.id] });
      await queryClient.cancelQueries({ queryKey: ['services'] });
      await queryClient.cancelQueries({ queryKey: ['services-paginated'] });

      // Snapshot the previous value
      const previousService = queryClient.getQueryData(['service', newService.id]);

      // Optimistically update to the new value
      if (previousService) {
        queryClient.setQueryData(['service', newService.id], (old: any) => ({
          ...old,
          ...newService,
        }));
      }

      // Also update in lists if found
      queryClient.setQueriesData({ queryKey: ['services'] }, (old: any) => {
        if (!old) return old;
        if (Array.isArray(old)) {
          return old.map((service: any) =>
            service.id === newService.id ? { ...service, ...newService } : service
          );
        }
        return old;
      });

      // Update paginated lists
      queryClient.setQueriesData({ queryKey: ['services-paginated'] }, (old: any) => {
        if (!old || !old.data) return old;
        return {
          ...old,
          data: old.data.map((service: any) =>
            service.id === newService.id ? { ...service, ...newService } : service
          ),
        };
      });

      // Return a context object with the snapshotted value
      return { previousService };
    },
    onError: (error, newService, context) => {
      console.error('Error updating service:', error);
      toast.error('Erro ao atualizar serviço');

      // Rollback to the previous value if we have it
      if (context?.previousService) {
        queryClient.setQueryData(['service', newService.id], context.previousService);
      }
      // We can't easily rollback lists without snapshotting them all, but invalidation will fix it
    },
    onSettled: (data, error, variables) => {
      // Always refetch after error or success to ensure cache consistency
      queryClient.invalidateQueries({ queryKey: ['service', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['services-paginated'] });

      // Also invalidate technician specific lists
      queryClient.invalidateQueries({ queryKey: ['technician-services'] });
      queryClient.invalidateQueries({ queryKey: ['technician-office-services'] });
      queryClient.invalidateQueries({ queryKey: ['available-workshop-services'] });

      if (data && !data.skipToast) {
        toast.success('Serviço atualizado!');
      }
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
      invalidateAllServiceQueries(queryClient);
      toast.success('Serviço eliminado!');
    },
    onError: (error) => {
      console.error('Error deleting service:', error);
      toast.error('Erro ao eliminar serviço');
    },
  });
}
