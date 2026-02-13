

# Etiqueta 29mm x 90mm — Tamanho Fixo Exacto

## Problema

A alteracao anterior removeu a altura fixa de 90mm e activou `autoHeight`, fazendo a etiqueta encolher para o tamanho do conteudo (~35mm). O utilizador quer exactamente **29mm x 90mm** porque e o tamanho fisico da etiqueta na impressora.

## Solucao

Reverter para altura fixa de 90mm em todos os pontos:

### 1. ServiceTagModal.tsx

- Repor `style={{ width: '29mm', minHeight: '90mm' }}` na div da etiqueta (linha 57)
- Remover `autoHeight: true` da chamada `generatePDF` (linha 38)

### 2. ServiceTagPage.tsx

- Remover `autoHeight: true` da chamada `generatePDF`

### 3. pdfUtils.ts

- Nenhuma alteracao necessaria — o formato `[29, 90]` ja e passado; sem `autoHeight: true`, usa o valor fixo

### 4. index.css

- Repor `min-height: 90mm` em `.print-tag-page .print-tag-container`
- Repor `height: 90mm` e `min-height: 90mm` na regra `@media print` para `.print-tag-page .print-tag-container`
- Repor `height: 90mm` na regra `.print-tag` dentro de `@media print`

### Resultado

- Preview no modal: etiqueta com 29mm x 90mm
- PDF gerado: pagina exactamente 29mm x 90mm
- Impressao: sai no tamanho correcto da etiqueta fisica

