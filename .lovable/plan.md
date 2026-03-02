

## Plano: Rastreabilidade Multi-Técnico nos Artigos + Painel Financeiro Consolidado

### Problema Actual

1. A tabela `service_parts` não regista **quem** adicionou o artigo nem **onde** (visita/oficina)
2. Quando o serviço vai de visita → oficina, o `handleConfirmArticles` da oficina **apaga todos os `is_requested=false`** e reinsere — perdem-se os artigos da visita
3. O painel de detalhes (`ServiceDetailSheet`) mostra artigos sem separação por técnico/local
4. Não há consolidação financeira multi-intervenção

### Alterações na Base de Dados

**Migração: adicionar colunas à tabela `service_parts`**

```sql
ALTER TABLE public.service_parts
  ADD COLUMN registered_by uuid REFERENCES auth.users(id),
  ADD COLUMN registered_location text DEFAULT 'oficina';
-- registered_location: 'visita' | 'oficina'
```

Isto permite rastrear quem registou cada artigo e em que contexto.

### Alterações nos Ficheiros

#### 1. `VisitFlowModals.tsx` — `handleConfirmArticles`

- Ao inserir artigos, preencher `registered_by: user.id` e `registered_location: 'visita'`
- Alterar o DELETE para só apagar partes com `registered_location = 'visita'` (não apagar artigos de oficina se por acaso existirem)

#### 2. `WorkshopFlowModals.tsx` — Artigos da Visita como Read-Only + Novos Artigos

**Carregar artigos existentes** ao montar o modal:
- Query `service_parts` onde `is_requested = false` para o serviço
- Separar em `previousArticles` (registados por outro técnico/em visita) e artigos actuais

**No modal `registo_artigos`**: Layout com duas secções:

```text
┌─────────────────────────────────────────────────────┐
│  Registo de Artigos                      Passo 3    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─ ARTIGOS DA VISITA ──── Técnico: João ─────────┐ │
│  │  (opacity-50, não editável)                     │ │
│  │  Ref  │ Descrição    │ Qtd │ Valor              │ │
│  │  ABC  │ Filtro HEPA  │  1  │ 25.00              │ │
│  └────────────────────────────────────────────────┘ │
│                                                     │
│  ┌─ ARTIGOS DA OFICINA (editáveis) ──────────────┐  │
│  │  Artigo │ Descrição    │ Qtd │ Valor  │ 🗑     │  │
│  │  [    ] │ [          ] │ [ ] │ [    ] │        │  │
│  └────────────────────────────────────────────────┘  │
│                                                     │
│  [+ Adicionar Artigo]                               │
│                                                     │
│  [← Anterior]              [Continuar →]            │
└─────────────────────────────────────────────────────┘
```

**No modal `resumo_reparacao`**: Mostra ambos os grupos com subtotais separados, depois soma total.

**No `handleConfirmArticles` da oficina**: DELETE apenas `registered_location = 'oficina'`, inserir com `registered_by: user.id` e `registered_location: 'oficina'`.

#### 3. `ServiceDetailSheet.tsx` — Painel Financeiro Consolidado

Redesign da secção "Artigos / Peças" e "Informação Financeira":

```text
┌─────────────────────────────────────────────────────┐
│  📦 Artigos / Intervenções                          │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ── Visita • João Silva • 28/02/2026 ──────────── │
│  Filtro HEPA (ABC)   1x  25.00€  = 25.00€          │
│  Mão de obra         1x  40.00€  = 40.00€          │
│                          Subtotal: 65.00 €          │
│                                                     │
│  ── Oficina • Pedro Costa • 01/03/2026 ─────────  │
│  Compressor (XY-123) 1x 120.00€  = 120.00€         │
│  Soldadura            1x  30.00€  = 30.00€          │
│                          Subtotal: 150.00 €         │
│                                                     │
├─────────────────────────────────────────────────────┤
│  Subtotal Geral ..................... 215.00 €      │
│  Desconto .......................... - 10.00 €      │
│  IVA (23%) .......................... 47.15 €      │
│  TOTAL FINAL ....................... 252.15 €      │
│  ─────────────────────────────────────────────────  │
│  Já Pago ✅ .......................... 50.00 €      │
│  EM DÉBITO 🔴 ....................... 202.15 €      │
└─────────────────────────────────────────────────────┘
```

- Agrupar `service_parts` por `registered_by` + `registered_location`
- Resolver o nome do técnico via join com profiles
- Mostrar data de criação do artigo
- Calcular subtotais por grupo
- Somar tudo, aplicar desconto/IVA do `pricing_description`
- Abater `amount_paid` automaticamente
- Mostrar saldo em débito

#### 4. Dados necessários no `useFullServiceData`

Adicionar join para buscar `registered_by` → `profiles.full_name` nos `service_parts`. Como o Supabase não suporta join directo de `service_parts.registered_by` → `profiles.user_id`, será necessário:
- Buscar os `service_parts` com `registered_by`
- Resolver nomes via query separada aos profiles onde `user_id IN (...)` dos registered_by únicos

### Ficheiros Afectados

1. **Migração SQL** — `ALTER TABLE service_parts ADD COLUMN registered_by, registered_location`
2. **`src/components/technician/VisitFlowModals.tsx`** — inserir com `registered_by` + `registered_location: 'visita'`, DELETE filtrado por location
3. **`src/components/technician/WorkshopFlowModals.tsx`** — carregar artigos anteriores, mostrar read-only com opacidade, inserir com `registered_location: 'oficina'`, DELETE filtrado
4. **`src/components/services/ServiceDetailSheet.tsx`** — redesign da secção de artigos com agrupamento por técnico/local e painel financeiro consolidado
5. **`src/hooks/useServices.ts`** — enriquecer query de `service_parts` para incluir `registered_by` e `registered_location`

