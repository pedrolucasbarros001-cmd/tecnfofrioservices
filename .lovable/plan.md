
# Plano: Reformular Modal de Precificação com Artigos e Melhorar Modal de Orçamento

## Resumo

Transformar o **SetPriceModal** (modal de precificação) para ter uma estrutura semelhante ao modal de orçamento, permitindo adicionar múltiplos artigos/linhas com referência, descrição, quantidade, valor e imposto - conforme a imagem de referência.

O **CreateBudgetModal** já possui a funcionalidade de adicionar linhas, mas vamos garantir que a interface seja consistente com a referência.

---

## Análise da Imagem de Referência

A imagem mostra um formulário de linhas com:
- **Dropdown "Adicionar Artigo"** no topo (para selecionar artigos pré-definidos)
- **Colunas**: Artigo (Referência), Descrição, Qtd, Valor, Imposto (0%/6%/13%/23%), Valor Final
- **Botão de confirmação** (✓) por linha
- **Botão de remover** (✕) por linha
- **Resumo financeiro**: Subtotal, Desconto, IVA, Ajuste, Total

---

## Ficheiros a Criar/Alterar

| Ficheiro | Ação | Descrição |
|----------|------|-----------|
| `src/components/modals/SetPriceModal.tsx` | **Reformular** | Adicionar sistema de linhas com artigos |
| `src/components/modals/CreateBudgetModal.tsx` | **Ajustar** | Melhorias de UX para consistência |

---

## Detalhes da Implementação

### 1. SetPriceModal - Nova Estrutura

**Antes**: Campo único de preço + descrição + desconto

**Depois**: Sistema de linhas com artigos (similar ao CreateBudgetModal)

```typescript
// Nova estrutura de dados para cada linha
interface PriceLineItem {
  id: string;
  reference: string;      // Referência do artigo
  description: string;    // Descrição detalhada
  quantity: number;       // Quantidade
  unit_price: number;     // Valor unitário
  tax_rate: number;       // Taxa de imposto (0, 6, 13, 23)
}

// Taxas de IVA disponíveis
const TAX_RATES = [
  { value: 0, label: '0%', code: 'IVA0' },
  { value: 6, label: '6%', code: 'IVA6' },
  { value: 13, label: '13%', code: 'IVA13' },
  { value: 23, label: '23%', code: 'IVA23' },
];
```

**Estrutura do Modal**:
1. **Header** com código do serviço e badge de garantia (se aplicável)
2. **Secção de Garantia** (se serviço de garantia)
3. **Tabela de Artigos**:
   - Coluna: Referência (input texto)
   - Coluna: Descrição (input texto, mais largo)
   - Coluna: Qtd (input numérico)
   - Coluna: Valor € (input numérico)
   - Coluna: Imposto (select com taxas IVA)
   - Coluna: Total (calculado automaticamente)
   - Coluna: Ações (botão remover)
4. **Botão "Adicionar Linha"** abaixo da tabela
5. **Resumo Financeiro**:
   - Subtotal (soma de todos os artigos)
   - Desconto (input com opção € ou %)
   - IVA Total
   - Ajuste (opcional)
   - **Total a Cobrar** (destacado)
6. **Footer** com botões Cancelar e Confirmar

### 2. Cálculos Financeiros

```typescript
// Para cada linha
const lineSubtotal = quantity * unit_price;
const lineTax = lineSubtotal * (tax_rate / 100);
const lineTotal = lineSubtotal + lineTax;

// Totais gerais
const subtotal = sum(all lineSubtotals);
const totalTax = sum(all lineTaxes);
const discountAmount = calculateDiscount(subtotal, discountValue, discountType);
const adjustmentAmount = parseFloat(adjustment) || 0;
const finalTotal = subtotal + totalTax - discountAmount + adjustmentAmount;
```

### 3. Desconto com Opção % ou €

Adicionar toggle para tipo de desconto:
- **€**: Valor fixo em euros
- **%**: Percentagem sobre o subtotal

```typescript
const [discountType, setDiscountType] = useState<'euro' | 'percent'>('euro');
const [discountValue, setDiscountValue] = useState('');

const calculateDiscount = () => {
  const value = parseCurrencyInput(discountValue);
  if (discountType === 'percent') {
    return subtotal * (value / 100);
  }
  return value;
};
```

### 4. Salvamento dos Dados

