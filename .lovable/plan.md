

## Plano: Alinhar SetPriceModal e RegisterPaymentModal com Histórico de Artigos

### Resumo

Sem botão "Validar como está" separado — o "Confirmar" existente faz tudo. O modal mostra o histórico de `service_parts` como read-only acima da tabela editável, e o form permite submissão com items vazios (artigos adicionais são opcionais se já existe histórico).

### Ficheiros afectados

#### 1. `src/components/modals/SetPriceModal.tsx`

**Queries adicionais ao abrir (quando `open && service`):**
- `service_parts` onde `is_requested = false` e `service_id = service.id` — artigos dos técnicos
- `service_payments` onde `service_id = service.id` — pagamentos anteriores
- `profiles` para resolver `registered_by` → nome do técnico

**Alterações de layout (inserir ACIMA da tabela PriceLineItems):**

```text
┌──────────────────────────────────────────────────────┐
│  Definir Preço - TF-00042           [Garantia badge] │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ── HISTÓRICO DE INTERVENÇÕES ──── (read-only)       │
│  (só aparece se existirem service_parts)             │
│  Visita • João Silva • 28/02/2026                    │
│    Filtro HEPA (ABC)   1x  25.00€  = 25.00€         │
│                           Subtotal: 25.00 €          │
│  Oficina • Pedro Costa • 01/03/2026                  │
│    Compressor (XY)     1x 120.00€  = 120.00€        │
│                           Subtotal: 120.00 €         │
│                                                      │
│  ── ARTIGOS ADICIONAIS (editáveis) ──────────────── │
│  [PriceLineItems existente — SEM ALTERAÇÃO]          │
│                                                      │
│  ── RESUMO ─────────────────────────────────────── │
│  [PricingSummary existente — subtotal inclui          │
│   historySubtotal + additionalSubtotal]              │
│                                                      │
│  ── INFORMAÇÃO ──────────────────────────────────── │
│  Já Pago ✅ ...................... 50.00 €           │
│  Total a Cobrar ................. XXX.XX €           │
│                                                      │
├──────────────────────────────────────────────────────┤
│  [Cancelar]                          [Confirmar]     │
└──────────────────────────────────────────────────────┘
```

**Alterações de lógica:**
- Calcular `historySubtotal` = soma de `cost * quantity` de todos os `service_parts` (is_requested=false)
- O subtotal passado ao `PricingSummary` passa a ser `historySubtotal + additionalSubtotal` (dos PriceLineItems)
- Relaxar validação do form: `items` passa de `.min(1)` para `.min(0)` — se não há artigos adicionais e existe histórico, o "Confirmar" funciona na mesma
- Se os items do form estão todos vazios (description vazia), o submit filtra-os e usa só o histórico
- Secção "Já Pago" mostra soma dos `service_payments` — informacional
- O `pricing_description` JSON salvo inclui referência ao histórico para auditoria

**Agrupamento dos artigos do histórico:**
- Agrupar por `registered_location + registered_by`
- Resolver nome do técnico via query a `profiles` onde `user_id IN (...)`
- Mostrar data do primeiro artigo do grupo (`created_at`)
- Opacity-60 para toda a secção, não editável

#### 2. `src/components/modals/RegisterPaymentModal.tsx`

**Queries adicionais ao abrir:**
- `service_parts` (is_requested=false) + profiles para nomes dos técnicos
- `service_payments` para histórico de pagamentos anteriores

**Alterações de layout (inserir ACIMA do resumo financeiro existente):**

```text
┌──────────────────────────────────────────────────────┐
│  Registar Pagamento - TF-00042                       │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ▼ Detalhes do Serviço (Collapsible, fechado)        │
│  ┌────────────────────────────────────────────────┐  │
│  │ Visita • João Silva                            │  │
│  │   Filtro HEPA  1x  25.00€                      │  │
│  │ Oficina • Pedro Costa                          │  │
│  │   Compressor   1x 120.00€                      │  │
│  │ Subtotal: 215.00€  Desc: -10€  IVA: +47€      │  │
│  │ TOTAL: 252.15€                                 │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ── PAGAMENTOS ANTERIORES ────────────────────────── │
│  (só aparece se existirem pagamentos)                │
│  28/02 • Dinheiro • 50.00€ • Recebido: João         │
│  Total Pago: 50.00€                                  │
│                                                      │
│  ── RESUMO FINANCEIRO (existente, sem alteração) ──  │
│  [Campos de pagamento existentes]                    │
│  [Novo saldo preview]                                │
├──────────────────────────────────────────────────────┤
│  [Cancelar]              [Confirmar Pagamento]       │
└──────────────────────────────────────────────────────┘
```

**Detalhes:**
- `Collapsible` (Radix) fechado por defeito para "Detalhes do Serviço"
- Pagamentos anteriores: lista com data, método, valor e quem recebeu (join profiles via `received_by`)
- O resumo financeiro existente (Valor Total / Já Pago / Em Falta) calcula `Em Falta` usando a soma real dos `service_payments`, não `amount_paid` do serviço — mais fiável
- Max-width do modal alarga para `sm:max-w-[700px]` para acomodar os detalhes

### Nenhuma alteração de DB necessária

As colunas `registered_by` e `registered_location` já existem em `service_parts`. As queries são feitas client-side.

