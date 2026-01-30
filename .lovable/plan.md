

# Plano: Simplificar Modal de Definir Preco

## Resumo

O utilizador quer simplificar o modal de precificacao, substituindo os campos separados de "Mao de Obra" e "Pecas" por:
1. Um campo unico de **Preco** (valor total)
2. Um campo livre de **Descricao** (para detalhar mao de obra, materiais e pecas)
3. Manter o campo de **Desconto** abaixo

---

## Nova Estrutura do Modal

```text
┌────────────────────────────────────────────────────┐
│  Definir Preco - OS-00003                      [X] │
├────────────────────────────────────────────────────┤
│                                                    │
│  Preco (EUR) *                                     │
│  ┌──────────────────────────────────────────────┐ │
│  │ 50.00                                        │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  Descricao                                         │
│  ┌──────────────────────────────────────────────┐ │
│  │ Mao de obra: Substituicao de compressor      │ │
│  │ Materiais: Gás R410A, soldadura              │ │
│  │ Pecas: Compressor 12BTU                      │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  Desconto (EUR)                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │ 0                                            │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │ Subtotal:                         EUR 50.00  │ │
│  │─────────────────────────────────────────────│ │
│  │ Total a cobrar:                   EUR 50.00  │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  [Cancelar]                    [Confirmar Preco]   │
└────────────────────────────────────────────────────┘
```

---

## Alteracoes Necessarias

### 1. Base de Dados - Nova Migracao

Adicionar campo `pricing_description` na tabela `services`:

```sql
ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS pricing_description TEXT;

COMMENT ON COLUMN public.services.pricing_description IS 
'Descricao livre de mao de obra, materiais e pecas incluidas no preco';
```

### 2. Types - Actualizar Interface

**Ficheiro:** `src/types/database.ts`

Adicionar campo na interface `Service`:

```typescript
export interface Service {
  // ... campos existentes ...
  pricing_description: string | null;  // NOVO
}
```

### 3. Modal - Simplificar Campos

**Ficheiro:** `src/components/modals/SetPriceModal.tsx`

Alteracoes:

| Antes | Depois |
|-------|--------|
| Campo "Mao de Obra" (Input number) | Campo "Preco" (Input number) |
| Campo "Pecas" (Input number) | Campo "Descricao" (Textarea) |
| Campo "Desconto" (Input number) | Campo "Desconto" (mantido) |

**Estado do componente:**

```typescript
// ANTES:
const [laborCost, setLaborCost] = useState('');
const [partsCost, setPartsCost] = useState('');
const [discount, setDiscount] = useState('');

// DEPOIS:
const [price, setPrice] = useState('');
const [description, setDescription] = useState('');
const [discount, setDiscount] = useState('');
```

**Calculo simplificado:**

```typescript
// ANTES:
const subtotal = laborValue + partsValue;
const finalPrice = Math.max(0, subtotal - discountValue);

// DEPOIS:
const priceValue = parseFloat(price) || 0;
const discountValue = parseFloat(discount) || 0;
const finalPrice = Math.max(0, priceValue - discountValue);
```

**Guardar na base de dados:**

```typescript
await updateService.mutateAsync({
  id: service.id,
  final_price: finalPrice,
  labor_cost: priceValue,       // Guardar preco no labor_cost para compatibilidade
  parts_cost: 0,                // Definir como 0
  discount: discountValue,
  pricing_description: description,  // NOVO campo
  pending_pricing: false,
  // ...
});
```

### 4. Carregar Dados Existentes

No `useEffect`, carregar o preco e descricao:

```typescript
useEffect(() => {
  if (service && open) {
    // Preco = labor_cost + parts_cost (para servicos antigos)
    const existingPrice = (service.labor_cost || 0) + (service.parts_cost || 0);
    setPrice(existingPrice > 0 ? existingPrice.toString() : '');
    setDescription(service.pricing_description || '');
    setDiscount(service.discount?.toString() || '0');
  }
}, [service, open]);
```

---

## Compatibilidade com Dados Existentes

Os servicos ja precificados com campos separados (`labor_cost` + `parts_cost`) continuarao a funcionar:
- Ao abrir o modal, somamos os dois valores no campo "Preco"
- A descricao sera vazia para servicos antigos (pode ser preenchida depois)
- O calculo de `final_price` mantem a mesma logica

---

## Ficheiros a Modificar

| Ficheiro | Accao |
|----------|-------|
| Nova migracao SQL | Criar coluna `pricing_description` |
| `src/integrations/supabase/types.ts` | Adicionar campo ao type (automatico) |
| `src/types/database.ts` | Adicionar `pricing_description: string \| null` |
| `src/components/modals/SetPriceModal.tsx` | Simplificar para campo unico + descricao |

---

## Interface Final

O modal tera:
- **Preco (EUR)**: Campo numerico obrigatorio
- **Descricao**: Textarea opcional para detalhar (mao de obra, materiais, pecas)
- **Desconto (EUR)**: Campo numerico opcional
- **Resumo**: Subtotal e Total a cobrar

A funcionalidade de garantia (warranty) mantem-se inalterada - quando activa, todos os campos ficam desactivados.

