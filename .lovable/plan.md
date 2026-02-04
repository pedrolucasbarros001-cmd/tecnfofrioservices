
## Objetivo
Fazer com que as páginas dedicadas **Ver Ficha** (`/print/service/:serviceId`) e **Ver Etiqueta** (`/print/tag/:serviceId`) deixem de abrir “em branco” e mostrem:
- **Ficha** em **A4**, com botões “Imprimir” e “Baixar PDF”.
- **Etiqueta** em **4x6"** (102mm x 152mm), com “Imprimir” e “Baixar PDF”.

## O que está a acontecer (diagnóstico provável)
Hoje os botões “Ver Ficha / Ver Etiqueta” abrem uma **nova aba** via `window.open('/print/...')`.

Em ambientes como o **Preview do Lovable** (app dentro de iframe / URL com `__lovable_token`), duas coisas podem causar “aba em branco”:
1) A nova aba pode abrir **sem o query param `__lovable_token`** (quando ele existe), e o preview pode não carregar corretamente.
2) Mesmo carregando, a nova aba pode **não ter a sessão Supabase** (storage particionado entre iframe e top-level em alguns browsers). Aí a rota protegida redireciona e o utilizador “perde” a renderização da ficha/etiqueta.

A correção mais robusta é:
- Abrir a nova aba **preservando o query string atual** (incluindo `__lovable_token` quando existir).
- Implementar um **“bridge” de sessão** (opener → nova aba) via `postMessage`, para garantir que a aba de impressão consegue autenticar mesmo quando o storage não é partilhado.
- Evitar que `ProtectedRoute` bloqueie a montagem das páginas de impressão antes do bridge atuar (senão a página nunca chega a executar a lógica de recuperação).

---

## Mudanças planejadas (alto nível)
### 1) Abrir “Ver Ficha / Ver Etiqueta” com URL completa (preservar query params)
**Porquê:** resolve o caso do preview exigir `__lovable_token` e evita “branco” por URL incompleta.

**Implementação:**
- Criar um helper tipo `openInNewTabPreservingQuery(pathname: string)` que:
  - Constrói `new URL(pathname, window.location.href)`
  - Copia `window.location.search` (ou pelo menos o `__lovable_token` se existir)
  - Faz `window.open(url.toString(), '_blank')`

**Locais a atualizar:**
- `src/components/services/ServiceDetailSheet.tsx` (onde está “Ver Ficha” e “Ver Etiqueta”)
- `src/pages/ServiceDetailPage.tsx` (botão que abre ficha)
- (Opcional) qualquer outro `window.open('/print/...')` encontrado via search.

---

### 2) Session Bridge (Supabase) para nova aba de impressão
**Porquê:** em browsers com storage particionado (muito comum com iframes/preview), a nova aba abre “sem sessão”. O bridge injeta a sessão na nova aba sem colocar tokens na URL.

**2.1) Listener global no app (responde pedidos de sessão)**
Adicionar no `AuthProvider` (`src/contexts/AuthContext.tsx`) um `window.addEventListener('message', ...)` que:
- Valida `event.origin === window.location.origin`
- Se receber `{ type: 'REQUEST_SUPABASE_SESSION' }`:
  - chama `supabase.auth.getSession()`
  - se houver `session`, responde para `event.source` com `{ type: 'SUPABASE_SESSION', access_token, refresh_token }`
- Cleanup no unmount.

**2.2) Hook/efeito nas páginas de impressão (pede sessão ao opener)**
Em `src/pages/ServicePrintPage.tsx` e `src/pages/ServiceTagPage.tsx`:
- No mount:
  - chama `supabase.auth.getSession()`
  - se **não** houver sessão e `window.opener` existir:
    - registra listener de message para receber `SUPABASE_SESSION`
    - manda `window.opener.postMessage({ type: 'REQUEST_SUPABASE_SESSION' }, window.location.origin)`
    - ao receber tokens, chama `supabase.auth.setSession({ access_token, refresh_token })`
