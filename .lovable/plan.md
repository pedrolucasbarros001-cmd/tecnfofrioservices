

# Diagnostico Completo e Plano de Correcao

## Respostas directas as suas perguntas

### 1. Que key esta no frontend?
**Anon key (SUPABASE_PUBLISHABLE_KEY).** O `service_role` so e usado em Edge Functions (server-side), como deve ser. Nao ha problema aqui.

### 2. `persistSession: true`?
Sim, esta activo no client. Isto e correcto e necessario.

### 3. `setSession` manual?
Apenas no `usePrintSessionBridge.ts` para paginas de impressao abertas em nova aba. Nao afecta o login normal.

### 4. localStorage customizado?
Nao. Usa o storage padrao do Supabase (`localStorage`).

### 5. Realtime subscriptions globais?
O `useRealtime` hook cria canais por tabela, com throttle de 5s. Nao partilha estado entre utilizadores.

### 6. Supabase client singleton?
Sim, `export const supabase = createClient(...)` — isto e o padrao correcto do Supabase. Um singleton por browser tab, cada um com o seu proprio JWT. Nao causa conflitos entre utilizadores em dispositivos diferentes.

---

## Causas reais identificadas

### PROBLEMA 1 — Login falha no telemovel
**Causa: bug no `withTimeout`** no AuthContext.

```typescript
// Codigo actual (NAO funciona):
await withTimeout(
  Promise.resolve(supabase.from('profiles').select('*')...),
  10000
)
```

`Promise.resolve()` resolve **imediatamente** com o query builder. O timeout nunca actua. Em redes moveis lentas, o HTTP request pode demorar 10-20s sem feedback, ate atingir o safety timeout de 15s que corta o loading sem role carregado → toast de erro → utilizador pensa que o servidor esta em baixo.

Alem disso, `onAuthStateChange` e `getSession()` disparam **ambos** `fetchUserData`, causando 2x queries de profile+role no arranque.

### PROBLEMA 2 — Outro utilizador ve a pagina do anterior (mesmo dispositivo)
**Causa: o `signOut` nao limpa o estado.**

Codigo actual:
```typescript
async function signOut() {
  await supabase.auth.signOut({ scope: 'local' });
  setUser(null); setSession(null); setProfile(null); setRole(null);
  // Falta: queryClient.clear()
  // Falta: limpar localStorage do Supabase
  // Falta: redirecionar para /login
}
```

Quando o User A faz logout e o User B faz login **no mesmo browser/dispositivo**:
- O React Query cache ainda tem dados do User A
- O React Router ainda tem a ultima rota visitada pelo User A
- As chaves `sb-flialeqlwrtfnonxtsnx-auth-token` podem conter refresh tokens antigos

### PROBLEMA 3 — NAO e problema de concorrencia no servidor
15-16 utilizadores com Supabase Pro **nunca** devem ter conflitos de login simultaneo. Cada login e um POST independente ao GoTrue. O problema e 100% client-side.

---

## Plano de correcao

### Ficheiro: `src/contexts/AuthContext.tsx`

**Correcao 1 — `withTimeout` real:**
Remover `Promise.resolve()` wrapper. Passar a promise HTTP directamente para que o timeout funcione.

**Correcao 2 — `signOut` completo:**
- Importar `queryClient` do App (exportar do App.tsx ou usar `useQueryClient`)
- No signOut: `queryClient.clear()`, limpar `localStorage` keys `sb-*`, redirecionar `window.location.href = '/login'`

**Correcao 3 — Limpar sessao stale antes de signIn:**
Adicionar `await supabase.auth.signOut({ scope: 'local' })` antes de `signInWithPassword` para eliminar refresh tokens antigos.

**Correcao 4 — Detectar troca de utilizador:**
No `onAuthStateChange`, comparar o `user.id` com o anterior. Se mudou, chamar `queryClient.clear()` antes de carregar dados do novo utilizador.

**Correcao 5 — Evitar fetch duplicado:**
Usar um ref para o ultimo `user.id` processado e ignorar chamadas duplicadas de `fetchUserData` vindas de `onAuthStateChange` + `getSession`.

### Ficheiro: `src/App.tsx`

Exportar `queryClient` para poder importar no AuthContext.

### Ficheiros a alterar

| Ficheiro | Alteracao |
|---|---|
| `src/App.tsx` | Exportar `queryClient` |
| `src/contexts/AuthContext.tsx` | 5 correcoes acima |

### Impacto
- Zero alteracoes em SQL/RLS/Edge Functions
- Zero alteracoes em componentes de UI
- Resolve os 3 problemas reportados

