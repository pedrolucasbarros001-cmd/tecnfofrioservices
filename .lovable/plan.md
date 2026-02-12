
# Tour Guiado — Responsividade Mobile + Interaccao Real com Modais

## Problemas Identificados

1. **Overlay SVG bloqueia cliques no elemento destacado**: O SVG tem `pointer-events: auto` no elemento `<svg>`, o que impede cliques no recorte (cutout). O utilizador nao consegue clicar no botao/elemento que o tour esta a explicar.

2. **Clicar no overlay fecha o tour**: O `onClick={closeOnboarding}` no overlay faz com que qualquer clique feche o tour. Se o utilizador quiser explorar o que o tour esta a mostrar, perde o guia.

3. **Modais aparecem ABAIXO do tour**: O overlay do tour usa `z-[9998]` e o tooltip `z-[9999]`. Os modais Radix usam `z-50`. Quando o utilizador clica num botao que abre um modal, o modal fica escondido atras do overlay escuro do tour.

4. **Scroll do body bloqueado**: `document.body.style.overflow = 'hidden'` causa bugs em mobile, impede scroll necessario para ver elementos fora do viewport.

5. **Tooltip sem responsividade mobile**: Max-width de 420px e posicionamento dinamico pode fazer o tooltip sair do ecra ou ficar sobre o elemento em telemoveis.

6. **Progress dots excessivos**: 22 dots para o Dono nao cabem em ecra mobile.

## Solucao

### 1. GuidedTourOverlay.tsx — Permitir cliques no elemento destacado

Quando existe um `targetRect` (elemento destacado):
- SVG container: `pointer-events: none` (nao captura cliques)
- Path (area escura): `pointer-events: auto` (captura cliques apenas na zona escura)
- Remover `onClick` do SVG; clicks na area escura nao fecham o tour (apenas escurecem)

Quando nao existe targetRect (card central):
- Manter overlay div com `pointer-events: auto` mas SEM onClick (nao fecha ao clicar fora)

Isto permite que o utilizador clique no botao/elemento real que esta dentro do recorte do spotlight.

### 2. GuidedTour.tsx — Coexistencia com modais

- Remover `document.body.style.overflow = 'hidden'` para eliminar bugs de scroll em mobile
- Em vez de bloquear scroll globalmente, usar `overscroll-behavior: contain` apenas no overlay
- Adicionar classe `tour-active` ao `<body>` quando o tour esta aberto, para controlar z-index de modais via CSS
- Remover `onClick={closeOnboarding}` do overlay — o tour so fecha via botao "Saltar guia" ou tecla Escape
- Manter Escape como forma de fechar

### 3. CSS Global (index.css) — Modais acima do tour

Adicionar regras CSS que, quando `body.tour-active` esta activo, elevam o z-index de todos os modais e sheets Radix para ficarem acima do overlay do tour:

```text
body.tour-active [data-radix-dialog-overlay] {
  z-index: 10000 !important;
}
body.tour-active [data-radix-dialog-content] {
  z-index: 10001 !important;
}
```

Isto garante que quando o utilizador clica num botao destacado que abre um modal (ex: "Novo Servico", "Atribuir Tecnico"), o modal aparece POR CIMA do overlay escuro do tour, permitindo ver e interagir com o modal enquanto o tour continua activo.

### 4. GuidedTourTooltip.tsx — Responsividade total em mobile

**Posicionamento mobile** (viewport < 768px):
- Tooltip posiciona-se SEMPRE fixo no fundo do ecra (estilo bottom sheet)
- Width 100% com padding lateral de 12px
- Max-height de 60vh com scroll interno para conteudo longo
- Border-radius apenas no topo
- O spotlight continua a destacar o elemento no topo/meio do ecra

**Posicionamento desktop** (viewport >= 768px):
- Manter logica actual (bottom > right > left > top)
- Max-width 420px

**Outras melhorias mobile**:
- Reducao de padding de `px-5` para `px-4` em mobile
- Font sizes menores para detalhes em mobile
- Botoes de accao com altura minima de 44px (touch target)

### 5. OnboardingProgress.tsx — Compacto para muitos passos

Quando o total de passos excede 10:
- Em vez de dots individuais, mostrar uma barra de progresso horizontal
- Manter o contador numerico (ex: "4/22")
- Em mobile, usar sempre a barra em vez de dots

Quando <= 10 passos:
- Manter dots actuais

### 6. Ficheiros a alterar

| Ficheiro | Alteracao |
|----------|-----------|
| `src/components/onboarding/GuidedTourOverlay.tsx` | pointer-events: none no SVG, auto no path; remover onClick |
| `src/components/onboarding/GuidedTour.tsx` | Remover overflow hidden; adicionar body.tour-active; remover onClick do overlay |
| `src/components/onboarding/GuidedTourTooltip.tsx` | Bottom sheet em mobile; responsive padding/sizing |
| `src/components/onboarding/OnboardingProgress.tsx` | Barra de progresso para > 10 passos |
| `src/index.css` | Regras z-index para modais durante tour |

### 7. Comportamento final esperado

1. Tour abre automaticamente ou via Preferencias
2. Spotlight destaca o elemento real
3. O utilizador pode CLICAR no elemento destacado (ex: "Novo Servico")
4. Se o elemento abre um modal, o modal aparece ACIMA do overlay do tour
5. O tooltip do tour continua visivel (abaixo do modal ou ao lado)
6. O utilizador pode fechar o modal e continuar o tour normalmente
7. Em mobile, o tooltip aparece como bottom sheet fixo
8. O tour so fecha via "Saltar guia", "Comecar a usar" ou Escape
9. Scroll funciona normalmente na pagina durante o tour
