
# Onboarding Tour Guiado ao Vivo

## Resumo

Substituir o onboarding modal actual por um sistema de **tour guiado ao vivo** que destaca elementos reais da interface com um overlay spotlight (fundo escuro com recorte no elemento alvo) e um tooltip posicionado com texto didactico detalhado. O tour navega automaticamente entre paginas, destacando sidebars, botoes, tabelas, modais e accoes para cada role.

## Como funciona

1. O utilizador inicia o tour (automaticamente na primeira sessao ou via Preferencias)
2. Um overlay escuro cobre toda a pagina, com um recorte rectangular sobre o elemento destacado
3. Um tooltip aparece ao lado do elemento com titulo, descricao, bullet points e botoes de navegacao
4. O sistema navega automaticamente para a pagina correcta quando o passo exige outra rota
5. O utilizador avanca com "Proximo", recua com "Anterior" ou salta com "Saltar guia"
6. Passos sem selector (welcome/final) mostram um card central flutuante (sem spotlight)

## Componentes a criar

### 1. GuidedTourOverlay.tsx (novo)

Overlay SVG fullscreen com mascara que cria o efeito spotlight:
- Fundo semi-transparente (rgba(0,0,0,0.65))
- Recorte rectangular com border-radius sobre o elemento alvo
- Calculo de posicao via `getBoundingClientRect()` + `ResizeObserver` + `scroll listener`
- Transicao suave ao mudar de elemento (300ms)
- `pointer-events: none` no overlay, `pointer-events: auto` no tooltip

### 2. GuidedTourTooltip.tsx (novo)

Popover posicionado automaticamente (cima/baixo/esquerda/direita conforme espaco disponivel):
- Titulo do passo (bold)
- Descricao principal
- Lista de bullet points (details[])
- Barra de progresso (dots + contador numerico)
- Botoes: "Saltar guia" (ghost), "Anterior" (outline), "Proximo" (primary)
- Seta CSS apontando para o elemento alvo
- Max-width: 400px, com scroll se conteudo exceder

### 3. GuidedTour.tsx (novo)

Componente principal que orquestra tudo:
- Consome `useOnboarding()` para estado e navegacao
- Usa `useNavigate()` para navegar entre paginas quando o passo exige outra rota
- Localiza o elemento alvo via `document.querySelector('[data-tour="..."]')`
- Aguarda a renderizacao do elemento apos navegacao (polling com timeout de 2s)
- Renderiza `GuidedTourOverlay` + `GuidedTourTooltip`
- Trata passos sem `tourSelector` como card central (estilo modal simples, sem spotlight)
- Bloqueia scroll do body enquanto activo

## Alteracoes em ficheiros existentes

### onboardingContent.ts -- Expandir interface e conteudo

Adicionar campos a `OnboardingStepContent`:
- `details: string[]` -- bullet points explicativos
- `tourSelector?: string` -- selector CSS do elemento a destacar (ex: `[data-tour="sidebar-menu"]`)

Expandir conteudo para todos os passos detalhados:

**Dono (22 passos)**:
1. Welcome (sem selector -- card central)
2. Sidebar (`[data-tour="sidebar-menu"]`)
3. Dashboard contadores (`[data-tour="dashboard-cards"]`)
4. Dashboard historico (`[data-tour="activity-history"]`)
5. Geral pagina (`[data-tour="geral-header"]`)
6. Agenda semanal (`[data-tour="weekly-agenda"]`)
7. Novo servico dropdown (`[data-tour="new-service-btn"]`)
8. Modal criar reparacao (sem selector -- card central, explica o modal)
9. Tabela servicos (`[data-tour="services-table"]`)
10. Botoes de accao (`[data-tour="action-buttons"]`)
11. Ficha lateral (sem selector -- card central, explica o sheet)
12. Timeline (sem selector -- card central)
13. Atribuir tecnico (sem selector -- card central, explica o modal)
14. Precificar (sem selector -- card central)
15. Pedido de peca (sem selector -- card central)
16. Notificacoes (`[data-tour="notifications-btn"]`)
17. Oficina (`[data-tour="oficina-cards"]`)
18. Clientes (`[data-tour="clientes-header"]`)
19. Orcamentos (`[data-tour="orcamentos-header"]`)
20. Performance (`[data-tour="performance-cards"]`)
21. Colaboradores (`[data-tour="colaboradores-header"]`)
22. Final (sem selector -- card central)

**Secretaria (16 passos)**:
1. Welcome (card central)
2. Sidebar (`[data-tour="sidebar-menu"]`)
3. Geral criar (`[data-tour="new-service-btn"]`)
4. Pesquisa (`[data-tour="search-bar"]`)
5. Atribuir tecnico (card central)
6. Oficina (`[data-tour="oficina-cards"]`)
7. Concluidos (`[data-tour="concluidos-header"]`)
8. Gerir entrega (card central)
9. Em debito (`[data-tour="debito-header"]`)
10. Registar pagamento (card central)
11. Contactar cliente (card central)
12. Ficha lateral (card central)
13. Clientes (`[data-tour="clientes-header"]`)
14. Notificacoes (`[data-tour="notifications-btn"]`)
15. Preferencias (`[data-tour="preferencias-header"]`)
16. Final (card central)

