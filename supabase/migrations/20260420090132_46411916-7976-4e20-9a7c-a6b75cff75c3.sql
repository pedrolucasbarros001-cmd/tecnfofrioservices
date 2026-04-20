-- ════════════════════════════════════════════════════════════
-- Optimização de I/O do Realtime: reduzir REPLICA IDENTITY FULL
-- apenas às tabelas onde o RLS realmente precisa da linha antiga.
--
-- FULL faz com que cada UPDATE/DELETE escreva a linha inteira no WAL.
-- Em tabelas com muitas colunas, isto multiplica I/O por 10-20x.
--
-- Mantemos FULL apenas onde:
--   - RLS depende de colunas que podem mudar (technician_id, user_id)
--   - Reatribuições/transferências precisam que o utilizador antigo
--     receba o evento DELETE-equivalent
--
-- Voltamos a DEFAULT (só PK) onde:
--   - RLS é baseado em role (dono/secretaria) — não muda por linha
--   - RLS usa can_access_service() que é uma função, não uma coluna
--   - A flag é estática (is_public)
-- ════════════════════════════════════════════════════════════

-- Tabelas onde só PK chega (RLS não precisa da linha antiga)
ALTER TABLE public.service_parts REPLICA IDENTITY DEFAULT;
ALTER TABLE public.service_photos REPLICA IDENTITY DEFAULT;
ALTER TABLE public.service_signatures REPLICA IDENTITY DEFAULT;
ALTER TABLE public.service_payments REPLICA IDENTITY DEFAULT;
ALTER TABLE public.service_documents REPLICA IDENTITY DEFAULT;
ALTER TABLE public.customers REPLICA IDENTITY DEFAULT;
ALTER TABLE public.budgets REPLICA IDENTITY DEFAULT;
ALTER TABLE public.activity_logs REPLICA IDENTITY DEFAULT;

-- Manter FULL apenas onde necessário:
--   services: RLS verifica technician_id; ao reatribuir, técnico antigo
--             precisa receber evento para remover OS da lista
--   notifications: RLS verifica user_id (raro mudar, mas seguro manter)
-- (já estão em FULL pela migration anterior — não fazemos nada)