

# Plano: Suportar Valores Acima de 1.000€

## Problema Identificado

Quando o utilizador escreve "2.000" (dois mil euros no formato português), o input `type="number"` interpreta o ponto como **separador decimal**, resultando em "2.00" (dois euros).

Isto acontece porque:
- **Formato Português**: 2.000,00 = dois mil euros (ponto = milhares, vírgula = decimais)
- **Formato HTML number**: 2.000 = dois euros (ponto = decimais)

## Solução

Mudar os campos de valor monetário de `type="number"` para `type="text"` com:
1. **Padrão de input** que aceita números e separadores
2. **Função de parsing** que converte formatos europeus
3. **Validação** para garantir valores válidos
4. **Formatação visual** para o utilizador ver o valor correctamente

## Ficheiros a Alterar

| Ficheiro | Campos Afectados |
|----------|------------------|
| `src/components/modals/RegisterPaymentModal.tsx` | Valor do pagamento |
| `src/components/modals/SetPriceModal.tsx` | Preço, Desconto |
| `src/components/modals/ConfirmPartOrderModal.tsx` | Custo da peça |
| `src/components/modals/CreateInstallationModal.tsx` | Valor da instalação |
| `src/components/modals/CreateDeliveryModal.tsx` | Valor da entrega |

## Implementação

### 1. Criar Utilitário de Parsing (novo ficheiro)

Criar `src/utils/currencyUtils.ts` com funções para:

```typescript
// Converte string para número, aceitando formatos PT/EU
// "2.000,50" → 2000.50
// "2000.50" → 2000.50
// "2000" → 2000
export function parseCurrencyInput(value: string): number

// Formata número para exibição (opcional)
export function formatCurrency(value: number): string
```

Lógica do parsing:
- Se contém vírgula como último separador → formato PT (1.234,56)
- Se contém ponto como último separador e mais de 2 dígitos depois → milhares PT (1.234)
- Caso contrário → formato numérico normal

### 2. Actualizar RegisterPaymentModal

```tsx
// Antes
<Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
const paymentValue = parseFloat(amount) || 0;

// Depois
<Input 
  type="text" 
  inputMode="decimal"
  placeholder="Ex: 2.000,00"
  value={amount} 
  onChange={(e) => setAmount(e.target.value)} 
/>
const paymentValue = parseCurrencyInput(amount);
```

### 3. Actualizar SetPriceModal

Aplicar a mesma lógica aos campos:
- **Preço** (linha 173-182)
- **Desconto** (linha 199-208)

### 4. Actualizar ConfirmPartOrderModal

Aplicar ao campo de **custo da peça**.

### 5. Actualizar CreateInstallationModal e CreateDeliveryModal

Aplicar aos campos de **valor**.

## Lógica de Parsing Detalhada

```typescript
export function parseCurrencyInput(value: string): number {
  if (!value || typeof value !== 'string') return 0;
  
  // Remove espaços
  let cleaned = value.trim();
  
  // Detectar formato europeu: 1.234,56 ou 1234,56
  // Se tem vírgula, assume formato PT/EU
  if (cleaned.includes(',')) {
    // Remove pontos (milhares) e substitui vírgula por ponto
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes('.')) {
    // Verificar se é ponto de milhares (ex: 2.000 sem decimais)
    const parts = cleaned.split('.');
    const lastPart = parts[parts.length - 1];
    
    // Se último grupo tem 3 dígitos, provavelmente é milhares
    // Ex: "2.000" → 2000, "2.50" → 2.50
    if (parts.length > 1 && lastPart.length === 3 && /^\d+$/.test(lastPart)) {
      // Provavelmente milhares: 2.000 → 2000
      cleaned = cleaned.replace(/\./g, '');
    }
    // Caso contrário, mantém como decimal: 2.50 → 2.50
  }
  
  const result = parseFloat(cleaned);
  return isNaN(result) ? 0 : result;
}
```

## Exemplos de Conversão

| Input | Resultado |
|-------|-----------|
| `2000` | 2000 |
| `2.000` | 2000 (detecta milhares) |
| `2.000,00` | 2000 |
| `2,50` | 2.50 |
| `1.234,56` | 1234.56 |
| `50.00` | 50 |
| `50,00` | 50 |

## Validação Adicional

Nos handlers de submit, manter validação:

```typescript
const paymentValue = parseCurrencyInput(amount);
if (paymentValue <= 0) {
  toast.error('Introduza um valor válido');
  return;
}
```

## Resultado Esperado

1. **"2.000"** → Registado como **€2.000,00** (dois mil euros)
2. **"1.500,50"** → Registado como **€1.500,50**
3. **"50"** → Registado como **€50,00**
4. **"2,50"** → Registado como **€2,50**

## Secção Técnica

### Atributo `inputMode`

Usar `inputMode="decimal"` para que teclados móveis mostrem o teclado numérico com separadores.

### Compatibilidade

Esta abordagem é compatível com:
- Desktop: Qualquer formato aceite
- Mobile: Teclado numérico decimal
- Safari/Chrome/Firefox: Todos suportam

### Ficheiros Criados/Alterados

| Ficheiro | Acção |
|----------|-------|
| `src/utils/currencyUtils.ts` | **Criar** - Funções de parsing |
| `src/components/modals/RegisterPaymentModal.tsx` | **Editar** - Usar parseCurrencyInput |
| `src/components/modals/SetPriceModal.tsx` | **Editar** - Usar parseCurrencyInput |
| `src/components/modals/ConfirmPartOrderModal.tsx` | **Editar** - Usar parseCurrencyInput |
| `src/components/modals/CreateInstallationModal.tsx` | **Editar** - Usar parseCurrencyInput |
| `src/components/modals/CreateDeliveryModal.tsx` | **Editar** - Usar parseCurrencyInput |

