
# Plano: Alinhamento do Sistema com o Documento Tecnico de Permissoes e Estados

## Resumo da Analise

Apos analise detalhada do codigo actual vs. a documentacao tecnica fornecida, identifiquei **discrepancias criticas** que precisam de correcao para garantir a integridade do sistema.

---

## Discrepancias Identificadas

### 1. CRITICO: "Reparar no Local" Viola Regra de Localizacao

**Documentacao (Regra):**
> "Servicos com service_location === 'cliente' NUNCA podem ter status 'concluidos'. O estado 'concluidos' e EXCLUSIVO para servicos com service_location === 'oficina'."

**Implementacao Actual (VisitFlowModals.tsx, linhas 114-121):**
```typescript
if (formData.decision === 'reparar_local') {
  await updateService.mutateAsync({
    id: service.id,
    status: 'concluidos',  // ERRO: location ainda e 'cliente'
    pending_pricing: true,
    detected_fault: formData.detectedFault,
  });
}
```

**Problema:** O servico fica com `status='concluidos'` MAS `service_location='cliente'`, violando a regra de negocio.

**Correcao Proposta:** Servicos reparados no local do cliente devem transitar para `a_precificar` (aguardam preco) e nao para `concluidos`:
```typescript
if (formData.decision === 'reparar_local') {
  await updateService.mutateAsync({
    id: service.id,
    status: 'a_precificar',  // CORRIGIDO
    pending_pricing: true,
    detected_fault: formData.detectedFault,
    work_performed: 'Reparado no local do cliente',
  });
}
```

---

### 2. Falta Estado de Transicao: Peca Pedida → Em Espera

**Documentacao:**
> "para_pedir_peca: Confirmacao do pedido de peca (Modal PartRequestModal) → em_espera_de_peca"

**Implementacao Actual (StateActionButtons.tsx, linhas 110-119):**
```typescript
case 'para_pedir_peca':
  if (isDono && onMarkPartArrived) {
    return {
      label: 'Registar Pedido',  // CORRECTO
      ...
    };
  }
```

**Problema:** A acao "Registar Pedido" existe, mas nao ha implementacao do modal `PartRequestModal` para o Dono confirmar o pedido e mover para `em_espera_de_peca`.

**Correcao Proposta:** Implementar logica no `onMarkPartArrived`:
- Se `status === 'para_pedir_peca'` → Mover para `em_espera_de_peca`
- Se `status === 'em_espera_de_peca'` → Mover para `em_execucao` (peca chegou)

---

### 3. RegisterPaymentModal: Status Apos Pagamento Total

**Documentacao:**
> "Se final_price <= amount_paid, vai para finalizado."

**Implementacao Actual (RegisterPaymentModal.tsx, linha 88):**
```typescript
status: isPaidOff ? 'concluidos' : 'em_debito',
```

**Problema:** Quando pago totalmente, volta para `concluidos` em vez de `finalizado`.

**Analise Adicional:** Este comportamento pode ser intencional se o servico ainda estiver na oficina aguardando entrega. A transicao para `finalizado` deve ocorrer apenas quando:
1. Pagamento completo **E**
2. Entrega efectuada (cliente recolheu ou tecnico entregou)

**Decisao:** Manter como esta, pois o documento indica que `finalizado` e o estado terminal apos entrega/recolha.

---

### 4. DeliveryManagementModal: Falta Transicao para Finalizado

**Documentacao:**
> "Botao 'Gerir Entrega' (Cliente vem buscar) → status 'finalizado', define Service.pickup_date"

**Implementacao Actual (DeliveryManagementModal.tsx, linha 32-35):**
```typescript
await updateService.mutateAsync({
  id: service.id,
  delivery_method: 'client_pickup',
  // FALTA: pickup_date e transicao para finalizado
});
```

**Problema:** Definir `client_pickup` nao finaliza o servico automaticamente. O `Dar Baixa` em SecretaryConcluidosPage faz isso correctamente.

**Analise:** O fluxo actual esta correcto:
1. `Gerir Entrega` → Define metodo (client_pickup ou technician_delivery)
2. `Dar Baixa` (separadamente) → Finaliza o servico quando cliente recolhe

