## Diagnóstico

Confirmei na base de dados que **todos os orçamentos recentes estão correctamente guardados como `is_insurance_budget = false`** (zero registos com `true`). O dado está certo — o problema é puramente visual:

1. A **folha de impressão** (`/print/budget/:id`) renderiza sempre com o título **"Relatório / Orçamento"** e o bloco "Descrição do Orçamento" da avaria, que é o layout do modelo de **Seguro**. Não muda quando o orçamento é simples.
2. O **modal de tipo de serviço** no atalho a partir do perfil do cliente (`CreateServiceFromCustomerModal` em `CustomerDetailSheet.tsx`) tem o cartão "Orçamento" gated por `isDono`, pelo que a secretaria não o vê. (A página `/orcamentos` tem o seu próprio botão "Criar Orçamento" — não é alterada aqui.)

## O que vou fazer

### 1. Layout de impressão sensível ao tipo de orçamento (`src/pages/BudgetPrintPage.tsx`)

- Título dinâmico:
  - `is_insurance_budget === true` → **"Relatório / Orçamento"** (modelo seguro, como hoje).
  - `is_insurance_budget === false` (ou null) → **"Orçamento"** (modelo simples).
- Seção "Descrição do Orçamento" (texto da avaria) passa a renderizar apenas quando `is_insurance_budget === true`. No modelo simples deixa de aparecer — fica só Equipamento + Artigos + Totais + Notas.
- A seção "Equipamento" mantém-se em ambos os modelos (continua condicional aos campos existirem).
- Sem mudanças de dados, query ou rotas — apenas renderização condicional.

### 2. Botão "Orçamento" para a secretaria no atalho do cliente (`src/components/shared/CustomerDetailSheet.tsx`)

- Atualmente o cartão "Orçamento" no `CreateServiceFromCustomerModal` aparece com `{isDono && (...)}` e o `CreateBudgetModal` também só monta se `isDono`.
- Alterar a regra de visibilidade para **`isDono || isSecretaria`**:
  - Adicionar `const isSecretaria = role === 'secretaria';`.
  - Passar `canCreateBudget = isDono || isSecretaria` ao `CreateServiceFromCustomerModal` e substituir os `isDono` que controlam o cartão "Orçamento", a grelha (`grid-cols-2 sm:grid-cols-4`) e a montagem do `CreateBudgetModal`.
- O `CreateBudgetModal` já existe, já abre com a checkbox de Seguro **desmarcada por defeito** e já grava `is_insurance_budget: false` quando não marcada — nenhuma alteração na lógica de criação.
- Técnico continua sem ver o cartão "Orçamento" (mantém-se restrito).

## Fora de âmbito

- Não mexo na criação do orçamento via fluxo do técnico (`VisitFlowModals` / `WorkshopFlowModals`) — já grava `is_insurance_budget = false` corretamente.
- Não mexo na página `/orcamentos` nem no badge "Seguro" no `BudgetDetailPanel` (já condicional à flag e correto).
- Não toco em RLS, schema ou migrações.

## Ficheiros a editar

- `src/pages/BudgetPrintPage.tsx` — título e bloco "Descrição do Orçamento" condicionais a `budget.is_insurance_budget`.
- `src/components/shared/CustomerDetailSheet.tsx` — permitir secretaria ver o cartão "Orçamento" e abrir `CreateBudgetModal`.
