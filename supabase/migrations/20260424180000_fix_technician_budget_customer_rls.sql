-- Fix RLS for budgets and customers to allow Technicians to properly create budgets

-- 1. Budgets: Allow technicians to insert budgets even without a service (or if they are not explicitly assigned to a service yet)
DROP POLICY IF EXISTS "Insert budgets: Dono, Secretaria and assigned technicians" ON public.budgets;
CREATE POLICY "Insert budgets: All Staff"
  ON public.budgets FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_dono(auth.uid()) OR 
    public.is_secretaria(auth.uid()) OR
    public.is_tecnico(auth.uid())
  );

-- 2. Customers: Allow technicians to insert and update customers from the budget modal
DROP POLICY IF EXISTS "Dono and secretaria can insert customers" ON public.customers;
CREATE POLICY "All staff can insert customers"
  ON public.customers FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_dono(auth.uid()) OR 
    public.is_secretaria(auth.uid()) OR
    public.is_tecnico(auth.uid())
  );

DROP POLICY IF EXISTS "Dono and secretaria can update customers" ON public.customers;
CREATE POLICY "All staff can update customers"
  ON public.customers FOR UPDATE
  TO authenticated
  USING (
    public.is_dono(auth.uid()) OR 
    public.is_secretaria(auth.uid()) OR
    public.is_tecnico(auth.uid())
  );
