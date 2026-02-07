

# Plano: Simplificar Modal de Criação de Orçamento

## Problema Identificado

O modal de criação de orçamento actual contém:
- **Secção Cliente** (Nome, Telefone, NIF, Técnico Sugerido, Observação)
- **Secção Aparelho** (Tipo de Aparelho, Marca, Modelo, Descrição da Avaria)
- **Secção Artigos** (tabela com itens)

O utilizador quer que o modal seja **igual às imagens de referência** - focado apenas na **tabela de artigos** com a capacidade de adicionar quantos itens quiser.

---

## Estrutura Desejada (Baseada nas Imagens)

O modal deve ter apenas:

1. **Tabela de Artigos** com colunas:
   - Artigo
   - Descrição
   - Qtd
   - Valor (€)
   - Imposto (dropdown: 0%, 6%, 13%, 23%)
   - Subtotal (€)

2. **Botão "Adicionar Linha"** para adicionar mais artigos

3. **Resumo de Totais**:
   - Subtotal
   - Desconto (input + €/%)
   - IVA Total
   - Total

4. **Botões**: Cancelar | Guardar Orçamento

---

## Alterações Necessárias

### Ficheiro: `src/components/modals/CreateBudgetModal.tsx`

| Alteração | Descrição |
|-----------|-----------|
| Remover secção "Cliente" | Eliminar campos Nome, Telefone, NIF, Técnico, Observação |
| Remover secção "Aparelho" | Eliminar campos Tipo, Marca, Modelo, Descrição da Avaria |
| Remover lógica de auto-detecção de cliente | Eliminar useEffect e estados relacionados |
| Simplificar schema | Remover campos de cliente e aparelho do Zod schema |
| Manter apenas artigos | Focar o modal apenas na tabela de itens e totais |

---

## Novo Schema Simplificado

```typescript
const itemSchema = z.object({
  name: z.string().min(1, 'Nome do artigo é obrigatório'),
  description: z.string().optional(),
  quantity: z.number().min(1, 'Quantidade mínima é 1'),
  unit_price: z.number().min(0, 'Valor deve ser positivo'),
  tax_rate: z.number(),
});

const formSchema = z.object({
  items: z.array(itemSchema).min(1, 'Adicione pelo menos um artigo'),
  discount_value: z.number().optional().default(0),
  discount_type: z.enum(['fixed', 'percentage']).optional().default('fixed'),
});
```

---

## Nova Estrutura do Modal

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  Criar Orçamento                                                        [X] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Artigo          │ Descrição │ Qtd │ Valor (€) │ Imposto │ Subtotal   │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │ Ex: Compressor  │ Detalh    │  1  │     0     │ 23% ▼   │ 0,00 €  🗑 │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  [+ Adicionar Linha]                                                        │
│                                                                             │
│                                          ┌────────────────────────────────┐ │
│                                          │ Subtotal:           2.980,00 € │ │
│                                          │ Desconto: [0] [€▼]    -0,00 € │ │
│                                          │ IVA Total:            685,40 € │ │
│                                          │──────────────────────────────│ │
│                                          │ Total:              3.665,40 € │ │
│                                          └────────────────────────────────┘ │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                        [Cancelar]  [Guardar Orçamento]      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Código a Remover

### 1. Estados a remover (linhas 96-100):
- `selectedCustomer`
- `foundCustomer`
- `showFoundCustomerBox`
- `showCreateCustomerDialog`
- `pendingFormValues`

### 2. Campos do schema a remover (linhas 66-74):
- `customer_name`
- `customer_phone`
- `customer_nif`
- `technician_id`
- `appliance_type`
- `brand`
- `model`
- `fault_description`
- `notes`

### 3. useEffect de auto-detecção de cliente (linhas 130-168):
- Eliminar completamente

### 4. Funções a remover:
- `handleSelectFoundCustomer` (linhas 170-179)
- `handleIgnoreFoundCustomer` (linhas 181-184)
- `handleConfirmCreateCustomer` (linhas 274-279)

### 5. JSX a remover:
- Secção "Cliente" completa (linhas 309-453)
- Secção "Aparelho" completa (linhas 457-518)
- Separadores entre secções
- AlertDialog de criar cliente (linhas 737-755)

### 6. Imports a remover:
- `useTechnicians`
- `useCreateCustomer`
- `Check`, `UserPlus`

---

## Actualização do Submit

A função `processSubmit` será simplificada para apenas guardar os artigos:

```typescript
const handleSubmit = async (values: FormValues) => {
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
      discountValue: discountValue,
    };

    const { error } = await supabase.from('budgets').insert({
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
```

---

## Ficheiros a Alterar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/modals/CreateBudgetModal.tsx` | Simplificar completamente - remover secções Cliente e Aparelho |

---

## Resultado Final

O modal será focado apenas em:
- Adicionar artigos/produtos/serviços
- Definir quantidades, valores e impostos
- Aplicar descontos
- Ver totais calculados

Isto alinha-se exactamente com as imagens de referência fornecidas pelo utilizador.

