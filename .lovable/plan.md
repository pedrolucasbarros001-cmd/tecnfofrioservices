

# Plano: Melhorias na Ficha de Impressão, Consulta de QR Code, Canvas de Assinatura e Modal de Peças

## Resumo das Alterações Solicitadas

1. **Ficha de Impressão (PDF/Print)**: Adicionar dados da empresa no cabeçalho (morada, telefone, email)
2. **Mostrar IVA na Ficha**: Quando aplicável, exibir o IVA no resumo financeiro
3. **Página de Consulta QR Code**: Redesenhar para mostrar status do serviço relevante para o cliente
4. **Canvas de Assinatura**: Simplificar para corrigir bug ao assinar com o dedo
5. **Modal Pedir Peça (Admin)**: Remover seleção manual de data, fixar **5 dias úteis** automáticos com indicador de cor

---

## Dados da Empresa (Conforme Imagens)

- **Morada**: R. Dom Pedro IV 3 R/C, Bairro da Coxa, 5300-124 Bragança
- **Telefone**: 273 332 772
- **Email**: tecno.frio@sapo.pt

---

## Ficheiros a Alterar

| Ficheiro | Ação | Descrição |
|----------|------|-----------|
| `src/utils/companyInfo.ts` | Criar | Constantes da empresa |
| `src/utils/dateUtils.ts` | Criar | Função para calcular dias úteis |
| `src/pages/ServicePrintPage.tsx` | Alterar | Adicionar header com dados da empresa + mostrar IVA |
| `src/pages/ServiceConsultPage.tsx` | Reformular | Redesenhar para cliente final (status-focused) |
| `src/components/shared/SignatureCanvas.tsx` | Simplificar | Corrigir bug de touch com implementação mais robusta |
| `src/components/modals/ConfirmPartOrderModal.tsx` | Simplificar | Remover opções de data, fixar 5 dias úteis automáticos |
| `src/components/shared/PartArrivalIndicator.tsx` | Ajustar | Atualizar cores para verde/amarelo/laranja/vermelho baseado em dias úteis |

---

## Detalhes por Ficheiro

### 1. dateUtils.ts - Função para Calcular Dias Úteis

Nova função para adicionar dias úteis (excluindo sábados e domingos):

```typescript
// src/utils/dateUtils.ts

/**
 * Adiciona dias úteis a uma data (exclui sábados e domingos)
 */
export function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let addedDays = 0;
  
  while (addedDays < days) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    // 0 = Domingo, 6 = Sábado
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      addedDays++;
    }
  }
  
  return result;
}

/**
 * Calcula dias úteis restantes até uma data
 */
export function getBusinessDaysRemaining(targetDate: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  
  if (target <= today) {
    // Calcula dias úteis atrasados (negativo)
    let days = 0;
    const current = new Date(target);
    while (current < today) {
      current.setDate(current.getDate() + 1);
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        days--;
      }
    }
    return days;
  }
  
  // Calcula dias úteis restantes (positivo)
  let days = 0;
  const current = new Date(today);
  while (current < target) {
    current.setDate(current.getDate() + 1);
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      days++;
    }
  }
  return days;
}
```

---

### 2. ServicePrintPage.tsx - Cabeçalho da Empresa + IVA

**Novo Header**:
```text
┌────────────────────────────────────────────────────────────────┐
│  [LOGO TECNOFRIO]                          Ficha de Serviço    │
├────────────────────────────────────────────────────────────────┤
│  📍 R. Dom Pedro IV 3 R/C, Bairro da Coxa, 5300-124 Bragança   │
│  📞 273 332 772  |  ✉️ tecno.frio@sapo.pt                       │
└────────────────────────────────────────────────────────────────┘
```

**IVA no Resumo Financeiro**:
```
Subtotal (s/ IVA):     €1.234,56
IVA:                    €284,00     ← Nova linha (quando > 0)
Desconto:               -€50,00
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL:                €1.468,56
```

---

### 3. ServiceConsultPage.tsx - Redesenhar para Cliente Final

Página focada no status do serviço para o cliente que lê o QR Code:

**Informação a MANTER**:
- Código do serviço
- Estado atual (com descrição amigável)
- Equipamento (tipo, marca, modelo)
- Data de entrada
- Localização (Cliente/Oficina)
- Valor a pagar (se definido)
- Contactos da empresa

**Descrições Amigáveis por Estado**:
```typescript
const STATUS_CLIENT_MESSAGES = {
  por_fazer: 'O seu serviço está na fila de espera para agendamento.',
  em_execucao: 'O técnico está a trabalhar no seu equipamento.',
  na_oficina: 'O seu equipamento está na nossa oficina para diagnóstico.',
  para_pedir_peca: 'Estamos a providenciar peças necessárias para a reparação.',
  em_espera_de_peca: 'A aguardar chegada de peças encomendadas.',
  a_precificar: 'A reparação foi concluída. Estamos a calcular o valor final.',
  concluidos: 'Reparação concluída! O seu equipamento está pronto para levantamento.',
  em_debito: 'Serviço concluído. Aguardamos o pagamento.',
  finalizado: 'Serviço concluído e entregue. Obrigado pela preferência!',
};
```

---

### 4. SignatureCanvas.tsx - Simplificar e Corrigir Bug Touch

