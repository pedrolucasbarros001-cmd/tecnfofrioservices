
Objetivo: resolver o congelamento de interação (“clica e nada acontece”) para o José Alves e qualquer utilizador após tempo parado na mesma tela.

Diagnóstico técnico (com evidências)
- A conta está válida (perfil existe, role em `user_roles` = `dono`, onboarding completo).
- As chamadas de rede continuam a funcionar em loop (services/budgets/notifications 200), ou seja, a app não está “morta”.
- O sintoma descrito (“tudo visível, mas nenhum botão responde”) é típico de camada de overlay invisível capturando clique.
- O projeto usa vários overlays de tela cheia (Radix Dialog/Sheet + GuidedTour/Demo) com `position: fixed; inset: 0`.
- Em `DialogOverlay` e `SheetOverlay`, não há proteção explícita para desabilitar eventos quando estado está fechado (`data-state=closed`), o que pode deixar uma camada a bloquear interações após idle/retorno de aba.

Do I know what the issue is?
- Sim, com alta confiança: bloqueio global de pointer events por overlay residual (Dialog/Sheet/Tour/Demo) após inatividade/retomada de aba.
- A parte de sessão pode coexistir noutros fluxos, mas não explica “sidebar e botões não navegam” com app ainda renderizando e API respondendo.

Plano de implementação

1) Blindagem de overlays Radix (correção principal)
- Ficheiro: `src/components/ui/dialog.tsx`
  - Ajustar classes do `DialogOverlay` para:
    - `data-[state=open]:pointer-events-auto`
    - `data-[state=closed]:pointer-events-none`
- Ficheiro: `src/components/ui/sheet.tsx`
  - Mesmo ajuste no `SheetOverlay`.

Resultado esperado:
- Mesmo que o overlay feche e permaneça momentaneamente no DOM, não bloqueará cliques quando `closed`.

2) Failsafe global por CSS (defesa em profundidade)
- Ficheiro: `src/index.css`
- Adicionar regra global de segurança:
  - `[data-radix-dialog-overlay][data-state="closed"] { pointer-events: none !important; }`
  - `[vaul-overlay][data-state="closed"] { pointer-events: none !important; }` (se aplicável)
- Manter sem mexer nas regras de print já existentes.

Resultado esperado:
- Camadas residuais “fantasma” deixam de capturar input, mesmo fora dos componentes principais.

3) Recuperação automática ao voltar de inatividade (robustez)
- Ficheiro: `src/components/layouts/AppLayout.tsx`
- Adicionar efeito leve em `visibilitychange` e `focus` para:
  - Fechar painel de notificações (`setShowNotifications(false)`), evitando sheet aberto residual após tab idle.
  - Remover classes de estado órfãs de tour/demo no `body` se não houver UI ativa correspondente.
- Não alterar lógica funcional de negócio; apenas sanitização de UI global.

Resultado esperado:
- Após ficar horas parado, ao voltar para a aba a interface volta clicável.

4) Hardening do overlay de tour/demo (sem quebrar onboarding)
- Ficheiros:
  - `src/components/onboarding/GuidedTour.tsx`
  - `src/components/onboarding/DemoRunner.tsx`
- Adicionar fallback de timeout defensivo para sair de estado “navigating” prolongado (ex.: >5s) e desmontar overlay se seletor alvo não existir.
- Garantir cleanup completo de listeners/refs em mudança de aba.

Resultado esperado:
- Overlay de tutorial/demo não fica preso em tela cheia bloqueando tudo.

5) Observabilidade mínima para confirmar correção
- Adicionar logs temporários de debug (curtos) quando houver:
  - Overlay `open/closed`
  - `visibilitychange` -> rotina de recuperação
  - Detecção de overlay órfão
- Objetivo: confirmar no próximo relato sem adivinhação.

Validação (E2E)
- Cenário A (desktop, dono):
  1. Login como José.
  2. Navegar por sidebar (Dashboard → Geral → Clientes → Oficina).
  3. Deixar aba inativa por 20-60 min.
  4. Voltar e clicar em sidebar, cards e botões de ação.
  5. Confirmar que URL muda e páginas abrem normalmente.
- Cenário B (com modal):
  1. Abrir/fechar Sheet de notificações.
  2. Abrir/fechar modais de serviço.
  3. Confirmar que após fechar tudo, a tela continua clicável.
- Cenário C (tour/demo):
  1. Iniciar e interromper tour/demo.
  2. Trocar aba e voltar.
  3. Confirmar ausência de bloqueio global.

Ficheiros previstos para alteração
- `src/components/ui/dialog.tsx`
- `src/components/ui/sheet.tsx`
- `src/index.css`
- `src/components/layouts/AppLayout.tsx`
- `src/components/onboarding/GuidedTour.tsx`
- `src/components/onboarding/DemoRunner.tsx`

Risco e mitigação
- Risco: interferir no comportamento legítimo de bloqueio quando modal está aberto.
- Mitigação: só desabilitar pointer-events no estado `closed`; estado `open` permanece bloqueante como esperado.
- Risco: cleanup de body classes remover estado válido.
- Mitigação: validar antes por presença real de componentes ativos.

Critério de pronto
- Não existe mais estado em que a UI fica visível porém “morta” ao clique.
- Sidebar e botões voltam a responder imediatamente após períodos longos de inatividade.
