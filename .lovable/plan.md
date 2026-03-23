

## Plano de Otimização de Performance — 5 Passos

### Passo 1 — Índices SQL para pesquisa rápida
Criar migração com:
- Extensão `pg_trgm` para pesquisa por texto parcial
- Índice GIN trigram nos campos de pesquisa dos serviços (code, appliance_type, brand, model, serial_number, fault_description)
- Índice parcial em `pending_pricing WHERE true`
- Índice GIN trigram separado no campo `code`

### Passo 2 — Corrigir optimistic update rollback
Em `src/hooks/useServices.ts`, na função `useUpdateService`:
- `onMutate`: trocar `['service', id]` por `['service-full', id]` no cancel, snapshot e setQueryData (linhas 443, 448, 452) — é o query key que o sistema realmente usa
- `onError`: mesma correção no rollback (linha 489)

### Passo 3 — Throttle → Debounce no Realtime
Reescrever `src/hooks/useRealtime.ts`:
- Substituir throttle de 3s (que ignora eventos) por debounce de 800ms (que reagenda)
- Usar `setTimeout`/`clearTimeout` em vez de timestamp comparison
- Limpar timer no cleanup do useEffect

### Passo 4 — Extrair queryFn partilhado
Em `src/hooks/useServices.ts`:
- Criar função `fetchFullServiceById(serviceId)` com a lógica de query + sorting que está duplicada em `useFullServiceData` e `prefetchFullServiceData`
- Simplificar ambas as funções para chamar esta função partilhada

### Passo 5 — Invalidação seletiva
Em `src/lib/queryInvalidation.ts`:
- Adicionar parâmetro opcional `scope: 'all' | 'detail' | 'list'` (default `'all'` = comportamento idêntico ao actual)
- Mover `pending-parts` e `all-pending-parts` para o bloco de listas
- Permitir futuras chamadas com scope específico sem mudar nada agora

### Secção Técnica
- **Ficheiros alterados**: `src/hooks/useServices.ts`, `src/hooks/useRealtime.ts`, `src/lib/queryInvalidation.ts`
- **Migração SQL**: 1 migração com 4 statements (CREATE EXTENSION + 3 CREATE INDEX)
- **Retrocompatibilidade**: todos os passos são retrocompatíveis — sem scope explícito, o comportamento é idêntico ao actual
- **Risco**: zero para o passo 1 (só índices). Passos 2-5 são refactors seguros sem mudança de comportamento externo

