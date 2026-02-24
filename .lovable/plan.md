
Objetivo principal
- Eliminar os fechamentos indevidos de modais, travamentos de fluxo e estados inconsistentes nos fluxos do técnico (Visita, Entrega, Instalação, Oficina), com validação de navegação real (não apenas leitura de ficheiros).
- Padronizar uma estrutura de fluxo para parar de “corrigir sempre” os mesmos problemas.

Do I know what the issue is?
- Sim.
- A causa principal dos fechamentos inesperados é combinação de:
  1) múltiplos `Dialog` independentes por passo dentro do mesmo fluxo;
  2) `onOpenChange` mal guardado (em alguns pontos fecha sempre, mesmo quando não devia);
  3) fechamento legítimo de um passo durante transição disparando `onOpenChange(false)` e sendo interpretado como “fechar fluxo todo”.
- Há também pontos secundários:
  - `FieldPaymentStep` e `SignatureCanvas` com `onOpenChange` agressivo;
  - custo desnecessário de carregamento em resumo com histórico (querys montadas cedo demais);
  - warning de ref no Sidebar que pode gerar comportamento UI inconsistente em mobile/sheet.

Evidências técnicas encontradas
- `VisitFlowModals`: existe `onOpenChange={() => handleClose()}` em diálogo principal (fecha sempre, inclusive em transições).
- `WorkshopFlowModals`: também há `onOpenChange={() => handleClose()}` em passos.
- `DeliveryFlowModals` e `InstallationFlowModals`: usam `!open && handleClose()`, porém continuam vulneráveis quando um `Dialog` fecha por mudança de passo e outro abre no mesmo fluxo.
- `FieldPaymentStep`: `onOpenChange={() => handleSkip()}` (executa skip de forma agressiva).
- `SignatureCanvas`: `onOpenChange={handleClose}` (sem distinguir `open` true/false).
- Console aponta warning de ref ligado ao `Sidebar`/`Dialog`, exigindo hardening para evitar efeitos colaterais.

Estratégia de correção (arquitetura padrão)
- Em vez de continuar com correções pontuais por botão, vou aplicar uma padronização única de controle de fechamento para todos os fluxos:
  - “Fechar fluxo” só quando houver intenção real de fechar (X/backdrop/escape), não durante troca de passo.
  - Transição de passo nunca pode disparar fechamento global.
- Isso cria uma base estável para Visita, Entrega, Instalação e Oficina com mesma lógica.

Plano de implementação

1) Guardião único de fechamento por passo (core fix)
- Ficheiros:
  - `src/components/technician/VisitFlowModals.tsx`
  - `src/components/technician/DeliveryFlowModals.tsx`
  - `src/components/technician/InstallationFlowModals.tsx`
  - `src/components/technician/WorkshopFlowModals.tsx`
- Implementar handler padrão por passo:
  - `handleStepDialogOpenChange(open, stepId)`:
    - se `open === true`, não fecha nada;
    - se `currentStep !== stepId`, ignorar (foi transição interna de passo);
    - só chamar `handleClose()` quando `open === false` e o passo atual ainda é aquele diálogo.
- Substituir todos os `onOpenChange` dos passos para esse padrão.
- Corrigir imediatamente todos os `onOpenChange={() => handleClose()}` e equivalentes.

Resultado esperado:
- Botões “Iniciar/Continuar/Concluir” deixam de fechar o fluxo acidentalmente.
- Troca entre modais de passo não derruba para agenda/página de fundo.

2) Normalização de submodais (pagamento, assinatura, câmara)
- Ficheiros:
  - `src/components/technician/FieldPaymentStep.tsx`
  - `src/components/shared/SignatureCanvas.tsx`
  - (revisão de consistência em `CameraCapture.tsx`)
- Ajustes:
  - `FieldPaymentStep`: `onOpenChange={(open) => { if (!open) handleSkip(); }}`
  - `SignatureCanvas`: `onOpenChange={(open) => { if (!open) handleClose(); }}`
  - Garantir que nenhum submodal execute “close side effects” quando abrir.
