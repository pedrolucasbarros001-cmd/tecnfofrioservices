

## Análise: Realtime é de facto perigoso aqui

### O problema real

O `useRealtime` subscreve a **toda** a tabela `services` com `event: '*'`. Cada vez que um técnico trabalha num fluxo, a RPC `technician_update_service` actualiza `flow_data` e `flow_step` — campos JSON que mudam dezenas de vezes por serviço. **Cada uma dessas escritas** gera um evento Postgres Changes que é enviado a **todos** os subscribers (GeralPage do admin, ServicosPage de cada técnico).

Com 3 técnicos activos simultaneamente, são facilmente 30-60 eventos/minuto. Mesmo com o throttle de 15s, cada subscriber ainda processa o evento (Supabase ainda envia o payload via WebSocket), e o Postgres WAL (Write-Ahead Log) regista cada notificação — é aqui que o Disk IO cresce.

### A estratégia já acordada (na memória do projecto)

A memória `data-update-strategy` diz exactamente:

> "As listagens gerais e técnicas (GeralPage, OficinaPage, ServicosPage) **não utilizam Realtime nem polling**, confiando no `refetchOnWindowFocus` e em invalidações manuais de cache após ações do utilizador."

As subscrições adicionadas recentemente contradizem esta estratégia.

### Plano: Remover Realtime e usar invalidação inteligente

**Ficheiros a modificar (3):**

1. **`src/pages/ServicosPage.tsx`** — Remover `useRealtime`. O técnico já vê dados frescos via `refetchOnWindowFocus` e após completar/fechar fluxos (o `handleFlowComplete` já chama `refetch()`).

2. **`src/pages/GeralPage.tsx`** — Remover `useRealtime`. O admin vê dados frescos ao voltar à tab e após qualquer acção (atribuir técnico, mudar estado, etc.).

3. **`src/hooks/useRealtime.ts`** — Manter o ficheiro (é usado pelo TV Monitor com filtro específico), mas sem utilizadores nas páginas principais.

**Resultado**: Zero subscrições Realtime globais na tabela `services`. O TV Monitor continua a usar a sua subscrição filtrada (`service_location=eq.oficina`), que é segura. As páginas actualizam-se naturalmente via `refetchOnWindowFocus: true` (já configurado no `queryClient.ts`) e invalidações manuais após acções.

