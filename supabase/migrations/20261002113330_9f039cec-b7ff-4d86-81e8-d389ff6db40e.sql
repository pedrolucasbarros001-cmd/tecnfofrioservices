CREATE OR REPLACE FUNCTION public.clear_budget_flag_on_terminal()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.awaiting_budget_approval IS TRUE
     AND NEW.status IN ('concluidos','finalizado','cancelado')
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status OR OLD.awaiting_budget_approval IS DISTINCT FROM NEW.awaiting_budget_approval) THEN
    NEW.awaiting_budget_approval := false;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_clear_budget_flag_on_terminal ON public.services;
CREATE TRIGGER trg_clear_budget_flag_on_terminal
BEFORE INSERT OR UPDATE ON public.services
FOR EACH ROW EXECUTE FUNCTION public.clear_budget_flag_on_terminal();

UPDATE public.services SET awaiting_budget_approval = false
WHERE awaiting_budget_approval = true AND status IN ('concluidos','finalizado','cancelado');