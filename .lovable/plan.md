
## Objetivo (bug reportado)
Garantir que **um serviço pode estar “Finalizado” (trabalho concluído) e, ao mesmo tempo, “A Precificar” (sem preço definido)**, aparecendo sempre na lista “A Precificar” até a precificação ser feita — e depois **passar a “Em Débito” apenas no sentido financeiro** (com base em `final_price` vs `amount_paid`), sem perder o estado “Finalizado”.

---

## Diagnóstico (por que isto acontece)
Hoje o sistema tenta usar `status` para representar coisas diferentes (estado operacional e estado financeiro). Isso causa conflitos:

1. **O filtro “A Precificar” deveria ser sempre `pending_pricing = true`**, independentemente do `status`.
2. Existem pontos do código onde um serviço (ex.: instalação) pode ir para **`status: 'finalizado'` sem garantir `pending_pricing: true`** quando ainda não tem preço.
3. A precificação (`SetPriceModal`) e o registo de pagamentos (`RegisterPaymentModal`) **alteram o `status` para `em_debito`/`concluidos`**, o que entra em conflito com a tua regra:  
   - instalação pode estar “Finalizado” e ainda assim “A Precificar” / “Em Débito” (financeiro)
4. O botão/ação “Definir Preço” **não aparece** para `status='finalizado'` mesmo que `pending_pricing=true`, então o serviço pode “sumir” da ação necessária.

---

## Regras de negócio (como vamos alinhar)
1. **Estado operacional** continua no `status`:
   - Fora da oficina (`service_location != 'oficina'`): não usa “Concluídos” como etapa final operacional (instalação fica “Finalizado”).
   - Dentro da oficina: usa “Concluídos” como etapa operacional antes da entrega.
2. **Precificação pendente** é exclusivamente `pending_pricing`.
3. **Débito** passa a ser **estado financeiro calculado**:
   - “Em débito” se `final_price > amount_paid`
   - “Sai do débito” quando `amount_paid >= final_price`
4. Serviço pode estar **Finalizado e Em Débito ao mesmo tempo** (financeiro), sem mudar `status`.

---

## Implementação (o que será alterado)

### A) Garantir que “A Precificar” mostra todos os pendentes (inclusive finalizados)
1. **GeralPage**: manter/fortalecer o comportamento de “A Precificar” como filtro por `pending_pricing`.
   - Tornar o filtro robusto aceitando:
     - `status=a_precificar` (compatibilidade com o que o Dashboard já usa)
     - e opcionalmente `status=pending_pricing` (mais explícito)
   - Internamente, ambos viram `useServices({ status: 'pending_pricing' })`.

**Ficheiro:** `src/pages/GeralPage.tsx`  
**Resultado:** qualquer serviço com `pending_pricing=true` aparece na lista, mesmo se `status='finalizado'`.

---

### B) Corrigir o fluxo de Instalação para não “perder” o pending_pricing
Hoje existe pelo menos um fluxo de instalação (página) que finaliza sem marcar `pending_pricing`.

1. Atualizar o “finish” da instalação para incluir:
   - `pending_pricing: true` (quando ainda não foi precificado)

**Ficheiro:** `src/pages/technician/TechnicianInstallationFlow.tsx`  
**Onde:** `handleSignatureComplete` → `updateService.mutateAsync({ ... })`  
**Resultado:** instalação finalizada sem preço aparece no “A Precificar”.

---

### C) Permitir “Definir Preço” mesmo quando o serviço está Finalizado
Hoje a lógica do `StateActionButtons` só permite “Definir Preço” em poucos casos.

1. Atualizar regras do menu (e opcionalmente ação principal) para:
   - Se `service.pending_pricing === true` e o utilizador é `dono` → mostrar “Definir Preço” independentemente do `status` (incluindo `finalizado`).

**Ficheiro:** `src/components/services/StateActionButtons.tsx`  
**Resultado:** o serviço não “some” sem ação possível — mesmo finalizado.

---

### D) Ajustar a precificação: não mudar status para “em_debito”
Hoje `SetPriceModal` faz:
- `pending_pricing: false`
- e muda `status` para `em_debito` se houver dívida

Vamos mudar para:
1. **Nunca usar `status='em_debito'` como resultado automático da precificação.**
2. `pending_pricing` passa a `false` quando o preço é definido.
3. `status`:
   - Se o serviço estava em `a_precificar`, aí sim pode “fechar” o operacional:
     - fora da oficina → `finalizado`
     - na oficina → `concluidos`
   - Se o serviço já estava `finalizado` (instalação), **permanece `finalizado`**.

**Ficheiro:** `src/components/modals/SetPriceModal.tsx`  
**Resultado:** após precificar, o serviço continua “Finalizado”, e aparece em “Em Débito” (página /em-debito) apenas por cálculo financeiro.

---

### E) Ajustar registo de pagamento: não mudar status
Hoje `RegisterPaymentModal` altera `status` para `em_debito`/`concluidos`. Isso quebra o teu modelo.

Vamos mudar para:
1. Atualizar apenas:
   - `amount_paid`
2. Não mexer em `status`.

**Ficheiro:** `src/components/modals/RegisterPaymentModal.tsx`  
**Resultado:** o serviço continua “Finalizado” (instalação), e “sai do débito” automaticamente quando `amount_paid >= final_price` (porque a página de débito já filtra por cálculo).

---

### F) Dashboard: contagens alinhadas com a realidade (para não haver “card diz X e lista mostra Y”)
1. “A Precificar” no Dashboard deve contar apenas:
   - `pending_pricing === true`
2. “Em Débito” no Dashboard deve contar por cálculo:
   - `final_price > 0 && amount_paid < final_price`
3. O card “Em Débito” deve navegar para `/em-debito` (onde já existe a lista correta).

**Ficheiro:** `src/pages/DashboardPage.tsx`  
**Resultado:** o número do card bate sempre certo com a lista.

---

## Migração / Correção de dados existentes (para resolver o caso que já aconteceu)
Para serviços já criados e que ficaram “Finalizado” sem preço, vamos incluir uma migração SQL (ou script de correção) para marcar `pending_pricing=true` quando fizer sentido.

Sugestão segura (focada em instalações):
- `is_installation = true`
- `status = 'finalizado'`
- `pending_pricing = false`
- `final_price = 0`
- `is_warranty = false`

E opcionalmente (se existir legado):
- Converter `status='em_debito'` para:
  - `concluidos` se `service_location='oficina'`
  - `finalizado` caso contrário  
  (para alinhar com o modelo novo, onde débito é financeiro e não “estado operacional”)

**Ficheiro:** nova migração em `supabase/migrations/*_fix_pricing_coexistence.sql`

---

## Checklist de validação (end-to-end)
1. Criar uma instalação, concluir como técnico:
   - serviço fica `finalizado`
   - `pending_pricing=true`
   - aparece no Dashboard “A Precificar”
   - aparece na lista “A Precificar”
2. Abrir esse serviço e conseguir clicar “Definir Preço” mesmo estando finalizado.
3. Definir preço:
   - `pending_pricing=false`
   - continua `finalizado`
   - se `amount_paid < final_price`, aparece em `/em-debito`
4. Registar pagamento parcial:
   - continua em `/em-debito`
   - continua `finalizado`
5. Registar pagamento total:
   - desaparece de `/em-debito`
   - continua `finalizado`

---

## Risco / Observações
- Esta alteração consolida o modelo correto: **status = operacional; débito = financeiro; precificar = flag**.
- Mantém compatibilidade com o que já existe (incluindo serviços “na oficina” que usam “concluídos”).
