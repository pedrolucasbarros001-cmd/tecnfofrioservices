

## Plano: Substituir "Peças Usadas" por "Registo de Artigos" + "Resumo da Reparação" no Fluxo de Visita

### Estado Atual

O **Workshop** (`WorkshopFlowModals.tsx`) já tem `registo_artigos` e `resumo_reparacao` implementados corretamente. O **Visit** (`VisitFlowModals.tsx`) ainda usa a etapa antiga `pecas_usadas` com pergunta Sim/Não (linhas 1295-1383).

### Fluxo Proposto (Visita — "Reparar no Local")

```text
decisao → registo_artigos → pedir_peca
  ├─ Sim (precisa peça) → resumo_reparacao → assinatura (pedido_peca) → fim
  └─ Não (sem peça)     → resumo_reparacao → pagamento → assinatura (conclusao) → fim
```

### Alterações em `src/components/technician/VisitFlowModals.tsx`

1. **Tipos**: Substituir `pecas_usadas` por `registo_artigos` e `resumo_reparacao` em `RepairModalStep` e `OtherModalStep`. Importar `ArticleEntry` do `WorkshopFlowModals`.

2. **`VisitFormData`**: Substituir `usedParts: boolean` e `usedPartsList: PartEntry[]` por `articles: ArticleEntry[]`, `discountValue: string`, `discountType: 'euro' | 'percent'`, `taxRate: number`, `articlesLocked: boolean`. Remover interface `PartEntry`.

3. **Helpers**: Adicionar `addArticle`, `updateArticle`, `removeArticle`, `articlesSubtotal`, `discountAmount`, `taxAmount`, `totalFinal` (copiar padrão do Workshop). Remover `addPart`, `removePart`, `updatePart`, `saveUsedParts`.

4. **Navegação**:
   - `handleDecisionConfirm` (reparar_local): vai para `registo_artigos` em vez de `pecas_usadas`.
   - `handlePedirPecaConfirm`: antes de ir para assinatura/pagamento, vai para `resumo_reparacao`.
   - Novo `handleResumoReparacaoConfirm`: confirma artigos (grava em `service_parts`), depois avança para pagamento+assinatura (sem peça) ou assinatura (com peça).
   - Botão "Anterior" do `pedir_peca` volta para `registo_artigos`.
   - Botão "Anterior" do `resumo_reparacao` volta para `pedir_peca`.

5. **UI — Etapa `registo_artigos`** (novo Dialog): Tabela com Ref | Descrição | Qtd (decimal) | Valor (€) | Total (auto). Botões adicionar/remover. Mesmo layout compacto do Workshop.

6. **UI — Etapa `resumo_reparacao`** (novo Dialog): Lista read-only dos artigos, subtotal, desconto (€/%), IVA (0/6/13/23%), total final. Botão "Confirmar e Guardar" → `articlesLocked = true` → grava artigos em `service_parts` (delete+insert). Após confirmação: botão "Continuar" avança para pagamento/assinatura.

7. **`getSteps()`**: Substituir `pecas_usadas` por `registo_artigos`, `resumo_reparacao`.

8. **`handleSignatureComplete`**: Remover chamada a `saveUsedParts()` (a gravação ocorre em `handleResumoReparacaoConfirm`).

### Sem alterações noutros ficheiros

O Workshop já está correto. A whitelist em `useFlowPersistence.ts` já inclui `registo_artigos` e `resumo_reparacao` para `visita` e `visita_continuacao`. A `service_parts.quantity` já é `numeric`. Print e painel lateral já mostram artigos com valor unitário.

