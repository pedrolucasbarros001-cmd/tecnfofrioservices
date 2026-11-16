CREATE OR REPLACE FUNCTION public.link_customer_appliance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid; _serial text; _pnc text;
BEGIN
  IF NEW.customer_id IS NULL OR nullif(trim(NEW.appliance_type),'') IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.appliance_id IS NOT NULL
     AND NEW.customer_id IS NOT DISTINCT FROM OLD.customer_id
     AND NEW.appliance_type IS NOT DISTINCT FROM OLD.appliance_type
     AND NEW.brand IS NOT DISTINCT FROM OLD.brand
     AND NEW.model IS NOT DISTINCT FROM OLD.model THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' AND NEW.appliance_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  BEGIN
    IF TG_TABLE_NAME = 'services' THEN
      _serial := nullif(trim(NEW.serial_number),''); _pnc := nullif(trim(NEW.pnc),'');
    END IF;
    SELECT id INTO _id FROM customer_appliances a
     WHERE a.customer_id = NEW.customer_id
       AND lower(trim(a.appliance_type)) = lower(trim(NEW.appliance_type))
       AND lower(coalesce(trim(a.brand),'')) = lower(coalesce(trim(NEW.brand),''))
       AND lower(coalesce(trim(a.model),'')) = lower(coalesce(trim(NEW.model),''))
     ORDER BY a.created_at LIMIT 1;
    IF _id IS NULL THEN
      INSERT INTO customer_appliances (customer_id, appliance_type, brand, model, serial_number, pnc)
      VALUES (NEW.customer_id, trim(NEW.appliance_type), nullif(trim(NEW.brand),''), nullif(trim(NEW.model),''), _serial, _pnc)
      RETURNING id INTO _id;
    ELSIF _serial IS NOT NULL OR _pnc IS NOT NULL THEN
      UPDATE customer_appliances SET serial_number = coalesce(serial_number, _serial), pnc = coalesce(pnc, _pnc)
       WHERE id = _id AND (serial_number IS NULL OR pnc IS NULL);
    END IF;
    NEW.appliance_id := _id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'link_customer_appliance: %', SQLERRM;
  END;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.link_customer_appliance() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_link_service_appliance BEFORE INSERT OR UPDATE OF customer_id, appliance_type, brand, model, appliance_id ON public.services FOR EACH ROW EXECUTE FUNCTION public.link_customer_appliance();
CREATE TRIGGER trg_link_budget_appliance BEFORE INSERT OR UPDATE OF customer_id, appliance_type, brand, model, appliance_id ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.link_customer_appliance();