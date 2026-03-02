

## Plano: Registo de Artigos na Oficina + Alinhamento DB + Impressão + Painel Lateral

### Contexto

O fluxo de visita vai ter (ou já tem) a nova etapa "Registo de Artigos" em vez de "Usou peças?". O mesmo padrão precisa ser aplicado ao fluxo de oficina (`WorkshopFlowModals`). Além disso, a tabela `service_parts.quantity` é `integer` e precisa aceitar decimais. A ficha de impressão e o painel lateral precisam exibir os artigos com referência, descrição, quantidade, valor unitário e total por linha.

---

### 1. Migração DB: `service_parts.quantity` → `numeric`

```sql
ALTER TABLE public.service_parts 
  ALTER COLUMN quantity TYPE numeric USING quantity::numeric;
```

Isto alinha com o campo `cost` (já `numeric`) e permite quantidades decimais (1.5, 0.75, etc.) tanto no fluxo do técnico como no modal de orçamentar.

---

### 2. `WorkshopFlowModals.tsx` — Substituir `pecas_usadas` por `registo_artigos` + `resumo_reparacao`

**Tipo `ModalStep`**: Remover `pecas_usadas`, adicionar `registo_artigos` e `resumo_reparacao`.

**Interface `ArticleEntry`**: `{ reference: string; description: string; quantity: number; unit_price: number }` com total calculado = `qty × unit_price`.

**`WorkshopFormData`**: Substituir `usedParts`/`usedPartsList` por `articles: ArticleEntry[]`, `discountValue`, `discountType`, `taxRate`, `articlesLocked`.

**Etapa `registo_artigos`** (inline, sem modal separado):
- Tabela com colunas: Ref | Descrição | Qtd | Valor (€) | Total
- Qtd e Valor aceitam decimais (`step="any"`)
- Botões: Adicionar linha, Remover linha
- Auto-save via persistência existente

**Etapa `resumo_reparacao`**:
- Lista read-only dos artigos com totais por linha
- Subtotal automático
- Campo Desconto (€ ou %)
- Campo IVA (select 0/6/13/23%)
- Total final automático
- Botão "Confirmar e Guardar Registos" → `articlesLocked = true`
- Após confirmação: campos disabled

**Remover**: Import e uso de `UsedPartsModal`, `showPartsModal`, `handlePartsConfirm`. Toda a lógica da RadioGroup "Usou peças?" desaparece.

**Gravação**: Ao confirmar, gravar artigos em `service_parts` com `part_code` = referência, `part_name` = descrição, `quantity` (decimal), `cost` = valor unitário, `is_requested = false`, `arrived = true`.

---

### 3. `useFlowPersistence.ts` — Whitelist

```
oficina: [..., 'registo_artigos', 'resumo_reparacao'] // remover 'pecas_usadas'
oficina_continuacao: [...] // sem alteração
```

Atualizar `deriveStepFromDb` para oficina: onde referencia `pecas_usadas`, passa a referenciar `registo_artigos`.

---

### 4. `ServicePrintPage.tsx` — Secção "Artigos do Serviço"

Atualizar a secção "Peças Utilizadas" para mostrar a tabela completa:
- Colunas: Ref. | Descrição | Qtd | Valor Unit. | Total
- Total por linha = `cost × quantity`
- Subtotal automático
- Manter retrocompatibilidade com peças antigas (sem `cost` = mostrar "-")

---

### 5. `ServiceDetailSheet.tsx` — Secção "Peças Utilizadas/Solicitadas"

Atualizar para mostrar:
- Referência (`part_code`) ao lado do nome
- Quantidade (com decimais)
- Valor unitário (`cost`) e total por linha
- Manter badges de estado (Pedida, Chegou, Registada)

---

### 6. `EditServiceDetailsModal.tsx` — Alinhamento

Adicionar campo de `cost` (valor unitário) por peça na edição, para que o dono/secretaria possa editar o valor das peças registadas pelo técnico.

---

### Ficheiros afetados
- **Migração SQL**: `service_parts.quantity` integer → numeric
- `src/components/technician/WorkshopFlowModals.tsx` — alteração principal
- `src/hooks/useFlowPersistence.ts` — whitelist + deriveStepFromDb
- `src/pages/ServicePrintPage.tsx` — tabela de artigos
- `src/components/services/ServiceDetailSheet.tsx` — painel lateral
- `src/components/modals/EditServiceDetailsModal.tsx` — campo de custo

