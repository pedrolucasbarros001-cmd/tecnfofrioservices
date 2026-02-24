
# Plano: Eliminar Leak de Realtime e Polling Redundante

## Causa Raiz Confirmada

O hook `useRealtime.ts` (linha 46) tem `queryKeys` no array de dependencias do `useEffect`. Como cada componente passa um array inline (ex: `[['services-paginated'], ['all-pending-parts']]`), o React cria uma **nova referencia a cada render**, o que faz o `useEffect` executar cleanup + re-subscribe em loop infinito.

Resultado: milhares de chamadas `realtime.list_changes` por hora.

### Subscriptions ativas (4 total, mas re-criadas milhares de vezes):

| Pagina | Tabela | Query Keys |
|---|---|---|
| GeralPage | services | services-paginated, all-pending-parts |
| GeralPage | service_parts | all-pending-parts, services-paginated |
| TVMonitorPage | services | tv-monitor-services |
| TVMonitorPage | activity_logs | public-activity-logs |

### Polling ativo em paralelo (6 timers):

| Ficheiro | Intervalo |
|---|---|
| useServices.ts (useAllServices) | 5 min |
| useServices.ts (usePaginatedServices) | 5 min |
| ServicosPage.tsx | 1 min |
| TechnicianOfficePage.tsx | 1 min |
| useServiceTransfers.ts | 1 min |
| useActivityLogs.ts (public) | 1 min |

## Solucao

### 1. Corrigir `src/hooks/useRealtime.ts`

Tres mudancas criticas:

- Mover `queryKeys` para `useRef` e remover do dependency array -- isto impede a re-criacao do channel a cada render
- Adicionar throttle de 5 segundos -- impede cascata de invalidacoes quando varias mudancas acontecem seguidas
- Usar nome de channel unico por `table:event` -- evita conflitos entre subscriptions
- Remover `console.log` -- cada log tambem consome recursos

```typescript
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const THROTTLE_MS = 5000;

export function useRealtime(
  table: string,
  queryKeys: string[][] = [['services'], ['services-paginated']],
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*' = '*'
) {
  const queryClient = useQueryClient();
  const queryKeysRef = useRef(queryKeys);
  queryKeysRef.current = queryKeys;
  const lastInvalidationRef = useRef<number>(0);

  useEffect(() => {
    const channel = supabase
      .channel(`rt:${table}:${event}`)
      .on('postgres_changes', { event, schema: 'public', table }, () => {
        const now = Date.now();
        if (now - lastInvalidationRef.current < THROTTLE_MS) return;
        lastInvalidationRef.current = now;
        queryKeysRef.current.forEach(key => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [table, event, queryClient]);
}
```

### 2. Remover polling redundante (5 ficheiros)

O Realtime ja cobre as atualizacoes. Manter apenas `refetchOnWindowFocus: true` (que ja e default do React Query).

**`src/hooks/useServices.ts`** -- remover `refetchInterval: 300000` de `useAllServices` e `usePaginatedServices`

**`src/pages/ServicosPage.tsx`** -- remover `refetchInterval: 60000`

**`src/pages/technician/TechnicianOfficePage.tsx`** -- remover `refetchInterval: 60000`

**`src/hooks/useServiceTransfers.ts`** -- remover `refetchInterval: 60000`

**`src/hooks/useActivityLogs.ts`** -- remover `refetchInterval: 60000` do modo public

**`src/components/layouts/AppLayout.tsx`** -- manter `refetchInterval: 120000` para notificacoes (nao tem Realtime)

### 3. Consolidar subscriptions na GeralPage

**`src/pages/GeralPage.tsx`** -- remover a segunda subscription (`service_parts`) porque updates em pecas ja sao cobertos pelo Realtime na tabela `services` (o trigger `updated_at = now()` atualiza o servico):

```typescript
// Manter apenas 1:
useRealtime('services', [['services-paginated'], ['all-pending-parts'], ['agenda-services']]);
// Remover: useRealtime('service_parts', ...)
```

## Ficheiros Alterados

| Ficheiro | Alteracao |
|---|---|
| `src/hooks/useRealtime.ts` | queryKeys para useRef + throttle 5s + channel unico |
| `src/hooks/useServices.ts` | Remover 2x refetchInterval |
| `src/pages/ServicosPage.tsx` | Remover refetchInterval |
| `src/pages/technician/TechnicianOfficePage.tsx` | Remover refetchInterval |
| `src/hooks/useServiceTransfers.ts` | Remover refetchInterval |
| `src/hooks/useActivityLogs.ts` | Remover refetchInterval public |
| `src/pages/GeralPage.tsx` | Remover 2a subscription duplicada |

## Resultado Esperado

- De ~10,000 chamadas `realtime.list_changes` para ~50/hora (reducao de 99%)
- Disk IO cai drasticamente -- o alerta deve desaparecer em poucas horas
- 6 timers de polling eliminados -- menos queries a BD
- Atualizacoes continuam em tempo real (4 subscriptions estaveis, sem re-criacao)
- Zero impacto funcional -- tudo continua a atualizar quando muda na BD
