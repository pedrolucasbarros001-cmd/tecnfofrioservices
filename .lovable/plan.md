

## Diagnóstico real (baseado no código e logs)

O problema tem **duas causas concretas** no código atual:

**Causa 1: `signIn` chama `signOut` antes de autenticar (linha 134 do AuthContext)**
Isto dispara o evento `SIGNED_OUT` no `onAuthStateChange`, que limpa `role=null`, `profile=null`. Depois o `signInWithPassword` dispara `SIGNED_IN`, que inicia `fetchUserData` assincronamente. Mas o `signIn` retorna **antes** da hidratação terminar. Resultado: o LoginPage fica à espera que o `useEffect` detecte `role`, mas o `role` pode não ter chegado ainda — ou o evento de limpeza interferiu.

**Causa 2: `isLoading` nunca é resetado no caminho de sucesso (LoginPage)**
Quando `signIn` retorna sem erro, o `onSubmit` **não faz nada** — não navega, não desliga o loading. Depende 100% do `useEffect` que vigia `isAuthenticated && role && !loading`. Se o `role` demora (rede lenta, retry de 3s no fetchUserData), o botão fica preso em "A entrar..." indefinidamente.

## Plano de correção (sem gambiarras, sem timeouts artificiais)

### 1) `AuthContext.tsx` — remover `signOut` do `signIn`
- `signInWithPassword` já substitui a sessão. O `signOut` prévio é desnecessário e é a causa das colisões de eventos.
- `signIn` deve: chamar `signInWithPassword` → aguardar `fetchUserData` → retornar `{ error, role }`.
- Assim o LoginPage recebe o role de forma síncrona e navega imediatamente.

### 2) `AuthContext.tsx` — `signIn` espera pela hidratação
- Após `signInWithPassword` com sucesso, chamar `await fetchUserData(user.id)` dentro do próprio `signIn`.
- Retornar `{ error: null, role: this.role }` após hidratação.
- O `onAuthStateChange` continua a funcionar em paralelo (para refresh de página, etc.), mas o `signIn` não depende dele.

### 3) `LoginPage.tsx` — navegação direta + reset garantido
- `onSubmit`: usar `try/finally` para **sempre** resetar `isLoading`.
- No sucesso: usar `role` retornado por `signIn` para navegar imediatamente via `navigate(getDefaultRouteForRole(role))`.
- O `useEffect` existente permanece apenas como fallback (ex: refresh de página com sessão ativa).

### 4) `AuthContext.tsx` — limpar `signOut`
- Remover `setTimeout(() => setLoading(false), 500)` no `signOut` — é um delay artificial sem propósito.
- Limpar estado e definir `loading=false` diretamente.

