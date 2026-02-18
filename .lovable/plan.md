
# Redesign da Etiqueta: Portrait 62mm x 90mm para Brother QL-700

## Problema Raiz — Por Que Aparecem Múltiplas Folhas

A impressora Brother QL-700 tem a fita de **62mm de largura** instalada ("62mm Fita contínua"). O sistema estava a enviar `@page { size: 29mm 90mm }` (29mm largura), mas a impressora espera 62mm de largura. O conflito de dimensões faz o driver dividir o conteúdo em múltiplas páginas.

A correção obrigatória é usar **62mm de largura** em todos os lugares — tanto no layout HTML como no CSS de impressão e no PDF.

## Novo Layout Solicitado (Portrait "em pé")

```text
┌──────────────────────────┐  62mm largura
│ ████████████████████████ │  barra azul topo
│                          │
│   [Logo TECNOFRIO]       │  logo centrado
│                          │
│      ┌────────┐          │
│      │  QR    │          │  QR centrado
│      │  CODE  │          │
│      └────────┘          │
│                          │
│  TF-00001                │  código grande, centrado
│                          │
│  Cl: José Fernando       │  dados compactos
│  Tel: 961 440 779        │
│  Eq: MLR                 │
│  Av: Não arrefece        │  NOVO: avaria
│                          │
│ ████████████████████████ │  barra azul fundo
└──────────────────────────┘
```

## Alterações Necessárias

### 1. `src/components/modals/ServiceTagModal.tsx`

Redesenhar completamente o div com `ref={tagRef}`:
- Dimensões: `width: 62mm` (portrait, a altura cresce com o conteúdo)
- Layout vertical: barra azul → logo centrado → QR centrado (tamanho maior, ~160px) → código do serviço centrado com fonte mono bold → dados em lista limpa abaixo
- Adicionar campo **Avaria** (`service.detected_fault`) ao conteúdo
- Todas as cores como hex fixo (`#2B4F84`, `#000`, `#4b5563`) — sem CSS variables
- Fonte aumentada para legibilidade real em etiqueta física
- Chamar `generatePDF` com `format: [62, 90]`, `orientation: 'portrait'`
- Usar `html2canvas` diretamente (como o `ServiceTagPage`) em vez de `html2pdf.js` para evitar o problema de cores invisíveis. A abordagem `html2canvas` → `jsPDF` captura os estilos computados reais, resolvendo o problema de censura de dados.

### 2. `src/pages/ServiceTagPage.tsx`

Aplicar o mesmo redesign portrait à página dedicada:
- Alterar `.print-tag-container` para `width: 62mm; height: auto; min-height: 90mm`
- Alterar `@page` para `size: 62mm 90mm` (portrait)
- Alterar `jsPDF` para `format: [62, 90], orientation: 'portrait'`
- Adicionar campo **Avaria** (`service.detected_fault`)
- Mesmo layout vertical centralizado: logo → QR → código → dados

### 3. `src/utils/printUtils.ts`

Alterar `PAGE_CONFIGS.tag`:
```
// ANTES (errado — não corresponde à fita de 62mm)
tag: '@page { size: 29mm 90mm; margin: 0; }'

// DEPOIS (correto para Brother QL-700 com fita de 62mm)
tag: '@page { size: 62mm 90mm; margin: 0; }'
```

### 4. `src/index.css`

Atualizar todas as referências de dimensões da etiqueta de `29mm x 90mm` / `62mm x 29mm` para o novo portrait `62mm x 90mm`:

- `.print-tag-page .print-tag-container`: `width: 62mm; height: auto; min-height: 90mm`
- `@media print .print-tag-page .print-tag-container`: `width: 62mm !important; height: auto !important; min-height: 90mm !important`
- `.print-tag`: `width: 62mm !important; height: auto !important`
- Atualizar comentários de `62mm x 29mm` para `62mm x 90mm`

## Estratégia para Dados Não Censurados no PDF

O problema de "censura" (texto invisível) ocorre porque `html2pdf.js` clona o DOM para um container offscreen onde as CSS variables (`hsl(var(--primary))`) não resolvem.

**Solução**: Usar `html2canvas` + `jsPDF` diretamente (mesma abordagem do `ServiceTagPage`), em vez do `html2pdf.js`. O `html2canvas` captura os estilos computados renderizados no ecrã — incluindo as cores resolvidas — então o texto aparece sempre visível.

No `ServiceTagModal.tsx`, substituir a chamada a `generatePDF` por:
```
const canvas = await html2canvas(tagRef.current, {
  scale: 4,
  useCORS: true,
  backgroundColor: '#ffffff',
  logging: false,
});
const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [62, 90] });
const canvasHeight = (canvas.height / canvas.width) * 62;
pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 62, canvasHeight);
pdf.save(`Etiqueta-${service.code}.pdf`);
```
Isto elimina completamente o problema de cores invisíveis.

## Resumo de Ficheiros

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/modals/ServiceTagModal.tsx` | Redesenho portrait 62mm, html2canvas+jsPDF, avaria |
| `src/pages/ServiceTagPage.tsx` | Redesenho portrait 62mm, @page correto, avaria |
| `src/utils/printUtils.ts` | @page size: 62mm 90mm |
| `src/index.css` | Dimensões portrait em todos os seletores .print-tag |

## Compatibilidade Brother QL-700

- Fita instalada: **62mm contínua**
- Tamanho da página: `62mm x 90mm` portrait
- A altura de 90mm é compatível com o modo "continuous tape" — o driver corta automaticamente no comprimento definido
- O conteúdo vertical (portrait) ocupa a largura total da fita de 62mm, sem rotação
