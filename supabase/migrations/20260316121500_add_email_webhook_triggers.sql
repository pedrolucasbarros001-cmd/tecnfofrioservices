-- Adicionar colunas timestamp para servir de gatilho aos webhooks
-- Sempre que a data for atualizada, o webhook dispara e a Edge Function envia o email

ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS last_payment_reminder_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_part_notice_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_visit_report_sent_at TIMESTAMPTZ;

-- Adicionar comentarios explicativos
COMMENT ON COLUMN public.services.last_payment_reminder_sent_at IS 'Gatilho para webhook: Envio de lembrete de pagamento';
COMMENT ON COLUMN public.services.last_part_notice_sent_at IS 'Gatilho para webhook: Envio de aviso de espera de peca';
COMMENT ON COLUMN public.services.last_visit_report_sent_at IS 'Gatilho para webhook: Envio do relatorio de intervencao';
