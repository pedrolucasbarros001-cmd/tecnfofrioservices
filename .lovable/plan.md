
# Plano Actualizado: Melhorias UX Tecnicos + Scroll + Morada Inteligente

## 1. Corrigir Scroll nos Modais de Criacao de Servico

O `CreateServiceModal.tsx` ja tem a estrutura `flex flex-col` + `overflow-y-auto`, mas o scroll pode falhar porque a `DialogContent` nao tem `overflow-hidden` e o conteudo pode "escapar". O `CustomerDetailSheet.tsx` usa `ScrollArea` que pode ter problemas semelhantes.

**Correcao**: Em ambos os modais, garantir que:
- `DialogContent` tem `overflow-hidden` alem de `flex flex-col`
- O container de scroll tem `min-h-0` para que o flex shrink funcione
- Testar com conteudo extenso (campos de garantia abertos + fotos)

**Ficheiros**: `CreateServiceModal.tsx`, `CustomerDetailSheet.tsx`

## 2. Logica Inteligente de Morada (Fallback para Perfil do Cliente)

**Problema actual**: O `CreateServiceModal` copia SEMPRE a morada do cliente para `service_address` (linhas 274-276), duplicando os dados. O `CustomerDetailSheet` pre-preenche os campos com a morada do cliente nos defaultValues (linhas 568-570), e grava o que estiver nos campos -- mesmo que seja a mesma morada.

**Logica desejada**: Se o utilizador NAO preencher morada alternativa, o sistema deve guardar `null` nos campos `service_address/service_postal_code/service_city`. Ao exibir, se estes campos forem `null`, usa a morada do perfil do cliente como fallback.

**Implementacao**:

### CreateServiceModal.tsx
- Remover a copia automatica de `customer_address` -> `service_address` no submit (linhas 274-276)
- Adicionar uma seccao "Morada do Servico" com checkbox/toggle: "Morada diferente do cliente?"
- Se desactivado: nao mostrar campos de morada, gravar `null`
- Se activado: mostrar campos editaveis (morada, codigo postal, cidade), gravar os valores

### CustomerDetailSheet.tsx
- Remover o pre-preenchimento de morada nos defaultValues (linhas 568-570) -- comecar vazio
- Mesma logica: toggle "Morada diferente?" que revela campos de morada
- Se vazio/desactivado: gravar `null` (fallback para perfil do cliente)
- Se preenchido: gravar a morada alternativa

### Exibicao (ServiceDetailSheet, impressao, etc.)
- Ja funciona com fallback (`contact_phone || customer?.phone`) conforme a memoria do sistema. A morada segue a mesma regra: `service_address || customer?.address`

## 3. Melhorias UX Tecnicos (do plano anterior)

### 3a. Tap-to-Call nos Cards
- `ServicosPage.tsx`: Adicionar telefone clicavel (`<a href="tel:...">`) no `ServiceCard`
- Modais de fluxo (`VisitFlowModals`, `InstallationFlowModals`, `DeliveryFlowModals`): Telefone clicavel nos resumos

### 3b. Debounce no saveStateToDb
- `useFlowPersistence.ts`: Adicionar debounce de 2 segundos com `setTimeout`/`clearTimeout` via `useRef`

### 3c. Remover Paginas Legacy
- Eliminar `TechnicianVisitFlow.tsx`, `TechnicianInstallationFlow.tsx`, `TechnicianDeliveryFlow.tsx`
- `App.tsx`: Redirecionar rotas `/tecnico/visita/:id`, `/tecnico/instalacao/:id`, `/tecnico/entrega/:id` para `/servicos`

### 3d. PhotoType -- Adicionar tipos em falta
- `database.ts`: Adicionar `'instalacao_antes' | 'instalacao_depois'` ao `PhotoType` e ao `PHOTO_TYPE_LABELS`

### 3e. Loading nos Botoes de Submissao
- `VisitFlowModals.tsx`, `WorkshopFlowModals.tsx`, `DeliveryFlowModals.tsx`: `disabled={isSubmitting}` + texto "A processar..." nos botoes finais

### 3f. Historico do Tecnico com Badges
- `TechnicianHistoryPage.tsx`: Adicionar badges de tipo de servico e tags de urgencia/garantia

## Resumo de Ficheiros

| Ficheiro | Alteracao |
|---|---|
| `CreateServiceModal.tsx` | Scroll fix + morada inteligente (toggle) |
| `CustomerDetailSheet.tsx` | Scroll fix + morada inteligente (toggle) |
| `ServicosPage.tsx` | Tap-to-call no card |
| `useFlowPersistence.ts` | Debounce 2s no saveStateToDb |
| `VisitFlowModals.tsx` | Tap-to-call + loading buttons |
| `InstallationFlowModals.tsx` | Tap-to-call |
| `DeliveryFlowModals.tsx` | Tap-to-call + loading button |
| `WorkshopFlowModals.tsx` | Loading buttons |
| `TechnicianHistoryPage.tsx` | Badges tipo servico |
| `database.ts` | PhotoType instalacao_antes/depois |
| `App.tsx` | Remover rotas legacy, redirecionar |
| `TechnicianVisitFlow.tsx` | ELIMINAR |
| `TechnicianInstallationFlow.tsx` | ELIMINAR |
| `TechnicianDeliveryFlow.tsx` | ELIMINAR |

## Detalhe Tecnico: Morada Inteligente

```text
Criacao de Servico:
  [x] Morada diferente do cliente?
      Se NAO marcado -> service_address = null (usa perfil)
      Se SIM marcado -> mostra campos editaveis -> grava valores

Exibicao/Impressao:
  morada = service.service_address || customer.address
  cidade = service.service_city || customer.city
  codigo_postal = service.service_postal_code || customer.postal_code
```

Esta logica ja existe parcialmente no sistema (memoria `logic/service-contact-overrides`). A mudanca e garantir que NAO se duplicam dados quando a morada e a mesma.
