-- Função para disparar a Edge Function via Webhook HTTP
CREATE OR REPLACE FUNCTION public.handle_service_email_webhook()
RETURNS TRIGGER AS $$
DECLARE
  action_type TEXT;
  payload JSONB;
  request_status INT;
BEGIN
  -- Determinar o tipo de ação com base na coluna alterada
  IF (OLD.last_visit_report_sent_at IS DISTINCT FROM NEW.last_visit_report_sent_at) THEN
    action_type := 'visit_report';
  ELSIF (OLD.last_payment_reminder_sent_at IS DISTINCT FROM NEW.last_payment_reminder_sent_at) THEN
    action_type := 'payment_reminder';
  ELSIF (OLD.last_part_notice_sent_at IS DISTINCT FROM NEW.last_part_notice_sent_at) THEN
    action_type := 'part_notice';
  ELSE
    RETURN NEW;
  END IF;

  -- NOTA: O disparo real via SQL exige a extensão 'pg_net'.
  -- Se preferir não usar extensões, configure o Webhook no Dashboard do Supabase:
  -- Database -> Webhooks -> Add New Webhook (apontando para a função send-email-notification)
  
  -- Se 'pg_net' estiver ativa, este seria um exemplo de disparo direto:
  /*
  SELECT net.http_post(
    url := 'https://' || (SELECT value FROM secrets.vault WHERE name = 'supabase_project_id') || '.functions.supabase.co/send-email-notification',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (SELECT value FROM secrets.vault WHERE name = 'service_role_key')),
    body := jsonb_build_object('service_id', NEW.id, 'action_type', action_type)
  ) INTO request_status;
  */

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Comentário para o utilizador
COMMENT ON FUNCTION public.handle_service_email_webhook() IS 'Lógica base para Webhooks de Email. Recomenda-se configurar o trigger visual no Dashboard -> Database -> Webhooks para maior estabilidade.';

-- Trigger para monitorizar pedidos de email
DROP TRIGGER IF EXISTS on_service_email_request ON public.services;
CREATE TRIGGER on_service_email_request
AFTER UPDATE ON public.services
FOR EACH ROW
WHEN (
  OLD.last_visit_report_sent_at IS DISTINCT FROM NEW.last_visit_report_sent_at OR
  OLD.last_payment_reminder_sent_at IS DISTINCT FROM NEW.last_payment_reminder_sent_at OR
  OLD.last_part_notice_sent_at IS DISTINCT FROM NEW.last_part_notice_sent_at
)
EXECUTE FUNCTION public.handle_service_email_webhook();
