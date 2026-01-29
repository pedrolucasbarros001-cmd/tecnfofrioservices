
# Plano: Corrigir Visibilidade de Serviços na Oficina e Coexistencia de Estados

## Problema Identificado

Existem **3 problemas distintos** que causam serviços a "sumir":

### 1. RLS do TV Monitor exclui status `por_fazer`
A politica atual apenas permite:
```sql
status IN ('na_oficina', 'em_execucao', 'para_pedir_peca', 'em_espera_de_peca', 'concluidos')
```
Logo, servicos como `OS-00002` (status=`por_fazer`, location=`oficina`) nao aparecem.

### 2. Nao existe card separado para servicos na oficina aguardando trabalho
O Dashboard mostra cards por status, mas um servico pode estar "na oficina" (`service_location='oficina'`) com qualquer status operacional. O card "Na Oficina" filtra por `status='na_oficina'`, o que e diferente de `service_location='oficina'`.

### 3. Estados financeiros vs operacionais precisam coexistir visualmente
Um servico pode estar simultaneamente:
- **Operacional**: `finalizado` (trabalho concluido)
- **Financeiro**: "A Precificar" (`pending_pricing=true`) E/OU "Em Debito" (`final_price > amount_paid`)

---

## Solucao

### A) Corrigir RLS do TV Monitor

Criar nova migracao para atualizar a politica:

```sql
-- Remover politica restritiva
DROP POLICY IF EXISTS "Public read for workshop services on TV monitor" ON public.services;

-- Criar politica que inclui TODOS os servicos na oficina
CREATE POLICY "Public read for workshop services on TV monitor"
  ON public.services FOR SELECT
  TO anon, authenticated
  USING (
    service_location = 'oficina' 
    AND status NOT IN ('finalizado')
  );
```

**Logica**: Mostrar todos os servicos com `service_location='oficina'` exceto os ja finalizados (que sairam da oficina).

**Ficheiro**: `supabase/migrations/[timestamp]_fix_tv_monitor_rls.sql`

---

### B) Corrigir politica de customers associados

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
        AND s.status NOT IN ('finalizado')
    )
  );
```

---

### C) Garantir que TV Monitor mostra todos os status relevantes

Atualizar `TVMonitorPage.tsx` para incluir `por_fazer` e `a_precificar` nas secoes:

```typescript
const MONITOR_SECTIONS = [
  { status: 'por_fazer', label: 'Por Fazer', icon: Clock, color: 'text-blue-400' },
  { status: 'em_execucao', label: 'Em Execução', icon: Play, color: 'text-cyan-400' },
  { status: 'na_oficina', label: 'Na Oficina (Disponíveis)', icon: Building2, color: 'text-green-400' },
  { status: 'para_pedir_peca', label: 'Para Pedir Peça', icon: Package, color: 'text-yellow-400' },
  { status: 'em_espera_de_peca', label: 'Em Espera de Peça', icon: Clock, color: 'text-orange-400' },
  { status: 'a_precificar', label: 'A Precificar', icon: DollarSign, color: 'text-green-400' },
  { status: 'concluidos', label: 'Concluídos (Prontos para Entrega)', icon: CheckCircle, color: 'text-emerald-400' },
];
```

E atualizar a barra de estatisticas:
```typescript
const statusOrder: ServiceStatus[] = [
  'por_fazer', 'em_execucao', 'na_oficina', 
  'para_pedir_peca', 'em_espera_de_peca', 'a_precificar', 'concluidos'
];
```

**Ficheiro**: `src/pages/TVMonitorPage.tsx`

---

### D) Migracao para corrigir dados existentes

Marcar servicos finalizados sem preco como `pending_pricing=true`:

```sql
UPDATE public.services
SET pending_pricing = true
WHERE status = 'finalizado'
  AND pending_pricing = false
  AND (final_price IS NULL OR final_price = 0)
  AND is_warranty = false;
```

---

## Ficheiros a Alterar

| Ficheiro | Alteracao |
|----------|-----------|
| `supabase/migrations/[timestamp]_fix_workshop_visibility.sql` | Nova migracao com RLS corrigida + correcao de dados |
| `src/pages/TVMonitorPage.tsx` | Adicionar `por_fazer` e `a_precificar` nas secoes |

---

## Resultado Esperado

| Cenario | Antes | Depois |
|---------|-------|--------|
| `por_fazer` + oficina no TV Monitor | Nao aparece | Aparece |
| `a_precificar` + oficina no TV Monitor | Nao aparece | Aparece |
| `em_execucao` + oficina no TV Monitor | Aparece | Aparece |
| Servico finalizado + oficina | Nao aplicavel | Nao aparece (saiu da oficina) |
| Dashboard cards | Conta serviços | Conta serviços (sem mudanca) |
| GeralPage filtros | Funciona | Funciona (sem mudanca) |

---

## Diagrama de Visibilidade

```text
┌─────────────────────────────────────────────────────────────┐
│                    REGRA DE VISIBILIDADE                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  TV MONITOR (publico/anon):                                │
│    service_location = 'oficina'                            │
│    AND status NOT IN ('finalizado')                        │
│                                                             │
│  DASHBOARD / GERAL (autenticado):                          │
│    Todos os servicos (politica RLS ja permite)             │
│    Contagem por status + pending_pricing + debito calc     │
│                                                             │
│  COEXISTENCIA:                                              │
│    Servico pode aparecer em multiplos "estados":           │
│    - Status operacional (por_fazer, em_execucao, etc.)     │
│    - Flag financeira (pending_pricing=true → A Precificar) │
│    - Calculo financeiro (final_price > amount_paid → Debito)│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Validacao

1. Criar servico na oficina com status `por_fazer`:
   - Aparece no TV Monitor ✓
   - Aparece no Dashboard card "Por Fazer" ✓
   - Aparece na GeralPage com filtro "Por Fazer" ✓

2. Finalizar instalacao sem preco:
   - `pending_pricing=true` automaticamente ✓
   - Aparece no card "A Precificar" ✓
   - Aparece na lista "A Precificar" ✓
   - Acao "Definir Preco" disponivel ✓

3. Definir preco e registar pagamento parcial:
   - Aparece em "Em Debito" (calculado) ✓
   - Status operacional permanece ✓
