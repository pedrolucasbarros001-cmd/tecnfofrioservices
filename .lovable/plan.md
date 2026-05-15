# Plano: 4 correções operacionais

## 1. "Atribuição desaparece no dia seguinte" (investigação + correção)

**Hipótese principal (precisa confirmação):** o serviço continua atribuído no banco, mas **não aparece na agenda** porque o filtro de `agenda-services` em `GeralPage.tsx` (linha ~167) exclui status `concluidos`, `a_precificar`, `finalizado` e `cancelado`. Se o técnico move o serviço para `a_precificar` ou `concluidos`, ele desaparece da agenda mesmo sem perder data/técnico.

**Hipótese secundária:** a função `lift_service_to_workshop` (levantar para oficina) limpa explicitamente `technician_id`, `scheduled_date` e `scheduled_shift`. Se o técnico aciona "Levantar para Oficina" no fim do dia, no dia seguinte aparece sem atribuição.

**Verificação a fazer (a pedir ao utilizador antes de mexer):** confirmar se, ao "desaparecer", o serviço ainda existe (e em que status) ou se simplesmente sumiu da agenda. Se confirmado:

- Manter `lift_service_to_workshop` como está (é intencional limpar agenda quando vai para oficina).
- Em `GeralPage.tsx` (consulta `agenda-services`), incluir também serviços com data agendada já passada que continuam ativos, para o utilizador ver atrasos. Já está — o problema é só o status. Avaliar adicionar `na_oficina` com data, ou criar uma vista "Atrasados" sem depender só do dia.

→ **Antes de codificar, confirmo o cenário exato com o utilizador** (ver pergunta no fim).

## 2. Adicionar pagamento por cheque

Suporte ao método `cheque` em todo o fluxo de pagamentos.

**Schema:**
- Migration: nada a alterar — `service_payments.payment_method` é `text` livre. (Confirmar que não há CHECK constraint via `supabase--read_query`.)

**Código:**
- `src/types/database.ts` (linha 29): adicionar `'cheque'` ao tipo `PaymentMethod`.
- `src/components/modals/RegisterPaymentModal.tsx`: incluir `{ value: 'cheque', label: 'Cheque' }` em `PAYMENT_METHODS` e em `METHOD_LABELS`.
- `src/components/technician/FieldPaymentStep.tsx`: incluir a opção em `PAYMENT_METHODS`.
- Verificar e atualizar qualquer outro local com lista de métodos (procurar `'mbway'` no projeto).

## 3. Duplicação de pagamentos entre técnico e secretaria

**Análise:** o `RegisterPaymentModal` já tem proteção de 2 minutos por (`service_id`+`amount`+`payment_method`), mas:
- A proteção não cruza com `service_payments` reportados pelo técnico em campo (`is_pending_validation=true`) que ficam pendentes de validação.
- A secretaria pode registar um pagamento "novo" em vez de **validar** o pagamento pendente do técnico → fica duplicado.

**Correções:**
- Em `RegisterPaymentModal.handleSubmit`, antes do INSERT, se existir um `service_payments` com `is_pending_validation=true` para o mesmo serviço com valor próximo (±0.01) e método igual, mostrar aviso bloqueante: *"Existe pagamento pendente do técnico de €X — valida ou rejeita primeiro."* — com botão "Ir para validação" que rola até à secção amarela.
- Banner visual no topo do modal quando há `pendingPayments.length > 0` (já são listados, mas não bloqueiam a criação).
- Estender a janela de proteção contra duplicado: também considerar `received_by` diferente (técnico vs secretária) nos últimos 10 minutos com mesmo valor+método.

## 4. Orçamentos a serem marcados como seguro

**Verificação no banco (já feita):** os últimos 15 orçamentos têm todos `is_insurance_budget=false`. **Os dados estão corretos no Supabase.**

**Hipótese:** o utilizador pode estar a confundir o badge visual ou a impressão. Vou:
- Inspecionar `BudgetPrintPage.tsx` e `BudgetDetailPanel.tsx` para confirmar que o tratamento visual depende mesmo de `is_insurance_budget`.
- Conferir se em `WorkshopFlowModals` ou `VisitFlowModals` (que enviam `is_insurance_budget` no insert) há algum default forçado a `true`.
- Verificar `EditBudgetDetailsModal` para garantir que ao editar não força a flag.
- Se nada estiver a forçar `true`, alinhar com utilizador: provavelmente é confusão de UX (campos "Marca/Processo de garantia" aparecem em todos e podem dar essa impressão).

## Detalhes técnicos

| Ficheiro | Alteração |
|---|---|
| `src/types/database.ts` | adicionar `'cheque'` ao `PaymentMethod` |
| `src/components/modals/RegisterPaymentModal.tsx` | método cheque + bloqueio quando existe pagamento pendente do técnico |
| `src/components/technician/FieldPaymentStep.tsx` | método cheque |
| `src/pages/GeralPage.tsx` (após confirmação do cenário 1) | ajuste no filtro de `agenda-services` |
| Inspecionar (sem editar a princípio): `BudgetPrintPage.tsx`, `WorkshopFlowModals.tsx`, `VisitFlowModals.tsx` |

Sem alterações de schema.

## Pergunta para o utilizador (antes de implementar a #1)

Quando dizes que "no dia seguinte a atribuição, dia e hora desaparecem", o serviço:
- (a) deixa de aparecer na **agenda semanal** mas ainda existe em "Serviços" (com técnico e data lá)?
- (b) realmente perde técnico/data no banco (aparece sem técnico em qualquer ecrã)?
- (c) acontece sempre depois de uma ação específica (ex.: "Levantar para Oficina", técnico finalizar a visita, ir para "A Precificar")?
