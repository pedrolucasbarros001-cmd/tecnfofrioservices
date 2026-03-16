import { QueryClient } from "@tanstack/react-query";

/**
 * Centralized cache invalidation after any service-related mutation.
 * Call this after create/update/delete on services, parts, photos, signatures, payments.
 * This ensures ALL views (admin, secretary, technician, workshop, paginated) refresh immediately.
 *
 * @param serviceId - optional: also invalidates service-specific queries (full data, parts, photos, etc.)
 */
export function invalidateServiceQueries(queryClient: QueryClient, serviceId?: string) {
  // All service list queries
  queryClient.invalidateQueries({ queryKey: ['services'] });
  queryClient.invalidateQueries({ queryKey: ['services-paginated'] });
  queryClient.invalidateQueries({ queryKey: ['technician-services'] });
  queryClient.invalidateQueries({ queryKey: ['technician-office-services'] });
  queryClient.invalidateQueries({ queryKey: ['available-workshop-services'] });
  queryClient.invalidateQueries({ queryKey: ['tv-monitor-services'] });

  // Service-specific queries (detail views)
  if (serviceId) {
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

  // Related entities
  queryClient.invalidateQueries({ queryKey: ['pending-parts'] });
  queryClient.invalidateQueries({ queryKey: ['all-pending-parts'] });
}

/**
 * Invalidate customer-related queries after customer mutations.
 */
export function invalidateCustomerQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['customers'] });
  queryClient.invalidateQueries({ queryKey: ['customers-paginated'] });
}
