-- A1. Backfill: Corrigir registros inconsistentes existentes

-- Serviços na oficina COM técnico mas com status 'por_fazer' → devem ser 'na_oficina'
UPDATE public.services
SET status = 'na_oficina', updated_at = now()
WHERE service_location = 'oficina'
  AND technician_id IS NOT NULL
  AND status = 'por_fazer';

-- Serviços na oficina SEM técnico mas com status 'na_oficina' → devem ser 'por_fazer'
UPDATE public.services
SET status = 'por_fazer', updated_at = now()
WHERE service_location = 'oficina'
  AND technician_id IS NULL
  AND status = 'na_oficina';

-- A2. Criar função de normalização de status para oficina
CREATE OR REPLACE FUNCTION public.normalize_workshop_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Só aplica a regra para serviços na oficina
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
$$ LANGUAGE plpgsql SET search_path = public;

-- Criar trigger que roda antes de INSERT ou UPDATE
CREATE TRIGGER normalize_workshop_status_trigger
  BEFORE INSERT OR UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_workshop_status();