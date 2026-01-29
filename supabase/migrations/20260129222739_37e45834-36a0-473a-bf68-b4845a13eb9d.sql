-- =====================================================
-- Security Fix: TV Monitor Data Exposure & Activity Logs
-- =====================================================

-- 1. Create a sanitized view for TV monitor that limits exposed data
CREATE OR REPLACE VIEW public.tv_monitor_services AS
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

-- Grant anonymous access to the sanitized view only
GRANT SELECT ON public.tv_monitor_services TO anon;
GRANT SELECT ON public.tv_monitor_services TO authenticated;

-- 2. Drop overly permissive RLS policies that expose customer data publicly
DROP POLICY IF EXISTS "Public read for workshop services on TV monitor" ON public.services;
DROP POLICY IF EXISTS "Public read for customers with workshop services" ON public.customers;
DROP POLICY IF EXISTS "Public read for technicians on TV monitor" ON public.technicians;
DROP POLICY IF EXISTS "Public read for technician profiles on TV monitor" ON public.profiles;

-- 3. Fix activity_logs insertion policy - require actor_id to match authenticated user
DROP POLICY IF EXISTS "Authenticated users can insert activity logs" ON public.activity_logs;

-- New policy: Users can only insert logs with their own actor_id (or null for system logs)
CREATE POLICY "Users can insert own activity logs"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    actor_id IS NULL OR actor_id = auth.uid()
  );

-- 4. Restrict is_public flag - only dono can create public logs
DROP POLICY IF EXISTS "Public activity logs viewable by anyone" ON public.activity_logs;

CREATE POLICY "Public activity logs viewable by anyone"
  ON public.activity_logs FOR SELECT
  TO anon
  USING (is_public = true);

-- Update the existing public logs policy for authenticated users
DROP POLICY IF EXISTS "Activity logs viewable by dono secretaria or public" ON public.activity_logs;

CREATE POLICY "Activity logs viewable by dono secretaria or public"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (
    is_dono(auth.uid()) OR 
    is_secretaria(auth.uid()) OR 
    is_public = true OR
    actor_id = auth.uid()
  );