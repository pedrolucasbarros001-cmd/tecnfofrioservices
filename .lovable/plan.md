
Objetivo: eliminar a causa do travamento no login (botão preso em “A entrar...”) sem camuflagem, tornando o fluxo determinístico mesmo em rede instável.

Implementação (curta e direta):

1) `src/contexts/AuthContext.tsx` — separar fluxo de eventos por tipo
- Parar de bloquear todos os eventos quando `signInActiveRef` estiver `true`.
- Bloquear apenas `SIGNED_OUT` do cleanup.
- Permitir `SIGNED_IN`/`INITIAL_SESSION` seguirem para hidratação (com deduplicação), para não depender de um único caminho.

2) `src/contexts/AuthContext.tsx` — deduplicação real de hidratação por utilizador
- Criar um `hydrationPromiseRef` por `userId` para garantir “single-flight” (um único fetch de profile/role por sessão ativa).
- `signIn` e `onAuthStateChange` passam a reutilizar a mesma promise quando ocorrerem em paralelo.

3) `src/contexts/AuthContext.tsx` — fail-safe contra promise pendente
- Em `signIn`, substituir await direto por `Promise.race` com timeout alto (ex.: 20–30s) apenas no passo de hidratação.
- Se timeout disparar, não concluir login “cego”: acionar `supabase.auth.getSession()` + `hydrateSession(session)` e aguardar conclusão controlada.
- Garantir `finally` para sempre liberar `signInActiveRef` e nunca deixar estado “preso”.

4) `src/pages/LoginPage.tsx` — navegação determinística após sucesso
- Após `signIn` sem erro, navegar imediatamente para `getDefaultRouteForRole(...)` com role retornada do `signIn` (sem depender só do `useEffect`).
- Manter `useEffect` apenas como fallback secundário.
- Garantir reset de `isLoading` em todos os caminhos não navegados.

5) `src/contexts/AuthContext.tsx` — contrato do `signIn` mais explícito
- Alterar retorno para incluir `role` e `redirectPath` no sucesso.
- Login page deixa de inferir estado assíncrono indiretamente e usa retorno transacional do auth.

6) `src/contexts/AuthContext.tsx` — instrumentação de diagnóstico temporária
- Adicionar logs com timestamps por etapa: `signOut cleanup`, `signInWithPassword`, `getSession`, `fetch profile`, `fetch role`, `state commit`, `navigate`.
- Remover logs após validação final.

Testes obrigatórios (E2E):
1) Login normal (dono/secretária/técnico) em desktop e telemóvel.
2) Mesmo dispositivo: logout utilizador A → login utilizador B.
3) Rede lenta (throttling): confirmar que não fica preso em “A entrar...”.
4) Confirmar que, sem refresh manual, sempre redireciona para a rota correta.

Detalhes técnicos (para implementação):
- Manter roles exclusivamente em `user_roles` (sem mover para `profiles`).
- Não usar localStorage para decisão de privilégio/autorização.
- Continuar validação de role via consulta autenticada ao Supabase + RLS existente.
- Evitar regressão de segurança: `ProtectedRoute` continua negando `role=null`.
