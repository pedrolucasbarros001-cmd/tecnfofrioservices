

## Correcção: Build errors + Artigos do pricing_description devem ter prioridade

### Diagnóstico

**Problema principal**: O `ServiceDetailSheet` e o `ServicePrintPage` priorizam `service_parts` sobre `pricing_description`. Quando o admin edita artigos via "Editar Detalhes" (que grava em `pricing_description`), os dados antigos de `service_parts` continuam a ser mostrados porque a condição verifica primeiro se existem `service_parts` não-pedidos.

A lógica correcta é: **`pricing_description` é a versão final** (editada pelo admin). Se existir e tiver items, deve ser sempre mostrado. `service_parts` é o fallback quando não há pricing_description.

### Build Errors (5 erros)

**1. `ConfirmPartOrderModal.tsx` linha 261** — `part.cost = e.target.value` atribui string a number. Corrigir com cast ou usar variável local.

**2. `EditServiceDetailsModal.tsx` linha 190** — `validItems` tem `description` opcional mas `LineItem` exige obrigatório. Adicionar `as LineItem[]` ou garantir que o filter já assegura description não-vazia.

**3. `SetPriceModal.tsx` linha 127** — `ServicePart` do `useServiceFinancialData` não inclui `is_requested` (já é filtrado na query). Remover o `.filter(p => !p.is_requested)`.

**4-5. `WorkshopFlowModals.tsx` linhas 1258/1262** — `quantity` não existe no tipo `{ name, reference, cost }`. Adicionar `quantity: string` ao tipo de `partsToOrder`.

### Prioridade pricing_description (2 ficheiros)

**`src/components/services/ServiceDetailSheet.tsx`** — Inverter a lógica do `centralItems`: se `pricing_description` existe e tem items, usar esses SEMPRE. Fallback para `service_parts` apenas quando não há pricing_description.

**`src/pages/ServicePrintPage.tsx`** — Mesma inversão: se `pricingDetails.items` existir, mostrar esses em vez de `usedParts`.

### Ficheiros a modificar (5)

1. **`src/components/services/ServiceDetailSheet.tsx`** — Inverter prioridade centralItems vs serviceParts
2. **`src/pages/ServicePrintPage.tsx`** — Inverter prioridade pricingDetails vs usedParts  
3. **`src/components/modals/ConfirmPartOrderModal.tsx`** — Fix tipo string→number
4. **`src/components/modals/SetPriceModal.tsx`** — Remover `.filter(p => !p.is_requested)` 
5. **`src/components/technician/WorkshopFlowModals.tsx`** — Adicionar `quantity` ao tipo partsToOrder
6. **`src/components/modals/EditServiceDetailsModal.tsx`** — Fix tipo LineItem cast

