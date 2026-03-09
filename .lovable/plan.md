

## Dry Run E2E: Diagnóstico e Correções

### Simulação 1: Clique Impulsivo (Race Conditions)

**Falhas encontradas:**

| Função | Ficheiro | Tem guarda `isSubmitting`? |
|--------|----------|--------------------------|
| `handleStartVisit` | VisitFlowModals.tsx:288 | **NAO** |
| `handleStartInstallation` | InstallationFlowModals.tsx:152 | **NAO** |
| `handleStartDelivery` | DeliveryFlowModals.tsx:139 | **NAO** |
| `handleStartRepair` | WorkshopFlowModals.tsx:296 | SIM |
| `handleSignatureComplete` (todos) | Todos os flows | SIM |
| `handleConfirmArticles` (todos) | Todos os flows | SIM |

**Problema real**: O técnico clica 3x em "Iniciar Visita" — dispara 3 chamadas RPC `technician_update_service` com `status: 'em_execucao'`. A RPC é idempotente (COALESCE), então não corrompe dados, mas gera 3 chamadas desnecessárias e 3 `invalidateQueries`. Mais grave: `safeSetStep` é chamado 3x, potencialmente causando flicker no modal.

**Correção**: Adicionar guarda `isSubmitting` a `handleStartVisit`, `handleStartInstallation` e `handleStartDelivery`, exatamente como `handleStartRepair` já faz.

---

### Simulação 2: Navegação Interrompida (Teardown/Cleanup)

**Estado atual**: Os flows usam `hasInitialized.current = false` no cleanup do `useEffect` quando `isOpen` muda para false. O `useFlowPersistence` limpa o timer de debounce no unmount (`useEffect` cleanup na linha 401-407). O `flushStateToDb` é chamado no `handleClose`.

**Falha encontrada**: As funções async (`handlePhotoCapture`, `handleSignatureComplete`, `handleConfirmArticles`) fazem `setFormData`, `setIsSubmitting(false)`, `setShowCamera(false)` etc. após o `await`. Se o utilizador fechar o modal enquanto o upload está em curso, o `setState` dispara num componente potencialmente desmontado.

**Risco real**: Em React 18, `setState` em componente desmontado é silenciosamente ignorado (não crasha). No entanto, o comportamento pode causar inconsistência se o utilizador reabrir o mesmo serviço imediatamente.

**Correção**: Adicionar um `useRef` de `isMounted` nos 4 flow modals e verificar antes de cada `setState` pós-async. Isto é uma melhoria defensiva, não uma correção de crash.

---

### Simulação 3: Dados Incompletos / Lentidão

**DashboardPage (linha 109)**: `services?.forEach(...)` — já usa optional chaining. Campos como `service.final_price || 0` estão protegidos. OK.

**ServicosPage**: `service.customer?.name`, `service.customer?.phone` — já usa optional chaining. OK.

**VisitFlowModals (linha 839)**: `service.customer?.name || "N/A"` — protegido. OK.

**Falha encontrada**: Nenhum Skeleton é mostrado durante o `isResuming` state no `VisitFlowModals`. O botão mostra "A carregar..." mas o conteúdo do modal já está visível com dados potencialmente incompletos. Isto não é um crash, mas é uma experiência degradada.

**Correção mínima**: Não é necessária — os dados vêm do `service` prop que já está carregado. O `isResuming` apenas bloqueia o botão enquanto o `deriveStepFromDb` completa.

---

### Simulação 4: Fluxo do Técnico (Teste de Fogo)

Técnico faz Login → Abre Serviço A → Inicia Visita → Modal Etapa 1 → Fecha → Reabre.

**Caminho de código rastreado**:
1. `handleClose()` chama `flushStateToDb(currentStep, formData)` — grava imediatamente no DB
2. `clearState` NÃO é chamado (apenas no `handleSignatureComplete` final) — localStorage preservado
3. Reabre → `useEffect` com `isOpen=true` → `loadState()` encontra localStorage → restaura step + formData
4. Se localStorage vazio → `deriveStepFromDb` lê do DB → restaura com whitelist de validação

**Resultado**: O fluxo preserva corretamente a etapa e os dados. Aprovado.

---

### Plano de Correções

**Ficheiros a modificar (3):**

1. **`src/components/technician/VisitFlowModals.tsx`**
   - Envolver `handleStartVisit` com guarda `isSubmitting`: `if (isSubmitting) return; setIsSubmitting(true); ... finally { setIsSubmitting(false); }`
   - Desabilitar botão "Iniciar Visita" com `disabled={isResuming || isSubmitting}`

2. **`src/components/technician/InstallationFlowModals.tsx`**
   - Mesmo padrão em `handleStartInstallation`
   - Desabilitar botão com `disabled={isResuming || isSubmitting}`

3. **`src/components/technician/DeliveryFlowModals.tsx`**
   - Mesmo padrão em `handleStartDelivery`
   - Desabilitar botão com `disabled={isResuming || isSubmitting}`

**Sem migrações de base de dados.** As chamadas RPC já são idempotentes. A correção é puramente de UX e prevenção de chamadas duplicadas.

