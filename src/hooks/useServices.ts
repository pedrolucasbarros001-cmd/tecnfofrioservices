import { useQuery, useMutation, useQueryClient, QueryClient } from '@tanstack/react-query';
import { supabase, ensureValidSession, isSessionOrRlsError } from '@/integrations/supabase/client';
import type { Service, ServiceStatus, ServicePart, ServicePhoto, ServiceSignature, ServicePayment } from '@/types/database';
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

      const { data, error } = await query.limit(200);

      if (error) throw error;
      return (data as unknown as Service[]) || [];
    },
    // Realtime handles updates — no polling needed
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
          payments:service_payments(*)
        `)
        .eq('id', serviceId)
        .single();

      if (error) throw error;

      // Ensure arrays are initialized even if empty
      const result = data as any;

      const safeSort = (arr: any[], dateKey: string) => {
        return (arr || []).sort((a, b) => {
          const timeA = a[dateKey] ? new Date(a[dateKey]).getTime() : 0;
          const timeB = b[dateKey] ? new Date(b[dateKey]).getTime() : 0;
          if (isNaN(timeA) && isNaN(timeB)) return 0;
          if (isNaN(timeA)) return 1;
          if (isNaN(timeB)) return -1;
          return timeB - timeA; // Descending
        });
      };

      return {
        ...result,
        parts: result.parts || [],
        photos: safeSort(result.photos, 'uploaded_at'),
        signatures: (result.signatures || []).sort((a: any, b: any) => {
          const tA = a.signed_at ? new Date(a.signed_at).getTime() : 0;
          const tB = b.signed_at ? new Date(b.signed_at).getTime() : 0;
          return (isNaN(tA) ? 0 : tA) - (isNaN(tB) ? 0 : tB);
        }),
        payments: safeSort(result.payments, 'payment_date'),
        logs: [], // Loaded separately to reduce query weight
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
          payments:service_payments(*)
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
        logs: [],
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
        let technicianIds: string[] = [];
        try {
          const [customersResult, techniciansResult] = await Promise.all([
            supabase
              .from('customers')
              .select('id')
              .or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`),
            supabase
              .from('technicians')
              .select('id, profile:profiles!inner(full_name)')
              .ilike('profile.full_name' as any, `%${searchTerm}%`),
          ]);

          if (!customersResult.error && customersResult.data) {
            customerIds = customersResult.data.map(c => c.id);
          }
          if (!techniciansResult.error && techniciansResult.data) {
            technicianIds = (techniciansResult.data as any[]).map(t => t.id);
          }
        } catch (err) {
          console.warn('Error searching customers/technicians:', err);
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
          .or(`code.ilike.%${searchTerm}%,appliance_type.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%,model.ilike.%${searchTerm}%,serial_number.ilike.%${searchTerm}%,fault_description.ilike.%${searchTerm}%,detected_fault.ilike.%${searchTerm}%,work_performed.ilike.%${searchTerm}%`);

        const { data: servicesByFields, error: error1 } = await serviceFieldsQuery;
        if (error1) throw error1;

        // Query 2: Services with matching customer_id (if any customers matched)
        // Query 3: Services with matching technician_id (if any technicians matched)
        const [servicesByCustomerResult, servicesByTechResult] = await Promise.all([
          customerIds.length > 0
            ? buildFilteredQuery().in('customer_id', customerIds).then(r => { if (r.error) throw r.error; return (r.data as unknown as Service[]) || []; })
            : Promise.resolve([] as Service[]),
          technicianIds.length > 0
            ? buildFilteredQuery().in('technician_id', technicianIds).then(r => { if (r.error) throw r.error; return (r.data as unknown as Service[]) || []; })
            : Promise.resolve([] as Service[]),
        ]);

        // Combine and deduplicate results
        const serviceMap = new Map<string, Service>();
        (servicesByFields || []).forEach(s => {
          if (s && s.id) serviceMap.set(s.id, s as Service);
        });
        servicesByCustomerResult.forEach(s => {
          if (s && s.id) serviceMap.set(s.id, s);
        });
        servicesByTechResult.forEach(s => {
          if (s && s.id) serviceMap.set(s.id, s);
        });

        allServices = Array.from(serviceMap.values());
        totalCount = allServices.length;

        // Sort by created_at descending (newest first)
        allServices.sort((a, b) => {
          const createA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const createB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return (isNaN(createB) ? 0 : createB) - (isNaN(createA) ? 0 : createA);
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
    // Realtime handles updates — no polling needed
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
