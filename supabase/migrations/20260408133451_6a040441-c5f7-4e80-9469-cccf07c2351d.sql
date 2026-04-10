
-- 1. Fix all services that have workshop statuses but wrong service_location
UPDATE public.services
SET service_location = 'oficina', updated_at = now()
WHERE status IN ('na_oficina', 'em_execucao', 'para_pedir_peca', 'em_espera_de_peca')
  AND service_location != 'oficina'
  AND service_location != 'cliente';

-- 2. Specifically fix TF-00126 if it wasn't caught above
UPDATE public.services
SET service_location = 'oficina', updated_at = now()
WHERE code = 'TF-00126' AND status = 'na_oficina' AND service_location != 'oficina';

-- 3. Update the trigger to also enforce service_location sync
CREATE OR REPLACE FUNCTION public.normalize_workshop_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- If status is a workshop-related status, ensure service_location is 'oficina'
  IF NEW.status IN ('na_oficina') AND NEW.service_location NOT IN ('oficina') THEN
    NEW.service_location := 'oficina';
  END IF;

  -- Original normalization logic for workshop services
  IF NEW.service_location = 'oficina' THEN
    -- Se não tem técnico e está como 'na_oficina', normaliza para 'por_fazer'
    IF NEW.technician_id IS NULL AND NEW.status = 'na_oficina' THEN
      NEW.status := 'por_fazer';
    END IF;
    
    -- Se tem técnico e está como 'por_fazer', normaliza para 'na_oficina'
    IF NEW.technician_id IS NOT NULL AND NEW.status = 'por_fazer' THEN
      NEW.status := 'na_oficina';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;
