-- Add owner confirmation fields to services table
-- Allows the owner (dono) to confirm that a fully-paid service has been
-- acknowledged. This is purely additive — no existing columns are changed,
-- no CHECK constraints are touched, and no existing queries are affected.

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS owner_confirmed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS owner_confirmed_at TIMESTAMPTZ;

COMMENT ON COLUMN services.owner_confirmed IS
  'Set to true by the owner (dono) after confirming that the service is fully paid and acknowledged. UI-driven only — not changed by any automated flow.';

COMMENT ON COLUMN services.owner_confirmed_at IS
  'Timestamp of when the owner confirmed the service payment.';
