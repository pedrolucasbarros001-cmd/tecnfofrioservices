import { QueryClient } from "@tanstack/react-query";

type InvalidationScope = 'all' | 'detail' | 'list';

/**
 * Centralized cache invalidation after any service-related mutation.
 * Call this after create/update/delete on services, parts, photos, signatures, payments.
 *
 * @param serviceId - optional: also invalidates service-specific queries
 * @param scope - 'all' (default, backwards-compatible), 'detail' (only service-specific), 'list' (only lists)
 */
export function invalidateServiceQueries(
  queryClient: QueryClient,
  serviceId?: string,
  scope: InvalidationScope = 'all'
) {
  const invalidateLists = scope === 'all' || scope === 'list';
  const invalidateDetail = scope === 'all' || scope === 'detail';

  if (invalidateLists) {
    queryClient.invalidateQueries({ queryKey: ['services'] });
    queryClient.invalidateQueries({ queryKey: ['services-paginated'] });
    queryClient.invalidateQueries({ queryKey: ['technician-services'] });
    queryClient.invalidateQueries({ queryKey: ['technician-office-services'] });
    queryClient.invalidateQueries({ queryKey: ['available-workshop-services'] });
    queryClient.invalidateQueries({ queryKey: ['tv-monitor-services'] });
    queryClient.invalidateQueries({ queryKey: ['pending-parts'] });
    queryClient.invalidateQueries({ queryKey: ['all-pending-parts'] });
  }

  if (serviceId && invalidateDetail) {
    queryClient.invalidateQueries({ queryKey: ['service', serviceId] });
    queryClient.invalidateQueries({ queryKey: ['service-full', serviceId] });
    queryClient.invalidateQueries({ queryKey: ['service-parts', serviceId] });
    queryClient.invalidateQueries({ queryKey: ['service-parts-edit', serviceId] });
    queryClient.invalidateQueries({ queryKey: ['service-photos', serviceId] });
    queryClient.invalidateQueries({ queryKey: ['service-signatures', serviceId] });
    queryClient.invalidateQueries({ queryKey: ['service-payments', serviceId] });
    queryClient.invalidateQueries({ queryKey: ['activity-logs', serviceId] });
    queryClient.invalidateQueries({ queryKey: ['service-financial', serviceId] });
  }
}

/**
 * Invalidate customer-related queries after customer mutations.
 */
export function invalidateCustomerQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['customers'] });
  queryClient.invalidateQueries({ queryKey: ['customers-paginated'] });
}
