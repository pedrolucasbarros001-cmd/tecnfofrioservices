REVOKE ALL ON FUNCTION public.lift_service_to_workshop(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lift_service_to_workshop(UUID, TEXT) TO authenticated;