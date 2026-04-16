-- Update budgets table and RLS policies
-- 1. Add missing column is_insurance_budget
-- 2. Fix RLS to allow secretaries and technicians to manage budgets

-- Add column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='budgets' AND column_name='is_insurance_budget') THEN
        ALTER TABLE public.budgets ADD COLUMN is_insurance_budget BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Drop old restricted policies
DROP POLICY IF EXISTS "Only dono can view budgets" ON public.budgets;
DROP POLICY IF EXISTS "Only dono can insert budgets" ON public.budgets;
DROP POLICY IF EXISTS "Only dono can update budgets" ON public.budgets;
DROP POLICY IF EXISTS "View budgets: Dono, Secretaria and assigned technicians" ON public.budgets;
DROP POLICY IF EXISTS "Insert budgets: Dono, Secretaria and assigned technicians" ON public.budgets;
DROP POLICY IF EXISTS "Update budgets: Dono and secretaria" ON public.budgets;
DROP POLICY IF EXISTS "Delete budgets: Only dono" ON public.budgets;

-- 1. SELECT: Dono and Secretaria see all, Technicians see assigned
CREATE POLICY "View budgets: Dono, Secretaria and assigned technicians"
  ON public.budgets FOR SELECT
  TO authenticated
  USING (
    public.is_dono(auth.uid()) OR 
    public.is_secretaria(auth.uid()) OR
    (source_service_id IS NOT NULL AND public.can_access_service(source_service_id, auth.uid()))
  );

-- 2. INSERT: Dono, Secretaria and assigned Technicians
CREATE POLICY "Insert budgets: Dono, Secretaria and assigned technicians"
  ON public.budgets FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_dono(auth.uid()) OR 
    public.is_secretaria(auth.uid()) OR
    (source_service_id IS NOT NULL AND public.can_access_service(source_service_id, auth.uid()))
  );

-- 3. UPDATE: Dono and Secretaria
CREATE POLICY "Update budgets: Dono and secretaria"
  ON public.budgets FOR UPDATE
  TO authenticated
  USING (
    public.is_dono(auth.uid()) OR 
    public.is_secretaria(auth.uid())
  );

-- 4. DELETE: Only dono
CREATE POLICY "Delete budgets: Only dono"
  ON public.budgets FOR DELETE
  TO authenticated
  USING (public.is_dono(auth.uid()));
