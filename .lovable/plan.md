
# Plano: Corrigir Orçamentos - Guardar Artigos e Funcionalidade de Impressão

## Problema Identificado

### 1. Dados não são guardados (Aparelho/Artigos vazios)
Ao criar um orçamento no modal `CreateBudgetModal`, os **itens/artigos detalhados** (referência, nome, descrição, quantidade, valor, IVA) são calculados para obter os totais mas **nunca são guardados** na base de dados.

**Causa:** A tabela `budgets` não tem uma coluna `pricing_description` para armazenar o JSON dos artigos (ao contrário da tabela `services` que tem).

**Resultado:** No painel de detalhes, a secção "Aparelho" aparece vazia porque `appliance_type`, `brand`, `model` são `null`.

### 2. Botão "Imprimir" não funciona
O botão está presente no `BudgetDetailPanel` mas não executa qualquer acção:
```tsx
<Button variant="outline" size="sm">
  <Printer className="h-4 w-4 mr-2" />
  Imprimir
</Button>
```
Falta o `onClick` e não existe página de impressão para orçamentos.

---

## Solução Proposta

### Parte 1: Adicionar coluna `pricing_description` à tabela budgets

Nova migração SQL para adicionar a coluna:
```sql
ALTER TABLE budgets ADD COLUMN pricing_description TEXT;
```

### Parte 2: Guardar artigos no CreateBudgetModal

Alterar a função `processSubmit` para serializar os items como JSON:

```typescript
// Antes
const { error } = await supabase.from('budgets').insert({
  // ... outros campos
  estimated_labor: subtotal,
  estimated_parts: 0,
  estimated_total: total,
});

// Depois
const pricingData = {
  items: values.items.map(item => ({
    ref: item.reference,
    description: item.name,
    details: item.description,
    qty: item.quantity,
    price: item.unit_price,
    tax: item.tax_rate,
  })),
};

const { error } = await supabase.from('budgets').insert({
  // ... outros campos
  estimated_labor: subtotal,
  estimated_parts: totalTax,
  estimated_total: total,
  pricing_description: JSON.stringify(pricingData),
});
```

### Parte 3: Exibir artigos no BudgetDetailPanel

Adicionar secção "Artigos" no painel de detalhes que mostra os items do JSON:

```tsx
{/* Artigos Section - NOVO */}
{budget.pricing_description && (() => {
  try {
    const parsed = JSON.parse(budget.pricing_description);
    if (parsed.items?.length > 0) {
      return (
        <div className="rounded-lg border-l-4 border-l-purple-500 bg-purple-50 p-4">
          <h3 className="font-semibold text-sm text-purple-700 mb-3">
            Artigos do Orçamento
          </h3>
          <table className="w-full text-sm">
            {/* Cabeçalho e linhas dos artigos */}
          </table>
        </div>
      );
    }
  } catch { /* ignore */ }
  return null;
})()}
```

### Parte 4: Criar página de impressão BudgetPrintPage

Criar novo ficheiro `src/pages/BudgetPrintPage.tsx` baseado no `ServicePrintPage`, adaptado para orçamentos:
- Usa mesmo layout A4
- Mostra informação do cliente
- Mostra tabela de artigos com IVA
- Mostra totais (Subtotal, IVA, Total)
- Indica validade do orçamento
- Inclui termos/condições

### Parte 5: Adicionar rota no App.tsx

```tsx
// Depois das rotas de impressão existentes
<Route path="/print/budget/:budgetId" element={<BudgetPrintPage />} />
```

### Parte 6: Conectar botão "Imprimir" no BudgetDetailPanel

```tsx
import { openInNewTabPreservingQuery } from '@/utils/openInNewTab';

// No botão
<Button 
  variant="outline" 
  size="sm"
  onClick={() => openInNewTabPreservingQuery(`/print/budget/${budget.id}`)}
>
  <Printer className="h-4 w-4 mr-2" />
  Imprimir
</Button>
```

---

## Ficheiros a Alterar/Criar

| Ficheiro | Acção | Descrição |
|----------|-------|-----------|
| `supabase/migrations/[timestamp]_add_budget_pricing.sql` | Criar | Adicionar coluna pricing_description |
| `src/components/modals/CreateBudgetModal.tsx` | Alterar | Guardar items como JSON em pricing_description |
| `src/components/shared/BudgetDetailPanel.tsx` | Alterar | Exibir artigos + conectar botão imprimir |
| `src/pages/BudgetPrintPage.tsx` | Criar | Nova página de impressão A4 para orçamentos |
| `src/App.tsx` | Alterar | Adicionar rota /print/budget/:budgetId |
| `src/integrations/supabase/types.ts` | Alterar | Adicionar pricing_description ao tipo Budget |

---

## Estrutura do JSON (pricing_description)

```json
{
  "items": [
    {
      "ref": "REF001",
      "description": "Mão de Obra",
      "details": "Reparação de compressor",
      "qty": 2,
      "price": 100.00,
      "tax": 23
    }
  ]
}
```

---

## Layout da Página de Impressão do Orçamento

```text
┌─────────────────────────────────────────────────────────────┐
│  [LOGO]    TECNOFRIO           Orçamento: ORC-00001         │
│            Contactos da empresa          Data: 06/02/2026   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CLIENTE                                                    │
│  Nome: Pedro Lucas                                          │
│  Telefone: 997654765        NIF: 688098542                  │
│  Morada: ...                                                │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ARTIGOS                                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Ref.  │ Descrição      │ Qtd │ Valor │ IVA │ Total  │   │
│  ├───────┼────────────────┼─────┼───────┼─────┼────────┤   │
│  │ REF01 │ Mão de Obra    │  1  │ 2000€ │ 23% │ 2460€  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│                              Subtotal:     2000.00 €        │
│                              IVA:           460.00 €        │
│                              ─────────────────────────      │
│                              TOTAL:        2460.00 €        │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  OBSERVAÇÕES                                                │
│  [Notas do orçamento]                                       │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Válido até: [data] | Orçamento sujeito a confirmação       │
└─────────────────────────────────────────────────────────────┘
```

---

## Resultado Esperado

1. ✅ Artigos do orçamento são guardados na BD (coluna pricing_description)
2. ✅ Painel de detalhes mostra artigos com referência, descrição, qtd, valor e IVA
3. ✅ Secção "Aparelho" mostra dados correctamente (se preenchidos)
4. ✅ Botão "Imprimir" abre página de impressão em nova aba
5. ✅ Página de impressão usa mesmo estilo das fichas de serviço (A4)
6. ✅ PDF pode ser descarregado
