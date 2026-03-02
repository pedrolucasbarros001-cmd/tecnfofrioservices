ALTER TABLE public.service_parts 
  ALTER COLUMN quantity TYPE numeric USING quantity::numeric;