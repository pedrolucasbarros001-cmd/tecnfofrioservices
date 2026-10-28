CREATE TABLE public.customer_appliances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  appliance_type text,
  brand text,
  model text,
  serial_number text,
  pnc text,
  purchase_date date,
  warranty_until date,
  location text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_customer_appliances_customer ON public.customer_appliances(customer_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_appliances TO authenticated;
GRANT ALL ON public.customer_appliances TO service_role;
ALTER TABLE public.customer_appliances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view appliances" ON public.customer_appliances FOR SELECT TO authenticated
  USING (public.is_dono(auth.uid()) OR public.is_secretaria(auth.uid()) OR public.is_tecnico(auth.uid()));
CREATE POLICY "Staff can add appliances" ON public.customer_appliances FOR INSERT TO authenticated
  WITH CHECK (public.is_dono(auth.uid()) OR public.is_secretaria(auth.uid()) OR public.is_tecnico(auth.uid()));
CREATE POLICY "Staff can edit appliances" ON public.customer_appliances FOR UPDATE TO authenticated
  USING (public.is_dono(auth.uid()) OR public.is_secretaria(auth.uid()) OR public.is_tecnico(auth.uid()));
CREATE POLICY "Admins can delete appliances" ON public.customer_appliances FOR DELETE TO authenticated
  USING (public.is_dono(auth.uid()) OR public.is_secretaria(auth.uid()));
CREATE TRIGGER update_customer_appliances_updated_at BEFORE UPDATE ON public.customer_appliances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.services ADD COLUMN IF NOT EXISTS appliance_id uuid REFERENCES public.customer_appliances(id) ON DELETE SET NULL;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS appliance_id uuid REFERENCES public.customer_appliances(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.suggest_customer_appliances(_customer_id uuid)
RETURNS TABLE(appliance_type text, brand text, model text, serial_number text, pnc text, services_count bigint, last_service date)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.appliance_type, s.brand, s.model, s.serial_number, max(s.pnc), count(*), max(s.created_at)::date
  FROM public.services s
  WHERE s.customer_id = _customer_id
    AND (public.is_dono(auth.uid()) OR public.is_secretaria(auth.uid()) OR public.is_tecnico(auth.uid()))
    AND s.appliance_type IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.customer_appliances a WHERE a.customer_id = s.customer_id
      AND coalesce(lower(a.appliance_type),'')=coalesce(lower(s.appliance_type),'')
      AND coalesce(lower(a.brand),'')=coalesce(lower(s.brand),'')
      AND coalesce(lower(a.model),'')=coalesce(lower(s.model),''))
  GROUP BY s.appliance_type, s.brand, s.model, s.serial_number
  ORDER BY max(s.created_at) DESC;
$$;
REVOKE EXECUTE ON FUNCTION public.suggest_customer_appliances(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.suggest_customer_appliances(uuid) TO authenticated;