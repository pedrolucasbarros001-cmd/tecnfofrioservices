ALTER TABLE public.services
  ADD COLUMN contact_phone text DEFAULT NULL,
  ADD COLUMN contact_email text DEFAULT NULL,
  ADD COLUMN contact_name text DEFAULT NULL;