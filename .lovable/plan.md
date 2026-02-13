

# Corrigir Etiqueta 29mm x 90mm — Eliminar Espaco em Branco

## Problema

O container da etiqueta tem `min-height: 90mm` no preview e `height: 90mm` no CSS de impressao, mas o conteudo real (logo + QR + codigo + dados do cliente) ocupa apenas ~35mm. O restante ~55mm e espaco em branco puro que sai na impressora como papel desperdicado ou pagina extra.

O mesmo problema existe no PDF gerado: o formato e definido como `[29, 90]` (29mm x 90mm), criando um PDF com pagina de 90mm de altura mesmo que o conteudo seja muito mais curto.

## Solucao

Mudar a abordagem: em vez de forcar altura fixa de 90mm, usar **altura automatica** (ajustada ao conteudo). Para o PDF, medir a altura real do conteudo e usar esse valor como tamanho da pagina.

### 1. CSS do preview — Remover min-height

**Ficheiro**: `src/index.css`

Na classe `.print-tag-page .print-tag-container` (linha 387-395):
- Remover `min-height: 90mm`
- O container ajusta-se automaticamente ao conteudo

### 2. CSS de impressao — Altura automatica

**Ficheiro**: `src/index.css`

Na regra `@media print` para `.print-tag-page .print-tag-container` (linha 495-503):
- Mudar `height: 90mm` para `height: auto`
- Mudar `min-height: 90mm` para `min-height: auto`

Na regra `.print-tag` (linha 575-588):
- Mudar `height: 90mm` para `height: auto`

### 3. ServiceTagModal.tsx — Remover min-height inline

**Ficheiro**: `src/components/modals/ServiceTagModal.tsx`

Na div da etiqueta (linha 56):
- Remover `minHeight: '90mm'` do style inline
- Manter apenas `width: '29mm'`

### 4. pdfUtils.ts — Medir altura real do conteudo para o PDF

**Ficheiro**: `src/utils/pdfUtils.ts`

Na funcao `generatePDF`, quando o formato e um array `[width, height]`:
- Medir a altura real do clone renderizado usando `clone.offsetHeight`
- Converter de pixels para mm: `heightMM = (heightPx / 96) * 25.4`
- Usar a altura medida em vez da altura fixa passada como parametro
- Isto garante que o PDF tem exactamente o tamanho do conteudo, sem espaco em branco

Adicionar parametro opcional `autoHeight?: boolean` (default `true` para tags) que activa este comportamento.

### 5. printUtils.ts — @page dinamico

**Ficheiro**: `src/utils/printUtils.ts`

Manter o `@page { size: 29mm 90mm }` pois e o tamanho do papel fisico na impressora termica. O conteudo preenche apenas o necessario e a impressora de rolo corta naturalmente. Se o utilizador usa impressora termica de rolo, o tamanho da pagina deve corresponder ao rolo; se usa impressora normal, a altura automatica no CSS ja resolve.

Nota: para impressoras de rolo termico, manter 29mm x 90mm como tamanho de papel e correcto. O problema real e no PDF e no preview.

### Resumo das alteracoes

| Ficheiro | Alteracao |
|----------|-----------|
| `src/index.css` | Remover min-height/height fixos de 90mm nos containers de tag |
| `src/components/modals/ServiceTagModal.tsx` | Remover `minHeight: '90mm'` do style inline |
| `src/utils/pdfUtils.ts` | Medir altura real do conteudo e usar como formato do PDF |

### Resultado esperado

- Preview: etiqueta mostra apenas o conteudo, sem espaco em branco abaixo
- PDF: pagina com exactamente o tamanho do conteudo (29mm x ~35mm)
- Impressao: no papel fisico de 29mm x 90mm, o conteudo aparece no topo e a impressora de rolo corta no fim do papel

