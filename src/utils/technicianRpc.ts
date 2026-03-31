import { supabase } from '@/integrations/supabase/client';

export interface TechnicianUpdateServiceInput {
  serviceId: string;
  status?: string | null;
  detectedFault?: string | null;
  workPerformed?: string | null;
  pendingPricing?: boolean | null;
  lastStatusBeforePartRequest?: string | null;
  flowStep?: string | null;
  flowData?: Record<string, unknown> | null;
}

/**
 * Wrapper estável para evitar ambiguidade entre overloads da RPC
 * technician_update_service, enviando SEMPRE os 8 parâmetros.
 */
export async function technicianUpdateService(input: TechnicianUpdateServiceInput) {
  // undefined → null (don't touch field), '' → '' (clear field), 'text' → 'text' (overwrite)
  const mapText = (v: string | null | undefined) => v === undefined ? null : v;
  return (supabase.rpc as any)('technician_update_service', {
    _service_id: input.serviceId,
    _status: input.status ?? null,
    _detected_fault: mapText(input.detectedFault),
    _work_performed: mapText(input.workPerformed),
    _pending_pricing: input.pendingPricing ?? null,
    _last_status_before_part_request: input.lastStatusBeforePartRequest ?? null,
    _flow_step: input.flowStep ?? null,
    _flow_data: input.flowData ?? null,
  });
}
