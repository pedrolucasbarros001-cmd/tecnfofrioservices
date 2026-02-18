-- Add soft-delete support to customers and prevent deleted rows from being visible

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Ensure new select policy excludes soft-deleted rows (nullable timestamp)
ALTER POLICY "Customers viewable by authenticated"
  ON public.customers
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

-- Update update policy to allow modifications only on non-deleted rows
ALTER POLICY "Dono and secretaria can update customers"
  ON public.customers FOR UPDATE
  TO authenticated
  USING (deleted_at IS NULL AND (public.is_dono(auth.uid()) OR public.is_secretaria(auth.uid())));

-- Adjust insert policy stays unaffected

-- Keep delete policy as before (physically removing) but we will prefer soft-delete in app logic.
-- (optionally we could alter to prevent physical deletes but not required)

-- A trigger to automatically set deleted_at instead of physical delete could be added,
-- but application-level update suffices.

-- Add index for deleted_at to speed queries
CREATE INDEX IF NOT EXISTS idx_customers_deleted_at ON public.customers(deleted_at);
