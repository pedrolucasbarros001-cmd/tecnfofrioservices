-- Migration: Add 'cancelado' to services.status CHECK constraint
-- This allows services to be deactivated/cancelled while preserving all their data.

DO $$
BEGIN
  -- Drop the existing CHECK constraint if it exists
  ALTER TABLE services DROP CONSTRAINT IF EXISTS services_status_check;

  -- Add the updated CHECK constraint including 'cancelado'
  ALTER TABLE services ADD CONSTRAINT services_status_check
    CHECK (status IN (
      'por_fazer',
      'em_execucao',
      'na_oficina',
      'para_pedir_peca',
      'em_espera_de_peca',
      'a_precificar',
      'concluidos',
      'em_debito',
      'finalizado',
      'cancelado'
    ));
END $$;
