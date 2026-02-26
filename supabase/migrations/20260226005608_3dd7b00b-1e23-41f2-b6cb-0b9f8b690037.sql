
CREATE OR REPLACE FUNCTION public.technician_create_service(
  _customer_name text,
  _customer_phone text,
  _appliance_type text,
  _fault_description text,
  _is_urgent boolean DEFAULT false,
  _is_warranty boolean DEFAULT false,
  _warranty_brand text DEFAULT NULL,
  _warranty_process_number text DEFAULT NULL,
  _customer_address text DEFAULT NULL,
  _customer_postal_code text DEFAULT NULL,
  _customer_city text DEFAULT NULL,
  _notes text DEFAULT NULL
)
RETURNS TABLE(service_id uuid, service_code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_id UUID;
  _technician_id UUID;
  _customer_id UUID;
  _new_service_id UUID;
  _new_service_code TEXT;
BEGIN
  _caller_id := auth.uid();

  -- 1. Validate caller is a technician
  IF NOT public.is_tecnico(_caller_id) THEN
    RAISE EXCEPTION 'Apenas técnicos podem criar serviços rápidos.';
  END IF;

  -- 2. Get technician_id for the caller
  SELECT t.id INTO _technician_id
  FROM public.technicians t
  JOIN public.profiles p ON t.profile_id = p.id
  WHERE p.user_id = _caller_id;

  IF _technician_id IS NULL THEN
    RAISE EXCEPTION 'Registo de técnico não encontrado.';
  END IF;

  -- 3. Find or create customer by phone
  SELECT id INTO _customer_id
  FROM public.customers
  WHERE phone = _customer_phone
  LIMIT 1;

  IF _customer_id IS NULL THEN
    INSERT INTO public.customers (name, phone, address, postal_code, city)
    VALUES (_customer_name, _customer_phone, _customer_address, _customer_postal_code, _customer_city)
    RETURNING id INTO _customer_id;
  ELSE
    -- Update customer info if provided and currently null
    UPDATE public.customers SET
      name = COALESCE(NULLIF(_customer_name, ''), name),
      address = COALESCE(_customer_address, address),
      postal_code = COALESCE(_customer_postal_code, postal_code),
      city = COALESCE(_customer_city, city)
    WHERE id = _customer_id;
  END IF;

  -- 4. Create service (trigger generate_service_code will set the code)
  INSERT INTO public.services (
    customer_id,
    technician_id,
    appliance_type,
    fault_description,
    is_urgent,
    is_warranty,
    warranty_brand,
    warranty_process_number,
    notes,
    service_location,
    service_type,
    status,
    scheduled_date,
    pending_pricing,
    service_address,
    service_postal_code,
    service_city,
    contact_phone
  ) VALUES (
    _customer_id,
    _technician_id,
    _appliance_type,
    _fault_description,
    COALESCE(_is_urgent, false),
    COALESCE(_is_warranty, false),
    _warranty_brand,
    _warranty_process_number,
    _notes,
    'cliente',
    'reparacao',
    'por_fazer',
    CURRENT_DATE,
    false,
    _customer_address,
    _customer_postal_code,
    _customer_city,
    _customer_phone
  )
  RETURNING id, code INTO _new_service_id, _new_service_code;

  -- 5. Log the creation
  INSERT INTO public.activity_logs (service_id, actor_id, action_type, description, is_public)
  VALUES (
    _new_service_id,
    _caller_id,
    'criacao',
    'Serviço criado pelo técnico em campo — ' || _appliance_type || ': ' || _fault_description,
    true
  );

  RETURN QUERY SELECT _new_service_id, _new_service_code;
END;
$$;
