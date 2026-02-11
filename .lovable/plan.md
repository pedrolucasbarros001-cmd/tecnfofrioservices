

# Corrigir Extraccao de Artigos do Orcamento

## Problema

O `pricing_description` do orcamento tem esta estrutura:

```text
{
  "items": [
    { "description": "compressor", "details": "um novo", "qty": 1, "price": 340, "tax": 23 }
  ],
  "discount": 0,
  "discountType": "euro",
  "discountValue": 0
}
```

O codigo actual faz `JSON.parse(budget.pricing_description)` e depois verifica `Array.isArray(items)`. Como o resultado e um **objecto** (e nao um array), a verificacao falha e a extraccao nunca acontece -- os campos ficam sempre `null`.

## Correcao

### `src/components/modals/ConvertBudgetModal.tsx` (linha 76-80)

Alterar o parse para aceder ao campo `.items` do objecto:

```text
Antes:
  const items = budget.pricing_description
    ? JSON.parse(budget.pricing_description)
    : [];
  if (Array.isArray(items) && items.length > 0) {

Depois:
  const parsed = budget.pricing_description
    ? JSON.parse(budget.pricing_description)
    : {};
  const items = Array.isArray(parsed) ? parsed : (parsed.items || []);
  if (items.length > 0) {
```

Isto cobre ambos os formatos possiveis:
- Formato actual: `{ items: [...] }` -- acede a `parsed.items`
- Formato legado (array directo): `[...]` -- usa o array directamente

## Servico existente TF-00002

O servico TF-00002 ja foi criado com campos vazios. Apos a correcao, novas conversoes funcionarao correctamente. Para corrigir o TF-00002 existente, seria necessario reconverter ou editar manualmente.

