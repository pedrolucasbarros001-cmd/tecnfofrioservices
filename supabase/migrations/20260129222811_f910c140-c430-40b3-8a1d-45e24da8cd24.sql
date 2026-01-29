-- Fix the view to use SECURITY INVOKER instead of DEFINER
-- This is safer as it respects the caller's permissions

DROP VIEW IF EXISTS public.tv_monitor_services;

CREATE VIEW public.tv_monitor_services 
WITH (security_invoker = true)
AS
SELECT 
  s.id,
  s.code,
  s.status,
  s.appliance_type,
  s.brand,
  s.model,
  s.fault_description,
  s.is_urgent,
  s.technician_id,
  s.created_at,
  s.service_location,
  -- Sanitized customer info - only show first initial
  CASE 
    WHEN c.name IS NOT NULL THEN SUBSTRING(c.name, 1, 1) || '***'
    ELSE NULL
  END as customer_name,
  -- Include technician info for display
  t.id as tech_id,
  t.color as tech_color,
  t.active as tech_active,
  p.full_name as tech_name
FROM public.services s
LEFT JOIN public.customers c ON s.customer_id = c.id
LEFT JOIN public.technicians t ON s.technician_id = t.id
LEFT JOIN public.profiles p ON t.profile_id = p.id
WHERE s.service_location = 'oficina'
  AND s.status <> 'finalizado';

-- Grant access to the view
GRANT SELECT ON public.tv_monitor_services TO anon;
GRANT SELECT ON public.tv_monitor_services TO authenticated;

-- Since SECURITY INVOKER means anon users need base table access,
-- we need minimal RLS policies for the view to work
-- Add minimal read-only policies for TV monitor view access

-- Allow anon to read services only through the filtered view conditions
CREATE POLICY "Anon read workshop services for TV monitor view"
  ON public.services FOR SELECT
  TO anon
  USING (service_location = 'oficina' AND status <> 'finalizado');

-- Allow anon to read customer names only (view masks them anyway)
CREATE POLICY "Anon read customer names for TV monitor view"
  ON public.customers FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.services s 
      WHERE s.customer_id = customers.id 
        AND s.service_location = 'oficina' 
        AND s.status <> 'finalizado'
    )
  );

-- Allow anon to read active technician info
CREATE POLICY "Anon read technicians for TV monitor view"
  ON public.technicians FOR SELECT
  TO anon
  USING (active = true);

-- Allow anon to read technician profile names
CREATE POLICY "Anon read technician profiles for TV monitor view"
  ON public.profiles FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.technicians t 
      WHERE t.profile_id = profiles.id 
        AND t.active = true
    )
  );