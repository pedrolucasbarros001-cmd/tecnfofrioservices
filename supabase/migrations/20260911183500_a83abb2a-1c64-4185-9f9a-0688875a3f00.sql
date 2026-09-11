-- 1. Remover acesso anónimo (TV monitor)
DROP POLICY IF EXISTS "Anon read technician profiles for TV monitor view" ON public.profiles;
DROP POLICY IF EXISTS "Anon read workshop services for TV monitor view" ON public.services;
DROP POLICY IF EXISTS "Anon read customer names for TV monitor view" ON public.customers;
DROP POLICY IF EXISTS "Anon read technicians for TV monitor view" ON public.technicians;

REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.services FROM anon;
REVOKE ALL ON public.customers FROM anon;
REVOKE ALL ON public.technicians FROM anon;
REVOKE ALL ON public.tv_monitor_services FROM anon;
GRANT SELECT ON public.tv_monitor_services TO authenticated;

-- 2. service_documents: remover políticas públicas
DROP POLICY IF EXISTS "Users can view documents of their services" ON public.service_documents;
DROP POLICY IF EXISTS "Users can insert documents" ON public.service_documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON public.service_documents;
REVOKE ALL ON public.service_documents FROM anon;

-- 3. search_path fixo
CREATE OR REPLACE FUNCTION public.handle_payment_received_by()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.received_by IS NULL THEN
    NEW.received_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_photo_uploaded_by()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.uploaded_by IS NULL THEN
    NEW.uploaded_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$function$;

-- 4. Revogar EXECUTE de funções de gatilho a anon/authenticated
REVOKE EXECUTE ON FUNCTION public.handle_payment_received_by() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_photo_uploaded_by() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_budget_code() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_service_code() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.normalize_workshop_status() FROM anon, authenticated;

-- 5. Revogar EXECUTE a anon nas funções SECURITY DEFINER de negócio
REVOKE EXECUTE ON FUNCTION public.can_access_service(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_technician_profile_id(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_dono(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_monitor(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_secretaria(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_tecnico(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.lift_service_to_workshop(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.start_workshop_service(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.technician_create_service(text, text, text, text, boolean, boolean, text, text, text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.technician_update_service(uuid, text, text, text, boolean, text, text, jsonb) FROM anon;