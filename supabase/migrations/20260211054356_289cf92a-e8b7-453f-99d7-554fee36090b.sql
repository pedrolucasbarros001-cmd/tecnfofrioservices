
-- Helper function
CREATE OR REPLACE FUNCTION public.is_monitor(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'monitor')
$$;

-- RLS: monitor can view workshop services
CREATE POLICY "Monitor can view workshop services"
ON public.services FOR SELECT
USING (is_monitor(auth.uid()) AND service_location = 'oficina' AND status <> 'finalizado');

-- RLS: monitor can view active technicians
CREATE POLICY "Monitor can view technicians"
ON public.technicians FOR SELECT
USING (is_monitor(auth.uid()) AND active = true);

-- RLS: monitor can view technician profiles
CREATE POLICY "Monitor can view technician profiles"
ON public.profiles FOR SELECT
USING (is_monitor(auth.uid()) AND EXISTS (
  SELECT 1 FROM technicians t WHERE t.profile_id = profiles.id AND t.active = true
));

-- RLS: monitor can view public activity logs
CREATE POLICY "Monitor can view public activity logs"
ON public.activity_logs FOR SELECT
USING (is_monitor(auth.uid()) AND is_public = true);

-- RLS: monitor can view customer names for workshop services
CREATE POLICY "Monitor can view workshop customers"
ON public.customers FOR SELECT
USING (is_monitor(auth.uid()) AND EXISTS (
  SELECT 1 FROM services s WHERE s.customer_id = customers.id AND s.service_location = 'oficina' AND s.status <> 'finalizado'
));