- UX: mostrar um estado “A verificar sessão…” enquanto tenta o bridge.
- Timeout opcional (ex.: 3–5s): se não receber sessão, mostrar CTA para Login.

**Segurança:**
- Não enviar tokens para origem diferente.
- Só aceitar mensagens do `window.location.origin`.

---

### 3) Ajustar proteção de rota para não impedir o bridge
Hoje as rotas de impressão estão assim (em `src/App.tsx`):
```tsx
<Route path="/print/service/:serviceId" element={<ProtectedRoute><ServicePrintPage/></ProtectedRoute>} />
<Route path="/print/tag/:serviceId" element={<ProtectedRoute><ServiceTagPage/></ProtectedRoute>} />
```
Isto impede a página de impressão de montar quando a nova aba abre sem sessão (e aí nunca roda o bridge).

**Opção A (recomendada): remover `ProtectedRoute` dessas rotas**
- Deixar as páginas de impressão montarem.
- Dentro delas, controlar:
  - “A verificar sessão…”
  - Se falhar: “Precisa de login” (botão vai para `/login` com redirect de volta)

**Opção B:** criar um `PrintProtectedRoute` que aguarda um “auth settle” extra e não redireciona imediatamente. (Mais complexo; A é mais simples e resiliente.)

---

### 4) Melhorar fallback e mensagens (para não parecer “em branco”)
Em ambas páginas:
- Se `!authLoading && !isAuthenticated` após tentar o bridge:
  - Mostrar um bloco claro:
    - “Sessão não encontrada nesta aba.”
    - Botão “Fazer login” que navega para `/login` e volta ao `/print/...` depois do login.
- Se React Query der `error`, mostrar erro + “Tentar novamente”.

---

### 5) Garantir 4x6 em todos os caminhos de etiqueta
Já existe `format: [102, 152]` no `ServiceTagPage.tsx`, mas há util antigo:
- `src/utils/pdfUtils.ts` tem `generateTagPDF()` ainda em **[80, 170]**.
  - Atualizar para `[102, 152]` para não haver inconsistências em outros pontos (ex.: modal de etiqueta).

Também ajustar texto/comentário no `ServiceTagPage.tsx`:
- “Tag Content - 80mm x 170mm” → “4x6 (102mm x 152mm)”.

---

## Arquivos que serão mexidos
1) `src/components/services/ServiceDetailSheet.tsx`  
2) `src/pages/ServiceDetailPage.tsx`  
3) `src/contexts/AuthContext.tsx`  
4) `src/App.tsx`  
5) `src/pages/ServicePrintPage.tsx`  
6) `src/pages/ServiceTagPage.tsx`  
7) `src/utils/pdfUtils.ts`  
(+ opcional: um helper novo `src/utils/openInNewTab.ts` e/ou `src/hooks/usePrintSessionBridge.ts` para manter o código limpo)

---

## Como vamos testar (checklist)
1) No Preview do Lovable (dentro do editor):
   - Abrir um serviço → clicar **Ver Ficha**:
     - Nova aba deve mostrar “A verificar sessão…” por instantes e depois a Ficha A4 completa.
     - Botões **Imprimir** e **Baixar PDF** funcionam.
   - Clicar **Ver Etiqueta**:
     - Renderiza etiqueta em 4x6 (102x152mm), com QR code e botões funcionando.
2) No site publicado (top-level):
   - Repetir os mesmos passos e confirmar que não depende do `__lovable_token`.
3) Caso sem sessão:
   - Abrir manualmente `/print/service/:id` em janela anónima:
     - Deve mostrar CTA de login (não “branco”).

---

## Riscos / Observações
- O bridge depende de `window.opener`. Se o browser abrir a aba com `noopener` automaticamente, o fallback (CTA login) resolve.
- Como estamos a enviar `refresh_token` via `postMessage`, a validação estrita de `origin` é obrigatória.

Se aprovar este plano, na implementação eu foco primeiro em: (1) preservar query no `window.open`, (2) session bridge, (3) remover `ProtectedRoute` das rotas de print, porque isso normalmente resolve o “branco” de forma definitiva no preview e em browsers com storage particionado.
