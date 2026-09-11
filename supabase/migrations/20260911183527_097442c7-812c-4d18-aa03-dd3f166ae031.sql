-- Revogar de PUBLIC (origem real do privilégio)
REVOKE EXECUTE ON FUNCTION public.handle_payment_received_by() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_photo_uploaded_by() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_budget_code() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_service_code() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.normalize_workshop_status() FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.can_access_service(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_technician_profile_id(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_dono(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_monitor(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_secretaria(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_tecnico(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.lift_service_to_workshop(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.start_workshop_service(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.technician_create_service(text, text, text, text, boolean, boolean, text, text, text, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.technician_update_service(uuid, text, text, text, boolean, text, text, jsonb) FROM PUBLIC;

-- Conceder apenas ao necessário (RLS e RPC dos colaboradores)
GRANT EXECUTE ON FUNCTION public.can_access_service(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_technician_profile_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_dono(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_monitor(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_secretaria(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tecnico(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lift_service_to_workshop(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_workshop_service(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.technician_create_service(text, text, text, text, boolean, boolean, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.technician_update_service(uuid, text, text, text, boolean, text, text, jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION public.can_access_service(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO service_role;