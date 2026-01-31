
## Objectivo

Fazer o print preview mostrar **apenas a ficha do modal** (1 página A4), escondendo toda a UI da aplicação (sidebar, OficinaPage, ServiceDetailSheet, etc.).

---

## Problema Actual

Olhando para a captura de tela, o print preview mostra **3 páginas** porque:

1. O CSS de impressão **não esconde o `#root`** (toda a aplicação)
2. Apenas esconde o overlay do Radix e elementos com `.no-print`
3. Resultado: A ficha do modal aparece + a página de oficina + o sheet de detalhes - tudo misturado no print

O CSS actual (linhas 360-484 de `index.css`) não tem nenhuma regra para esconder `#root`.

---

## Solução: Esconder #root e Mostrar Apenas o Portal

### Ficheiro: `src/index.css`

Adicionar regras na secção `@media print` (após linha 392) para:

1. **Esconder completamente o `#root`** (toda a aplicação React)
2. **Esconder todos os filhos do body** excepto portais Radix e print-portal
3. **Garantir que o portal Radix é visível** (onde o modal está)

```css
@media print {
  /* ... regras existentes ... */

  /* CRÍTICO: Esconder toda a aplicação React */
  #root {
    display: none !important;
    visibility: hidden !important;
  }

  /* Esconder todos os elementos do body que não são portais */
  body > *:not([data-radix-portal]):not(.print-portal) {
    display: none !important;
  }

  /* Mostrar apenas portais Radix (onde o modal está renderizado) */
  [data-radix-portal] {
    display: block !important;
    visibility: visible !important;
  }
}
```

---

## Por Que Funciona

O Radix UI renderiza modais através de **Portals** - elementos que são inseridos directamente no `<body>`, fora do `#root`:

```text
<body>
  <div id="root">              <- ESCONDIDO no print
    <OficinaPage />            <- ESCONDIDO
    <ServiceDetailSheet />     <- ESCONDIDO
    ...                        <- ESCONDIDO
  </div>
  
  <div data-radix-portal>      <- VISÍVEL no print
    <DialogOverlay />          <- ESCONDIDO (já tinha regra)
    <DialogContent>            <- VISÍVEL
      <.print-modal-a4>        <- A4 Sheet
        <.print-sheet>         <- Conteúdo da ficha
    </DialogContent>
  </div>
</body>
```

Ao esconder `#root` e todos os filhos do `body` **excepto** `[data-radix-portal]`, garantimos que apenas o modal de impressão aparece.

---

## Sobre o Tamanho do Modal

O utilizador também mencionou que "o modal pode ser menor". O modal actual tem:

- Ecrã: `width: 210mm`, `height: 297mm`, `max-height: 90vh`
- Print: `width: 210mm`, `height: auto`

O tamanho de **210mm x 297mm** é exactamente A4. No ecrã, o modal mostra um preview WYSIWYG do A4.

**Opções:**
1. **Manter A4 no modal** (recomendado): Preview fiel ao que será impresso
2. **Reduzir modal no ecrã**: O preview será menor mas a impressão continua A4

Se o utilizador quer um modal menor no ecrã mas manter A4 no print, podemos ajustar:
- Ecrã: `max-width: 80vw` e `max-height: 85vh` com scroll
- Print: Continua `width: 210mm` e `height: auto`

---

## Ficheiros a Alterar

| Ficheiro | Alteração |
|----------|-----------|
| `src/index.css` | Adicionar regras `#root { display: none }` e `body > *:not([data-radix-portal]) { display: none }` na secção `@media print` |

---

## Resultado Esperado

1. **Print preview**: Mostra apenas **1 página** (ou mais se a ficha tiver muito conteúdo)
2. **Conteúdo**: Apenas a ficha A4 do modal, **sem UI da aplicação** (sem sidebar, sem página de fundo)
3. **Tamanho**: A4 portrait (210x297mm)
4. **Etiqueta**: Também funcionará correctamente porque usa o mesmo sistema de portal

---

## Secção Técnica

### Selectores CSS Utilizados

```css
/* Esconde o root da aplicação React */
#root { display: none !important; }

/* Esconde tudo no body que não seja portal Radix ou print-portal */
body > *:not([data-radix-portal]):not(.print-portal) { display: none !important; }

/* Mantém portais Radix visíveis (onde o modal é renderizado) */
[data-radix-portal] { display: block !important; visibility: visible !important; }
```

### Hierarquia de Visibilidade no Print

| Elemento | Visível no Print? |
|----------|-------------------|
| `#root` (app React) | Não |
| `body > script, style` | Não (não afecta) |
| `[data-radix-portal]` | Sim |
| `[data-radix-dialog-overlay]` | Não (já escondido) |
| `DialogContent` | Sim |
| `.print-modal-a4` | Sim |
| `.print-sheet` | Sim |
| `.no-print` | Não |
