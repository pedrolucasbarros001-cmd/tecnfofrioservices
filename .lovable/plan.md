

# Plano: Ajustar Estrategia de Atualizacao por Area

## Resumo das Mudancas

Cada area do sistema tera uma estrategia de atualizacao especifica conforme pedido:

| Area | Estrategia Atual | Nova Estrategia |
|---|---|---|
| TV Monitor (servicos) | Realtime em TODA a tabela `services` | Realtime filtrado: so `service_location=eq.oficina` |
| TV Monitor (atividade) | Realtime em `activity_logs` | Polling leve a cada 60s |
| Dashboard | Fetch ao abrir (sem polling/realtime) | Manter + adicionar polling 60s |
| Lista Geral (GeralPage) | Realtime em `services` | Remover realtime. Fetch ao abrir + refetchOnWindowFocus |

## Detalhes Tecnicos

### 1. TV Monitor -- Realtime filtrado (so oficina)

**Ficheiro:** `src/pages/TVMonitorPage.tsx`

Remover as 2 chamadas `useRealtime()` e substituir por uma subscription direta com filtro:

```typescript
// ANTES (reage a QUALQUER mudanca em services):
useRealtime('services', [['tv-monitor-services']]);
useRealtime('activity_logs', [['public-activity-logs']]);

// DEPOIS (reage APENAS a mudancas em servicos de oficina):
useEffect(() => {
  const channel = supabase
    .channel('tv-monitor-oficina')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'services',
      filter: 'service_location=eq.oficina'
    }, () => {
      queryClient.invalidateQueries({ queryKey: ['tv-monitor-services'] });
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [queryClient]);
```

Para o historico de atividade, trocar Realtime por polling leve de 60s:

```typescript
const { data: activityLogs = [] } = usePublicActivityLogs(10);
// Adicionar refetchInterval: 60000 no usePublicActivityLogs
```

### 2. Activity Logs -- Polling para TV Monitor

**Ficheiro:** `src/hooks/useActivityLogs.ts`

Adicionar parametro opcional para ativar polling apenas quando necessario (ex: TV Monitor):

```typescript
export function usePublicActivityLogs(limit = 10, pollingInterval?: number) {
  return useQuery({
    queryKey: ['public-activity-logs', limit],
    queryFn: async () => { /* ... mesmo codigo ... */ },
    refetchInterval: pollingInterval || false,
  });
}
```

No TVMonitorPage: `usePublicActivityLogs(10, 60000)` -- polling a cada 60s.
No DashboardPage: `useActivityLogs({ limit: 10 })` -- sem polling (ja e assim).

### 3. Dashboard -- Manter como esta + adicionar 60s

**Ficheiro:** `src/pages/DashboardPage.tsx`

O dashboard ja faz fetch apenas ao abrir (via `useEffect` + `fetchStats()`). Adicionar um intervalo de 60s:

```typescript
useEffect(() => {
  fetchStats();
  const interval = setInterval(fetchStats, 60000);
  return () => clearInterval(interval);
}, [role, navigate]);
```

### 4. Lista Geral -- Remover Realtime

**Ficheiro:** `src/pages/GeralPage.tsx`

Remover a linha:
```typescript
useRealtime('services', [['services-paginated'], ['all-pending-parts'], ['agenda-services']]);
```

O React Query ja tem `refetchOnWindowFocus: true` por defeito, entao ao trocar de aba ou voltar a pagina os dados atualizam automaticamente. Alem disso, qualquer acao (criar servico, atribuir tecnico, etc.) ja invalida as queries manualmente apos sucesso.

## Ficheiros Alterados

| Ficheiro | Alteracao |
|---|---|
| `src/pages/TVMonitorPage.tsx` | Remover 2x `useRealtime`, adicionar 1 subscription filtrada `service_location=eq.oficina`, usar polling 60s para atividade |
| `src/hooks/useActivityLogs.ts` | Adicionar parametro `pollingInterval` ao `usePublicActivityLogs` |
| `src/pages/DashboardPage.tsx` | Adicionar `setInterval(fetchStats, 60000)` |
| `src/pages/GeralPage.tsx` | Remover `useRealtime('services', ...)` |

## Resultado

- TV Monitor: 1 unica subscription filtrada (so oficina) em vez de 2 subscriptions globais
- Historico de atividade no monitor: polling leve a cada 60s em vez de Realtime
- Dashboard: atualiza ao abrir + a cada 60s
- Lista geral: atualiza ao abrir pagina, ao voltar de outra aba, ou apos qualquer acao
- Reducao massiva de chamadas `realtime.list_changes`

