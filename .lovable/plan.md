

## Plano: Etiquetas 29x90mm para Brother QL-700 + Bug "Orçamentar" preso

### Problema 1 — Tamanho da etiqueta errado

A etiqueta está configurada para **62mm x 90mm** mas a Brother QL-700 com fita DK-11201 usa etiquetas de **29mm x 90mm**. Todos os ficheiros de etiqueta e impressão precisam ser actualizados:

- `ServiceTagModal.tsx`: largura `62mm` → `29mm`, PDF format `[62, 90]` → `[29, 90]`
- `ServiceTagPage.tsx`: largura e `@page` de `62mm 90mm` → `29mm 90mm`, PDF format idem
- `printUtils.ts`: `@page { size: 62mm 90mm }` → `29mm 90mm`

O layout interno também precisa de ajustes: QR code menor (~70px em vez de 110-120px), fonte menor, logo mais compacta, barras de acento mais finas, margens reduzidas — tudo para caber nos 29mm de largura.

### Problema 2 — Serviço fica preso em "Orçamentar" após precificação

**Evidência no banco**: `TF-00129` tem `pending_pricing=true` E `final_price=253.34` E `status=a_precificar`. Isto não deveria acontecer — o `SetPriceModal` envia `pending_pricing: false`, mas algo falhou.

**Causa provável**: o guard em `useServices.ts` (linha 376-386) pode ter descartado o `status` em certas condições de race, ou o update simplesmente falhou sem feedback.

**Correção defensiva em duas camadas**:

1. **Badge "Orçamentar"** — actualmente a condição é:
   ```
   pending_pricing === true && final_price === 0
   ```
   Isto já deveria esconder o badge quando `final_price > 0`. Mas o serviço `TF-00129` tem `pending_pricing=true` com `final_price=253.34`. O badge não aparece (porque `final_price > 0`), mas o serviço **continua a aparecer na página Precificar** porque `SecretaryPrecificarPage` filtra apenas por `pending_pricing === true`.

2. **Página Precificar** (`SecretaryPrecificarPage.tsx`) — o filtro é:
   ```
   s.pending_pricing === true
   ```
   Deveria ser:
   ```
   s.pending_pricing === true && (s.final_price ?? 0) === 0
   ```
   Assim, serviços já precificados (com `final_price > 0`) saem automaticamente da lista mesmo que `pending_pricing` não tenha sido limpo.

3. **Consistência do `SetPriceModal`** — verificar que o update realmente persiste `pending_pricing: false`. O `useUpdateService` guard não deveria bloquear porque `pending_pricing === false` passa a condição. Mas para segurança, separar a chamada em duas: primeiro os campos financeiros, depois o status + `pending_pricing`.

4. **Dashboard** (`DashboardPage.tsx`) — o contador de "Orçamentar" usa `service.pending_pricing` sem verificar `final_price`. Deve aplicar a mesma lógica: `pending_pricing && final_price === 0`.

### Ficheiros a alterar

**Etiqueta (tamanho 29x90mm):**
- `src/components/modals/ServiceTagModal.tsx` — largura 29mm, PDF [29, 90], QR ~70px, layout compacto
- `src/pages/ServiceTagPage.tsx` — idem + `@page 29mm 90mm`
- `src/utils/printUtils.ts` — `@page size: 29mm 90mm`

**Bug "Orçamentar":**
- `src/pages/secretary/SecretaryPrecificarPage.tsx` — filtro `pending_pricing === true && final_price === 0`
- `src/pages/DashboardPage.tsx` — contador `a_precificar` com a mesma condição
- `src/hooks/useServices.ts` — quando o filtro `pending_pricing` é usado nas queries, adicionar `.or('final_price.eq.0,final_price.is.null')`

### Secção técnica

Regra corrigida para "Orçamentar":
```typescript
// Serviço precisa de orçamento SE:
// 1. pending_pricing === true (flag operacional)
// 2. final_price === 0 ou null (ainda não tem preço definido)
// Se já tem final_price > 0, já foi precificado — sai da lista.
const needsPricing = s.pending_pricing === true && (s.final_price ?? 0) === 0;
```

Dimensões da etiqueta Brother QL-700 (DK-11201):
```
29mm (largura) x 90mm (altura)
```

