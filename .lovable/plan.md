
# Auditoria e Padronizacao Visual de Modais

## Diagnostico

Analisei todos os modais do sistema e confirmei que **o codigo ja garanta que todos os utilizadores do mesmo cargo (role) veem exactamente a mesma interface**. Nao existe logica por utilizador individual -- apenas por `role` (`dono`, `secretaria`, `tecnico`). Dois tecnicos verao sempre os mesmos modais, e o mesmo aplica-se a administradores e secretarias.

As diferencas visiveis entre contas de cargos diferentes sao intencionais (permissoes), mas encontrei **inconsistencias de estilo entre modais** que devem ser padronizadas:

## Inconsistencias Encontradas

### Larguras de modais inconsistentes
Cada modal usa uma largura diferente sem razao aparente:

| Modal | Largura actual |
|---|---|
| RegisterPaymentModal | `sm:max-w-[425px]` |
| ContactClientModal | `sm:max-w-[400px]` |
| PartArrivedModal | `sm:max-w-[450px]` |
| RescheduleServiceModal | `sm:max-w-[500px]` |
| CreateUserModal / EditUserModal | `sm:max-w-[500px]` |
| RequestTransferModal / SendTaskModal | `sm:max-w-md` |
| ConvertBudgetModal | `sm:max-w-lg` |
| CreateServiceModal | `sm:max-w-lg` |
| CreateBudgetModal / SetPriceModal | `sm:max-w-[900px]` |
| Modais tecnicos (todos) | `max-w-md w-[95vw]` |

### Estruturas de scroll inconsistentes
- Alguns modais usam `flex flex-col` + `overflow-y-auto` com `p-0` (padrao correcto)
- Outros usam `overflow-y-auto` directamente no `DialogContent` sem flex
- Modais de tecnico usam `w-[95vw]` para mobile mas os de admin nao

### Padding e header inconsistentes
- Modais de tecnico: `p-6` no DialogContent + `ModalHeader` customizado
- Modais de admin: padding default do DialogContent + `DialogHeader` padrao

## Plano de Padronizacao

### Regra: 3 tamanhos padrao

1. **Pequeno** (`sm:max-w-md w-[95vw]`): modais simples com poucos campos -- ContactClient, SendTask, RequestTransfer, ServiceTag
2. **Medio** (`sm:max-w-lg w-[95vw] max-h-[90vh] flex flex-col overflow-hidden p-0`): modais com formularios -- RegisterPayment, PartArrived, RescheduleService, CreateUser, EditUser, ForceState, AssignTechnician, ConvertBudget, EditServiceDetails, RequestPart, ConfirmPartOrder, UsedParts
3. **Grande** (`sm:max-w-[900px] w-[95vw] max-h-[90vh] flex flex-col overflow-hidden p-0`): modais com tabelas/listas -- CreateBudget, SetPrice, CreateService, CreateDelivery, CreateInstallation
4. **Modais tecnicos**: manter `max-w-md w-[95vw] max-h-[90vh] overflow-y-auto p-6` (ja consistentes entre si)

### Regra: estrutura de scroll padrao

Todos os modais medios e grandes seguem:

```text
DialogContent (flex flex-col, max-h-[90vh], overflow-hidden, p-0)
  DialogHeader (px-6 pt-6 pb-4, flex-shrink-0)
  div.flex-1.overflow-y-auto.min-h-0.px-6 (conteudo com scroll)
  DialogFooter (px-6 py-4, border-t, flex-shrink-0)
```

### Regra: `w-[95vw]` em todos

Adicionar `w-[95vw]` a todos os modais para garantir que em mobile ocupam a largura correcta, independentemente do cargo.

## Ficheiros a Alterar

| Ficheiro | Alteracao |
|---|---|
| `RegisterPaymentModal.tsx` | `sm:max-w-[425px]` -> `sm:max-w-lg w-[95vw] max-h-[90vh] flex flex-col overflow-hidden p-0` + reestruturar header/scroll/footer |
| `ContactClientModal.tsx` | `sm:max-w-[400px]` -> `sm:max-w-md w-[95vw]` |
| `PartArrivedModal.tsx` | `sm:max-w-[450px]` -> `sm:max-w-lg w-[95vw] max-h-[90vh] flex flex-col overflow-hidden p-0` + reestruturar |
| `RescheduleServiceModal.tsx` | `sm:max-w-[500px]` -> `sm:max-w-lg w-[95vw] max-h-[90vh] flex flex-col overflow-hidden p-0` + reestruturar |
| `CreateUserModal.tsx` | `sm:max-w-[500px]` -> `sm:max-w-lg w-[95vw] max-h-[90vh] flex flex-col overflow-hidden p-0` + reestruturar |
| `EditUserModal.tsx` | `sm:max-w-[500px]` -> `sm:max-w-lg w-[95vw] max-h-[90vh] flex flex-col overflow-hidden p-0` + reestruturar |
| `ForceStateModal.tsx` | Adicionar `w-[95vw]` + reestruturar scroll |
| `ConvertBudgetModal.tsx` | `sm:max-w-lg` -> `sm:max-w-lg w-[95vw] max-h-[90vh] flex flex-col overflow-hidden p-0` + reestruturar |
| `RequestPartModal.tsx` | Padronizar para medio |
| `ConfirmPartOrderModal.tsx` | Padronizar para medio |
| `UsedPartsModal.tsx` | `max-w-md w-[95vw]` -> `sm:max-w-lg w-[95vw] max-h-[90vh] flex flex-col overflow-hidden p-0` + reestruturar |
| `ServicePrintModal.tsx` | Padronizar |
| `ServiceTagModal.tsx` | `sm:max-w-sm` -> `sm:max-w-md w-[95vw]` |
| `SendTaskModal.tsx` | Adicionar `w-[95vw]` |
| `RequestTransferModal.tsx` | Adicionar `w-[95vw]` |
| `CreateServiceModal.tsx` | Verificar que ja tem a estrutura correcta |
| `CreateDeliveryModal.tsx` | Verificar que ja tem a estrutura correcta |
| `CreateInstallationModal.tsx` | Verificar que ja tem a estrutura correcta |
| `SetPriceModal.tsx` | Verificar que ja tem a estrutura correcta |
| `CreateBudgetModal.tsx` | Verificar que ja tem a estrutura correcta |
| `EditBudgetDetailsModal.tsx` | Padronizar |
| `AssignDeliveryModal.tsx` | Padronizar |
| `DeliveryManagementModal.tsx` | Padronizar |

## Modais de Tecnico (ja consistentes)

Os modais de fluxo do tecnico (`VisitFlowModals`, `WorkshopFlowModals`, `InstallationFlowModals`, `DeliveryFlowModals`) ja usam todos o mesmo padrao `max-w-md w-[95vw] max-h-[90vh] overflow-y-auto p-6`. Nao precisam de alteracao.

## Resultado Esperado

Apos esta padronizacao:
- Todos os modais terao largura e comportamento de scroll consistentes
- Em mobile, todos ocuparao 95% da largura do ecra
- A estrutura visual (header fixo, conteudo com scroll, footer fixo) sera identica em todos
- Nenhuma diferenca visual entre contas do mesmo cargo ou entre contas de cargos diferentes (excepto botoes de permissao)
