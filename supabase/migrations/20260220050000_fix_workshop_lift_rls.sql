-- ============================================================
-- Fix: Todas as transições de estado por técnicos sem erro RLS
-- ============================================================
--
-- Problema raiz: A política UPDATE em services não tem WITH CHECK
-- explícita, pelo que o PostgreSQL herda USING como WITH CHECK.
-- Isto causa falhas em dois cenários:
--
-- 1. "Levantar para Oficina": técnico define technician_id=NULL.
--    O row pós-update falha a verificação USING/WITH CHECK porque
--    já não há técnico atribuído.
--
-- 2. "Começar" serviço de oficina: técnico tenta atualizar um
--    serviço com technician_id=NULL (sem técnico atribuído).
--    A verificação USING falha porque o técnico não está no row.
--
-- Solução: Funções SECURITY DEFINER que correm como dono da BD
-- e verificam manualmente as permissões antes de executar.
-- ============================================================

-- ─── 1. Levantar para Oficina ─────────────────────────────────
-- Liberta o técnico do serviço e move para a oficina sem técnico.
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

  -- Verify caller is assigned technician OR admin
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
    status             = 'na_oficina',
    service_location   = 'oficina',
    technician_id      = NULL,
    scheduled_date     = NULL,
    scheduled_shift    = NULL,
    detected_fault     = COALESCE(NULLIF(_detected_fault, ''), detected_fault),
    updated_at         = now()
  WHERE id = _service_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.lift_service_to_workshop(UUID, TEXT) TO authenticated;


-- ─── 2. Começar serviço de oficina ────────────────────────────
-- Atribui o técnico e muda para em_execucao.
-- Compatível com serviços que ainda não têm técnico atribuído ou
-- que já têm o mesmo técnico atribuído (idempotente).
CREATE OR REPLACE FUNCTION public.start_workshop_service(
  _service_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_id UUID;
  _technician_id UUID;
  _is_privileged BOOLEAN;
  _current_technician_id UUID;
BEGIN
  _caller_id := auth.uid();

  -- Get the technician record for this user
  SELECT t.id INTO _technician_id
  FROM public.technicians t
  JOIN public.profiles p ON t.profile_id = p.id
  WHERE p.user_id = _caller_id;

  -- Also allow dono / secretaria
  SELECT (public.is_dono(_caller_id) OR public.is_secretaria(_caller_id))
  INTO _is_privileged;

  IF _technician_id IS NULL AND NOT _is_privileged THEN
    RAISE EXCEPTION 'Utilizador não é um técnico nem tem privilégios suficientes.';
  END IF;

  -- Get current assigned technician
  SELECT technician_id INTO _current_technician_id
  FROM public.services WHERE id = _service_id;

  -- Only allow if service is unassigned OR assigned to this technician
  IF _current_technician_id IS NOT NULL
     AND _current_technician_id != _technician_id
     AND NOT _is_privileged THEN
    RAISE EXCEPTION 'Este serviço já está atribuído a outro técnico.';
  END IF;

  UPDATE public.services
  SET
    status        = 'em_execucao',
    technician_id = COALESCE(_current_technician_id, _technician_id),
    updated_at    = now()
  WHERE id = _service_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_workshop_service(UUID) TO authenticated;


-- ─── 3. Atualização genérica de estado pelo técnico ───────────
-- Para todos os outros UPDATE que um técnico precisa de fazer num
-- serviço atribuído (status, detected_fault, work_performed, etc).
-- Não permite alterar technician_id nem campos de preço.
CREATE OR REPLACE FUNCTION public.technician_update_service(
  _service_id       UUID,
  _status           TEXT    DEFAULT NULL,
  _detected_fault   TEXT    DEFAULT NULL,
  _work_performed   TEXT    DEFAULT NULL,
  _pending_pricing  BOOLEAN DEFAULT NULL,
  _last_status_before_part_request TEXT DEFAULT NULL
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
    updated_at       = now()
  WHERE id = _service_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.technician_update_service(UUID, TEXT, TEXT, TEXT, BOOLEAN, TEXT) TO authenticated;
