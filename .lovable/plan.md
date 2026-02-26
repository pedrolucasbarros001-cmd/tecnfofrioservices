

# Diagnóstico: Login falha no telemóvel

## Causa raiz encontrada

Analisei os logs de autenticação do Supabase: **zero erros no servidor**. Todos os logins retornam status 200. O problema é 100% no código do cliente.

A falha tem duas causas concretas:

### Causa 1 — Queries sequenciais com timeout agressivo

```text
signIn → signInWithPassword (1-3s rede)
       → getSession (instant)
       → fetchUserData
           → SELECT profiles (timeout 8s)  ← espera acabar
           → SELECT user_roles (timeout 8s) ← só começa depois
           Total possível: 16s sequencial
```

No telemóvel com rede lenta (3G/4G fraco), cada query pode levar 3-5s (TLS + DNS + HTTP). **São feitas em SEQUÊNCIA**, não em paralelo. Se uma delas excede 8s, o `withTimeout` dispara, retorna `role = null`, e o código trata isso como "utilizador sem permissões":

```typescript
// AuthContext.tsx linha 225
if (!userData.role) {
  return { error: new Error('Perfil sem permissões atribuídas.') };
}
```

**Timeout de rede é interpretado como falta de permissão.** O login "falha" quando na realidade o servidor respondeu bem — o cliente é que não esperou.

### Causa 2 — Trabalho duplicado

`signInWithPassword` dispara `onAuthStateChange(SIGNED_IN)` → `hydrateSession` → `fetchUserData`. Depois, `signIn` também chama `fetchUserData`. O dedup via `fetchingRef` funciona SE os dois chamam ao mesmo tempo, mas se o primeiro já acabou quando o segundo começa, faz tudo de novo — 4 queries HTTP em vez de 2.

## Plano de correção (2 ficheiros)

### `src/contexts/AuthContext.tsx`

1. **Queries em PARALELO**: Mudar `fetchUserDataOnce` para usar `Promise.allSettled([profileQuery, roleQuery])` em vez de sequencial. Corta o tempo de 16s para 8s no pior caso.

2. **Remover timeout artificial**: Eliminar `withTimeout` das queries de profile/role. Deixar o browser gerir o timeout natural da rede (~30s). Um SELECT simples com índice unique NUNCA demora 8s no servidor — o tempo é rede, e cortá-lo artificialmente causa falhas falsas.

3. **Não tratar timeout como "sem permissões"**: Se `fetchUserData` falha por rede, o `signIn` deve devolver erro de rede, não erro de permissões. Separar os dois cenários.

4. **Evitar fetch duplicado no login**: No `signIn`, como já faz `fetchUserData` explicitamente, marcar um flag para que o `onAuthStateChange(SIGNED_IN)` NÃO dispare `hydrateSession` → `fetchUserData` de novo. Menos queries = login mais rápido.

### `src/pages/LoginPage.tsx`

5. **Remover textos de "servidor lento"**: O servidor não está lento (0 erros nos logs). Remover mensagens enganadoras. Manter apenas "A entrar..." durante o loading. Se falhar, mostrar o erro real, não uma suposição sobre o servidor.

## Resultado esperado

```text
ANTES (sequencial, mobile lento):
  signIn: 3s + profile: 5s + role: 5s = 13s + duplicado = timeout

DEPOIS (paralelo, sem timeout artificial):
  signIn: 3s + max(profile, role): 5s = 8s total, sem falsos erros
```

## Ficheiros alterados

| Ficheiro | Alteração |
|---|---|
| `src/contexts/AuthContext.tsx` | Queries paralelas, remover withTimeout, separar erro rede vs permissões, evitar fetch duplicado |
| `src/pages/LoginPage.tsx` | Remover mensagens enganadoras de servidor lento |

