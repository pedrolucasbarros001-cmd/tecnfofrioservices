

## Proteção do Realtime contra Sobrecarga de Disk IO

### Problemas Identificados

1. **Colisão de canais**: `ServicosPage` e `GeralPage` criam canais com o mesmo nome (`rt:services:*`). Se ambas estiverem montadas ou alternarem rapidamente, o Supabase recebe pedidos de subscribe/unsubscribe conflitantes.

2. **Sem pausa quando tab está oculta**: O listener continua a disparar `invalidateQueries` mesmo com o browser em background. Cada invalidação gera um refetch ao Supabase = Disk IO desnecessário.

3. **Sem filtro na subscrição**: Toda alteração na tabela `services` (incluindo campos irrelevantes como `flow_data`, `flow_step`) dispara invalidação. Um técnico a trabalhar num fluxo gera dezenas de updates por minuto que invalidam o cache de TODOS os utilizadores subscritos.

4. **Throttle de 5s é curto**: Com múltiplos técnicos ativos, 5s permite até 12 invalidações por minuto por utilizador. Com 5 técnicos = 60 refetches/min no Supabase.

### Correções

**Ficheiro único: `src/hooks/useRealtime.ts`**

- **Throttle**: Aumentar de 5s para 15s (4 invalidações/min máximo por subscrição)
- **Visibilidade**: Ignorar eventos quando `document.visibilityState === 'hidden'` — sem refetches com tab em background
- **Canais únicos**: Adicionar sufixo único ao nome do canal (`rt:services:*:${id}`) para evitar colisões entre componentes
- **Stale check**: Antes de invalidar, verificar se a query já está `stale` — se sim, não invalidar novamente (já será refetched na próxima oportunidade)

Resultado: redução de ~80% das invalidações desnecessárias sem perder a reatividade real.

### Ficheiros a Modificar

1. **`src/hooks/useRealtime.ts`** — Todas as 4 correções acima

Sem migrações. Sem novos ficheiros.

