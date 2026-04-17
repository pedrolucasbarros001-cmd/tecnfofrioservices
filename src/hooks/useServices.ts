import { useQuery, useMutation, useQueryClient, QueryClient } from '@tanstack/react-query';
import { supabase, ensureValidSession, isSessionOrRlsError } from '@/integrations/supabase/client';
import type { Service, ServiceStatus, ServicePart, ServicePhoto, ServiceSignature, ServicePayment, ServiceDocument } from '@/types/database';
import { toast } from 'sonner';

import { invalidateServiceQueries } from '@/lib/queryInvalidation';

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
      } else if (status === 'em_debito') {
        // special derived filter: handled after fetch
      } else if (status !== 'all') {
        query = query.eq('status', status);
      }

      if (location !== 'all') {
        query = query.eq('service_location', location);
      }

      if (technicianId) {
        query = query.eq('technician_id', technicianId);
      }

      // BUG-04 FIX: Increased from 200 to 500. If we hit the limit, warn the user.
      const LIMIT = 500;
      const { data, error } = await query.limit(LIMIT);

      if (error) throw error;
      let services = (data as unknown as Service[]) || [];

      // Warn when result is exactly at limit — data may be silently truncated
      if (services.length === LIMIT) {
        toast.warning('Atenção: a lista está truncada. Use filtros para ver todos os serviços.');
      }
      if (status === 'em_debito') {
        services = services.filter(s =>
          (s.final_price ?? 0) > 0 && (s.amount_paid ?? 0) < (s.final_price ?? 0)
        );
      }
      return services;
    },
    // Realtime handles updates — no polling needed
  });
}

// Shared fetch logic — used by both useFullServiceData and prefetchFullServiceData
async function fetchFullServiceById(serviceId: string) {
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
      documents:service_documents(*)
    `)
    .eq('id', serviceId)
    .single();

  if (error) throw error;
  if (!data) return null;

  const result = data as any;

  const safeDate = (d: any) => {
    if (!d) return 0;
    const t = new Date(d).getTime();
    return isNaN(t) ? 0 : t;
  };

  const safeSort = (arr: any[], dateKey: string) =>
    Array.isArray(arr)
      ? [...arr].sort((a, b) => safeDate(b[dateKey]) - safeDate(a[dateKey]))
      : [];

  return {
    ...result,
    parts: result.parts || [],
    photos: safeSort(result.photos, 'uploaded_at'),
    signatures: (result.signatures || []).sort((a: any, b: any) =>
      safeDate(a.signed_at) - safeDate(b.signed_at)
    ),
    payments: safeSort(result.payments, 'payment_date'),
    documents: safeSort(result.documents, 'created_at'),
    logs: [],
  } as Service & {
    parts: ServicePart[];
    photos: ServicePhoto[];
    signatures: ServiceSignature[];
    payments: (ServicePayment & { receiver?: { full_name: string | null } })[];
    documents: ServiceDocument[];
    logs: any[];
  };
}

export function useFullServiceData(serviceId: string | undefined, enabled: boolean = true) {
  return useQuery({
    queryKey: ['service-full', serviceId],
    queryFn: () => fetchFullServiceById(serviceId!),
    enabled: !!serviceId && enabled,
    staleTime: 1000 * 30,
  });
}

export function prefetchFullServiceData(queryClient: QueryClient, serviceId: string) {
  return queryClient.prefetchQuery({
    queryKey: ['service-full', serviceId],
    queryFn: () => fetchFullServiceById(serviceId),
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
      } else if (status === 'em_debito') {
        // leave baseQuery unfiltered; we will filter results below
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
        const serviceFieldsQuery = buildFilteredQuery()
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
        } else if (status === 'em_debito') {
          // no filter here, we'll post-process below
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
        // apply derived debt filter after retrieval when requested
        if (status === 'em_debito') {
          allServices = allServices.filter(s =>
            (s.final_price ?? 0) > 0 && (s.amount_paid ?? 0) < (s.final_price ?? 0)
          );
          totalCount = allServices.length;
        } else {
          totalCount = count || 0;
        }
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
    onSuccess: (data) => {
      invalidateServiceQueries(queryClient, data?.id);
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
    mutationFn: async ({ id, skipToast, shouldSelect = true, ...updates }: Partial<Service> & { id: string; skipToast?: boolean; shouldSelect?: boolean }) => {      // guard: financial updates should not carry an unrelated status change
      // Define which financial fields should NEVER accompany a status
      // mutation.  `pending_pricing` is intentionally omitted since there
      // are legitimate business rules where both properties are updated
      // together (e.g. service completion that marks status=a_precificar
      // *and* pending_pricing=true).  Other fields like final_price or
      // amount_paid belong strictly to the financial axis and must not
      // drag the operational status along with them.
      const financialKeysPreventingStatus = [
        'final_price',
        'labor_cost',
        'parts_cost',
        'discount',
        'pricing_description',
        'amount_paid',
      ];
      if (
        updates.status &&
        Object.keys(updates).some(k => financialKeysPreventingStatus.includes(k)) &&
        updates.pending_pricing !== false
      ) {
        console.warn(
          '[useUpdateService] Dropping status because unrelated financial fields are present',
          updates
        );
        delete (updates as any).status;
      }
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
      await queryClient.cancelQueries({ queryKey: ['service-full', newService.id] });
      await queryClient.cancelQueries({ queryKey: ['services'] });
      await queryClient.cancelQueries({ queryKey: ['services-paginated'] });

      // Snapshot the previous value
      const previousService = queryClient.getQueryData(['service-full', newService.id]);

      // Optimistically update to the new value
      if (previousService) {
        queryClient.setQueryData(['service-full', newService.id], (old: any) => ({
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
        queryClient.setQueryData(['service-full', newService.id], context.previousService);
      }
      // We can't easily rollback lists without snapshotting them all, but invalidation will fix it
    },
    onSettled: (data, error, variables) => {
      invalidateServiceQueries(queryClient, variables.id);

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
      invalidateServiceQueries(queryClient);
      toast.success('Serviço eliminado!');
    },
    onError: (error) => {
      console.error('Error deleting service:', error);
      toast.error('Erro ao eliminar serviço');
    },
  });
}
