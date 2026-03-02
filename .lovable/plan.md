## Plano: Registo de Artigos — IMPLEMENTADO ✅

### Alterações realizadas

1. **Migração DB**: `service_parts.quantity` integer → numeric ✅
2. **WorkshopFlowModals.tsx**: Substituído `pecas_usadas` por `registo_artigos` + `resumo_reparacao` ✅
3. **useFlowPersistence.ts**: Whitelist atualizada para oficina e visita ✅
4. **ServicePrintPage.tsx**: Tabela de artigos com Ref, Descrição, Qtd, Valor Unit., Total ✅
5. **ServiceDetailSheet.tsx**: Painel lateral com valor unitário e total por linha ✅
6. **EditServiceDetailsModal.tsx**: Campo de custo por peça + quantidades decimais ✅
