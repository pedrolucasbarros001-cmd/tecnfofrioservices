CREATE POLICY "Dono and secretaria can delete customers"
  ON public.customers FOR DELETE
  USING (is_dono(auth.uid()) OR is_secretaria(auth.uid()));