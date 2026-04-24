CREATE OR REPLACE FUNCTION public.generate_budget_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(
    CASE 
      WHEN SUBSTRING(code FROM 5) ~ '^[0-9]+$' THEN CAST(SUBSTRING(code FROM 5) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO next_num
  FROM public.budgets
  WHERE code LIKE 'ORC-%';
  
  NEW.code := 'ORC-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_service_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(
    CASE 
      WHEN SUBSTRING(code FROM 4) ~ '^[0-9]+$' THEN CAST(SUBSTRING(code FROM 4) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO next_num
  FROM public.services
  WHERE code LIKE 'OS-%';
  
  NEW.code := 'OS-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$;