**Tecnico (18 passos)**:
1. Welcome (card central)
2. Sidebar (`[data-tour="sidebar-menu"]`)
3. Agenda diaria (`[data-tour="servicos-agenda"]`)
4. Cards de servico (`[data-tour="service-cards"]`)
5. Comecar servico (`[data-tour="start-service-btn"]`)
6. Resumo anterior (card central)
7. Deslocacao GPS (card central)
8. Fotos obrigatorias (card central)
9. Diagnostico (card central)
10. Decisao principal (card central)
11. Pecas usadas (card central)
12. Assinatura digital (card central)
13. Pedir peca (card central)
14. Oficina tecnico (`[data-tour="oficina-tecnico"]`)
15. Fluxo oficina (card central)
16. Perfil (`[data-tour="perfil-header"]`)
17. Preferencias (`[data-tour="preferencias-header"]`)
18. Final (card central)

### Adicionar atributos data-tour nos componentes

Ficheiros a editar com `data-tour` attributes:

- `OwnerSidebar.tsx`: `data-tour="sidebar-menu"` no `<SidebarMenu>`
- `SecretarySidebar.tsx`: `data-tour="sidebar-menu"` no `<SidebarMenu>`
- `TechnicianSidebar.tsx`: `data-tour="sidebar-menu"` no `<SidebarMenu>`
- `AppLayout.tsx`: `data-tour="notifications-btn"` no botao Bell
- `DashboardPage.tsx`: `data-tour="dashboard-cards"` no grid de cards, `data-tour="activity-history"` no card de historico
- `GeralPage.tsx`: `data-tour="geral-header"` no header, `data-tour="new-service-btn"` no dropdown, `data-tour="search-bar"` no input, `data-tour="services-table"` na tabela
- `WeeklyAgenda.tsx`: `data-tour="weekly-agenda"` no container
- `OficinaPage.tsx`: `data-tour="oficina-cards"` no grid
- `ClientesPage.tsx`: `data-tour="clientes-header"` no header
- `OrcamentosPage.tsx`: `data-tour="orcamentos-header"` no header
- `PerformancePage.tsx`: `data-tour="performance-cards"` no grid
- `ColaboradoresPage.tsx`: `data-tour="colaboradores-header"` no header
- `ServicosPage.tsx`: `data-tour="servicos-agenda"` no container, `data-tour="service-cards"` nos cards
- `TechnicianOfficePage.tsx`: `data-tour="oficina-tecnico"` no container
- `PerfilPage.tsx`: `data-tour="perfil-header"` no header
- `PreferenciasPage.tsx`: `data-tour="preferencias-header"` no header
- `SecretaryConcluidosPage.tsx`: `data-tour="concluidos-header"` no header
- `SecretaryDebitoPage.tsx`: `data-tour="debito-header"` no header

### OnboardingContext.tsx -- Sem alteracoes estruturais

O contexto actual ja suporta tudo o que o tour precisa (isOpen, currentStep, nextStep, prevStep, skip, complete, navigate por page). Apenas o `OnboardingModal` deixa de ser usado e e substituido pelo `GuidedTour`.

### AppLayout.tsx -- Substituir OnboardingModal por GuidedTour

Trocar:
```text
{isOnboardingOpen && <OnboardingModal />}
```
Por:
```text
{isOnboardingOpen && <GuidedTour />}
```

### OnboardingModal.tsx -- Manter como ficheiro (nao eliminar)

Manter o ficheiro para referencia futura ou modo alternativo, mas deixar de o importar no AppLayout.

## Detalhes tecnicos do spotlight

### Calculo de posicao do recorte

```text
1. querySelector('[data-tour="..."]')
2. getBoundingClientRect() -> {top, left, width, height}
3. Adicionar padding de 8px a volta
4. Criar SVG path com mascara:
   - Rectangulo fullscreen (fundo escuro)
   - Rectangulo invertido na posicao do elemento (recorte transparente)
   - Border-radius de 8px no recorte
```

### Posicionamento do tooltip

```text
1. Calcular espaco disponivel: cima, baixo, esquerda, direita
2. Preferencia: baixo > direita > esquerda > cima
3. Offset de 12px do elemento
4. Se tooltip sair do viewport, ajustar posicao
5. Seta CSS aponta para o centro do elemento
```

### Navegacao entre paginas

```text
1. Se step.page !== currentPath:
   a. navigate(step.page)
   b. Polling: verificar se elemento existe (100ms interval, 2s timeout)
   c. Quando encontrado, posicionar spotlight
2. Se step.page === currentPath:
   a. Posicionar spotlight imediatamente
3. Se step nao tem tourSelector:
   a. Mostrar card central (sem spotlight)
```

### Responsividade

- Em mobile, o tooltip aparece sempre em baixo (fullwidth com margem lateral)
- O spotlight funciona igualmente em qualquer resolucao
- Se sidebar estiver collapsed, o tour expande-a primeiro para o passo da sidebar

## Conteudo completo dos passos

Todo o conteudo descrito no pedido original (22 passos Dono, 16 Secretaria, 18 Tecnico) sera implementado integralmente no `onboardingContent.ts`, com:
- `title`: titulo do passo
- `description`: texto didactico principal
- `details`: array de 3-5 bullet points explicativos
- `fallbackIcon`: icone Lucide (mantido para card central)
- `page`: rota da pagina (para navegacao automatica)
- `tourSelector`: selector CSS do elemento (quando aplicavel)

## Sequencia de implementacao

1. Expandir interface `OnboardingStepContent` com `details` e `tourSelector`
2. Reescrever todo o conteudo dos 3 roles (56 passos no total)
3. Criar `GuidedTourOverlay.tsx`
4. Criar `GuidedTourTooltip.tsx`
5. Criar `GuidedTour.tsx`
6. Adicionar `data-tour` attributes em ~18 ficheiros
7. Actualizar `AppLayout.tsx` para usar `GuidedTour` em vez de `OnboardingModal`
8. Testar tour para cada role