Ao confirmar o preço:
1. Calcular o preço final (subtotal + IVA - desconto + ajuste)
2. Guardar na base de dados:
   - `labor_cost`: subtotal (valor base)
   - `parts_cost`: 0 (compatibilidade)
   - `discount`: valor do desconto calculado
   - `final_price`: total final
   - `pricing_description`: JSON ou texto com detalhes dos artigos
3. Atualizar status do serviço conforme lógica existente

### 5. CreateBudgetModal - Consistência

O modal de orçamento já tem a estrutura de linhas. Ajustes menores:
- Adicionar campo **Referência** se não existir
- Garantir consistência visual com o SetPriceModal
- Adicionar opção de **Desconto %** além de €
- Adicionar campo de **Ajuste** opcional

---

## Layout Visual (SetPriceModal)

```text
┌─────────────────────────────────────────────────────────────────┐
│ Definir Preço - SRV-00123                    [Badge Garantia]   │
├─────────────────────────────────────────────────────────────────┤
│ [Se garantia: opção de cobrir todo o serviço]                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [+ Adicionar Linha]                                            │
│                                                                 │
│  ┌──────────┬────────────────┬─────┬────────┬────────┬────────┐ │
│  │Referência│ Descrição      │ Qtd │ Valor  │Imposto │ Total  │ │
│  ├──────────┼────────────────┼─────┼────────┼────────┼────────┤ │
│  │ [input]  │ [input largo]  │ [1] │[0.00]  │ [23%▼] │ €0.00  │✕│
│  └──────────┴────────────────┴─────┴────────┴────────┴────────┘ │
│                                                                 │
│                              ┌──────────────────────────────────┤
│                              │ Subtotal:          €1.234,56     │
│                              │ Desconto: [___] [€▼]  -€50,00    │
│                              │ IVA (23%):          €284,00      │
│                              │ Ajuste: [___]         €0,00      │
│                              ├──────────────────────────────────┤
│                              │ TOTAL:           €1.468,56       │
│                              └──────────────────────────────────┤
├─────────────────────────────────────────────────────────────────┤
│                              [Cancelar]  [Confirmar Preço]      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Mapeamento de Dados para Base de Dados

O serviço tem os seguintes campos financeiros:
- `labor_cost`: Usado para guardar o subtotal
- `parts_cost`: 0 (não usado separadamente)
- `discount`: Valor do desconto em €
- `final_price`: Total final a cobrar
- `pricing_description`: Texto/JSON com descrição detalhada

Para guardar os artigos detalhados, usar `pricing_description` como JSON:
```json
{
  "items": [
    { "ref": "001", "desc": "Compressor", "qty": 1, "price": 500, "tax": 23 },
    { "ref": "002", "desc": "Mão de obra", "qty": 2, "price": 50, "tax": 23 }
  ],
  "discount": { "type": "euro", "value": 50 },
  "adjustment": 0
}
```

---

## Secção Técnica

### Dependências
- `react-hook-form` com `useFieldArray` para gestão dinâmica de linhas
- `zod` para validação do formulário
- Componentes UI existentes (Table, Input, Select, Button)

### Schema de Validação
```typescript
const lineItemSchema = z.object({
  reference: z.string().optional(),
  description: z.string().min(1, 'Descrição é obrigatória'),
  quantity: z.number().min(1, 'Mínimo 1'),
  unit_price: z.number().min(0, 'Valor deve ser positivo'),
  tax_rate: z.number(),
});

const formSchema = z.object({
  items: z.array(lineItemSchema).min(1, 'Adicione pelo menos um artigo'),
  discount_type: z.enum(['euro', 'percent']),
  discount_value: z.string(),
  adjustment: z.string(),
  warranty_covers_all: z.boolean(),
});
```

### Estado Inicial
Ao abrir o modal com um serviço existente:
- Se `pricing_description` contém JSON válido, popular as linhas
- Senão, criar uma linha vazia para começar
- Preencher desconto com valor existente

---

## Resumo de Alterações

| Ficheiro | Tipo | Linhas Estimadas |
|----------|------|------------------|
| `src/components/modals/SetPriceModal.tsx` | Reformular | ~350 linhas |
| `src/components/modals/CreateBudgetModal.tsx` | Pequenos ajustes | ~20 linhas |

**Total: 2 ficheiros, reformulação significativa**

---

## Resultado Esperado

- Modal de precificação com interface profissional de linhas/artigos
- Possibilidade de adicionar múltiplos artigos com IVA individual
- Desconto em € ou %
- Campo de ajuste para pequenas correções
- Resumo financeiro claro e visível
- Consistência visual entre modal de orçamento e precificação
