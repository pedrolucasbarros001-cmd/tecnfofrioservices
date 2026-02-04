-- Update can_access_service function to allow ALL technicians to view any service
-- This enables universal QR code scanning for internal history lookup
CREATE OR REPLACE FUNCTION public.can_access_service(_service_id uuid, _user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    public.is_dono(_user_id) OR 
    public.is_secretaria(_user_id) OR 
    public.is_tecnico(_user_id)  -- Any technician can now view any service
$function$;