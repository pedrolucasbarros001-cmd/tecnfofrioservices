

# Plano: Adicionar Scroll Padronizado a Todos os Modais

## Problema

Varios modais do sistema nao possuem suporte a scroll quando o conteudo excede a altura da tela, especialmente em dispositivos moveis. Isto causa conteudo cortado e botoes inacessiveis (como visivel no screenshot do "Registar Pedido de Peca").

## Modais que Precisam de Correcao

### Grupo 1 -- Modais sem qualquer scroll (6 ficheiros)

| Modal | Problema |
|---|---|
| `SendTaskModal.tsx` | Sem max-h, sem scroll |
| `ServiceTypeSelector.tsx` | Sem max-w-[95vw], sem max-h, sem scroll |
| `DeliveryManagementModal.tsx` | Sem max-h, sem scroll |
| `ContactClientModal.tsx` | Sem max-h, sem scroll |
| `ServiceTagModal.tsx` | Sem max-h, sem scroll |
| `RequestTransferModal.tsx` | Sem max-h, sem scroll |

### Grupo 2 -- Modal com scroll fora do padrao (1 ficheiro)

| Modal | Problema |
|---|---|
| `EditServiceDetailsModal.tsx` | Usa `overflow-y-auto` direto no DialogContent em vez do padrao com header fixo + ScrollArea + footer fixo |

### Modais ja corretos (nao serao alterados)

ConfirmPartOrderModal, CreateServiceModal, CreateCustomerModal, CreateDeliveryModal, SetPriceModal, CreateBudgetModal, ForceStateModal, RescheduleServiceModal, AssignDeliveryModal, UsedPartsModal, CreateUserModal, EditUserModal, PartArrivedModal, RegisterPaymentModal, RequestPartModal, ConvertBudgetModal, AssignTechnicianModal, CreateInstallationModal, EditBudgetDetailsModal, ServicePrintModal (modal especial de impressao).

## Solucao

Aplicar o padrao ja existente no projeto em todos os modais: `DialogContent` com `max-h-[90vh] flex flex-col overflow-hidden p-0`, header com `px-6 pt-6 pb-4 flex-shrink-0`, conteudo central com scroll, e footer com `px-6 py-4 border-t flex-shrink-0`.

### Para modais mais simples (Grupo 1)

Adicionar `max-h-[90vh]` e `overflow-y-auto` ao DialogContent (sem necessidade de separar header/footer pois o conteudo e curto, mas garante que em telas pequenas funcione):

```
DialogContent className="sm:max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto"
```

### Para EditServiceDetailsModal (Grupo 2)

Converter para o padrao completo: header fixo, ScrollArea no meio, footer fixo. Isto garante que os botoes "Cancelar" e "Guardar" fiquem sempre visiveis.

## Detalhes por Ficheiro

### `src/components/modals/SendTaskModal.tsx`
- Adicionar `max-h-[90vh] overflow-y-auto` ao DialogContent

### `src/components/modals/ServiceTypeSelector.tsx`
- Adicionar `max-w-[95vw] max-h-[90vh] overflow-y-auto` ao DialogContent

### `src/components/modals/DeliveryManagementModal.tsx`
- Adicionar `max-h-[90vh] overflow-y-auto` ao DialogContent

### `src/components/modals/ContactClientModal.tsx`
- Adicionar `max-h-[90vh] overflow-y-auto` ao DialogContent

### `src/components/modals/ServiceTagModal.tsx`
- Adicionar `max-h-[90vh] overflow-y-auto` ao DialogContent

### `src/components/modals/RequestTransferModal.tsx`
- Adicionar `max-h-[90vh] overflow-y-auto` ao DialogContent

### `src/components/modals/EditServiceDetailsModal.tsx`
- Converter de `overflow-y-auto` simples para o padrao completo com `p-0`, header fixo (`px-6 pt-6 pb-4 flex-shrink-0`), ScrollArea central, e DialogFooter fixo (`px-6 py-4 border-t flex-shrink-0`)

## Ficheiros Alterados

| Ficheiro | Alteracao |
|---|---|
| `src/components/modals/SendTaskModal.tsx` | Adicionar max-h + overflow |
| `src/components/modals/ServiceTypeSelector.tsx` | Adicionar max-w-[95vw] + max-h + overflow |
| `src/components/modals/DeliveryManagementModal.tsx` | Adicionar max-h + overflow |
| `src/components/modals/ContactClientModal.tsx` | Adicionar max-h + overflow |
| `src/components/modals/ServiceTagModal.tsx` | Adicionar max-h + overflow |
| `src/components/modals/RequestTransferModal.tsx` | Adicionar max-h + overflow |
| `src/components/modals/EditServiceDetailsModal.tsx` | Refactor para padrao completo com ScrollArea |

## Resultado

- Todos os modais terao scroll funcional em qualquer tamanho de tela
- Botoes de acao (Cancelar, Confirmar) ficam sempre acessiveis
- Padrao visual consistente em todo o sistema
- Funciona identicamente para todos os cargos (dono, secretaria, tecnico)
