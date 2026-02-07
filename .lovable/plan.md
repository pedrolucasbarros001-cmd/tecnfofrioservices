

# Plano Completo: Modal Idêntico às Imagens + Botão Excluir + Painel Coerente

## Resumo das Alterações

O utilizador solicita:
1. **Botão de excluir orçamento** no dropdown de ações
2. **Modal de criação idêntico às imagens** (com campo de Desconto)
3. **Painel de consulta lateral coerente** com o que foi registado no modal

---

## Ficheiros a Alterar

| Ficheiro | Alteração |
|----------|-----------|
| `src/pages/OrcamentosPage.tsx` | Adicionar botão excluir + AlertDialog |
| `src/components/modals/CreateBudgetModal.tsx` | Adicionar campo de desconto + melhorar labels IVA |
| `src/components/shared/BudgetDetailPanel.tsx` | Mostrar desconto no resumo financeiro |

---

## Parte 1: Botão Excluir na Página de Orçamentos

### Alterações em `src/pages/OrcamentosPage.tsx`

**1. Adicionar imports:**
```tsx
import { Search, Plus, FileText, Check, X, ArrowRight, Trash2 } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
```

**2. Adicionar estados:**
```tsx
const [budgetToDelete, setBudgetToDelete] = useState<any | null>(null);
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
```

**3. Adicionar função de exclusão:**
```tsx
const handleDeleteBudget = async () => {
  if (!budgetToDelete) return;
  
  try {
    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', budgetToDelete.id);

    if (error) throw error;
    
    toast.success('Orçamento excluído com sucesso!');
    refetch();
  } catch (error) {
    console.error('Error deleting budget:', error);
    toast.error('Erro ao excluir orçamento');
  } finally {
    setBudgetToDelete(null);
    setShowDeleteConfirm(false);
  }
};
```

**4. Adicionar item "Excluir" no dropdown (após "Converter em Serviço"):**
```tsx
<DropdownMenuItem
  className="text-red-600 focus:text-red-600"
  onClick={(e) => {
    e.stopPropagation();
    setBudgetToDelete(budget);
    setShowDeleteConfirm(true);
  }}
>
  <Trash2 className="h-4 w-4 mr-2" />
  Excluir
</DropdownMenuItem>
```

**5. Adicionar AlertDialog de confirmação (antes do fecho do componente):**
```tsx
<AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Excluir Orçamento?</AlertDialogTitle>
      <AlertDialogDescription>
        Esta ação não pode ser desfeita. O orçamento {budgetToDelete?.code} será 
        permanentemente removido do sistema.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel onClick={() => setBudgetToDelete(null)}>
        Cancelar
      </AlertDialogCancel>
      <AlertDialogAction 
        className="bg-red-600 hover:bg-red-700"
        onClick={handleDeleteBudget}
      >
        Excluir
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## Parte 2: Modal de Criação Idêntico às Imagens

### Alterações em `src/components/modals/CreateBudgetModal.tsx`

**1. Actualizar TAX_RATES com labels detalhadas (linha 81-86):**
```typescript
const TAX_RATES = [
  { value: 0, label: '0% (Isento)' },
  { value: 6, label: '6% (IVA6)' },
  { value: 13, label: '13% (IVA13)' },
  { value: 23, label: '23% (IVA23)' },
];
```

**2. Adicionar campos de desconto ao schema (linha 66-77):**
```typescript
const formSchema = z.object({
  customer_name: z.string().min(1, 'Cliente é obrigatório'),
  customer_phone: z.string().optional(),
  customer_nif: z.string().optional(),
  technician_id: z.string().optional(),
  appliance_type: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  fault_description: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Adicione pelo menos um artigo'),
  discount_value: z.number().optional().default(0),
  discount_type: z.enum(['fixed', 'percentage']).optional().default('fixed'),
});
```

**3. Adicionar defaultValues para desconto (linha 107-115):**
```typescript
defaultValues: {
  customer_name: '',
  customer_phone: '',
  customer_nif: '',
  items: [
    { reference: '', name: '', description: '', quantity: 1, unit_price: 0, tax_rate: 23 },
  ],
  discount_value: 0,
  discount_type: 'fixed',
},
```

**4. Adicionar watch e cálculo do desconto (após linha 194):**
```typescript
const discountValue = form.watch('discount_value') || 0;
const discountType = form.watch('discount_type') || 'fixed';

const discountAmount = discountType === 'percentage' 
  ? subtotal * (discountValue / 100) 
  : discountValue;

