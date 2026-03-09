

## Auditoria de Rigidez: Autenticação, Rotas e Anti-Crash

### Estado Atual vs. Regras

Após análise dos ficheiros `AuthContext.tsx`, `ProtectedRoute.tsx`, `LoginPage.tsx`, `App.tsx`, `ErrorBoundary.tsx` e `types/database.ts`, o sistema já implementa a maioria das regras solicitadas. Segue o que está conforme e o que precisa de ajuste.

---

### SKILL 1: Anti-Crash — Conformidade

| Regra | Estado | Notas |
|-------|--------|-------|
| `translate="no"` no `<html>` | OK | Já presente em `index.html` |
| ErrorBoundary global | OK | Envolve toda a app em `App.tsx` |
| GlobalErrorHandler (unhandledrejection) | OK | Implementado com `import.meta.env.DEV` |
| Optional chaining em dados do Supabase | Parcial | A maioria dos componentes usa, mas não é universal |

**Violação encontrada**: O botão "Problemas ao entrar? Limpar sessão local" no `LoginPage.tsx` (linha 232) executa `localStorage.clear()` — isto **apaga os rascunhos dos técnicos**, violando a Skill 2 e 3.

### SKILL 2: Autenticação & RBAC — Conformidade

| Regra | Estado | Notas |
|-------|--------|-------|
| Tipagem forte de roles | OK | `AppRole = 'dono' \| 'secretaria' \| 'tecnico' \| 'monitor'` |
| Loading state global | OK | `ProtectedRoute` bloqueia renderização até `loading=false` |
| Limpeza de cache no login | OK | `queryClient.clear()` + limpeza de `sb-*` keys |
| Preservação de rascunhos | OK no `signIn()` | Mas **violado** pelo botão "Limpar sessão local" |
| Retry de rede no login | OK | Até 2 retries com backoff |
| Guarda para role nulo | OK | `ProtectedRoute` redireciona para `/login` se role é null |

**Violação encontrada**: `LoginPage.tsx` linha 232 — `localStorage.clear()` apaga tudo incluindo rascunhos.

### SKILL 3: Workflow Persistence — Conformidade

| Regra | Estado | Notas |
|-------|--------|-------|
| Persistência no Supabase (flow_step/flow_data) | OK | Via `technician_update_service` RPC |
| Recuperação de estado | OK | `deriveStepFromDb` com whitelist `VALID_STEPS_BY_FLOW` |

Sem violações nesta skill, exceto o risco do `localStorage.clear()` mencionado acima.

---

### Correções Necessárias (2 pontos)

#### 1. LoginPage.tsx — Botão "Limpar sessão local"

**Problema**: `localStorage.clear()` apaga **tudo**, incluindo rascunhos de técnicos.

**Correção**: Substituir por limpeza seletiva que remove apenas chaves de autenticação (`sb-*`), preservando rascunhos:

```ts
Object.keys(localStorage).forEach((key) => {
  if (key.startsWith('sb-')) {
    localStorage.removeItem(key);
  }
});
```

#### 2. LoginPage.tsx — Estado `isAuthenticated && !role` mais robusto

**Problema**: Quando o utilizador está autenticado mas sem role, o ecrã de fallback oferece "Sair e Limpar Sessão" que faz `signOut()` + `window.location.reload()`. Isto é correto, mas o botão de reload simples (`window.location.reload()`) pode não resolver se o problema for persistente.

**Correção**: No botão "Tentar Ligar Novamente", em vez de apenas reload, forçar re-hidratação chamando `signOut()` seguido de redirect para `/login` para garantir estado limpo.

---

### Ficheiros a Modificar

1. **`src/pages/LoginPage.tsx`** — Corrigir `localStorage.clear()` para limpeza seletiva; melhorar fallback de role nulo.

Nenhuma migração de base de dados necessária. Nenhum ficheiro novo.

