-- Add pricing_description column to budgets table (same as services table)
-- This stores the JSON with line items (ref, description, qty, price, tax)

ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS pricing_description TEXT;