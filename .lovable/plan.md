
# Plano: Corrigir Erros de Execucao dos Tecnicos e Blindar os Fluxos

## Problemas Identificados

Apos analise minuciosa de todos os ficheiros de fluxo, identifiquei **5 problemas criticos** que causam erros ao iniciar servicos, perda de progresso e comportamento instavel:

### 1. Sessao Expirada Causa "Erro ao iniciar reparacao" (CRITICO)

Nenhuma das acoes criticas chama `ensureValidSession()` antes de executar RPCs. Se o token JWT expirou (o que acontece frequentemente em telemoveis que ficam em standby), o RPC falha silenciosamente com erro de RLS.

**Ficheiros afetados:**
- `WorkshopFlowModals.tsx` - `handleStartRepair()`, `handleRequestPart()`, `handleComplete()`
- `VisitFlowModals.tsx` - `handleSignatureComplete()`, `handlePhotoCapture()`
- `InstallationFlowModals.tsx` - acoes de conclusao
- `DeliveryFlowModals.tsx` - acoes de conclusao

### 2. Fluxo de Visita NAO Regista "em_execucao" ao Iniciar (CRITICO)

O `WorkshopFlowModals` chama `start_workshop_service` RPC que muda o status para `em_execucao`. Mas o `VisitFlowModals` **nao faz nada ao iniciar** -- apenas muda o `currentStep` local. Consequencia:
- O servico permanece em `por_fazer` no servidor
- Se o tecnico fechar a app, o `deriveStepFromDb` nao deteta progresso porque `isInProgress` e `false`
- Fotos tiradas ficam "orfas" sem vinculo ao progresso do fluxo

### 3. `useEffect` Re-Executa e Reseta o Fluxo (CRITICO)

Em todos os 4 fluxos, o `useEffect` que carrega o estado tem `service` como dependencia:

```typescript
useEffect(() => {
  // ...loads state from localStorage or DB
}, [isOpen, service, loadState, mode]);
```

Quando o `refetchOnWindowFocus` dispara (que agora e o mecanismo principal), o objecto `service` recebe uma nova referencia. O `useEffect` re-executa, e como o `loadState()` le do localStorage (que pode ja ter sido limpo apos conclusao), o fluxo reseta para "resumo" -- **perdendo todo o progresso do tecnico**.

### 4. Base64 de Fotos Guardada no `flow_data` da BD (PERFORMANCE)

O `saveStateToDb` envia o `formData` completo para a coluna `flow_data`, incluindo strings base64 de fotos (que podem ter 1-5MB cada). Com 3 fotos de estado, o UPDATE pode facilmente ser de 15MB, causando:
- Timeouts na BD
- Lentidao ao guardar estado
- Consumo excessivo de Disk I/O

### 5. Debounce de 2s no `saveStateToDb` Pode Perder Ultimo Passo

Se o tecnico navega para um passo e fecha a app rapidamente (menos de 2 segundos), o `setTimeout` e cancelado no cleanup do `useEffect` e o ultimo passo nunca e guardado na BD.

## Solucao

### Alteracao 1: Adicionar `ensureValidSession()` Antes de Todas as Acoes Criticas

**Ficheiros:** `WorkshopFlowModals.tsx`, `VisitFlowModals.tsx`, `InstallationFlowModals.tsx`, `DeliveryFlowModals.tsx`

Em cada funcao que chama um RPC ou faz INSERT/UPDATE:
```typescript
import { ensureValidSession } from '@/integrations/supabase/client';

const handleStartRepair = async () => {
  try {
    await ensureValidSession(); // <-- NOVO
    const { error } = await supabase.rpc('start_workshop_service', ...);
    ...
  }
};
```

Aplicar em:
- `handleStartRepair` (Workshop)
- `handleRequestPart` (Workshop)
- `handleComplete` (Workshop)
- `handleSignatureComplete` (Visit)
- `handlePhotoCapture` (Visit)
- Camera `onCapture` callbacks (Workshop)
- `handleFinish` / completion handlers (Installation, Delivery)

### Alteracao 2: Visit Flow Deve Registar `em_execucao` ao Iniciar

**Ficheiro:** `VisitFlowModals.tsx`

Criar uma funcao `handleStartVisit` que chama o RPC `technician_update_service` com `_status: 'em_execucao'` antes de avancar para o passo de deslocacao:

```typescript
const handleStartVisit = async () => {
  try {
    await ensureValidSession();
    const { error } = await supabase.rpc('technician_update_service', {
      _service_id: service.id,
      _status: 'em_execucao',
    });
    if (error) throw error;

    // Invalidate caches
    queryClient.invalidateQueries({ queryKey: ['services'] });
    queryClient.invalidateQueries({ queryKey: ['technician-services'] });

    // Navigate to resume step or deslocacao
    if (derivedResumeStep && derivedResumeStep !== 'resumo') {
      setCurrentStep(derivedResumeStep);
    } else {
      setCurrentStep('deslocacao');
    }
  } catch (error) {
    toast.error(humanizeError(error));
  }
};
```

