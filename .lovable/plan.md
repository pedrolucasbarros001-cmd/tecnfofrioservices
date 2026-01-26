

# Plano: Ajustar Modais de Definir Preco e Registar Pagamento

## Resumo das Alteracoes

Ajustar ambos os modais para corresponder ao design exato das imagens de referencia, incluindo:

1. **SetPriceModal**: Titulo com codigo do servico, campos alinhados, box de resumo com subtotal/total
2. **RegisterPaymentModal**: Titulo com codigo do servico, box de resumo financeiro, campos reorganizados

---

## 1. SetPriceModal - "Definir Preco - TF-XXXXX"

### 1.1 Alteracoes no Design

| Elemento Atual | Novo Design (conforme imagem) |
|----------------|-------------------------------|
| Titulo: "Precificar Servico" com icone | "Definir Preco - TF-XXXXX" (sem icone) |
| Box de info do servico | Removido (codigo ja esta no titulo) |
| Labels com "(€)" | Labels com "(€) *" para campos obrigatorios |
| Resumo simples | Box azul claro com Subtotal + Total separados |
| Botao verde "Guardar Preco" | Botao violeta "Confirmar Preco" |

### 1.2 Layout do Modal

```text
┌─────────────────────────────────────────────┐
│ Definir Preco - TF-000001              [X]  │
├─────────────────────────────────────────────┤
│                                             │
│ Mao de Obra (€) *                           │
│ ┌─────────────────────────────────────┐     │
│ │                                   ↕ │     │
│ └─────────────────────────────────────┘     │
│                                             │
│ Pecas (€) *                                 │
│ ┌─────────────────────────────────────┐     │
│ │                                   ↕ │     │
│ └─────────────────────────────────────┘     │
│                                             │
│ Desconto (€)                                │
│ ┌─────────────────────────────────────┐     │
│ │ 0                                 ↕ │     │
│ └─────────────────────────────────────┘     │
│                                             │
│ ┌───────────────────────────────────────┐   │
│ │ Subtotal:                     €0.00   │   │
│ │ ─────────────────────────────────────│   │
│ │ Total:                        €0.00   │   │
│ └───────────────────────────────────────┘   │
│                                             │
│        [Cancelar]  [Confirmar Preco]        │
└─────────────────────────────────────────────┘
```

### 1.3 Estilos Especificos

- Box de resumo: `bg-violet-50 border border-violet-100 rounded-lg`
- Total: texto violeta bold (`text-violet-600 font-bold`)
- Botao principal: violeta (`bg-violet-600 hover:bg-violet-700`)

---

## 2. RegisterPaymentModal - "Registar Pagamento - TF-XXXXX"

### 2.1 Alteracoes no Design

| Elemento Atual | Novo Design (conforme imagem) |
|----------------|-------------------------------|
| Titulo com icone CreditCard | "Registar Pagamento - TF-XXXXX" (sem icone) |
| Box info servico + grid 3 colunas | Box unico com layout vertical (Valor Total, Ja Pago, Em Falta) |
| Label "Valor do Pagamento (€)" | "Valor a Pagar (€) *" com placeholder "Max: €XXX.XX" |
| Label "Descricao (opcional)" | "Descricao (Opcional)" |
| Ordem: Valor, Metodo, Data, Descricao | Ordem: Metodo, Valor, Descricao, Data |
| Botao laranja | Botao verde "Confirmar Pagamento" |

### 2.2 Layout do Modal

```text
┌─────────────────────────────────────────────┐
│ Registar Pagamento - TF-000001         [X]  │
├─────────────────────────────────────────────┤
│                                             │
│ ┌───────────────────────────────────────┐   │
│ │ Valor Total:                  €150.00 │   │
│ │ Ja Pago:                       €0.00  │   │ (verde)
│ │ Em Falta:                    €150.00  │   │ (vermelho bold)
│ └───────────────────────────────────────┘   │
│                                             │
│ Metodo de Pagamento *                       │
│ ┌─────────────────────────────────────┐     │
│ │ Dinheiro                          ▼ │     │
│ └─────────────────────────────────────┘     │
│                                             │
│ Valor a Pagar (€) *                         │
│ ┌─────────────────────────────────────┐     │
│ │ Max: €150.00                      ↕ │     │
│ └─────────────────────────────────────┘     │
│                                             │
│ Descricao (Opcional)                        │
│ ┌─────────────────────────────────────┐     │
│ │ Ex: Pagamento parcial               │     │
│ └─────────────────────────────────────┘     │
│                                             │
│ Data do Pagamento *                         │
│ ┌─────────────────────────────────────┐     │
│ │ 25/01/2026                          │     │
│ └─────────────────────────────────────┘     │
│                                             │
│      [Cancelar]  [Confirmar Pagamento]      │
└─────────────────────────────────────────────┘
```

