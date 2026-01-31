
## Objetivo
Fazer a impressão nativa (botão **Imprimir**) voltar a funcionar (sem “preview em branco”), garantindo:
- **Ficha** sempre em **A4** e bem alinhada no preview de impressão
- **Etiqueta** sempre em **80x170mm** e bem alinhada no preview de impressão
- Manter **Imprimir + PDF** (mas sem PDF “cortado”)

---

## O que está acontecendo (causa provável do “preview em branco”)
Pelo CSS atual (`src/index.css`) vocês tentam ocultar o overlay do Radix no print com:

- `@media print { [data-radix-dialog-overlay] { display:none } }`

Só que o overlay do `Dialog` **não tem** esse atributo hoje (ver `src/components/ui/dialog.tsx`), então no Safari ele pode estar sendo renderizado/empilhado acima do conteúdo na hora do print.

No Safari, quando “Imprimir fundos” está desmarcado (como na sua captura), overlays e backgrounds podem virar uma “folha branca” por cima do conteúdo no preview, resultando em **tudo branco**.

---

## Plano de correção (mudanças pequenas, mas certeiras)

### 1) Garantir que o overlay do Dialog seja removido no print (principal)
**Arquivo:** `src/components/ui/dialog.tsx`

**Ações:**
- Adicionar o atributo `data-radix-dialog-overlay` no `DialogOverlay` (para casar com o CSS existente).
- Adicionar a classe `no-print` no botão de fechar padrão do Dialog (para não aparecer o “X” na impressão).

**Resultado esperado:**
- O Safari não “tampa” a impressão com o overlay e o preview volta a mostrar a ficha/etiqueta.

---

### 2) Garantir o tamanho correto no preview de impressão (A4 vs 80x170mm)
Hoje o CSS tem `@page` fixo em A4 e não há override real para etiqueta (CSS não permite `@page` condicionado por seletor de `body` de forma confiável).

**Arquivo:** `src/utils/printUtils.ts`

**Ações:**
- Evoluir o `triggerPrint(type)` para **injetar dinamicamente** um `<style media="print">` com `@page` correto antes de chamar `window.print()`:
  - Para ficha: `@page { size: A4 portrait; margin: 0; }`
  - Para etiqueta: `@page { size: 80mm 170mm; margin: 0; }`
- Remover esse `<style>` no `afterprint` (e também remover a class do body como já faz).

**Por que isso é importante:**
- Garante que o **preview** do print no browser “entende” o papel correto.
- Evita casos onde a etiqueta é “encaixada” num A4 e sai desalinhada/cortada.

---

### 3) Ajustar CSS de print para não “duplicar margens” e evitar cortes
Atualmente vocês têm:
- `@page margin: 10mm`
- e também `.print-sheet { padding: 10mm }`

Isso pode causar redução excessiva de área útil e aumentar chance de corte/scale automático.

**Arquivo:** `src/index.css`

**Ações:**
- Manter `@page` com `margin: 0` (o injected style do passo 2 manda).
- Deixar a margem “visual” via `padding` dentro da ficha:
  - `.print-modal-a4 .print-sheet { padding: 10mm }` (no print)
- Garantir que o layout do A4 em impressão:
  - não dependa de scroll (`overflow: visible` no print)
  - permita quebra de página se um dia passar de 1 folha (ex.: muitas peças/pagamentos)
- Manter `.print-tag` com `padding: 4mm` e tamanho fixo.

---

### 4) Consertar o PDF “cortado” (já que vocês querem manter PDF)
O `generatePDF` atual (`src/utils/pdfUtils.ts`) chama `html2pdf` direto no elemento do modal que tem scroll/limites; isso é uma causa comum de PDF truncado.

**Arquivos:**
- `src/utils/pdfUtils.ts`
- `src/components/modals/ServicePrintModal.tsx`
- `src/components/modals/ServiceTagModal.tsx`

**Ações:**
1) Atualizar `generatePDF` para:
- clonar o elemento em um container temporário “offscreen”
- forçar `overflow: visible`, `height: auto`, remover `max-height`
- só então gerar o PDF
- remover o container temporário no final

2) Permitir formato customizado no `generatePDF`:
- Ficha: `format: 'a4'`, `orientation: 'portrait'`, `margin` compatível
- Etiqueta: `format: [80, 170]` (em mm), `margin: 0`

**Resultado esperado:**
- PDF da ficha não sai mais cortado.
- PDF da etiqueta sai no tamanho correto (80x170) em vez de “etiqueta pequena dentro de A4”.

---

## Como vamos validar (checklist)
1) Abrir um serviço → **Ver Ficha** → clicar **Imprimir**:
- Safari: preview não pode ficar branco
- Conteúdo alinhado em A4
- Sem overlay, sem botão “X” impresso

2) Abrir um serviço → **Ver Etiqueta** → clicar **Imprimir**:
- Preview deve mostrar papel 80x170mm
- Conteúdo centralizado/encaixado (sem cortes)

3) Testar PDF:
- **Baixar PDF** da ficha (sem cortes)
- **Baixar Etiqueta** no formato correto 80x170mm

4) Teste cruzado:
- Pelo menos Safari + Chrome (para garantir que o fix não seja específico)

---

## Arquivos que serão alterados
- `src/components/ui/dialog.tsx` (overlay + close “no-print”)
- `src/utils/printUtils.ts` (injeção dinâmica de `@page` por tipo)
- `src/index.css` (ajustes finos de print: overflow/padding/margem)
- `src/utils/pdfUtils.ts` (PDF sem corte + formatos custom)
- `src/components/modals/ServicePrintModal.tsx` (usar novo generatePDF/config, sem depender de scroll)
- `src/components/modals/ServiceTagModal.tsx` (usar novo generatePDF/config 80x170)

---

## Riscos / cuidados
- `afterprint` no Safari às vezes é inconsistente: vamos manter limpeza via `afterprint`, mas incluir fallback com `setTimeout` para remover o `<style>` injetado se necessário.
- Se algum outro modal precisar do overlay em print (quase nunca), a regra `no-print` pode afetar. Na prática, é desejado: overlay/close não devem ir para papel.
