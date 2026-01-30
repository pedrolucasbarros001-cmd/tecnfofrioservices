-- Adicionar colunas de onboarding na tabela profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;

-- Marcar utilizadores existentes como já com onboarding concluído
-- (para não verem o onboarding na próxima vez que entrarem)
UPDATE public.profiles
SET onboarding_completed = TRUE, onboarding_step = 999
WHERE onboarding_completed IS NULL OR onboarding_completed = FALSE;