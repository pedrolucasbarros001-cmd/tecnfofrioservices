
-- Drop the broken trigger and function that reference non-existent columns (email, client_name) on services
DROP TRIGGER IF EXISTS trigger_new_service_email ON public.services;
DROP FUNCTION IF EXISTS public.handle_new_service() CASCADE;
