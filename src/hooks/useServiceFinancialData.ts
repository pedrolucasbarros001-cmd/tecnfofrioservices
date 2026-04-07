import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ServicePart {
  id: string;
  part_name: string;
  part_code: string | null;
  quantity: number;
  cost: number;
  iva_rate: number;
  registered_by: string | null;
  registered_location: string | null;
  created_at: string;
}

export interface ServicePayment {
  id: string;
  amount: number;
  payment_method: string | null;
  payment_date: string | null;
  description: string | null;
  received_by: string | null;
  created_at: string;
  is_pending_validation: boolean | null;
  validated_at: string | null;
  validated_by: string | null;
}

export interface GroupedParts {
  location: string;
  technicianName: string;
  technicianId: string | null;
  date: string;
  parts: ServicePart[];
  subtotal: number;
}

export function useServiceFinancialData(serviceId: string | undefined, enabled: boolean) {
  // Fetch service_parts (non-requested = articles registered by technicians)
  const partsQuery = useQuery({
    queryKey: ['service-parts-history', serviceId],
    queryFn: async () => {
      if (!serviceId) return [];
      const { data, error } = await supabase
        .from('service_parts')
        .select('id, part_name, part_code, quantity, cost, iva_rate, registered_by, registered_location, created_at')
        .eq('service_id', serviceId)
        .eq('is_requested', false)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as ServicePart[];
    },
    enabled: enabled && !!serviceId,
  });

  // Fetch all service_payments for this service
  const paymentsQuery = useQuery({
    queryKey: ['service-payments-history', serviceId],
    queryFn: async () => {
      if (!serviceId) return [];
      const { data, error } = await supabase
        .from('service_payments')
        .select('id, amount, payment_method, payment_date, description, received_by, created_at, is_pending_validation, validated_at, validated_by')
        .eq('service_id', serviceId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as ServicePayment[];
    },
    enabled: enabled && !!serviceId,
  });

  // Split into validated and pending
  const allPayments = paymentsQuery.data || [];
  const pendingPayments = allPayments.filter(p => p.is_pending_validation === true && !p.validated_at);
  const validatedPayments = allPayments.filter(p => !(p.is_pending_validation === true && !p.validated_at));

  // Collect unique user IDs from parts and payments
  const userIds = new Set<string>();
  partsQuery.data?.forEach(p => { if (p.registered_by) userIds.add(p.registered_by); });
  paymentsQuery.data?.forEach(p => { if (p.received_by) userIds.add(p.received_by); });
  const userIdArray = Array.from(userIds);

  // Fetch profiles for name resolution
  const profilesQuery = useQuery({
    queryKey: ['profiles-names', userIdArray.sort().join(',')],
    queryFn: async () => {
      if (userIdArray.length === 0) return {};
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIdArray);
      if (error) throw error;
      const map: Record<string, string> = {};
      data?.forEach(p => { map[p.user_id] = p.full_name || 'Desconhecido'; });
      return map;
    },
    enabled: enabled && userIdArray.length > 0,
  });

  const nameMap = profilesQuery.data || {};

  // Group parts by location + technician
  const groupedParts: GroupedParts[] = [];
  if (partsQuery.data && partsQuery.data.length > 0) {
    const groups = new Map<string, ServicePart[]>();
    for (const part of partsQuery.data) {
      const key = `${part.registered_location || 'oficina'}_${part.registered_by || 'unknown'}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(part);
    }
    for (const [, parts] of groups) {
      const first = parts[0];
      const loc = first.registered_location || 'oficina';
      const locationLabel = loc === 'cliente' ? 'Visita' : loc === 'oficina' ? 'Oficina' : loc;
      groupedParts.push({
        location: locationLabel,
        technicianName: first.registered_by ? (nameMap[first.registered_by] || 'Técnico') : 'Desconhecido',
        technicianId: first.registered_by,
        date: first.created_at,
        parts,
        subtotal: parts.reduce((sum, p) => sum + (p.cost || 0) * (p.quantity || 1), 0),
      });
    }
  }

  // Calculate totals (pending payments do NOT count toward the balance yet)
  const historySubtotal = groupedParts.reduce((sum, g) => sum + g.subtotal, 0);
  const totalPaid = validatedPayments.reduce((sum, p) => sum + p.amount, 0);

  return {
    parts: partsQuery.data || [],
    payments: validatedPayments,
    pendingPayments,
    groupedParts,
    nameMap,
    historySubtotal,
    totalPaid,
    isLoading: partsQuery.isLoading || paymentsQuery.isLoading || profilesQuery.isLoading,
  };
}
