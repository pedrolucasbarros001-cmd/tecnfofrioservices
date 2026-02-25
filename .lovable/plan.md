

# Diagnostico Completo: Disk IO e Performance do Supabase

## Resultados das Consultas

### 1. Conexoes Ativas (`pg_stat_activity`)
- **Apenas 1 conexao ativa** no momento da consulta (a propria query de diagnostico)
- **Nenhum loop de Realtime ativo** — nao ha conexoes `realtime` ou `wal` persistentes
- Conclusao: **nao ha loop de Realtime neste momento**

### 2. Triggers
- **Zero triggers** na base de dados publica
- Conclusao: **triggers nao sao causa de IO**

### 3. Tamanho da Base
- **276 MB** — muito pequeno, longe do limite de 8 GB
- Conclusao: **tamanho nao e causa de alertas**

### 4. Realtime Publication
- **Nenhuma tabela esta publicada** no `supabase_realtime`
- O hook `useRealtime` existe no codigo mas **nunca e chamado** — nenhum componente o importa
- A unica subscricao Realtime ativa e no `TVMonitorPage` (filtrada por `service_location=eq.oficina`)
- Conclusao: **Realtime nao e o vilao principal**

### 5. Edge Functions
- 6 edge functions configuradas, todas com `verify_jwt = false`
- Nenhuma e chamada em loop pelo frontend (sao acoes manuais: invite-user, change-password, etc.)
- Conclusao: **edge functions nao contribuem para IO**

---

## O Verdadeiro Problema: Indices em Falta + RLS com Subqueries

### Indices Actuais na Tabela `services`
```text
services_pkey          (id)
services_code_key      (code)
```

**So existem 2 indices.** Faltam indices em TODAS as colunas usadas para filtrar:
- `status` (usado em todas as listagens)
- `technician_id` (usado em RLS e filtros de tecnico)
- `customer_id` (usado em JOINs)
- `service_location` (usado em filtros de oficina/cliente)
- `scheduled_date` (usado na agenda)
- `created_at` (usado em ordenacao)

### Impacto
Cada query a `services` faz **sequential scan** (confirmado: `seq_scan = 12`, `idx_scan = 0`).

### RLS com Subqueries Pesadas
Cada pedido autenticado dispara politicas RLS que fazem:
```sql
EXISTS (SELECT 1 FROM technicians t WHERE t.id = services.technician_id AND t.profile_id = get_technician_profile_id(auth.uid()))
```
Sem indice em `services.technician_id`, isto e um sequential scan por cada linha avaliada.

### Outras Tabelas sem Indices
- `notifications`: 16 seq_scans, 0 idx_scans (falta indice em `user_id`)
- `profiles`: 46 seq_scans, 0 idx_scans alem do PK (ja tem unique em `user_id`)
- `customers`: 16 seq_scans (falta indice em `name` para pesquisa)
- `service_parts`, `service_photos`, `service_signatures`, `service_payments`: falta indice em `service_id`

### Carga em `user_roles`
- 723 idx_scans — e a tabela mais consultada porque TODA policy RLS chama `is_dono()`, `is_secretaria()`, `is_tecnico()`, que por sua vez chamam `has_role()` que consulta `user_roles`
- Ja tem indice unico em `(user_id, role)`, entao esta OK

---

## Polling no Frontend
- `AppLayout`: polling de notificacoes a cada **120 segundos** — aceitavel
- `usePublicActivityLogs`: polling configuravel (60s no TV Monitor) — aceitavel
- Nenhum `refetchInterval` agressivo encontrado

---

## Diagnostico Final

```text
╔══════════════════════════════════════════════════════════╗
║  CAUSA RAIZ: Indices em falta na tabela services        ║
║  + subqueries RLS a fazer seq_scan em cada request      ║
╠══════════════════════════════════════════════════════════╣
║  Realtime:        NAO e causa (nao esta ativo)          ║
║  Triggers:        NAO existem                           ║
║  Edge Functions:  NAO sao chamadas em loop              ║
║  Polling:         Aceitavel (120s / 60s)                ║
║  Tamanho DB:      276 MB (pequeno)                      ║
║  Indices:         CRITICOS EM FALTA                     ║
╚══════════════════════════════════════════════════════════╝
```

---

## Plano de Correcao: Criar Indices Criticos

Uma unica migracao SQL para resolver o problema estrutural:

```sql
-- services: indices para todas as colunas usadas em filtros e RLS
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
CREATE INDEX IF NOT EXISTS idx_services_technician_id ON services(technician_id);
CREATE INDEX IF NOT EXISTS idx_services_customer_id ON services(customer_id);
CREATE INDEX IF NOT EXISTS idx_services_location ON services(service_location);
CREATE INDEX IF NOT EXISTS idx_services_scheduled_date ON services(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_services_created_at ON services(created_at);
CREATE INDEX IF NOT EXISTS idx_services_status_location ON services(status, service_location);

-- tabelas filhas: indice em service_id para JOINs
CREATE INDEX IF NOT EXISTS idx_service_parts_service_id ON service_parts(service_id);
CREATE INDEX IF NOT EXISTS idx_service_photos_service_id ON service_photos(service_id);
CREATE INDEX IF NOT EXISTS idx_service_signatures_service_id ON service_signatures(service_id);
CREATE INDEX IF NOT EXISTS idx_service_payments_service_id ON service_payments(service_id);

-- notifications: indice para filtro por user
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- customers: indice para pesquisa por nome
CREATE INDEX IF NOT EXISTS idx_customers_name_trgm ON customers USING gin(name gin_trgm_ops);
```

**Nota:** O indice trigram em `customers.name` requer a extensao `pg_trgm`. Se nao estiver activa, substituimos por um indice btree simples.

### Resultado Esperado
- Queries a `services` passam de sequential scan para index scan
- RLS com `EXISTS` passa a usar indice em `technician_id` em vez de varrer toda a tabela
- Listagens, agenda e filtros respondem significativamente mais rapido
- Disk IO reduzido de forma permanente (nao e analgésico, e correcao estrutural)

### Nenhuma Alteracao de Codigo Necessaria
Os indices sao transparentes — o Postgres e o PostgREST passam a usa-los automaticamente sem qualquer mudanca no frontend ou nas queries.

