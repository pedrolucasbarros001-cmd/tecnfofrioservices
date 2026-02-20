-- Add flow_step and flow_data to services for persistence
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS flow_step TEXT,
ADD COLUMN IF NOT EXISTS flow_data JSONB DEFAULT '{}'::jsonb;

-- Update the technician_update_service function to support these new columns
CREATE OR REPLACE FUNCTION public.technician_update_service(
  _service_id       UUID,
  _status           TEXT    DEFAULT NULL,
  _detected_fault   TEXT    DEFAULT NULL,
  _work_performed   TEXT    DEFAULT NULL,
  _pending_pricing  BOOLEAN DEFAULT NULL,
  _last_status_before_part_request TEXT DEFAULT NULL,
  _flow_step        TEXT    DEFAULT NULL,
  _flow_data        JSONB   DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_id UUID;
  _is_assigned BOOLEAN;
  _is_privileged BOOLEAN;
BEGIN
  _caller_id := auth.uid();

  -- Check if caller is assigned technician
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
    detected_fault   = COALESCE(NULLIF(_detected_fault, ''), detected_fault),
    work_performed   = COALESCE(NULLIF(_work_performed, ''), work_performed),
    pending_pricing  = COALESCE(_pending_pricing, pending_pricing),
    last_status_before_part_request = COALESCE(
                         _last_status_before_part_request,
                         last_status_before_part_request),
    flow_step        = COALESCE(_flow_step, flow_step),
    flow_data        = COALESCE(_flow_data, flow_data),
    updated_at       = now()
  WHERE id = _service_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.technician_update_service(UUID, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT, JSONB) TO authenticated;