### 2.3 Estilos Especificos

- Box resumo: `bg-green-50 border border-green-100 rounded-lg`
- "Ja Pago": texto verde (`text-green-600`)
- "Em Falta": texto vermelho bold (`text-red-600 font-bold`)
- Botao principal: verde (`bg-green-600 hover:bg-green-700`)

---

## 3. Funcionalidade de Calculos Multiplos

O sistema de pagamentos ja suporta multiplos registos (tabela `service_payments`). As alteracoes visuais vao:

1. Mostrar `Ja Pago` = soma de todos os pagamentos anteriores (`service.amount_paid`)
2. Mostrar `Em Falta` = `final_price - amount_paid`
3. Placeholder do campo valor: "Max: €XXX.XX" mostrando o saldo restante
4. Apos cada pagamento:
   - Atualiza `amount_paid` no servico
   - Se `amount_paid >= final_price` → status muda para `concluidos`
   - Senao → mantem `em_debito`

---

## 4. Ficheiros a Modificar

| Ficheiro | Alteracao |
|----------|-----------|
| `src/components/modals/SetPriceModal.tsx` | Redesign completo do layout |
| `src/components/modals/RegisterPaymentModal.tsx` | Redesign completo do layout |

---

## 5. Seccao Tecnica

### 5.1 SetPriceModal.tsx - Novo Layout

```typescript
// Titulo dinamico com codigo do servico
<DialogTitle className="text-xl font-semibold">
  Definir Preco - {service?.code}
</DialogTitle>

// Box de resumo com estilo violeta
<div className="p-4 bg-violet-50 border border-violet-100 rounded-lg space-y-2">
  <div className="flex justify-between items-center text-sm">
    <span className="text-muted-foreground">Subtotal:</span>
    <span>€{(laborValue + partsValue).toFixed(2)}</span>
  </div>
  <div className="border-t border-violet-200" />
  <div className="flex justify-between items-center">
    <span className="font-semibold">Total:</span>
    <span className="text-violet-600 font-bold text-lg">
      €{finalPrice.toFixed(2)}
    </span>
  </div>
</div>

// Botao violeta
<Button className="bg-violet-600 hover:bg-violet-700">
  Confirmar Preco
</Button>
```

### 5.2 RegisterPaymentModal.tsx - Novo Layout

```typescript
// Titulo dinamico com codigo do servico
<DialogTitle className="text-xl font-semibold">
  Registar Pagamento - {service?.code}
</DialogTitle>

// Box de resumo financeiro com layout vertical
<div className="p-4 bg-green-50 border border-green-100 rounded-lg space-y-2">
  <div className="flex justify-between items-center">
    <span className="text-muted-foreground">Valor Total:</span>
    <span className="font-semibold">€{finalPrice.toFixed(2)}</span>
  </div>
  <div className="flex justify-between items-center">
    <span className="text-muted-foreground">Ja Pago:</span>
    <span className="text-green-600 font-semibold">
      €{amountPaid.toFixed(2)}
    </span>
  </div>
  <div className="flex justify-between items-center">
    <span className="text-red-600 font-semibold">Em Falta:</span>
    <span className="text-red-600 font-bold">
      €{remainingBalance.toFixed(2)}
    </span>
  </div>
</div>

// Campo de valor com placeholder dinamico
<Input
  placeholder={`Max: €${remainingBalance.toFixed(2)}`}
  ...
/>

// Botao verde
<Button className="bg-green-600 hover:bg-green-700">
  Confirmar Pagamento
</Button>
```

### 5.3 Ordem dos Campos no RegisterPaymentModal

Nova ordem:
1. Box de resumo financeiro
2. Metodo de Pagamento
3. Valor a Pagar
4. Descricao (Opcional)
5. Data do Pagamento

---

## 6. Validacoes

### SetPriceModal
- Mao de Obra: obrigatorio (minimo 0)
- Pecas: obrigatorio (minimo 0)
- Desconto: opcional (default 0)

### RegisterPaymentModal
- Metodo: obrigatorio
- Valor: obrigatorio, max = saldo restante
- Descricao: opcional
- Data: obrigatoria (default = hoje)

---

## 7. Resultado Esperado

1. **SetPriceModal**:
   - Titulo: "Definir Preco - TF-XXXXX"
   - Campos limpos com labels corretos
   - Box violeta com Subtotal e Total
   - Botao violeta "Confirmar Preco"

2. **RegisterPaymentModal**:
   - Titulo: "Registar Pagamento - TF-XXXXX"
   - Box verde com Valor Total, Ja Pago (verde), Em Falta (vermelho)
   - Campos na ordem correta
   - Placeholder com valor maximo
   - Botao verde "Confirmar Pagamento"
   - Suporta pagamentos parciais com calculo automatico

