
# Plano: Alinhar Modal de Criação de Orçamento com as Imagens

## Comparação: Modal Actual vs Imagem de Referência

### Modal Actual
| Ref. | Artigo | Descrição | Qtd | Valor (€) | Imposto | Subtotal (€) | X |
|------|--------|-----------|-----|-----------|---------|--------------|---|
| (input) | (input) | (input) | 1 | 0 | 23% (IVA23) | 0,00 € | 🗑 |

**8 colunas** - IVA mostra: "23% (IVA23)"

### Imagem de Referência (O que o utilizador quer)
| Artigo | Descrição | Qtd | Valor (€) | Imposto | Subtotal (€) |
|--------|-----------|-----|-----------|---------|--------------|
| Ex: Compressor | Detalh | 1 | 0 | 23% ▼ | 0,00 € |

**6 colunas** - IVA mostra apenas: "0%", "6%", "13%", "23%"

---

## Alterações Necessárias

### Ficheiro: `src/components/modals/CreateBudgetModal.tsx`

| Alteração | Descrição |
|-----------|-----------|
| Remover coluna "Ref." | Eliminar campo de referência da tabela |
| Simplificar labels IVA | Alterar de "23% (IVA23)" para apenas "23%" |
| Remover coluna do botão delete | Integrar X apenas quando houver mais de 1 linha |
| Ajustar placeholders | Usar "Ex: Compressor" e "Detalh" como na imagem |

---

## Detalhes Técnicos

### 1. Actualizar TAX_RATES (linha 83-88)

**Antes:**
```typescript
const TAX_RATES = [
  { value: 0, label: '0% (Isento)' },
  { value: 6, label: '6% (IVA6)' },
  { value: 13, label: '13% (IVA13)' },
  { value: 23, label: '23% (IVA23)' },
];
```

**Depois:**
```typescript
const TAX_RATES = [
  { value: 0, label: '0%' },
  { value: 6, label: '6%' },
  { value: 13, label: '13%' },
  { value: 23, label: '23%' },
];
```

### 2. Remover campo "Referência" do item schema e default values

**Linha 57-64 - itemSchema:**
```typescript
const itemSchema = z.object({
  name: z.string().min(1, 'Nome do artigo é obrigatório'),
  description: z.string().optional(),
  quantity: z.number().min(1, 'Quantidade mínima é 1'),
  unit_price: z.number().min(0, 'Valor deve ser positivo'),
  tax_rate: z.number(),
});
```

**Linha 113 - defaultValues:**
```typescript
items: [
  { name: '', description: '', quantity: 1, unit_price: 0, tax_rate: 23 },
],
```

### 3. Simplificar cabeçalho da tabela (linha 543-553)

**Antes (8 colunas):**
```tsx
<TableRow>
  <TableHead className="w-[100px]">Ref.</TableHead>
  <TableHead className="w-[180px]">Artigo</TableHead>
  <TableHead>Descrição</TableHead>
  <TableHead className="w-[80px]">Qtd</TableHead>
  <TableHead className="w-[120px]">Valor (€)</TableHead>
  <TableHead className="w-[100px]">Imposto</TableHead>
  <TableHead className="w-[120px] text-right">Subtotal (€)</TableHead>
  <TableHead className="w-[50px]"></TableHead>
</TableRow>
```

**Depois (6 colunas):**
```tsx
<TableRow>
  <TableHead className="min-w-[200px]">Artigo</TableHead>
  <TableHead className="min-w-[150px]">Descrição</TableHead>
  <TableHead className="w-[80px]">Qtd</TableHead>
  <TableHead className="w-[120px]">Valor (€)</TableHead>
  <TableHead className="w-[100px]">Imposto</TableHead>
  <TableHead className="w-[120px] text-right">Subtotal (€)</TableHead>
</TableRow>
```

### 4. Simplificar linhas da tabela (linha 556-681)

Remover célula de Referência e integrar botão de delete na última coluna:

```tsx
{fields.map((field, index) => {
  const item = watchItems[index];
  const itemSubtotal = item ? calculateItemSubtotal(item) : 0;

  return (
    <TableRow key={field.id}>
      {/* Artigo */}
      <TableCell>
        <FormField
          control={form.control}
          name={`items.${index}.name`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input placeholder="Ex: Compressor" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
      </TableCell>
      
      {/* Descrição */}
      <TableCell>
        <FormField
          control={form.control}
          name={`items.${index}.description`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input placeholder="Detalh" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
      </TableCell>
      
      {/* Qtd */}
      <TableCell>
        <FormField
          control={form.control}
          name={`items.${index}.quantity`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </TableCell>
      
      {/* Valor (€) */}
      <TableCell>
        <FormField
          control={form.control}
          name={`items.${index}.unit_price`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </TableCell>
      
      {/* Imposto */}
      <TableCell>
        <FormField
          control={form.control}
          name={`items.${index}.tax_rate`}
          render={({ field }) => (
            <FormItem>
              <Select
                value={field.value.toString()}
                onValueChange={(v) => field.onChange(parseInt(v))}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {TAX_RATES.map((rate) => (
                    <SelectItem key={rate.value} value={rate.value.toString()}>
                      {rate.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
      </TableCell>
      
      {/* Subtotal (€) com botão delete integrado */}
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <span className="font-medium">{formatCurrency(itemSubtotal)}</span>
          {fields.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => remove(index)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
})}
```

### 5. Actualizar append para novo item (linha 533)

```typescript
onClick={() => append({ name: '', description: '', quantity: 1, unit_price: 0, tax_rate: 23 })}
```

### 6. Actualizar serialização do pricingData (linha 235-247)

Remover referência da serialização:
```typescript
const pricingData = {
  items: values.items.map(item => ({
    description: item.name,
    details: item.description || '',
    qty: item.quantity,
    price: item.unit_price,
    tax: item.tax_rate,
  })),
  discount: discountAmount,
  discountType: discountType,
  discountValue: discountValue,
};
```

---

## Resultado Visual Final

### Tabela de Artigos (Nova)
```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Artigo          │ Descrição │ Qtd │ Valor (€) │ Imposto │ Subtotal (€)      │
├─────────────────────────────────────────────────────────────────────────────┤
│ Ex: Compressor  │ Detalh    │  1  │     0     │ 23% ▼   │ 0,00 €        🗑  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Dropdown de IVA (Simplificado)
```text
┌────────┐
│ 0%     │
│ 6%     │
│ 13%    │
│ 23%  ✓ │
└────────┘
```

---

## Ficheiros a Alterar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/modals/CreateBudgetModal.tsx` | Simplificar tabela: 6 colunas, labels IVA simples |

