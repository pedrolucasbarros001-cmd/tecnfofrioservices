
Implementação proposta (focada no problema recorrente de login em **preview + publicado**, e em **antes/depois do redirect**):

1) `src/lib/queryClient.ts` (novo)
- Extrair `queryClient` de `App.tsx` para módulo isolado.
- Exportar `queryClient` único.

2) `src/App.tsx`
- Importar `queryClient` de `@/lib/queryClient`.
- Remover definição local de `queryClient`.
- Corrigir `GlobalErrorHandler`: trocar `process.env.NODE_ENV` por `import.meta.env.DEV`.

3) `src/contexts/AuthContext.tsx`
- Importar `queryClient` de `@/lib/queryClient` (elimina ciclo `App -> AuthContext -> App`).
- Tornar cleanup pré-login resiliente:
  - `signOut(local)` com `Promise.race` (timeout curto, ex.: 1500–2000ms).
  - Em timeout/falha, continuar fluxo (não bloquear login).
- Garantir que `signIn` nunca fica pendente:
  - Encapsular etapas críticas em `try/catch/finally`.
  - Sempre limpar flags de fluxo no `finally`.
- Se `signInWithPassword` retornar sucesso mas hidratação falhar/timeout:
  - fazer fallback controlado com `getSession` + `hydrateSession`.
  - retornar erro explícito só se realmente não houver sessão/role ao final.
- Manter supressão seletiva apenas para `SIGNED_OUT` do cleanup.

4) `src/pages/LoginPage.tsx`
- Adicionar watchdog local de UI (ex.: 30s) para nunca manter botão preso em “A entrar...”.
- Se watchdog disparar: liberar `isLoading` + toast orientando nova tentativa (sem refresh manual).
- Manter navegação imediata por `redirectPath` e fallback por `useEffect`.

5) `src/contexts/OnboardingContext.tsx`
- Blindar bootstrap para não gerar crash em janelas transitórias:
  - só consultar onboarding quando `authLoading === false` e `user && role`.
  - evitar reentrância durante troca de sessão (flag local de execução).

6) Diagnóstico temporário (curto prazo)
- Logs com `requestId` por tentativa de login:
  - `login_start`, `cleanup_start/end`, `signInWithPassword_ok`, `hydrate_start/end`, `navigate`.
- Remover logs após validar estabilidade.

7) Testes obrigatórios (antes de fechar)
- Login 10x seguidas no mesmo utilizador (desktop + telemóvel).
- Logout A -> login B -> logout B -> login A no mesmo dispositivo.
- Rede lenta (throttling): confirmar que não trava em “A entrar...”.
- Fluxo completo sem refresh manual no preview e no publicado.
- Confirmar ausência do erro `useAuth must be used within an AuthProvider`.

Seção técnica (resumo objetivo)
- Raiz provável 1: ciclo de módulos (`AuthContext` importando `queryClient` de `App`) causando estado inconsistente de contexto em runtime/HMR.
- Raiz provável 2: `await signOut(local)` no início do login podendo bloquear a promessa de `signIn`.
- Raiz provável 3: handler global com `process.env.NODE_ENV` em app Vite pode gerar erro em runtime.
- Estratégia: remover ciclo, tornar `signIn` “non-blocking + fail-safe”, e garantir watchdog de UI para nunca congelar botão de entrada.
