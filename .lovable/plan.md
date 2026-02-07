
# Plano: Alinhar Colunas e Painel Lateral de Orçamentos

## Problema Identificado

### 1. Colunas da tabela não correspondem ao conteúdo
A tabela mostra "Aparelho" e "Avaria" que estão vazios para orçamentos criados sem esses dados. O conteúdo mais relevante são os **artigos** do `pricing_description`.

### 2. Painel lateral precisa mostrar artigos sempre
A secção de artigos só aparece quando há dados, mas deveria mostrar uma mensagem informativa para orçamentos antigos.

---

## Ficheiros a Alterar

| Ficheiro | Acção |
|----------|-------|
| `src/pages/OrcamentosPage.tsx` | Alterar colunas da tabela |
| `src/components/shared/BudgetDetailPanel.tsx` | Sempre mostrar secção de artigos |

---

## Alterações Detalhadas

### 1. OrcamentosPage.tsx

**Adicionar função helper para extrair artigo:**

```typescript
// Após formatCurrency
const getFirstArticle = (budget: any) => {
  if (!budget.pricing_description) return null;
  try {
    const parsed = JSON.parse(budget.pricing_description);
    if (parsed.items && parsed.items.length > 0) {
      return {
        name: parsed.items[0].description || '-',
        ref: parsed.items[0].ref || '-',
        count: parsed.items.length
      };
    }
  } catch { }
  return null;
};
```

**Novas colunas do cabeçalho:**

```tsx
<TableHeader>
  <TableRow>
    <TableHead>Código</TableHead>
    <TableHead>Cliente</TableHead>
    <TableHead>Artigo</TableHead>
    <TableHead>Ref.</TableHead>
    <TableHead className="text-center">Qtd</TableHead>
    <TableHead className="text-right">Total</TableHead>
    <TableHead>Estado</TableHead>
    <TableHead className="text-right">Ações</TableHead>
  </TableRow>
</TableHeader>
```

**Novas células nas linhas:**

```tsx
{filteredBudgets.map((budget) => {
  const statusConfig = STATUS_CONFIG[budget.status as keyof typeof STATUS_CONFIG];
  const firstArticle = getFirstArticle(budget);

  return (
    <TableRow key={budget.id} ...>
      <TableCell className="font-mono font-semibold text-primary">
        {budget.code}
      </TableCell>
      <TableCell className="font-medium">
        {budget.customer?.name || 'Sem cliente'}
      </TableCell>
      {/* Artigo - nome do primeiro artigo */}
      <TableCell className="max-w-[180px] truncate">
        {firstArticle?.name || '-'}
      </TableCell>
      {/* Referência */}
      <TableCell className="font-mono text-xs text-muted-foreground">
        {firstArticle?.ref || '-'}
      </TableCell>
      {/* Quantidade de artigos */}
      <TableCell className="text-center">
        {firstArticle ? (
          <Badge variant="outline" className="text-xs">
            {firstArticle.count} {firstArticle.count === 1 ? 'artigo' : 'artigos'}
          </Badge>
        ) : '-'}
      </TableCell>
      <TableCell className="text-right font-bold text-orange-600">
        {formatCurrency(budget.estimated_total)}
      </TableCell>
      {/* Estado e Ações mantêm-se iguais */}
    </TableRow>
  );
})}
```

---

### 2. BudgetDetailPanel.tsx

**Sempre mostrar secção de artigos (com fallback para orçamentos antigos):**

Substituir a condição `{pricingDetails.items.length > 0 && (...)}` por:

```tsx
{/* Articles Section - sempre visível */}
<div className="rounded-lg border-l-4 border-l-purple-500 bg-purple-50 dark:bg-purple-950/20 p-4">
  <h3 className="font-semibold text-sm text-purple-700 dark:text-purple-400 mb-3 flex items-center gap-2">
    <ShoppingCart className="h-4 w-4" />
    Artigos do Orçamento
  </h3>
  
  {pricingDetails.items.length > 0 ? (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b">
            <th className="text-left py-1.5 font-medium">Ref.</th>
            <th className="text-left py-1.5 font-medium">Descrição</th>
            <th className="text-center py-1.5 font-medium">Qtd</th>
            <th className="text-right py-1.5 font-medium">Valor</th>
            <th className="text-center py-1.5 font-medium">IVA</th>
            <th className="text-right py-1.5 font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {pricingDetails.items.map((item, index) => {
            const lineSubtotal = item.qty * item.price;
            const lineTax = lineSubtotal * (item.tax / 100);
            const lineTotal = lineSubtotal + lineTax;
            
            return (
              <tr key={index} className="border-b last:border-0">
                <td className="py-1.5">{item.ref || '-'}</td>
                <td className="py-1.5">
                  {item.description}
                  {item.details && (
                    <span className="text-muted-foreground block text-[10px]">
                      {item.details}
                    </span>
                  )}
                </td>
                <td className="py-1.5 text-center">{item.qty}</td>
                <td className="py-1.5 text-right">{formatCurrency(item.price)}</td>
                <td className="py-1.5 text-center">{item.tax}%</td>
                <td className="py-1.5 text-right font-medium">{formatCurrency(lineTotal)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  ) : (
    <p className="text-sm text-muted-foreground italic">
      Orçamento criado sem artigos detalhados. Valor total: {formatCurrency(pricingDetails.total)}
    </p>
  )}
</div>
```

---

## Comparação Visual

### Tabela ANTES:
```text
| Código    | Cliente | Aparelho | Avaria | Total     | Estado   |
|-----------|---------|----------|--------|-----------|----------|
| ORC-00003 | Pedro   | -        | -      | 2000,00 € | Pendente |
```

### Tabela DEPOIS:
```text
| Código    | Cliente | Artigo      | Ref.   | Qtd       | Total     | Estado   |
|-----------|---------|-------------|--------|-----------|-----------|----------|
| ORC-00003 | Pedro   | Mão de Obra | REF01  | 1 artigo  | 2000,00 € | Pendente |
```

### Painel Lateral (Orçamento sem artigos detalhados):
```text
┌─────────────────────────────────────────────┐
│ 🛒 Artigos do Orçamento                     │
│                                             │
│ Orçamento criado sem artigos detalhados.    │
│ Valor total: 2000,00 €                      │
└─────────────────────────────────────────────┘
```

### Painel Lateral (Orçamento com artigos):
```text
┌─────────────────────────────────────────────────────────┐
│ 🛒 Artigos do Orçamento                                 │
│                                                         │
│ Ref.   │ Descrição     │ Qtd │ Valor   │ IVA │ Total   │
│ REF01  │ Mão de Obra   │  1  │ 2000 €  │ 23% │ 2460 €  │
│        │ Reparação...  │     │         │     │         │
└─────────────────────────────────────────────────────────┘
```

---

## Resultado Esperado

1. Colunas da tabela mostram o primeiro artigo, referência e quantidade total de artigos
2. Painel lateral sempre mostra a secção "Artigos do Orçamento"
3. Orçamentos antigos (sem `pricing_description`) mostram mensagem informativa
4. Novos orçamentos mostram tabela completa com todos os artigos
5. Interface coerente entre modal de criação, tabela e painel de consulta