const total = subtotal - discountAmount + totalTax;
```

**5. Guardar desconto ao submeter (linha 223-246):**
```typescript
const pricingData = {
  items: values.items.map(item => ({
    ref: item.reference || '',
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

**6. Adicionar inputs de desconto no resumo de totais (linha 673-690):**
```tsx
{/* Totals */}
<div className="flex justify-end">
  <div className="w-[350px] space-y-2 p-4 bg-muted/50 rounded-lg">
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">Subtotal:</span>
      <span className="font-semibold">{formatCurrency(subtotal)}</span>
    </div>
    
    {/* Campo de Desconto */}
    <div className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground">Desconto:</span>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          step={0.01}
          className="w-20 h-8 text-right"
          value={discountValue}
          onChange={(e) => form.setValue('discount_value', parseFloat(e.target.value) || 0)}
        />
        <Select
          value={discountType}
          onValueChange={(v) => form.setValue('discount_type', v as 'fixed' | 'percentage')}
        >
          <SelectTrigger className="w-16 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fixed">€</SelectItem>
            <SelectItem value="percentage">%</SelectItem>
          </SelectContent>
        </Select>
        <span className="font-semibold text-red-600 w-20 text-right">
          -{formatCurrency(discountAmount)}
        </span>
      </div>
    </div>
    
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">IVA Total:</span>
      <span className="font-semibold">{formatCurrency(totalTax)}</span>
    </div>
    <Separator />
    <div className="flex justify-between text-lg font-bold">
      <span>Total:</span>
      <span className="text-purple-600">{formatCurrency(total)}</span>
    </div>
  </div>
</div>
```

---

## Parte 3: Painel de Consulta Coerente

### Alterações em `src/components/shared/BudgetDetailPanel.tsx`

**1. Actualizar parsing para incluir desconto (linha 65-105):**
```typescript
const pricingDetails = useMemo(() => {
  if (!budget?.pricing_description) {
    return { 
      items: [] as BudgetItem[], 
      subtotal: budget?.estimated_labor || 0, 
      iva: budget?.estimated_parts || 0,
      total: budget?.estimated_total || 0,
      discount: 0
    };
  }
  
  try {
    const parsed = JSON.parse(budget.pricing_description);
    if (parsed.items && Array.isArray(parsed.items)) {
      const items: BudgetItem[] = parsed.items;
      
      const subtotal = items.reduce((sum, item) => {
        return sum + (item.qty * item.price);
      }, 0);
      
      const iva = items.reduce((sum, item) => {
        return sum + ((item.qty * item.price) * (item.tax / 100));
      }, 0);
      
      const discount = parsed.discount || 0;
      
      return { 
        items, 
        subtotal, 
        iva,
        discount,
        total: subtotal - discount + iva
      };
    }
  } catch {
    // Fallback to existing fields
  }
  
  return { 
    items: [] as BudgetItem[], 
    subtotal: budget?.estimated_labor || 0, 
    iva: budget?.estimated_parts || 0,
    total: budget?.estimated_total || 0,
    discount: 0
  };
}, [budget?.pricing_description, budget?.estimated_labor, budget?.estimated_parts, budget?.estimated_total]);
```

**2. Adicionar exibição do desconto no resumo financeiro (linha 298-312):**
```tsx
<div className="space-y-2">
  <div className="flex justify-between text-sm">
    <span className="text-muted-foreground">Subtotal</span>
    <span>{formatCurrency(pricingDetails.subtotal)}</span>
  </div>
  
  {pricingDetails.discount > 0 && (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">Desconto</span>
      <span className="text-red-600">-{formatCurrency(pricingDetails.discount)}</span>
    </div>
  )}
  
  <div className="flex justify-between text-sm">
    <span className="text-muted-foreground">IVA</span>
    <span>{formatCurrency(pricingDetails.iva)}</span>
  </div>
  <Separator className="my-2" />
  <div className="flex justify-between text-base font-bold">
    <span className="text-foreground">Total</span>
    <span className="text-primary">{formatCurrency(pricingDetails.total)}</span>
  </div>
</div>
```

---

## Resultado Visual Final

### Dropdown de Ações (com Excluir):
```text
┌──────────────────────────┐
│ Ver Detalhes             │
│ Aprovar          ← verde │
│ Recusar          ← verm. │
│ Converter em Serviço     │
│──────────────────────────│
│ Excluir          ← verm. │
└──────────────────────────┘
```

### Modal de Criação (com Desconto):
```text
┌─────────────────────────────────────────────┐
│ Resumo de Totais                            │
│                                             │
│ Subtotal:                        2.980,00 € │
│ Desconto:   [100] [% ▼]           -298,00 € │
│ IVA Total:                         617,14 € │
│ ─────────────────────────────────────────── │
│ Total:                           3.299,14 € │
└─────────────────────────────────────────────┘
```

### Painel Lateral (com Desconto):
```text
┌─────────────────────────────────────────────┐
│ Resumo Financeiro                           │
│                                             │
│ Subtotal                         2.980,00 € │
│ Desconto                          -298,00 € │
│ IVA                                617,14 € │
│ ─────────────────────────────────────────── │
│ Total                            3.299,14 € │
└─────────────────────────────────────────────┘
```

---

## Coerência Garantida

| Campo no Modal | Campo no Painel Lateral |
|----------------|------------------------|
| Cliente (Nome, Telefone, NIF) | Secção "Cliente" |
| Aparelho (Tipo, Marca, Modelo) | Secção "Aparelho" |
| Descrição da Avaria | Secção "Descrição da Avaria" |
| Artigos (Ref, Artigo, Descrição, Qtd, Valor, IVA) | Tabela "Artigos do Orçamento" |
| Desconto (valor ou %) | Linha "Desconto" no resumo |
| Subtotal / IVA / Total | "Resumo Financeiro" |
| Observação | Secção "Notas / Observações" |

Todas as informações registadas no modal de criação serão exibidas no painel de consulta lateral.

