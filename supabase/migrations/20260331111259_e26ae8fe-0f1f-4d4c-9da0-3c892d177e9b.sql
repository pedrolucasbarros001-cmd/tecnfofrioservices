
-- Step 1: Drop the obsolete 6-parameter overload to eliminate ambiguity
DROP FUNCTION IF EXISTS public.technician_update_service(uuid, text, text, text, boolean, text);

-- Step 2: Replace the 8-parameter version with CASE WHEN logic
CREATE OR REPLACE FUNCTION public.technician_update_service(
  _service_id uuid,
  _status text DEFAULT NULL::text,
  _detected_fault text DEFAULT NULL::text,
  _work_performed text DEFAULT NULL::text,
  _pending_pricing boolean DEFAULT NULL::boolean,
  _last_status_before_part_request text DEFAULT NULL::text,
  _flow_step text DEFAULT NULL::text,
  _flow_data jsonb DEFAULT NULL::jsonb
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _caller_id UUID;
  _is_assigned BOOLEAN;
  _is_privileged BOOLEAN;
BEGIN
  _caller_id := auth.uid();

  SELECT EXISTS (
    SELECT 1 FROM public.services s
    JOIN public.technicians t ON s.technician_id = t.id
    JOIN public.profiles p ON t.profile_id = p.id
    WHERE s.id = _service_id AND p.user_id = _caller_id
  ) INTO _is_assigned;

  SELECT (public.is_dono(_caller_id) OR public.is_secretaria(_caller_id))
  INTO _is_privileged;

  IF NOT _is_assigned AND NOT _is_privileged THEN
    RAISE EXCEPTION 'Não tem permissão para atualizar este serviço.';
  END IF;

  UPDATE public.services SET
    status           = COALESCE(_status, status),
    detected_fault   = CASE WHEN _detected_fault IS NOT NULL THEN _detected_fault ELSE detected_fault END,
    work_performed   = CASE WHEN _work_performed IS NOT NULL THEN _work_performed ELSE work_performed END,
    pending_pricing  = COALESCE(_pending_pricing, pending_pricing),
    last_status_before_part_request = COALESCE(
                         _last_status_before_part_request,
                         last_status_before_part_request),
    flow_step        = _flow_step,
    flow_data        = _flow_data,
    updated_at       = now()
  WHERE id = _service_id;
END;
$function$;
