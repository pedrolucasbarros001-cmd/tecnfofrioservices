
-- Migration: Permitir horários específicos no campo scheduled_shift
-- Remove a restrição CHECK que limitava a 'manha', 'tarde', 'noite'

ALTER TABLE public.services 
DROP CONSTRAINT IF EXISTS services_scheduled_shift_check;

-- Opcional: Adicionar comentário para documentar a mudança
COMMENT ON COLUMN public.services.scheduled_shift IS 'Armazena o turno (manha, tarde, noite) ou um horário específico (ex: 14:00).';
