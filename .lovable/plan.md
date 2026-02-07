

# Plano: Adicionar Secção de Cliente ao Modal de Criação de Orçamento

## Objectivo

Adicionar uma secção de **Dados do Cliente** ao modal de criação de orçamento com:
1. Campos para Nome, Telefone e NIF
2. Auto-detecção de cliente existente (pesquisa automática)
3. Opção de associar a um cliente encontrado
4. Opção de criar novo perfil de cliente com os dados preenchidos

---

## Estrutura Final do Modal

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  Criar Orçamento                                                        [X] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  👤 Dados do Cliente (Opcional)                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Nome          │ Telefone        │ NIF                                 │  │
│  │ [___________] │ [___________]   │ [___________]                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ ✓ Cliente encontrado: João Silva                                        ││
│  │   Tel: 912345678 | NIF: 123456789                                       ││
│  │   [Associar Cliente]  [Criar Novo]                                      ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  🛒 Artigos do Orçamento                                                    │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Artigo   │ Descrição │ Qtd │ Valor (€) │ Imposto │ Subtotal (€)       │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │ (input)  │ (input)   │  1  │     0     │ 23% ▼   │ 0,00 €          🗑 │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  [+ Adicionar Linha]                                                        │
│                                                                             │
│                                          ┌────────────────────────────────┐ │
│                                          │ Subtotal (s/ IVA):     0,00 € │ │
│                                          │ IVA Total:             0,00 € │ │
│                                          │ Desconto: [0] [€/▼]   -0,00 € │ │
│                                          │──────────────────────────────│ │
│                                          │ Total:                 0,00 € │ │
│                                          └────────────────────────────────┘ │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                        [Cancelar]  [Guardar Orçamento]      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Alterações Necessárias

### Ficheiro: `src/components/modals/CreateBudgetModal.tsx`

| Alteração | Descrição |
|-----------|-----------|
| Adicionar imports | `useEffect`, `Check`, `UserPlus`, `User` icons, `useCreateCustomer` hook |
| Adicionar estados | `selectedCustomer`, `foundCustomer`, `showFoundCustomerBox`, `showCreateCustomerDialog`, `pendingFormValues` |
| Actualizar schema | Adicionar campos `customer_name`, `customer_phone`, `customer_nif` (opcionais) |
| Adicionar useEffect | Auto-detecção de cliente por telefone ou NIF |
| Adicionar secção UI | Campos de cliente antes da tabela de artigos |
| Adicionar AlertDialog | Confirmar criação de novo cliente |
| Actualizar handleSubmit | Incluir `customer_id` no insert |

---

## Código a Adicionar

### 1. Novos Imports

```typescript
import { useState, useEffect } from 'react';
import { Check, UserPlus, User } from 'lucide-react';
import { useCreateCustomer } from '@/hooks/useCustomers';
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
import type { Customer } from '@/types/database';
```

### 2. Novos Estados

```typescript
const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
const [showFoundCustomerBox, setShowFoundCustomerBox] = useState(false);
const [showCreateCustomerDialog, setShowCreateCustomerDialog] = useState(false);
const [pendingFormValues, setPendingFormValues] = useState<FormValues | null>(null);

const createCustomer = useCreateCustomer();
```

### 3. Schema Actualizado

```typescript
const formSchema = z.object({
  // Cliente (opcional)
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  customer_nif: z.string().optional(),
  
  // Artigos
  items: z.array(itemSchema).min(1, 'Adicione pelo menos um artigo'),
  discount_value: z.number().optional().default(0),
  discount_type: z.enum(['fixed', 'percentage']).optional().default('fixed'),
});
```

### 4. useEffect para Auto-Detecção

```typescript
const customerPhone = form.watch('customer_phone');
const customerNif = form.watch('customer_nif');

useEffect(() => {
  const searchCustomer = async () => {
    if (selectedCustomer) return;
    
    const searchPhone = customerPhone?.replace(/\s/g, '');
    const searchNif = customerNif?.replace(/\s/g, '');
    
    if ((!searchPhone || searchPhone.length < 6) && (!searchNif || searchNif.length < 6)) {
      setFoundCustomer(null);
      setShowFoundCustomerBox(false);
      return;
    }

    try {
      let query = supabase.from('customers').select('*');
      
      if (searchPhone && searchPhone.length >= 6) {
        query = query.ilike('phone', `%${searchPhone}%`);
      } else if (searchNif && searchNif.length >= 6) {
        query = query.ilike('nif', `%${searchNif}%`);
      }
      
      const { data, error } = await query.limit(1).maybeSingle();
      
      if (!error && data) {
        setFoundCustomer(data as Customer);
        setShowFoundCustomerBox(true);
      } else {
        setFoundCustomer(null);
        setShowFoundCustomerBox(false);
      }
    } catch (e) {
      console.error('Error searching customer:', e);
    }
  };

  const debounce = setTimeout(searchCustomer, 500);
  return () => clearTimeout(debounce);
}, [customerPhone, customerNif, selectedCustomer]);
```

### 5. Secção de Cliente no JSX (antes da tabela)

