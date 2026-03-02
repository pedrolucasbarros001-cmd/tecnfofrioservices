
-- Allow technicians to delete their own registered articles (needed for idempotent re-insert)
DROP POLICY IF EXISTS "Only dono can delete parts" ON public.service_parts;

CREATE POLICY "Dono and tecnico can delete own parts"
ON public.service_parts
FOR DELETE
USING (
  is_dono(auth.uid()) OR 
  (registered_by = auth.uid())
);
