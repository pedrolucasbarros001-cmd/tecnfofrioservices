
# Plano: Remover o "0" que Aparece na Ficha de Serviço

## Problema Identificado

Na ficha de serviço (tanto na visualização do sistema quanto na impressão), aparece um "0" isolado após a seção "Diagnóstico" e antes das "Assinaturas Recolhidas". Este é um bug clássico de React causado por expressões condicionais incorretas.

## Causa Técnica

O problema está na forma como as condições são escritas em React. Quando se usa:

```jsx
{service.final_price && service.final_price > 0 && (
  <Component />
)}
```

Se `service.final_price` for `0`:
1. `service.final_price` avalia para `0` (que é falsy)
2. O operador `&&` retorna o primeiro valor falsy encontrado: `0`
3. React renderiza o número `0` no DOM

A forma correcta é:

```jsx
{service.final_price > 0 && (
  <Component />
)}
```

Porque `0 > 0` avalia para `false`, e React não renderiza `false`.

## Ficheiros Afectados

### 1. ServiceDetailSheet.tsx

Linhas com o padrão problemático:
- Linha 584: Condição do wrapper da seção financeira
- Linha 591: `{service.labor_cost && service.labor_cost > 0 &&`
- Linha 597: `{service.parts_cost && service.parts_cost > 0 &&`
- Linha 603: `{service.discount && service.discount > 0 &&`
- Linha 609: `{service.final_price && service.final_price > 0 &&`
- Linha 626: `{service.final_price && service.final_price > 0 &&`

### 2. ServicePrintModal.tsx

Linhas com o padrão problemático:
- Linha 309: `{(service.final_price && service.final_price > 0) &&`
- Linha 671: `{(service.final_price && service.final_price > 0) &&`

## Alterações a Fazer

### ServiceDetailSheet.tsx

| Linha | De | Para |
|-------|-----|------|
| 584 | `((service.labor_cost && service.labor_cost > 0) \|\| (service.parts_cost && service.parts_cost > 0) \|\| (service.final_price && service.final_price > 0))` | `(service.labor_cost > 0 \|\| service.parts_cost > 0 \|\| service.final_price > 0)` |
| 591 | `{service.labor_cost && service.labor_cost > 0 &&` | `{service.labor_cost > 0 &&` |
| 597 | `{service.parts_cost && service.parts_cost > 0 &&` | `{service.parts_cost > 0 &&` |
| 603 | `{service.discount && service.discount > 0 &&` | `{service.discount > 0 &&` |
| 609 | `{service.final_price && service.final_price > 0 &&` | `{service.final_price > 0 &&` |
| 626 | `{service.final_price && service.final_price > 0 &&` | `{service.final_price > 0 &&` |

### ServicePrintModal.tsx

| Linha | De | Para |
|-------|-----|------|
| 309 | `{(service.final_price && service.final_price > 0) &&` | `{service.final_price > 0 &&` |
| 671 | `{(service.final_price && service.final_price > 0) &&` | `{service.final_price > 0 &&` |

## Notas Importantes

- A expressão `service.value > 0` é segura mesmo quando `service.value` é `undefined` ou `null`, porque `undefined > 0` e `null > 0` ambos avaliam para `false`
- Os tipos TypeScript mostram que estes campos são `number` (não nullable), portanto `> 0` é suficiente
- Esta correção elimina completamente o "0" espúrio que aparece na interface

## Resultado Esperado

Após a correção:
- A ficha de serviço mostrará apenas as seções que têm valores relevantes (> 0)
- Não haverá mais "0" isolado a aparecer entre as seções
- O comportamento será consistente tanto na visualização do sistema quanto na impressão
