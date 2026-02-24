
# Plano: Corrigir Erros nos Fluxos do Tecnico e Garantir Estabilidade

## Problemas Identificados

Apos analise detalhada do codigo, identifiquei 6 problemas concretos que causam erros, crashes e bloqueios no fluxo do tecnico.

### Problema 1: Entrega de Oficina -- Tecnico nao consegue iniciar (CRITICO)

Quando a secretaria atribui uma entrega via `AssignDeliveryModal`, o modal:
- Define `delivery_technician_id` (tecnico de entrega)
- Define `delivery_method`, `delivery_date`, `scheduled_shift`
- **NAO** define `technician_id` (campo usado pelo RPC)
- **NAO** muda o `service_type` para `entrega`
- **NAO** muda o `status` para `por_fazer`

Resultado: O tecnico de entrega nunca ve o servico na sua lista (ServicosPage filtra por `technician_id`), e mesmo que visse, o RPC `technician_update_service` recusa porque verifica `technician_id`, nao `delivery_technician_id`.

### Problema 2: DeliveryFlowModals -- Assinatura nao e idempotente (ERRO)

No `handleSignatureComplete`, a assinatura e inserida sem verificar se ja existe (linha 163). Se o tecnico clicar duas vezes ou a rede falhar no meio, insere duplicadas ou da erro.

Comparacao: `VisitFlowModals` JA faz a verificacao corretamente com `maybeSingle()` antes de inserir.

### Problema 3: WorkshopFlowModals -- Camera sem try/catch (CRASH)

O `onCapture` da camera (linhas 1009-1035) faz `await ensureValidSession()` e `await supabase.from("service_photos").insert(...)` diretamente sem try/catch. Se a sessao expirar ou falhar o upload, o erro nao e capturado e pode crashar a pagina.

### Problema 4: WorkshopFlowModals -- "confirmacao_peca" sem scroll (UI)

O dialog na linha 493 usa `className="max-w-md p-6"` sem `max-w-[95vw] max-h-[90vh] overflow-y-auto`, ao contrario de todos os outros dialogs do mesmo fluxo. Em telemoveis pequenos o conteudo fica cortado.

### Problema 5: DeliveryFlowModals -- Falta ensureValidSession na assinatura (ERRO)

No `handleSignatureComplete` (linha 161), chama `ensureValidSession()` mas NAO verifica a sessao antes do `updateService.mutateAsync` na linha 171. Se a sessao expirar entre a assinatura e a atualizacao, da erro de RLS.

### Problema 6: Falta de try/catch em handleStartRepair no workshop (CRASH)

A funcao `handleStartRepair` (linha 169) tem try/catch, mas no bloco `finally` faz `setIsSubmitting(false)` -- se o modo for `continuacao_peca`, o return na linha 176 ignora o finally e `isSubmitting` nunca volta a false. Na verdade, `finally` SEMPRE executa, entao este caso especifico esta ok. Mas o fluxo de continuacao salta diretamente para `confirmacao_peca` sem registar atividade, o que e correto.

## Solucao

### 1. Corrigir AssignDeliveryModal (ficheiro principal do bug de entrega)

Ao atribuir um tecnico para entrega de oficina, tambem definir:
- `technician_id` = tecnico selecionado (para que o RPC e a query do tecnico funcionem)
- `service_type` = `'entrega'` (para que o fluxo correto seja iniciado)
- `status` = `'por_fazer'` (para que o servico apareca como pendente)
- `scheduled_date` = data da entrega

```typescript
await updateService.mutateAsync({
  id: service.id,
  delivery_method: 'technician_delivery',
  delivery_technician_id: technicianId,
  delivery_date: deliveryDate,
  scheduled_shift: deliveryTime,
  // NOVAS LINHAS:
  technician_id: technicianId,
  service_type: 'entrega',
  status: 'por_fazer',
  scheduled_date: deliveryDate,
  skipToast: true,
});
```

### 2. Tornar DeliveryFlowModals idempotente

Adicionar verificacao `maybeSingle()` antes de inserir assinatura e usar o mesmo padrao do VisitFlowModals:

```typescript
// Verificar se assinatura ja existe
const { data: existingSig } = await supabase
  .from('service_signatures')
  .select('id')
  .eq('service_id', service.id)
  .eq('signature_type', 'entrega')
  .maybeSingle();

if (!existingSig) {
  await supabase.from('service_signatures').insert({...});
}
```

### 3. Adicionar try/catch ao onCapture da camera no WorkshopFlowModals

Envolver o handler em try/catch com `humanizeError`:

```typescript
onCapture={async (imageData) => {
  try {
    await ensureValidSession();
    // ... insert photo ...
    toast.success("Foto guardada!");
  } catch (error) {
    console.error("Error saving photo:", error);
    toast.error(humanizeError(error));
  }
}}
```

### 4. Adicionar scroll ao dialog "confirmacao_peca" no WorkshopFlowModals

Mudar linha 493 de:
```
className="max-w-md p-6"
```
Para:
```
className="max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto p-6"
```

### 5. Reforcar sessao no DeliveryFlowModals antes de updateService

Adicionar `await ensureValidSession()` antes da chamada `updateService.mutateAsync` na assinatura:

```typescript
// Antes de atualizar status
await ensureValidSession();
await updateService.mutateAsync({
  id: service.id,
  status: 'finalizado',
  ...
});
```

### 6. Adicionar ensureValidSession no handleStartDelivery

O `handleStartDelivery` ja tem `ensureValidSession()`, mas o `technicianUpdateService` pode falhar sem mensagem clara. Melhorar a mensagem de erro:

```typescript
} catch (error) {
  console.error('Error starting delivery:', error);
  toast.error(humanizeError(error)); // Em vez de string fixa
}
```

## Ficheiros Alterados

| Ficheiro | Alteracao |
|---|---|
| `src/components/modals/AssignDeliveryModal.tsx` | Definir `technician_id`, `service_type`, `status`, `scheduled_date` ao atribuir entrega |
| `src/components/technician/DeliveryFlowModals.tsx` | Idempotencia na assinatura + ensureValidSession + humanizeError |
| `src/components/technician/WorkshopFlowModals.tsx` | try/catch na camera + scroll no confirmacao_peca |

## Resultado

- Entregas atribuidas aparecem na lista do tecnico e podem ser iniciadas sem erro
- Cliques duplos em assinaturas nao geram registos duplicados
- Sessoes expiradas durante fluxos mostram mensagens claras em vez de crashes
- Camera que falha nao crashe a pagina inteira do tecnico
- Todos os dialogs do fluxo funcionam corretamente em telemoveis pequenos
- Zero impacto funcional nos outros fluxos (visita, instalacao, oficina)
