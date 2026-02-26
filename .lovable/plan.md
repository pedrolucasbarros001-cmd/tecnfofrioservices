

# Diagnóstico: Dois cenários de erro distintos

## O que mostram as screenshots

**IMG_8782** — Tela "A carregar..." presa + toast "Ocorreu um erro inesperado"
**IMG_8783** — ErrorBoundary ("Ocorreu um erro") com botões Tentar/Voltar

Estes são dois caminhos de falha diferentes, ambos causados por problemas na função `hydrateSession` do `AuthContext.tsx`.

## Causa raiz identificada (3 bugs)

### Bug 1 — `hydrateSession` não tem try/catch

```typescript
// AuthContext.tsx — callback do onAuthStateChange
async (event, nextSession) => {
  // Se hydrateSession lançar exceção, torna-se unhandled rejection
  await hydrateSession(nextSession);  // ← SEM try/catch
}
```

Se `fetchUserData` falhar por qualquer motivo inesperado (erro de rede transitório, exceção interna do Supabase client), a exceção propaga como **unhandled promise rejection**. O `GlobalErrorHandler` apanha-a e mostra o toast "Ocorreu um erro inesperado". E como `setLoading(false)` nunca executa, a tela fica presa em "A carregar..." para sempre.

### Bug 2 — Bootstrap duplicado cria race condition

Na inicialização da app, AMBOS disparam `hydrateSession` com a mesma sessão:
- `onAuthStateChange(INITIAL_SESSION)` → `hydrateSession(session)` 
- `getSession().then()` → `hydrateSession(session)`

São duas chamadas paralelas não coordenadas. Ambas fazem `setLoading(true)`, ambas chamam `fetchUserData`, ambas fazem `setLoading(false)`. Se a primeira termina e seta `loading=false`, e a segunda ainda está a correr e seta `loading=true` de novo, o utilizador vê "A carregar..." novamente sem razão.

### Bug 3 — ProtectedRoute permite render com `role = null`

```typescript
// ProtectedRoute.tsx linha 30
if (allowedRoles && role && !allowedRoles.includes(role)) {
  return redirect;
}
return <>{children}</>;  // ← Renderiza mesmo com role = null
```

Se `loading = false` mas `role = null` (porque fetchUserData falhou silenciosamente), o ProtectedRoute renderiza os children. Os componentes internos (AppLayout, sidebars, páginas) recebem `role = null` e podem crashar → **ErrorBoundary** (IMG_8783).

## Plano de correção (2 ficheiros)

### `src/contexts/AuthContext.tsx`

1. **Envolver TODO o callback de `onAuthStateChange` em try/catch** — impede unhandled rejections
2. **Eliminar bootstrap duplicado** — usar apenas `onAuthStateChange` para hidratar a sessão inicial; remover o `getSession().then()` separado (o Supabase v2 já dispara `INITIAL_SESSION` automaticamente)
3. **Mover `signInActiveRef = true` para ANTES do `signOut`** no `signIn` — suprime também o evento SIGNED_OUT do cleanup

### `src/components/auth/ProtectedRoute.tsx`

4. **Redirecionar para `/login` quando `loading = false` E `isAuthenticated = true` MAS `role = null`** — indica que a hidratação falhou; em vez de renderizar componentes com dados incompletos, mandar o utilizador para login onde pode tentar de novo

