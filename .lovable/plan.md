
# Plano: Melhorias no Sistema de Feedback e Encadeamento de Ações

## Resumo

Este plano implementa um sistema de feedback inteligente que:
1. Informa o utilizador sobre o novo estado do serviço após cada ação
2. Fornece contexto adicional relevante (ex: "Serviço já se encontra na oficina")
3. Sugere a próxima ação lógica no fluxo
4. Usa mensagens diferenciadas e descritivas ao invés de mensagens genéricas

## Situação Atual

Atualmente, as mensagens de sucesso são genéricas e não fornecem contexto:

| Ação | Mensagem Atual | Problema |
|------|---------------|----------|
| Atribuir técnico | "Serviço atualizado!" | Não indica o novo estado nem o técnico |
| Definir preço | "Preço definido: €X" | Não indica próximo passo |
| Registar pagamento | "Pagamento registado!" | Não indica se há saldo em aberto |
| Iniciar reparação | "Reparação iniciada!" | OK, mas pode ser melhor |
| Concluir reparação | "Reparação concluída!" | Não menciona precificação |

## Melhorias Propostas

### A) Mensagens Contextuais com Estado e Próxima Ação

Criar mensagens que informam:
1. O que aconteceu
2. O novo estado/localização do serviço
3. A próxima ação (quando aplicável)

#### Exemplos de Novas Mensagens:

| Ação | Nova Mensagem |
|------|--------------|
| Atribuir técnico (oficina) | "Técnico Pedro atribuído! Serviço na oficina, aguarda início." |
| Atribuir técnico (cliente) | "Técnico João agendado para 15/02, manhã." |
| Definir preço | "Preço definido: €150. Serviço pronto para entrega." |
| Pagamento parcial | "Pagamento de €50 registado. Em falta: €100." |
| Pagamento total | "Pagamento completo! Serviço sem débito." |
| Iniciar reparação | "Em execução! OS-00001 está a ser reparado." |
| Concluir (oficina) | "Concluído! Aguarda precificação pelo dono." |
| Pedir peça | "Peça 'Compressor' solicitada. Serviço em espera." |

### B) Hook Utilitário para Mensagens de Feedback

Criar um novo ficheiro com funções auxiliares para gerar mensagens contextuais:

**Novo Ficheiro**: `src/utils/feedbackMessages.ts`

```text
Funções a implementar:
- getAssignmentFeedback(service, techName, scheduledDate, shift)
- getPricingFeedback(service, price, isWarranty)
- getPaymentFeedback(amountPaid, remaining, total)
- getStatusChangeFeedback(service, oldStatus, newStatus)
- getPartRequestFeedback(partName, service)
- getDeliveryFeedback(service, method)
```

### C) Integração nos Modais Existentes

#### 1. AssignTechnicianModal.tsx
**Linha ~143**: Após sucesso, usar mensagem contextual

Antes:
```typescript
// (sem toast específico - usa o genérico do hook)
```

Depois:
```typescript
const techName = selectedTech?.profile?.full_name || 'Técnico';
const dateStr = format(values.scheduled_date, "dd/MM");
const shiftLabel = values.scheduled_shift === 'manha' ? 'manhã' : 
                   values.scheduled_shift === 'tarde' ? 'tarde' : 'noite';

if (service.service_location === 'oficina') {
  toast.success(`${techName} atribuído! Serviço na oficina, aguarda início.`);
} else {
  toast.success(`${techName} agendado para ${dateStr}, ${shiftLabel}.`);
}
```

#### 2. SetPriceModal.tsx
**Linha ~97-100**: Melhorar mensagem com próximo passo

Antes:
```typescript
toast.success(warrantyCoversAll 
  ? 'Serviço de garantia registado - sem cobrança ao cliente!' 
  : `Preço definido: €${finalPrice.toFixed(2)}`
);
```

Depois:
```typescript
if (warrantyCoversAll) {
  toast.success('Garantia aplicada! Serviço sem custo para o cliente.');
} else {
  const nextStep = service.service_location === 'oficina' 
    ? 'Pronto para entrega.' 
    : 'Serviço concluído.';
  toast.success(`Preço definido: €${finalPrice.toFixed(2)}. ${nextStep}`);
}
```

#### 3. RegisterPaymentModal.tsx
**Linha ~106**: Indicar saldo restante ou confirmação de quitação

Antes:
```typescript
toast.success('Pagamento registado com sucesso!');
```

Depois:
```typescript
if (newBalance > 0) {
  toast.success(`Pagamento de €${paymentValue.toFixed(2)} registado. Em falta: €${newBalance.toFixed(2)}`);
} else {
  toast.success(`Pagamento completo! ${service.code} sem débito.`);
}
```

#### 4. WorkshopFlowModals.tsx
**Linha ~91, ~115, ~126**: Mensagens mais descritivas

Antes:
```typescript
toast.success('Reparação iniciada!');
toast.success('Pedido de peça registado!');
toast.success('Reparação concluída! Aguarda precificação.');
```

Depois:
```typescript
toast.success(`Em execução! ${service.code} está a ser reparado.`);
toast.success(`Peça solicitada! ${service.code} aguarda aprovação do dono.`);
toast.success(`${service.code} concluído! Aguarda precificação pelo dono.`);
```

#### 5. RequestPartModal.tsx
**Linha ~95**: Indicar que o serviço está em espera

Antes:
```typescript
toast.success('Peça solicitada com sucesso!');
```

Depois:
```typescript
toast.success(`Peça "${partName}" solicitada! ${service.code} em espera de aprovação.`);
```

#### 6. DeliveryManagementModal.tsx
**Linha ~37**: Confirmar opção escolhida

Antes:
```typescript
toast.success('Serviço marcado para recolha pelo cliente');
```