```tsx
{/* Dados do Cliente (Opcional) */}
<div className="space-y-3">
  <div className="flex items-center gap-2 text-sm text-muted-foreground">
    <User className="h-4 w-4" />
    <span>Dados do Cliente (Opcional)</span>
  </div>
  
  {/* Cliente já selecionado */}
  {selectedCustomer && (
    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
      <div className="flex items-center gap-2">
        <Check className="h-5 w-5 text-green-600" />
        <span className="font-medium text-green-800">
          Cliente: {selectedCustomer.name}
        </span>
      </div>
      <Button 
        type="button" 
        variant="ghost" 
        size="sm"
        onClick={() => {
          setSelectedCustomer(null);
          form.setValue('customer_name', '');
          form.setValue('customer_phone', '');
          form.setValue('customer_nif', '');
        }}
      >
        Alterar
      </Button>
    </div>
  )}

  {/* Cliente encontrado */}
  {!selectedCustomer && showFoundCustomerBox && foundCustomer && (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
      <p className="font-medium text-blue-900">Cliente existente encontrado!</p>
      <div className="text-sm text-blue-700 bg-white/50 p-2 rounded">
        <p><strong>Nome:</strong> {foundCustomer.name}</p>
        {foundCustomer.phone && <p><strong>Tel:</strong> {foundCustomer.phone}</p>}
        {foundCustomer.nif && <p><strong>NIF:</strong> {foundCustomer.nif}</p>}
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={handleSelectFoundCustomer}>
          Associar Cliente
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleIgnoreFoundCustomer}>
          Criar Novo
        </Button>
      </div>
    </div>
  )}

  {/* Campos de input (se não houver cliente selecionado) */}
  {!selectedCustomer && (
    <div className="grid grid-cols-3 gap-3">
      <FormField
        control={form.control}
        name="customer_name"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Input placeholder="Nome" className="h-9" {...field} />
            </FormControl>
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="customer_phone"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Input placeholder="Telefone" className="h-9" {...field} />
            </FormControl>
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="customer_nif"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Input placeholder="NIF" className="h-9" {...field} />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  )}
</div>

<Separator />
```

### 6. Funções de Gestão de Cliente

```typescript
const handleSelectFoundCustomer = () => {
  if (!foundCustomer) return;
  setSelectedCustomer(foundCustomer);
  form.setValue('customer_name', foundCustomer.name);
  form.setValue('customer_phone', foundCustomer.phone || '');
  form.setValue('customer_nif', foundCustomer.nif || '');
  setShowFoundCustomerBox(false);
  setFoundCustomer(null);
};

const handleIgnoreFoundCustomer = () => {
  setShowFoundCustomerBox(false);
  setFoundCustomer(null);
};
```

### 7. handleSubmit Actualizado

```typescript
const handleSubmit = async (values: FormValues) => {
  // Se tem dados de cliente mas não está associado, perguntar se quer criar
  const hasCustomerData = values.customer_name || values.customer_phone;
  if (hasCustomerData && !selectedCustomer) {
    setPendingFormValues(values);
    setShowCreateCustomerDialog(true);
    return;
  }

  await processSubmit(values, selectedCustomer?.id);
};

const processSubmit = async (values: FormValues, customerId?: string) => {
  setIsLoading(true);
  try {
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
      discountValue: parsedDiscountValue,
    };

    const { error } = await supabase.from('budgets').insert({
      customer_id: customerId || null,
      estimated_labor: subtotal,
      estimated_parts: totalTax,
      estimated_total: total,
      status: 'pendente',
      pricing_description: JSON.stringify(pricingData),
    });

    if (error) throw error;

    toast.success('Orçamento criado com sucesso!');
    handleClose();
    onSuccess?.();
  } catch (error) {
    console.error('Error creating budget:', error);
    toast.error('Erro ao criar orçamento');
  } finally {
    setIsLoading(false);
  }
};

const handleConfirmCreateCustomer = async () => {
  if (!pendingFormValues) return;
  setShowCreateCustomerDialog(false);
  
  try {
    const newCustomer = await createCustomer.mutateAsync({
      name: pendingFormValues.customer_name || '',
      phone: pendingFormValues.customer_phone,
      nif: pendingFormValues.customer_nif,
    });
    
    await processSubmit(pendingFormValues, newCustomer.id);
  } catch (error) {
    console.error('Error creating customer:', error);
    toast.error('Erro ao criar cliente');
  }
  
  setPendingFormValues(null);
};

const handleSkipCustomerCreation = async () => {
  if (!pendingFormValues) return;
  setShowCreateCustomerDialog(false);
  await processSubmit(pendingFormValues);
  setPendingFormValues(null);
};
```

### 8. AlertDialog para Confirmar Criação de Cliente

```tsx
<AlertDialog open={showCreateCustomerDialog} onOpenChange={setShowCreateCustomerDialog}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Criar perfil de cliente?</AlertDialogTitle>
      <AlertDialogDescription>
        Preencheu dados de cliente. Deseja criar um perfil para este cliente?
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel onClick={handleSkipCustomerCreation}>
        Não, guardar sem cliente
      </AlertDialogCancel>
      <AlertDialogAction onClick={handleConfirmCreateCustomer}>
        <UserPlus className="h-4 w-4 mr-2" />
        Sim, criar cliente
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### 9. Actualizar handleClose

```typescript
const handleClose = () => {
  onOpenChange(false);
  form.reset();
  setDiscountValue('');
  setDiscountType('euro');
  setSelectedCustomer(null);
  setFoundCustomer(null);
  setShowFoundCustomerBox(false);
  setPendingFormValues(null);
};
```

---

## Fluxo de Utilização

1. **Sem dados de cliente**: Utilizador pode criar orçamento sem associar cliente
2. **Com telefone/NIF**: Sistema pesquisa automaticamente cliente existente
3. **Cliente encontrado**: Mostra caixa com opção de Associar ou Criar Novo
4. **Ao submeter com dados**: Pergunta se quer criar perfil de cliente
5. **Ao submeter sem dados**: Guarda orçamento sem cliente associado

---

## Ficheiros a Alterar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/modals/CreateBudgetModal.tsx` | Adicionar secção de cliente com auto-detecção e opção de criar |

