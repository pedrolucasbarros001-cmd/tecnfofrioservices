-- Fix triggers for code generation to prevent 'invalid input syntax for type integer' crashes
-- when legacy or custom codes (e.g. 'ORC-2026-2734') are present in the table.

CREATE OR REPLACE FUNCTION public.generate_service_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 4) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.services
  WHERE code LIKE 'OS-%' AND SUBSTRING(code FROM 4) ~ '^[0-9]+$';
  
  NEW.code := 'OS-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_budget_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.budgets
  WHERE code LIKE 'ORC-%' AND SUBSTRING(code FROM 5) ~ '^[0-9]+$';
  
  NEW.code := 'ORC-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$;