**Solução**: Implementação mais robusta com API Pointer unificada:

```typescript
// Usar Pointer API unificada (funciona para touch e mouse)
onPointerDown={handlePointerDown}
onPointerMove={handlePointerMove}
onPointerUp={handlePointerUp}
onPointerLeave={handlePointerUp}

// Usar setPointerCapture para manter tracking
// Usar offsetX/offsetY para coordenadas precisas
// Remover scaling 2x do canvas
```

---

### 5. ConfirmPartOrderModal.tsx - Simplificar com 5 Dias Úteis

**Antes**: Permite escolher entre 3 dias, 1 semana, 2 semanas ou data específica

**Depois**: Automático **5 dias úteis** fixos, sem opção manual

**Nova Interface**:
```text
┌────────────────────────────────────────────────────────────────┐
│  📦 Registar Pedido de Peça                                    │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  TF-00123                                                      │
│  Frigorífico Samsung RT38K                                     │
│                                                                │
│  Peças Solicitadas                                             │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Compressor                                      x1     │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                │
│  ℹ️ Previsão de Chegada: 5 dias úteis (dd/MM/yyyy)             │
│     Esta previsão serve como termómetro para o indicador       │
│     de urgência quando em "Espera de Peça".                    │
│                                                                │
│  Fornecedor                                                    │
│  [___________________________]                                 │
│                                                                │
│  Custo da Peça (€)                                             │
│  [___________________________]                                 │
│                                                                │
│  Notas                                                         │
│  [___________________________]                                 │
│                                                                │
│                         [Cancelar]  [Confirmar Pedido]         │
└────────────────────────────────────────────────────────────────┘
```

**Lógica de Cálculo**:
```typescript
import { addBusinessDays } from '@/utils/dateUtils';

// Ao confirmar, calcular data de chegada
const getEstimatedArrivalDate = (): string => {
  const arrivalDate = addBusinessDays(new Date(), 5);
  return format(arrivalDate, 'yyyy-MM-dd');
};
```

---

### 6. PartArrivalIndicator.tsx - Termómetro com Dias Úteis

**Atualizar para usar dias úteis e 4 níveis de cor**:

| Dias Úteis Restantes | Cor | Label |
|----------------------|-----|-------|
| ≥ 4 dias úteis | 🟢 Verde | "Chega em X dias úteis" |
| 2-3 dias úteis | 🟡 Amarelo | "Chega em X dias úteis" |
| 1 dia útil | 🟠 Laranja | "Chega amanhã" |
| 0 ou atrasada | 🔴 Vermelho | "Chega hoje" / "Atrasada X dias úteis" |

**Código atualizado**:
```typescript
import { getBusinessDaysRemaining } from '@/utils/dateUtils';

const getIndicatorConfig = () => {
  const businessDaysRemaining = getBusinessDaysRemaining(arrival);
  
  if (businessDaysRemaining < 0) {
    // Atrasada - Vermelho
    return { 
      color: 'bg-red-500', 
      textColor: 'text-red-600',
      label: `Atrasada ${Math.abs(businessDaysRemaining)} dia${Math.abs(businessDaysRemaining) !== 1 ? 's úteis' : ' útil'}`,
    };
  }
  if (businessDaysRemaining === 0) {
    // Chega hoje - Vermelho
    return { color: 'bg-red-500', textColor: 'text-red-600', label: 'Chega hoje' };
  }
  if (businessDaysRemaining === 1) {
    // Chega amanhã - Laranja
    return { color: 'bg-orange-500', textColor: 'text-orange-600', label: 'Chega amanhã' };
  }
  if (businessDaysRemaining <= 3) {
    // 2-3 dias - Amarelo
    return { 
      color: 'bg-yellow-400', 
      textColor: 'text-yellow-600',
      label: `Chega em ${businessDaysRemaining} dias úteis`,
    };
  }
  // 4+ dias - Verde
  return { 
    color: 'bg-green-500', 
    textColor: 'text-green-600',
    label: `Chega em ${businessDaysRemaining} dias úteis`,
  };
};
```

---

## Resumo de Alterações

| Ficheiro | Tipo | Descrição |
|----------|------|-----------|
| `src/utils/companyInfo.ts` | Criar | Constantes da empresa |
| `src/utils/dateUtils.ts` | Criar | Funções para dias úteis |
| `src/pages/ServicePrintPage.tsx` | Alterar | Header + IVA |
| `src/pages/ServiceConsultPage.tsx` | Reformular | Página cliente QR |
| `src/components/shared/SignatureCanvas.tsx` | Simplificar | Corrigir bug touch |
| `src/components/modals/ConfirmPartOrderModal.tsx` | Simplificar | 5 dias úteis automáticos |
| `src/components/shared/PartArrivalIndicator.tsx` | Ajustar | Termómetro dias úteis |

**Total: 7 ficheiros**

---

## Resultado Esperado

1. **Ficha de Serviço**: Cabeçalho profissional com dados da empresa + IVA visível
2. **Consulta QR**: Página limpa e focada para o cliente ver apenas o seu status
3. **Assinatura**: Funciona corretamente em dispositivos móveis com touch
4. **Pedido Peça**: Interface simplificada com **5 dias úteis** automáticos
5. **Indicador**: Termómetro visual com 4 níveis de cor baseado em **dias úteis restantes**

