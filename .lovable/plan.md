
# Plano: Corrigir TV Monitor para Mostrar Todos os Serviços da Oficina

## Problema Identificado

A página **TV Monitor** não mostra os serviços com `service_location = 'oficina'` porque a política RLS (Row Level Security) está a filtrar serviços por status, excluindo o status **`por_fazer`**.

### Política Atual (Restritiva)
```sql
USING (
  service_location = 'oficina' 
  AND status IN ('na_oficina', 'em_execucao', 'para_pedir_peca', 'em_espera_de_peca', 'concluidos')
)
```

O status `por_fazer` não está incluído, logo os serviços novos na oficina que ainda não foram iniciados não aparecem.

---

## Solução

### 1. Nova Migração SQL - Atualizar Política RLS

Substituir a política existente por uma mais permissiva que inclui **todos os status operacionais** para serviços na oficina:

```sql
-- Remover politica existente
DROP POLICY IF EXISTS "Public read for workshop services on TV monitor" ON public.services;

-- Criar nova politica que inclui TODOS os servicos na oficina
CREATE POLICY "Public read for workshop services on TV monitor"
  ON public.services FOR SELECT
  TO anon, authenticated
  USING (
    service_location = 'oficina' 
    AND status NOT IN ('finalizado', 'em_debito')
  );
```

A nova lógica:
- Mostra **todos** os serviços com `service_location = 'oficina'`
- **Exceto** os que já saíram do fluxo operacional (`finalizado`, `em_debito`)
- Isto garante que qualquer novo status operacional será automaticamente incluído

### 2. Atualizar Política de Customers Associados

```sql
DROP POLICY IF EXISTS "Public read for customers with workshop services" ON public.customers;

CREATE POLICY "Public read for customers with workshop services"
  ON public.customers FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.customer_id = customers.id
        AND s.service_location = 'oficina'
        AND s.status NOT IN ('finalizado', 'em_debito')
    )
  );
```

---

## Ficheiro a Criar

| Ficheiro | Descrição |
|----------|-----------|
| `supabase/migrations/[timestamp]_fix_tv_monitor_rls.sql` | Atualiza políticas RLS para mostrar todos serviços da oficina |

---

## Resultado Esperado

| Estado do Serviço | Antes | Depois |
|-------------------|-------|--------|
| `por_fazer` + oficina | Não aparece | Aparece |
| `em_execucao` + oficina | Aparece | Aparece |
| `na_oficina` + oficina | Aparece | Aparece |
| `para_pedir_peca` + oficina | Aparece | Aparece |
| `em_espera_de_peca` + oficina | Aparece | Aparece |
| `concluidos` + oficina | Aparece | Aparece |
| `a_precificar` + oficina | Não aparece | Aparece |
| `finalizado` + oficina | Não aplicável | Não aparece |
| `em_debito` + oficina | Não aplicável | Não aparece |

---

## Diagrama de Fluxo

```text
┌─────────────────────────────────────────────────────────────┐
│                         TV MONITOR                          │
│                                                             │
│  Critério: service_location = 'oficina'                    │
│            AND status NOT IN ('finalizado', 'em_debito')   │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  Por Fazer  │  │ Em Execução │  │ Na Oficina          │ │
│  │   (cards)   │  │   (cards)   │  │    (cards)          │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│                                                             │
│  ┌──────────────────┐  ┌─────────────────┐  ┌───────────┐ │
│  │ Para Pedir Peça  │  │ Em Espera Peça  │  │ Concluídos│ │
│  │     (cards)      │  │    (cards)      │  │  (cards)  │ │
│  └──────────────────┘  └─────────────────┘  └───────────┘ │
│                                                             │
│  ❌ Não mostra: finalizado, em_debito                      │
│     (já saíram do fluxo operacional)                       │
└─────────────────────────────────────────────────────────────┘
```