O botao "Iniciar Visita" no Resumo passa a chamar `handleStartVisit` em vez de simplesmente mudar o `currentStep`.

### Alteracao 3: Estabilizar o `useEffect` Contra Re-Renders do `service`

**Ficheiros:** Todos os 4 FlowModals

Usar `service.id` e `service.status` como dependencias em vez do objecto `service` completo. Guardar se o estado ja foi carregado com uma ref para evitar re-execucoes:

```typescript
const hasInitialized = useRef(false);

useEffect(() => {
  if (!isOpen) {
    hasInitialized.current = false;
    setIsResuming(false);
    return;
  }

  // Evita re-execucao se ja foi inicializado para este servico
  if (hasInitialized.current) return;
  hasInitialized.current = true;

  const savedState = loadState();
  if (savedState) {
    setCurrentStep(savedState.currentStep as ModalStep);
    setFormData(savedState.formData);
    return;
  }

  setIsResuming(true);
  deriveStepFromDb(service.id, persistenceFlowType, service as unknown as Record<string, unknown>)
    .then(({ step, formDataOverrides }) => {
      // ... existing logic
    })
    .catch(() => setIsResuming(false));
}, [isOpen, service.id]);
```

Isto garante que o estado e carregado **uma unica vez** quando o modal abre, independentemente de quantos re-renders ocorram.

### Alteracao 4: Excluir Base64 do `flow_data` Guardado na BD

**Ficheiro:** `useFlowPersistence.ts`

Filtrar campos de foto do `formData` antes de enviar para a BD:

```typescript
const saveStateToDb = useCallback((currentStep: string, formData?: T) => {
  if (dbSaveTimerRef.current) {
    clearTimeout(dbSaveTimerRef.current);
  }
  dbSaveTimerRef.current = setTimeout(async () => {
    try {
      // Remove base64 photo data before saving to DB (too large)
      let cleanData: Record<string, unknown> | null = null;
      if (formData) {
        cleanData = {};
        for (const [key, value] of Object.entries(formData)) {
          if (typeof value === 'string' && value.startsWith('data:image/')) {
            cleanData[key] = '__photo_exists__';
          } else if (Array.isArray(value) && value.some(v => typeof v === 'string' && v.startsWith('data:image/'))) {
            cleanData[key] = value.map(v =>
              typeof v === 'string' && v.startsWith('data:image/') ? '__photo_exists__' : v
            );
          } else {
            cleanData[key] = value;
          }
        }
      }

      const { error } = await supabase.rpc('technician_update_service', {
        _service_id: serviceId,
        _flow_step: currentStep,
        _flow_data: cleanData,
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error persisting flow state to DB:', error);
    }
  }, 2000);
}, [serviceId]);
```

Isto reduz o tamanho do UPDATE de potencialmente 15MB para menos de 1KB.

### Alteracao 5: Flush Imediato do `saveStateToDb` ao Fechar/Sair

**Ficheiro:** `useFlowPersistence.ts`

Adicionar uma funcao `flushStateToDb` que faz o save imediatamente (sem debounce), para ser chamada quando o modal fecha:

```typescript
const flushStateToDb = useCallback(async (currentStep: string, formData?: T) => {
  if (dbSaveTimerRef.current) {
    clearTimeout(dbSaveTimerRef.current);
    dbSaveTimerRef.current = null;
  }
  try {
    // Same clean logic as saveStateToDb but synchronous
    let cleanData = sanitizeFormData(formData);
    await supabase.rpc('technician_update_service', {
      _service_id: serviceId,
      _flow_step: currentStep,
      _flow_data: cleanData,
    });
  } catch (error) {
    console.error('Error flushing flow state to DB:', error);
  }
}, [serviceId]);
```

Chamar `flushStateToDb` no `handleClose` de cada fluxo.

## Ficheiros Alterados

| Ficheiro | Alteracao |
|---|---|
| `src/hooks/useFlowPersistence.ts` | Filtrar base64 do flow_data; adicionar flushStateToDb |
| `src/components/technician/VisitFlowModals.tsx` | ensureValidSession; handleStartVisit com RPC; useRef para init; flush ao fechar |
| `src/components/technician/WorkshopFlowModals.tsx` | ensureValidSession em acoes criticas; useRef para init; flush ao fechar |
| `src/components/technician/InstallationFlowModals.tsx` | ensureValidSession; useRef para init; flush ao fechar |
| `src/components/technician/DeliveryFlowModals.tsx` | ensureValidSession; useRef para init; flush ao fechar |

## Resultado Esperado

- **Zero erros ao iniciar servico** -- sessao validada antes de cada acao
- **Progresso nunca se perde** -- useEffect estavel + flush imediato ao fechar
- **Sem duplicacao de registos** -- logica idempotente ja existente mantem-se
- **BD nao sobrecarregada** -- flow_data sem fotos base64 (de ~15MB para ~1KB por save)
- **Retoma exata do passo** -- Visit flow agora regista `em_execucao`, permitindo ao `deriveStepFromDb` funcionar corretamente
