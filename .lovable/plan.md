
# Plano de Estabilização dos Fluxos do Técnico — CONCLUÍDO

## Correções aplicadas

### 1. onOpenChange padronizado (causa raiz dos fechamentos)
- **VisitFlowModals.tsx** (linha 723): `onOpenChange={() => handleClose())` → `onOpenChange={(open) => { if (!open) handleClose(); }}`
- **WorkshopFlowModals.tsx** (linhas 440, 523, 579): mesma correção em 3 pontos
- **DeliveryFlowModals.tsx**: já estava correto
- **InstallationFlowModals.tsx**: já estava correto

### 2. Submodais normalizados
- **FieldPaymentStep.tsx** (linha 153): `onOpenChange={() => handleSkip())` → `onOpenChange={(o) => { if (!o) handleSkip(); }}`
- **SignatureCanvas.tsx** (linha 118): `onOpenChange={handleClose}` → `onOpenChange={(o) => { if (!o) handleClose(); }}`

### 3. Performance de retoma (oficina/reparação com histórico)
- **ServicePreviousSummary.tsx**: queries de activity_logs e photos agora são lazy (`enabled: isExpanded`), com `staleTime: 30_000`
- Resultado: modal de resumo abre imediatamente sem esperar por dados pesados

### 4. Sidebar (hardening)
- O sidebar.tsx já usa `forwardRef` corretamente em todos os componentes — sem alteração necessária