- Resultado:
  - Evita salto de etapas e assinatura/pagamento sumindo por callback indevido.

3) Performance de retoma em serviços com histórico (reparação/oficina)
- Ficheiros:
  - `src/components/technician/ServicePreviousSummary.tsx`
  - `src/components/technician/DiagnosisPhotosGallery.tsx`
  - `src/components/technician/WorkshopFlowModals.tsx`
  - `src/components/technician/VisitFlowModals.tsx`
- Ajustes:
  - Lazy-load de dados pesados do resumo anterior apenas quando bloco expandido/necessário.
  - Evitar cargas de miniaturas/fotos não visíveis no primeiro paint.
  - Revisar “estado de retoma” para não bloquear botão por tempo excessivo se fallback já resolver.
- Resultado:
  - Fluxo de reparação com histórico deixa de “ficar carregando” por demasiado tempo antes de responder.

4) Hardening de sidebar/ref warning (estabilidade geral de navegação)
- Ficheiros:
  - `src/components/ui/sidebar.tsx`
  - sidebars de layout se necessário (`OwnerSidebar`, `SecretarySidebar`, `TechnicianSidebar`)
- Objetivo:
  - Eliminar warning “Function components cannot be given refs” no caminho de render da Sidebar/Dialog.
  - Remover fonte de comportamento não determinístico em mobile + sheet.
- Resultado:
  - Menos ruído no runtime e menos risco de regressões de interação.

5) Auditoria de botões críticos e guardas de submissão
- Ficheiros foco:
  - Fluxos técnicos (4 ficheiros acima)
  - Hooks auxiliares de update (`useServices`, `useFlowPersistence`) apenas se necessário
- Validar:
  - todos os botões finais com `isSubmitting`;
  - nenhuma ação crítica sem `ensureValidSession`;
  - transições de estado sem loops (ex.: `em_execucao` → passos → conclusão).
- Resultado:
  - proteção contra clique duplo, race conditions e duplicação de eventos.

Validação prática (navegação real + regressão)

Matriz E2E obrigatória
1) Entrega (rota `/servicos`)
- Abrir card entrega → “Começar” → “Iniciar Entrega” → avançar todos os passos
- Confirmar que não retorna à agenda ao trocar de passo
- Fechar por X/cancelar e confirmar fechamento correto

2) Visita
- Iniciar visita nova e visita com histórico
- Testar botões: iniciar, fotos, diagnóstico, decisão, pedir peça, assinatura
- Confirmar que nenhum botão fecha fluxo indevidamente

3) Instalação
- Iniciar, deslocação, foto antes/depois, materiais, trabalho, pagamento, assinatura
- Validar mudança de passo contínua sem desmontar fluxo

4) Oficina
- Reparação normal e continuação de peça
- Confirmar “Iniciar/Continuar Reparação”, confirmação de peça, conclusão
- Garantir ausência de fechamento abrupto

5) Navegação/estabilidade global
- Abrir/fechar notificações, trocar abas, voltar, repetir fluxos
- Conferir console limpo de warning crítico de ref e sem erros de runtime

Critério de pronto
- Nenhum fluxo técnico fecha sozinho ao trocar de passo.
- Botões críticos não causam retorno inesperado para agenda.
- Reparação com histórico responde sem demora anormal.
- Submodais (pagamento/assinatura/câmara) não provocam side effects de fechamento.
- Sem erros de console que indiquem problema estrutural de interação.

Observação importante sobre “garantir que nunca mais acontece”
- Garantia absoluta (“jamais”) não existe em software, mas esta entrega vai incluir:
  - correção estrutural da causa raiz;
  - padronização de fechamento para todos os fluxos;
  - validação E2E de navegação real;
  - hardening contra regressões.
- Isso reduz drasticamente a probabilidade de repetição e elimina os cenários reportados agora.