Nenhuma correcao necessaria, mas deve ser documentado claramente na UI.

---

### 5. Falta Guardar `last_status_before_part_request`

**Documentacao:**
> "em_espera_de_peca: O status anterior e guardado em last_status_before_part_request. Peca Recebida → restaura last_status_before_part_request."

**Implementacao Actual:** O campo `last_status_before_part_request` nao existe na tabela `services` nem na logica.

**Correcao Proposta:** 
1. Adicionar coluna `last_status_before_part_request` na tabela `services`
2. Ao transitar para `para_pedir_peca`, guardar o status actual
3. Ao receber a peca, restaurar para o status guardado

---

### 6. StateActionButtons: Falta Acao "Finalizar Servico" Completa

**Documentacao:**
> "Botao 'Finalizar Servico' estara disabled se isServicePriced === false ou isServiceInDebit === true."

**Implementacao Actual (StateActionButtons.tsx, linhas 257-263):**
```typescript
{canBeFinalized && (isDono || isSecretaria) && onFinalize && (
  <DropdownMenuItem onClick={onFinalize}>
    <CheckCircle className="h-4 w-4 mr-2" />
    Finalizar Serviço
  </DropdownMenuItem>
)}
```

**Problema:** A acao existe no dropdown, mas a funcao `onFinalize` nao esta implementada nas paginas que usam o componente.

---

## Ficheiros a Modificar

| Ficheiro | Alteracao |
|----------|-----------|
| `src/components/technician/VisitFlowModals.tsx` | Corrigir "Reparar no Local" para `a_precificar` |
| `src/components/services/StateActionButtons.tsx` | Melhorar logica de transicoes de pecas |
| `src/pages/GeralPage.tsx` | Implementar handlers para todas as acoes |
| `src/components/modals/RequestPartModal.tsx` | Implementar logica de transicao completa |

---

## Diagrama de Fluxo Corrigido

```text
VISITA NO CLIENTE
       │
       ├─── "Reparar no Local"
       │         │
       │         └──► status = 'a_precificar' (CORRIGIDO)
       │              pending_pricing = true
       │              service_location = 'cliente' (mantém)
       │                    │
       │                    ▼
       │              Dono define preco
       │                    │
       │              ┌─────┴─────┐
       │              ▼           ▼
       │         em_debito    finalizado
       │              │           │
       │              ▼           │
       │         Pagamento       │
       │         completo        │
       │              │           │
       │              └─────┬─────┘
       │                    ▼
       │              finalizado
       │
       ├─── "Levantar para Oficina"
       │         │
       │         └──► status = 'na_oficina'
       │              service_location = 'oficina'
       │              pickup_signature_url = [assinatura]
       │                    │
       │                    ▼
       │              FLUXO OFICINA
       │                    │
       │              ┌─────┴─────┐
       │              ▼           ▼
       │         Pedir Peca    Concluir
       │              │           │
       │              ▼           ▼
       │         para_pedir_peca  │
       │              │           │
       │              ▼           │
       │         Dono regista     │
       │         pedido           │
       │              │           │
       │              ▼           │
       │         em_espera_peca   │
       │              │           │
       │              ▼           │
       │         Peca chegou      │
       │              │           │
       │              ▼           │
       │         em_execucao ◄────┘
       │              │
       │              ▼
       │         concluidos (location=oficina OK)
       │              │
       │              ▼
       │         Gerir Entrega
       │              │
       │         ┌────┴────┐
       │         ▼         ▼
       │    Tecnico    Cliente
       │    Entrega    Recolhe
       │         │         │
       │         ▼         ▼
       │    Entrega    Dar Baixa
       │    Flow          │
       │         │         │
       │         └────┬────┘
       │              ▼
       │         finalizado
       │
       └─── "Pedir Peça"
                 │
                 └──► status = 'para_pedir_peca'
                      (mesma logica acima)
```

---

## Seccao Tecnica: Alteracoes Detalhadas

### Alteracao 1: VisitFlowModals.tsx (Linhas 114-121)

