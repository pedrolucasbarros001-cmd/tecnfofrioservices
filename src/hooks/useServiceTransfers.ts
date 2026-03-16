import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { invalidateServiceQueries } from '@/lib/queryInvalidation';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ServiceTransferRequest {
  id: string;
  service_id: string;
  from_technician_id: string;
  to_technician_id: string;
  status: 'pendente' | 'aceite' | 'recusado' | 'cancelado';
  message: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface TransferRequestWithDetails extends ServiceTransferRequest {
  service?: {
    id: string;
    code: string;
    customer?: { name: string } | null;
    appliance_type: string | null;
    brand: string | null;
  };
  from_technician?: {
    id: string;
    profile?: { full_name: string | null } | null;
  };
  to_technician?: {
    id: string;
    profile?: { full_name: string | null } | null;
  };
}

/**
 * Hook to get current technician ID for the logged-in user
 */
export function useCurrentTechnicianId() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['current-technician-id', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;

      const { data, error } = await supabase
        .from('technicians')
        .select('id')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (error) throw error;
      return data?.id || null;
    },
    enabled: !!profile?.id,
  });
}

/**
 * Hook to get pending transfer requests for the current technician
 */
export function usePendingTransferRequests() {
  const { data: technicianId } = useCurrentTechnicianId();

  return useQuery({
    queryKey: ['pending-transfer-requests', technicianId],
    queryFn: async () => {
      if (!technicianId) return [];

      const { data, error } = await supabase
        .from('service_transfer_requests')
        .select(`
          *,
          service:services(id, code, appliance_type, brand, customer:customers(name)),
          from_technician:technicians!service_transfer_requests_from_technician_id_fkey(id, profile:profiles(full_name)),
          to_technician:technicians!service_transfer_requests_to_technician_id_fkey(id, profile:profiles(full_name))
        `)
        .eq('to_technician_id', technicianId)
        .eq('status', 'pendente')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as unknown as TransferRequestWithDetails[]) || [];
    },
    enabled: !!technicianId,
    // Realtime handles updates — no polling needed
  });
}

/**
 * Hook to create a transfer request
 */
export function useCreateTransferRequest() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      serviceId,
      fromTechnicianId,
      toTechnicianId,
      message,
    }: {
      serviceId: string;
      fromTechnicianId: string;
      toTechnicianId: string;
      message?: string;
    }) => {
      const { data, error } = await supabase
        .from('service_transfer_requests')
        .insert({
          service_id: serviceId,
          from_technician_id: fromTechnicianId,
          to_technician_id: toTechnicianId,
          message: message || null,
          status: 'pendente',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateServiceQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['pending-transfer-requests'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Pedido de transferência enviado!');
    },
    onError: (error) => {
      console.error('Error creating transfer request:', error);
      toast.error('Erro ao enviar pedido de transferência');
    },
  });
}

/**
 * Hook to accept a transfer request
 */
export function useAcceptTransferRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      // Get the transfer request details first
      const { data: request, error: fetchError } = await supabase
        .from('service_transfer_requests')
        .select('*, service:services(code)')
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;

      // Update the transfer request status
      const { error: updateError } = await supabase
        .from('service_transfer_requests')
        .update({
          status: 'aceite',
          resolved_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Update the service to the new technician
      const { error: serviceError } = await supabase
        .from('services')
        .update({
          technician_id: request.to_technician_id,
        })
        .eq('id', request.service_id);

      if (serviceError) throw serviceError;

      return request;
    },
    onSuccess: () => {
      invalidateServiceQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['pending-transfer-requests'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Transferência aceite! O serviço foi movido para si.');
    },
    onError: (error) => {
      console.error('Error accepting transfer:', error);
      toast.error('Erro ao aceitar transferência');
    },
  });
}

/**
 * Hook to reject a transfer request
 */
export function useRejectTransferRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('service_transfer_requests')
        .update({
          status: 'recusado',
          resolved_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateServiceQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['pending-transfer-requests'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Transferência recusada.');
    },
    onError: (error) => {
      console.error('Error rejecting transfer:', error);
      toast.error('Erro ao recusar transferência');
    },
  });
}

/**
 * Hook to cancel a transfer request (by the requester)
 */
export function useCancelTransferRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('service_transfer_requests')
        .update({
          status: 'cancelado',
          resolved_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-transfer-requests'] });
      toast.success('Pedido de transferência cancelado.');
    },
    onError: (error) => {
      console.error('Error cancelling transfer:', error);
      toast.error('Erro ao cancelar pedido');
    },
  });
}
