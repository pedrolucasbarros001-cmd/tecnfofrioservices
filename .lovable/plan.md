

## Bug: Preço duplicado no fluxo de oficina do técnico

### Causa raiz encontrada

Em `WorkshopFlowModals.tsx`, o cálculo financeiro soma os artigos **duas vezes**:

```text
formData.articles  ← carrega TODOS os service_parts (isExisting: true)
previousArticles   ← carrega os MESMOS service_parts novamente

articlesSubtotal         = soma de formData.articles (inclui existentes)
previousArticlesSubtotal = soma de previousArticles  (mesmos dados!)
combinedSubtotal         = articlesSubtotal + previousArticlesSubtotal  ← DUPLICADO
```

Linha 347: `combinedSubtotal = articlesSubtotal + previousArticlesSubtotal` — conta os mesmos artigos duas vezes.

Na imagem: "Módulo eletrónico" (289€) aparece como artigo existente E como artigo anterior, resultando em Subtotal Bruto de 578€ em vez de 289€.

**Risco na finalização**: O técnico não grava `final_price` directamente (o preço é definido pela administração via `SetPriceModal`), mas a confusão visual pode levar a decisões erradas. E se a administração já definiu `pricing_description` antes, o `adminPricingTotal` é somado por cima do subtotal já duplicado, criando um triplo-count.

### Correção

**Ficheiro**: `src/components/technician/WorkshopFlowModals.tsx`

1. **Separar artigos existentes dos novos no cálculo**:
   - `articlesSubtotal` deve contar apenas artigos **novos** (`!isExisting`)
   - `previousArticlesSubtotal` conta os artigos **existentes** (do banco)
   - `combinedSubtotal = articlesSubtotal + previousArticlesSubtotal` — agora sem duplicação

2. **Alternativa mais limpa** (preferida): remover `previousArticlesSubtotal` do cálculo financeiro e usar `combinedSubtotal = articlesSubtotal` (que já inclui existentes via `formData.articles`). O `previousArticles` fica apenas para exibição de histórico, sem impacto no cálculo.

### Implementação concreta

Alterar linha 347:
```typescript
// ANTES (duplicado):
const combinedSubtotal = articlesSubtotal + previousArticlesSubtotal;

// DEPOIS (correcto):
const combinedSubtotal = articlesSubtotal;
```

Isto funciona porque `formData.articles` já contém todos os artigos (existentes + novos). O `previousArticles` é uma cópia separada usada apenas para mostrar o histórico com nomes de técnicos — não deve entrar no cálculo financeiro.

### Ficheiros alterados
- `src/components/technician/WorkshopFlowModals.tsx` — corrigir `combinedSubtotal` para não duplicar