**De:**
```typescript
if (formData.decision === 'reparar_local') {
  await updateService.mutateAsync({
    id: service.id,
    status: 'concluidos',
    pending_pricing: true,
    detected_fault: formData.detectedFault,
  });
  toast.success('Visita concluída! Aguarda precificação.');
}
```

**Para:**
```typescript
if (formData.decision === 'reparar_local') {
  await updateService.mutateAsync({
    id: service.id,
    status: 'a_precificar',
    pending_pricing: true,
    detected_fault: formData.detectedFault,
    work_performed: 'Reparado no local do cliente',
  });
  toast.success('Visita concluída! Aguarda precificação pelo Dono.');
}
```

### Alteracao 2: SetPriceModal.tsx (Linha 52)

Quando o preco e definido para um servico com `service_location === 'cliente'`, deve ir directamente para `finalizado` ou `em_debito` (sem passar por `concluidos`):

**De:**
```typescript
status: finalPrice > (service.amount_paid || 0) ? 'em_debito' : 'concluidos',
```

**Para:**
```typescript
// Para servicos no cliente, vai para finalizado/em_debito
// Para servicos na oficina, vai para concluidos/em_debito
const isClientLocation = service.service_location === 'cliente';
const hasDebt = finalPrice > (service.amount_paid || 0);

let newStatus: string;
if (hasDebt) {
  newStatus = 'em_debito';
} else if (isClientLocation) {
  newStatus = 'finalizado'; // Cliente: sem entrega necessaria
} else {
  newStatus = 'concluidos'; // Oficina: aguarda entrega
}
```

### Alteracao 3: StateActionButtons.tsx

Adicionar condicao para mostrar "Definir Preco" em `a_precificar`:

```typescript
case 'a_precificar':
  if (isDono && onSetPrice) {
    return {
      label: 'Definir Preço',
      icon: DollarSign,
      onClick: onSetPrice,
      className: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    };
  }
  return null;
```

---

## Tabela de Transicoes Corrigida

| Status Actual | Acao | Condicao | Novo Status |
|---------------|------|----------|-------------|
| `por_fazer` | Atribuir Tecnico | Dono/Secretaria | `por_fazer` (tecnico atribuido) |
| `por_fazer` | Iniciar | Tecnico, location=cliente | `em_execucao` |
| `por_fazer` | Assumir | Tecnico, location=oficina | `na_oficina` |
| `em_execucao` | Reparar no Local | Tecnico, location=cliente | `a_precificar` |
| `em_execucao` | Levantar Oficina | Tecnico, location=cliente | `na_oficina` |
| `em_execucao` | Pedir Peca | Tecnico | `para_pedir_peca` |
| `na_oficina` | Comecar | Tecnico | `em_execucao` |
| `para_pedir_peca` | Registar Pedido | Dono | `em_espera_de_peca` |
| `em_espera_de_peca` | Peca Chegou | Dono | `em_execucao` |
| `em_execucao` (oficina) | Concluir | Tecnico | `concluidos` |
| `a_precificar` | Definir Preco | Dono | `em_debito` ou `finalizado` |
| `concluidos` | Definir Preco | Dono (se !priced) | `em_debito` ou `concluidos` |
| `concluidos` | Gerir Entrega | Dono/Secretaria, loc=oficina | `concluidos` (delivery_method set) |
| `concluidos` | Dar Baixa | Dono/Secretaria, client_pickup | `finalizado` |
| `em_debito` | Registar Pagamento | Dono/Secretaria | `em_debito` ou `concluidos` |
| Instalacao | Concluir | Tecnico + assinatura | `finalizado` |
| Entrega | Concluir | Tecnico + assinatura | `finalizado` |

---

## Conclusao

Este plano alinha a implementacao actual com o documento tecnico original, corrigindo a violacao critica da regra de localizacao e garantindo que:

1. Servicos reparados no cliente vao para `a_precificar` (nao `concluidos`)
2. O estado `concluidos` e exclusivo para servicos na oficina
3. A precificacao de servicos no cliente leva directamente a `finalizado` ou `em_debito`
4. Todas as transicoes respeitam as regras de permissao por role
