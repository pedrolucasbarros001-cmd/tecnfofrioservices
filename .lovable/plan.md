

## Problema: Referência e Descrição dos artigos não aparecem no painel e na impressão

### Diagnóstico

Analisei o screenshot e o código. A secção "ARTIGOS / INTERVENÇÕES" no `ServiceDetailSheet` mostra apenas quantidades e valores (ex: "2x 5.00€ = 10.00€") sem qualquer texto descritivo. Há dois caminhos de renderização:

1. **Caminho `serviceParts`** (dados da tabela `service_parts`): Linhas 695-706 — usa `part.part_name` e `part.part_code`. Funciona correctamente SE os dados existirem na BD.

2. **Caminho `centralItems`** (fallback do JSON `pricing_description`): Linhas 717-728 — é o que aparece no screenshot (separadores tracejados). Este caminho tem dois problemas:
   - **Não mostra referência** — não existe nenhum render de `item.ref` ou `item.article`
   - **Usa apenas `item.description`** — mas o schema do JSON usa `desc` como chave primária (com `description` como fallback). Se o JSON tem `desc`, nada aparece.

A ficha de impressão (`ServicePrintPage`) já tem os fallbacks correctos no caminho `pricingDetails.items` (linha 454-455: `item.ref || item.article`, `item.desc || item.description`), mas preciso confirmar que ambos os caminhos estão consistentes.

### Correcções

**Ficheiro 1: `src/components/services/ServiceDetailSheet.tsx`**
- Linha 718-728 (centralItems render): Adicionar exibição de referência (`item.ref || item.article`) e corrigir descrição para `item.desc || item.description`
- Manter o layout actual com ref entre parêntesis, consistente com o caminho serviceParts

**Ficheiro 2: `src/pages/ServicePrintPage.tsx`**
- Verificar e garantir consistência — já tem fallbacks correctos, mas confirmar que o caminho `usedParts` também funciona bem

São alterações de renderização apenas, sem impacto na BD.
