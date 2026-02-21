

# Correcao: Modal de Produto fecha ao escrever "Modelo"

## Causa Raiz

O problema NAO e de interaccao externa (onPointerDownOutside). O problema e logico:

```
const needsProductStep = !(service.brand || formData.productBrand) || !(service.model || formData.productModel);
```

Esta variavel e recalculada a cada render. Quando o tecnico preenche o campo "Modelo", `formData.productModel` fica com valor, e se a marca tambem ja estiver preenchida, `needsProductStep` muda para `false`. Como o Dialog esta dentro de `{needsProductStep && (...)}`, o componente e **removido do DOM** instantaneamente.

O mesmo acontece se preencher primeiro a marca e depois o modelo -- basta ambos terem valor para o modal desaparecer.

## Solucao

Separar a logica em duas variaveis:

1. **`needsProductStep`** -- calculada apenas uma vez na abertura do fluxo (baseada nos dados do servico vindos da BD, sem considerar formData). Controla se o passo "produto" aparece na lista de steps.

2. **Renderizacao do Dialog** -- usar `currentStep === "produto"` directamente em vez de `{needsProductStep && (...)}`. Se o step actual e "produto", o modal deve estar visivel independentemente do que o utilizador esta a escrever.

## Alteracoes

### Ficheiro 1: `src/components/technician/WorkshopFlowModals.tsx`

- Linha 333: Mudar `needsProductStep` para usar apenas `service.brand` e `service.model` (dados da BD), ignorando `formData`:
  ```
  const needsProductStep = !service.brand || !service.model;
  ```
- Linha 636: Remover o wrapper `{needsProductStep && (...)}` do Dialog do produto. Manter apenas a condicao `open={currentStep === "produto" ...}` que ja controla a visibilidade.

### Ficheiro 2: `src/components/technician/VisitFlowModals.tsx`

- Linha 549: Mesma correcao -- usar apenas dados da BD:
  ```
  const needsProductStep = !service.brand || !service.model;
  ```
- Linha 995: Remover o wrapper `{needsProductStep && (...)}` do Dialog do produto.

## Resultado

- O modal de produto aparece quando a BD nao tem marca/modelo preenchidos
- O tecnico pode preencher todos os campos sem que o modal feche
- Os dados so sao gravados quando clica "Continuar"
- Se o servico ja tem marca e modelo na BD, o passo e saltado (comportamento actual mantido)

