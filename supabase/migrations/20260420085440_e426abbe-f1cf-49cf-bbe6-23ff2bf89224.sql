-- ════════════════════════════════════════════════════════════
-- Habilita Realtime Postgres para as tabelas operacionais.
--
-- Sem esta migration, o Supabase NÃO envia eventos de mudança
-- pelo canal WebSocket — mesmo que o código frontend subscreva
-- correctamente via supabase.channel(). O canal fica aberto mas
-- silencioso.
--
-- REPLICA IDENTITY FULL é necessário para que eventos UPDATE e
-- DELETE carreguem a linha completa — o Realtime verifica o RLS
-- contra a linha (antiga em UPDATE/DELETE, nova em INSERT) antes
-- de entregar ao utilizador. Sem FULL, o evento é descartado
-- silenciosamente quando o RLS não consegue avaliar.
-- ════════════════════════════════════════════════════════════

-- Passo 1: REPLICA IDENTITY FULL — garante que eventos carregam
-- a linha inteira para avaliação do RLS
ALTER TABLE public.services REPLICA IDENTITY FULL;
ALTER TABLE public.service_parts REPLICA IDENTITY FULL;
ALTER TABLE public.service_photos REPLICA IDENTITY FULL;
ALTER TABLE public.service_signatures REPLICA IDENTITY FULL;
ALTER TABLE public.service_payments REPLICA IDENTITY FULL;
ALTER TABLE public.service_documents REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.budgets REPLICA IDENTITY FULL;
ALTER TABLE public.customers REPLICA IDENTITY FULL;
ALTER TABLE public.activity_logs REPLICA IDENTITY FULL;

-- Passo 2: Adicionar cada tabela à publication supabase_realtime.
-- Esta é a publication que o Supabase Realtime escuta.
-- Sem isto, as mudanças nestas tabelas NÃO são publicadas.
--
-- Usamos DO $$ para ser idempotente — se a tabela já estiver na
-- publication (raro, mas possível), não dá erro.

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'services',
    'service_parts',
    'service_photos',
    'service_signatures',
    'service_payments',
    'service_documents',
    'notifications',
    'budgets',
    'customers',
    'activity_logs'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;