Depois:
```typescript
toast.success(`Recolha pelo cliente definida! Notificar ${service.customer?.name || 'cliente'}.`);
```

#### 7. ForceStateModal.tsx
**Linha ~40-42**: Mostrar transição de estado

Antes:
```typescript
// (sem toast específico)
```

Depois:
```typescript
const oldLabel = SERVICE_STATUS_CONFIG[service.status]?.label;
const newLabel = SERVICE_STATUS_CONFIG[selectedStatus]?.label;
toast.warning(`Estado forçado: ${oldLabel} → ${newLabel}`);
```

### D) Hook useUpdateService com Mensagens Contextuais

Modificar o hook para aceitar uma mensagem customizada (opcional):

**Ficheiro**: `src/hooks/useServices.ts`

Alterar `useUpdateService` para receber um parâmetro opcional de mensagem:

```typescript
export function useUpdateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, customMessage, ...updates }: 
      Partial<Service> & { id: string; customMessage?: string }) => {
      const { data, error } = await supabase
        .from('services')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, customMessage };
    },
    onSuccess: ({ customMessage }) => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      // Apenas mostrar toast genérico se não houver mensagem custom
      if (!customMessage) {
        toast.success('Serviço atualizado!');
      }
      // Mensagem custom é mostrada no local que chamou
    },
    onError: (error) => {
      console.error('Error updating service:', error);
      toast.error('Erro ao atualizar serviço');
    },
  });
}
```

### E) Melhorar ServiceDetailSheet com Toasts Contextuais

**Ficheiro**: `src/components/services/ServiceDetailSheet.tsx`

Melhorar os toasts nas ações internas (finalizar, confirmar peça, etc.):

```typescript
// Finalizar serviço
toast.success(`${service.code} finalizado com sucesso!`);

// Confirmar pedido de peça
toast.success(`Pedido confirmado! ${service.code} em espera de peça.`);

// Peça chegou
toast.success(`Peça chegou! ${service.code} pronto para continuar.`);
```

## Ficheiros a Alterar

| Ficheiro | Alteração | Prioridade |
|----------|-----------|------------|
| `src/utils/feedbackMessages.ts` | **NOVO** - Funções auxiliares de mensagens | ALTA |
| `src/hooks/useServices.ts` | Suporte a customMessage no update | ALTA |
| `src/components/modals/AssignTechnicianModal.tsx` | Mensagem contextual de atribuição | ALTA |
| `src/components/modals/SetPriceModal.tsx` | Mensagem com próximo passo | ALTA |
| `src/components/modals/RegisterPaymentModal.tsx` | Indicar saldo restante | ALTA |
| `src/components/technician/WorkshopFlowModals.tsx` | Mensagens mais claras | MÉDIA |
| `src/components/modals/RequestPartModal.tsx` | Indicar estado de espera | MÉDIA |
| `src/components/modals/DeliveryManagementModal.tsx` | Confirmar método de entrega | MÉDIA |
| `src/components/modals/ForceStateModal.tsx` | Mostrar transição (warning) | MÉDIA |
| `src/components/services/ServiceDetailSheet.tsx` | Mensagens contextuais | MÉDIA |

## Estrutura do Ficheiro feedbackMessages.ts

```text
src/utils/feedbackMessages.ts

Exportações:
├── getAssignmentMessage(service, techName, date, shift)
│   └── Retorna: "Pedro atribuído! Serviço na oficina, aguarda início."
│
├── getPricingMessage(price, isWarranty, location)
│   └── Retorna: "Preço €150 definido. Pronto para entrega."
│
├── getPaymentMessage(paid, remaining, serviceCode)
│   └── Retorna: "€50 registado. Em falta: €100." ou "Pagamento completo!"
│
├── getPartRequestMessage(partName, serviceCode)
│   └── Retorna: "Peça 'Compressor' solicitada! OS-001 aguarda aprovação."
│
├── getStatusTransitionMessage(from, to, serviceCode)
│   └── Retorna: "OS-001: Por Fazer → Em Execução"
│
└── getDeliveryMessage(method, customerName)
    └── Retorna: "Recolha definida! Notificar João Silva."
```

## Resultado Esperado

| Cenário | Antes | Depois |
|---------|-------|--------|
| Atribuir técnico oficina | "Serviço atualizado!" | "Pedro atribuído! Serviço na oficina." |
| Atribuir técnico cliente | "Serviço atualizado!" | "Pedro agendado para 15/02, manhã." |
| Definir preço €150 | "Preço definido: €150" | "Preço €150 definido. Pronto para entrega." |
| Pagamento parcial €50 | "Pagamento registado!" | "€50 registado. Em falta: €100." |
| Pagamento total | "Pagamento registado!" | "Pagamento completo! OS-001 sem débito." |
| Iniciar reparação | "Reparação iniciada!" | "Em execução! OS-001 está a ser reparado." |
| Pedir peça | "Peça solicitada!" | "Peça 'Compressor' solicitada! Aguarda aprovação." |
| Forçar estado | (sem toast) | "Estado forçado: Por Fazer → Em Execução" |

## Validação

1. **Atribuição de técnico**:
   - Na oficina: Mensagem indica "na oficina, aguarda início"
   - No cliente: Mensagem indica data e turno agendado

2. **Precificação**:
   - Oficina: Indica "pronto para entrega"
   - Cliente: Indica "serviço concluído"
   - Garantia: Indica "sem custo para cliente"

3. **Pagamentos**:
   - Parcial: Mostra valor pago e em falta
   - Total: Confirma "sem débito"

4. **Fluxo de peças**:
   - Solicitação: Indica nome da peça e espera de aprovação
   - Chegada: Indica que pode continuar

5. **Forçar estado**:
   - Toast amarelo (warning) mostrando transição
