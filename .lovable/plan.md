
# Plano: Actualizar Painel Lateral de Orçamento

## Problema Identificado

O painel lateral de consulta (`BudgetDetailPanel`) ainda mostra secções que já não existem no modal de criação simplificado:
- Secção "Cliente" 
- Secção "Aparelho"
- Secção "Descrição da Avaria"
- Secção "Notas / Observações"
- Coluna "Ref." na tabela de artigos

## Estrutura Desejada (Coerente com o Modal)

O painel deve mostrar apenas:

1. **Header**
   - Código do orçamento
   - Status (badge)
   - Data de criação
   - Botão imprimir

2. **Tabela de Artigos** (6 colunas):
   - Artigo
   - Descrição
   - Qtd
   - Valor (€)
   - Imposto
   - Subtotal (€)

3. **Resumo Financeiro**:
   - Subtotal (s/ IVA)
   - Desconto (se aplicável)
   - IVA Total
   - Total

4. **Acções** (footer)
   - Aprovar / Recusar (se pendente)
   - Converter em Serviço (se aprovado)

---

## Alterações Necessárias

### Ficheiro: `src/components/shared/BudgetDetailPanel.tsx`

| Alteração | Descrição |
|-----------|-----------|
| Remover secção "Cliente" | Eliminar linhas 180-212 |
| Remover secção "Aparelho" | Eliminar linhas 214-231 |
| Remover secção "Descrição da Avaria" | Eliminar linhas 233-242 |
| Remover secção "Notas" | Eliminar linhas 328-336 |
| Remover secção "Validade" | Eliminar linhas 338-343 |
| Actualizar tabela de artigos | Remover coluna "Ref.", usar 6 colunas como no modal |
| Remover imports não usados | `User`, `Phone`, `Mail`, `MapPin`, `FileText`, `Package` |

---

## Nova Estrutura do Painel

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  ORC-001                                              [Pendente] [Imprimir] │
│  Criado em 3 de Fevereiro de 2025                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  🛒 Artigos do Orçamento                                                    │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Artigo     │ Descrição │ Qtd │ Valor  │ Imposto │ Subtotal           │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │ Compressor │ Detalhe   │  1  │ €500   │ 23%     │ €615,00            │  │
│  │ Mão-de-Obra│ Instalação│  1  │ €100   │ 23%     │ €123,00            │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  💰 Resumo Financeiro                                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Subtotal (s/ IVA):                                          €600,00  │  │
│  │ Desconto:                                                    -€50,00  │  │
│  │ IVA Total:                                                   €126,50  │  │
│  │ ─────────────────────────────────────────────────────────────────────│  │
│  │ Total:                                                       €676,50  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                               [Recusar]  [Aprovar]                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Código a Alterar

### 1. Actualizar imports (linha 4-16)

Remover imports não usados:
```typescript
import {
  Printer,
  Check,
  X,
  ArrowRight,
  ShoppingCart,
} from 'lucide-react';
```

### 2. Remover secções do JSX (linha 180-343)

Manter apenas:
- Secção "Artigos do Orçamento" (actualizada sem coluna Ref.)
- Secção "Resumo Financeiro"

### 3. Actualizar tabela de artigos (linha 253-289)

Nova estrutura com 6 colunas (sem Ref.):
```tsx
<table className="w-full text-xs">
  <thead>
    <tr className="border-b">
      <th className="text-left py-1.5 font-medium">Artigo</th>
      <th className="text-left py-1.5 font-medium">Descrição</th>
      <th className="text-center py-1.5 font-medium">Qtd</th>
      <th className="text-right py-1.5 font-medium">Valor (€)</th>
      <th className="text-center py-1.5 font-medium">Imposto</th>
      <th className="text-right py-1.5 font-medium">Subtotal (€)</th>
    </tr>
  </thead>
  <tbody>
    {pricingDetails.items.map((item, index) => {
      const lineSubtotal = item.qty * item.price;
      const lineTax = lineSubtotal * (item.tax / 100);
      const lineTotal = lineSubtotal + lineTax;
      
      return (
        <tr key={index} className="border-b last:border-0">
          <td className="py-1.5 font-medium">{item.description}</td>
          <td className="py-1.5 text-muted-foreground">
            {item.details || '-'}
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
```

---

## Resultado Final

O painel lateral será agora coerente com o modal de criação:
- Mostra apenas os artigos registados
- Cálculos de Subtotal, Desconto, IVA e Total
- Acções de aprovação/recusa/conversão

Todas as secções removidas (Cliente, Aparelho, Avaria, Notas) deixam de aparecer porque o modal simplificado não regista esses dados.

---

## Ficheiros a Alterar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/shared/BudgetDetailPanel.tsx` | Simplificar - remover secções de Cliente, Aparelho, Avaria, Notas |
