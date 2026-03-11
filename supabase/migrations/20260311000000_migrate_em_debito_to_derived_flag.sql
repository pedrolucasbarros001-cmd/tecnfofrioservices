-- Migration: Consolidate em_debito as derived flag
-- Date: 2026-03-11
--
-- Purpose:
-- - Convert all services with status='em_debito' to 'concluidos'
-- - 'em_debito' is now a derived flag calculated from final_price vs amount_paid
-- - This ensures operational state remains orthogonal to financial state

-- Step 1: Convert existing em_debito records to concluidos
UPDATE services
SET status = 'concluidos'
WHERE status = 'em_debito';

-- Step 2: Add comment to services table explaining em_debito is deprecated
COMMENT ON COLUMN services.status IS 
'Operational status of the service. Valid values: por_fazer, em_execucao, na_oficina, para_pedir_peca, em_espera_de_peca, a_precificar, concluidos, finalizado, cancelado.
DEPRECATED: em_debito should not be written; financial debt is derived from final_price vs amount_paid.
Keep em_debito in the type for backwards compatibility only.';

-- Step 3: Document the derivation rule for em_debito flag
-- This is enforced in the application layer via computeIsDebt() function
COMMENT ON TABLE services IS 
'Service records. Financial state (final_price, amount_paid, pending_pricing) is ORTHOGONAL to operational state (status).
Derived flags: "em_debito" = (status != cancelado AND final_price > 0 AND amount_paid < final_price)';

-- Step 4: Ensure no future writes of em_debito via SQL-level constraint
-- Note: This is optional but recommended for extra safety
-- ALTER TABLE services ADD CONSTRAINT no_em_debito_status CHECK (status != 'em_debito');
-- Commented out: triggers/guards may be more flexible for eventual transitions

-- Verification: Count how many records were converted
SELECT 
  (SELECT COUNT(*) FROM services WHERE status = 'concluidos') as now_concluidos,
  (SELECT COUNT(*) FROM services WHERE status != 'em_debito') as total_non_debito;
