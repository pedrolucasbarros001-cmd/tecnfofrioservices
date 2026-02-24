

# Plano: Resolver Sobrecarga da Base de Dados (CPU 94%, Disk I/O Esgotado)

## Diagnostico

As imagens do Supabase mostram:
- **CPU a 94%** -- quase no limite
- **Disco I/O prestes a esgotar** -- aviso critico do Supabase
- **Multiplos erros "statement timeout"** -- 9+ queries canceladas na ultima hora
- **Memoria a 408MB** -- constante e elevada

### Causa Raiz: Polling Excessivo

O sistema tem **7+ queries a disparar a cada 30 segundos** (e uma a cada 10 segundos), **simultaneamente**, para todos os utilizadores ligados:

| Query | Intervalo | Peso |
|---|---|---|
| `useServices` (OficinaPage - SEM limite, carrega TODOS) | 30s | PESADO |
| `usePaginatedServices` (GeralPage) | 30s | Medio |
| `technician-services` (ServicosPage) | 30s | Medio |
| `technician-office-services` (TechnicianOfficePage) | 30s | Medio |
| `unread-notifications` (AppLayout - TODAS as paginas) | 30s | Leve |
| `activity-logs` (DashboardPage - feed publico) | **10s** | Medio |
| `useServiceTransfers` | 30s | Leve |
| `TVMonitorPage` | 30s | Medio |

Com 3-5 utilizadores ativos, isto gera **15-35 queries por minuto** constantemente, mesmo quando ninguem interage com o sistema.

Alem disso:
- `gcTime: 24 horas` mantem dados antigos em memoria do browser indefinidamente
- `useServices` na OficinaPage carrega TODOS os servicos da oficina sem `.limit()` -- se houver 500 servicos, carrega tudo
- O `useFullServiceData` faz JOIN de 6 tabelas (servicos + clientes + tecnicos + pecas + fotos + assinaturas + pagamentos + logs)

## Solucao

### 1. Reduzir polling drasticamente -- usar `refetchOnWindowFocus` como mecanismo principal

Em vez de bombardear a BD a cada 30s, o sistema atualiza quando o utilizador volta a janela (que ja esta ativo). Polling so para paginas criticas e com intervalo muito maior.

**Ficheiros e alteracoes:**

**`src/App.tsx`** -- Configuracao global do QueryClient:
```
staleTime: 1000 * 60 * 2    (2 minutos, em vez de 30s)
gcTime: 1000 * 60 * 30      (30 minutos, em vez de 24 horas)
refetchOnWindowFocus: true   (manter -- este e o mecanismo principal)
```

**`src/hooks/useServices.ts`**:
- `useServices()`: remover `refetchInterval: 30000` (usar apenas windowFocus)
- `usePaginatedServices()`: remover `refetchInterval: 30000`

**`src/hooks/useActivityLogs.ts`**:
- Mudar `refetchInterval` de `10000/30000` para `60000` (1 minuto) no feed publico e remover nos restantes

**`src/pages/ServicosPage.tsx`**:
- Mudar `refetchInterval` de `30000` para `60000` (1 minuto) -- esta e a pagina do tecnico, precisa de alguma atualizacao

**`src/pages/technician/TechnicianOfficePage.tsx`**:
- Mudar `refetchInterval` de `30000` para `60000`

**`src/components/layouts/AppLayout.tsx`**:
- Notificacoes: mudar `refetchInterval` de `30000` para `120000` (2 minutos)

**`src/pages/TVMonitorPage.tsx`**:
- Manter `refetchInterval: 30000` -- este e um monitor dedicado que precisa de atualizacoes

**`src/hooks/useServiceTransfers.ts`**:
- Mudar `refetchInterval` de `30000` para `60000`

### 2. Limitar a query da OficinaPage

**`src/hooks/useServices.ts`** -- `useServices()`:
- Adicionar `.limit(200)` para nunca carregar mais de 200 servicos de uma vez
- Isto previne queries gigantes que causam timeouts

### 3. Reduzir gcTime para libertar memoria

**`src/App.tsx`**:
- `gcTime: 1000 * 60 * 30` (30 minutos em vez de 24 horas)
- Dados nao utilizados sao limpos apos 30 minutos, reduzindo a pressao de memoria

### 4. Otimizar `useFullServiceData` -- nao carregar logs no JOIN

**`src/hooks/useServices.ts`** -- `useFullServiceData()`:
- Remover `logs:activity_logs(*)` do SELECT principal -- carregar logs separadamente apenas quando necessario
- Isto reduz o peso da query mais pesada do sistema

## Resumo de Impacto

| Metrica | Antes | Depois |
|---|---|---|
| Queries/minuto (3 users) | ~35 | ~8 |
| Intervalo minimo polling | 10s | 60s |
| gcTime | 24h | 30min |
| staleTime | 30s | 2min |
| OficinaPage max rows | Ilimitado | 200 |
| useFullServiceData JOINs | 7 tabelas | 6 tabelas (sem logs) |

## Ficheiros Alterados

| Ficheiro | Alteracao |
|---|---|
| `src/App.tsx` | staleTime 2min, gcTime 30min |
| `src/hooks/useServices.ts` | Remover refetchInterval; limit(200); remover logs do JOIN |
| `src/hooks/useActivityLogs.ts` | refetchInterval 60s/remover |
| `src/hooks/useServiceTransfers.ts` | refetchInterval 60s |
| `src/pages/ServicosPage.tsx` | refetchInterval 60s |
| `src/pages/technician/TechnicianOfficePage.tsx` | refetchInterval 60s |
| `src/components/layouts/AppLayout.tsx` | refetchInterval 120s |

## Resultado Esperado

- CPU deve cair de 94% para menos de 30%
- Disk I/O volta ao normal
- Sem mais erros "statement timeout"
- O sistema continua responsivo porque `refetchOnWindowFocus` garante dados frescos quando o utilizador interage
- Tecnicos nao notam diferenca porque os dados atualizam ao voltar a app

