
ALTER TABLE public.service_parts
  ADD COLUMN registered_by uuid REFERENCES auth.users(id),
  ADD COLUMN registered_location text DEFAULT 'oficina';
