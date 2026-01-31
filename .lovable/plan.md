
# Plano: Restaurar Impressão Nativa + Garantir Alinhamento

## Problema Actual

O PDF gerado via `html2pdf.js` está a cortar o conteúdo. A solução é restaurar a impressão nativa do browser (`window.print()`) com CSS `@media print` bem configurado, mantendo o botão PDF como alternativa.

## Solução

### Parte 1: Restaurar Botão "Imprimir" no Modal da Ficha

**Ficheiro:** `src/components/modals/ServicePrintModal.tsx`

Alterações no header do modal (linhas 452-463):
- Adicionar botão "Imprimir" ao lado do botão "Baixar PDF"
- Importar `Printer` do lucide-react
- Importar `printServiceSheet` do `printUtils.ts`

```tsx
// Header com botões
<div className="no-print flex items-center justify-between p-3 border-b bg-muted/30">
  <h2 className="font-semibold text-foreground">Pré-visualização da Ficha</h2>
  <div className="flex gap-2">
    <Button onClick={() => printServiceSheet()} size="sm" variant="outline">
      <Printer className="h-4 w-4 mr-2" />
      Imprimir
    </Button>
    <Button onClick={handleDownloadPDF} size="sm" disabled={isGenerating}>
      {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
      {isGenerating ? 'A gerar...' : 'Baixar PDF'}
    </Button>
  </div>
</div>
```

### Parte 2: Restaurar Botão "Imprimir" no Modal da Etiqueta

**Ficheiro:** `src/components/modals/ServiceTagModal.tsx`

Alterações:
- Adicionar botão "Imprimir" antes do "Baixar Etiqueta"
- Importar `Printer` do lucide-react
- Importar `printServiceTag` do `printUtils.ts`
- Adicionar classes de impressão ao conteúdo da tag

```tsx
// Footer com botões
<DialogFooter className="gap-2">
  <Button variant="outline" onClick={() => onOpenChange(false)}>
    Cancelar
  </Button>
  <Button variant="outline" onClick={() => printServiceTag()}>
    <Printer className="h-4 w-4 mr-2" />
    Imprimir
  </Button>
  <Button onClick={handleDownloadPDF} disabled={isGenerating}>
    {isGenerating ? <Loader2 /> : <Download />}
    {isGenerating ? 'A gerar...' : 'Baixar Etiqueta'}
  </Button>
</DialogFooter>
```

Também adicionar a classe `print-tag` ao container da etiqueta para que o CSS de impressão funcione:
```tsx
<div ref={tagRef} className="print-tag border rounded-lg p-4 bg-white">
```

### Parte 3: Ajustar CSS de Impressão

**Ficheiro:** `src/index.css`

O CSS actual já tem regras para A4 e 80x170mm, mas precisamos de alguns ajustes:

1. **Garantir que o modal A4 usa todo o espaço disponível na impressão**
2. **Garantir que a etiqueta é centrada e não cortada**
3. **Adicionar regra `@page` específica para a tag**

```css
/* ========== PRINT MEDIA STYLES ========== */
@media print {
  /* Reset geral */
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  /* Page setup - A4 default */
  @page {
    size: A4 portrait;
    margin: 10mm;
  }

  /* Page específica para tag */
  body.print-type-tag @page {
    size: 80mm 170mm;
    margin: 0;
  }

  /* Esconder UI do app */
  #root,
  [data-radix-dialog-overlay],
  .no-print {
    display: none !important;
  }

  /* Mostrar elementos de impressão */
  .print-only,
  .print-portal {
    display: block !important;
    visibility: visible !important;
  }

  /* ===== FICHA A4 ===== */
  .print-modal-a4 {
    position: fixed !important;
    inset: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    height: auto !important;
    max-height: none !important;
    margin: 0 !important;
    padding: 0 !important;
    border: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    transform: none !important;
    background: white !important;
    overflow: visible !important;
    z-index: 2147483647 !important;
  }

  .print-modal-a4 .print-sheet {
    width: 100% !important;
    height: auto !important;
    max-height: none !important;
    overflow: visible !important;
    padding: 0 !important;
    page-break-inside: avoid;
  }

  /* ===== ETIQUETA 80x170mm ===== */
  .print-tag {
    display: block !important;
    visibility: visible !important;
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 80mm !important;
    height: 170mm !important;
    margin: 0 !important;
    padding: 4mm !important;
    background: white !important;
    border: none !important;
    box-shadow: none !important;
    box-sizing: border-box !important;
  }
}
```

### Parte 4: Garantir Renderização Completa

O problema de corte pode ocorrer porque o `printSheetRef` captura apenas a área visível do scroll. Precisamos garantir que todo o conteúdo é renderizado antes da impressão.

**Ficheiro:** `src/components/modals/ServicePrintModal.tsx`

Adicionar função que força renderização completa antes de imprimir:

```tsx
const handlePrint = () => {
  // Garantir que o scroll está no topo para renderizar tudo
  if (printSheetRef.current) {
    printSheetRef.current.scrollTop = 0;
  }
  // Pequeno delay para garantir render completo
  setTimeout(() => {
    printServiceSheet();
  }, 100);
};
```

## Resumo de Ficheiros

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/modals/ServicePrintModal.tsx` | Adicionar botão "Imprimir" + função handlePrint |
| `src/components/modals/ServiceTagModal.tsx` | Adicionar botão "Imprimir" + classe print-tag |
| `src/index.css` | Melhorar regras @media print para A4 e 80x170mm |

## Resultado Esperado

1. **Modal Ficha**: Dois botões - "Imprimir" (abre diálogo de impressão do browser) e "Baixar PDF"
2. **Modal Etiqueta**: Dois botões - "Imprimir" e "Baixar Etiqueta"
3. **Preview de Impressão**: Conteúdo completo e bem alinhado, sem cortes
4. **Tamanhos**: Ficha em A4 (210x297mm), Etiqueta em 80x170mm

## Secção Técnica

### Porquê a impressão nativa é melhor neste caso

A biblioteca `html2pdf.js` utiliza `html2canvas` internamente, que tem limitações:
- Não suporta bem conteúdo que excede a área visível (scroll)
- Pode cortar elementos que não estão renderizados no DOM visível
- Tem problemas com fontes e cores específicas

A impressão nativa do browser (`window.print()`) com CSS `@media print`:
- Renderiza todo o conteúdo, independente do scroll
- Suporta múltiplas páginas automaticamente
- Respeita regras `@page` para tamanhos específicos
- Permite ao utilizador escolher impressora e configurações

### Classes CSS utilizadas

- `.print-modal-a4`: Aplicada ao DialogContent do modal da ficha
- `.print-sheet`: Aplicada ao container interno com o conteúdo A4
- `.print-tag`: Aplicada ao container da etiqueta
- `.no-print`: Aplicada a elementos que devem ser escondidos na impressão
- `.print-only`: Aplicada a elementos que só aparecem na impressão
