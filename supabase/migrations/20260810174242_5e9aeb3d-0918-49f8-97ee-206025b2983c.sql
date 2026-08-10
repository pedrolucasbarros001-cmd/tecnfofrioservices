CREATE OR REPLACE FUNCTION public.lift_service_to_workshop(
  _service_id UUID,
  _detected_fault TEXT DEFAULT NULL
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

  SELECT EXISTS (
    SELECT 1 FROM public.services s
    JOIN public.technicians t ON s.technician_id = t.id
    JOIN public.profiles p ON t.profile_id = p.id
    WHERE s.id = _service_id AND p.user_id = _caller_id
  ) INTO _is_assigned;

  SELECT (public.is_dono(_caller_id) OR public.is_secretaria(_caller_id))
  INTO _is_privileged;

  IF NOT _is_assigned AND NOT _is_privileged THEN
    RAISE EXCEPTION 'Não tem permissão para levantar este serviço para oficina.';
  END IF;

  UPDATE public.services
  SET
    status           = 'na_oficina',
    service_location = 'oficina',
    detected_fault   = COALESCE(NULLIF(_detected_fault, ''), detected_fault),
    updated_at       = now()
  WHERE id = _service_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.lift_service_to_workshop(UUID, TEXT) TO authenticated;