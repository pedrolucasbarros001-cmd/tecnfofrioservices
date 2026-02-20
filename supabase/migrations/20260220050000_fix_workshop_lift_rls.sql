-- ============================================================
-- Fix: "Levantar para Oficina" sem erro de RLS
-- ============================================================
-- 
-- Problema: A política de UPDATE na tabela services não tem uma
-- cláusula WITH CHECK explícita, pelo que o PostgreSQL herda a
-- cláusula USING como WITH CHECK. Isso significa que o row
-- APÓS o UPDATE também tem de satisfazer a condição:
--   t.id = technician_id (técnico atribuído)
-- 
-- Quando o técnico define technician_id = NULL (para libertar o
-- serviço para a oficina), o row pós-update não passa nesta
-- verificação e o PostgreSQL rejeita a operação.
--
-- Solução: Função SECURITY DEFINER que corre como o dono da BD,
-- bypassando o RLS. A função verifica manualmente que quem chama
-- é realmente o técnico atribuído ao serviço antes de executar.
-- ============================================================

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

  -- Verify the caller is the assigned technician OR has admin access
  SELECT EXISTS (
    SELECT 1 FROM public.services s
    JOIN public.technicians t ON s.technician_id = t.id
    JOIN public.profiles p ON t.profile_id = p.id
    WHERE s.id = _service_id AND p.user_id = _caller_id
  ) INTO _is_assigned;

  SELECT (
    public.is_dono(_caller_id) OR public.is_secretaria(_caller_id)
  ) INTO _is_privileged;

  IF NOT _is_assigned AND NOT _is_privileged THEN
    RAISE EXCEPTION 'Não tem permissão para levantar este serviço para oficina.';
  END IF;

  -- Execute the update. As SECURITY DEFINER, bypasses RLS.
  UPDATE public.services
  SET
    status = 'na_oficina',
    service_location = 'oficina',
    technician_id = NULL,
    scheduled_date = NULL,
    scheduled_shift = NULL,
    detected_fault = COALESCE(_detected_fault, detected_fault),
    updated_at = now()
  WHERE id = _service_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.lift_service_to_workshop(UUID, TEXT) TO authenticated;
