
Objetivo: corrigir o “preview em branco” na impressão tanto da Ficha (modal A4) quanto da Etiqueta.

## Diagnóstico (por que ficou tudo em branco)
Hoje existem **dois sistemas de CSS de impressão ativos ao mesmo tempo** em `src/index.css`:

1) **CSS antigo (portal)**: ao imprimir, ele faz:
- `#root { display: none }`
- `body > *:not(.print-portal) { display: none }`
Ou seja: se **não existir `.print-portal`**, o Safari/Chrome não tem nada para renderizar no print preview → página em branco.

2) **CSS novo (modal A4)**: ao imprimir, ele faz:
- `body > *:not([data-radix-dialog-overlay]):not([role="dialog"]) { display: none }`
Como o Radix Dialog fica dentro de um wrapper `div[data-radix-portal]` (que é filho direto do `body`), esse wrapper **não tem** `role="dialog"`, então ele também é escondido → a página fica em branco.

Resultado:
- **Ficha (A4)**: como agora imprime via modal (sem `.print-portal`), o CSS antigo esconde tudo → branco.
- **Etiqueta (portal `.print-portal`)**: o CSS novo do modal A4 esconde o `.print-portal` (ele não é overlay nem role=dialog) → branco.

## Solução proposta (robusta e simples)
Unificar a lógica de impressão para **não depender de seletores “body > *:not(...)”** (eles quebram com Portal do Radix e com portais custom).

Vamos manter:
- A **Ficha** imprimindo pelo modal A4 (`.print-modal-a4` + `.print-sheet`)
- A **Etiqueta** imprimindo pelo portal (`.print-portal.print-only` + `.print-tag`)

E no CSS de impressão vamos:
- Continuar escondendo `#root` para não imprimir a app inteira.
- Remover as regras conflitantes que fazem `display:none` em “tudo exceto X”.
- Mostrar explicitamente, durante a impressão, **o que deve aparecer**:
  - `.print-portal` (Etiqueta)
  - `.print-modal-a4` (Ficha)
- Esconder overlay do Radix e o header `.no-print`.

## Passos de implementação

### 1) Ajustar `src/index.css` (principal)
1. Remover (ou comentar) as duas regras que causam o branco:
   - Do bloco antigo (portal):
     - `body > *:not(.print-portal) { display: none !important; }`
   - Do bloco novo (modal A4):
     - `body > *:not([data-radix-dialog-overlay]):not([role="dialog"]) { display: none !important; }`

2. Substituir por uma abordagem “mostra-alvo” que não depende do elemento ser filho direto do body:
   - Manter `#root { display:none !important; }` em `@media print` (isso evita páginas extras em branco).
   - Em `@media print`, garantir:
     - `.print-only { display:block !important; }`
     - `.print-portal` visível e ocupando a página:
       - `position: fixed; inset: 0; width: 100vw; height: 100vh; background: white; z-index alto`
     - `.print-modal-a4` visível e ocupando a página:
       - `position: fixed; inset: 0; width/height: 100%; transform: none; box-shadow: none; border-radius: 0; background: white`
     - esconder:
       - `[data-radix-dialog-overlay] { display:none !important; }`
       - `.print-modal-a4 .no-print { display:none !important; }`
     - `.print-modal-a4 .print-sheet` sem scroll no print:
       - `overflow: visible !important; height: auto !important; max-height: none !important;`

Observação importante: essa solução funciona com o Radix porque **não depende** de `[role="dialog"]` estar no “nível certo” do DOM.

### 2) (Opcional, mas recomendado) Limpar `src/components/modals/ServicePrintModal.tsx`
- Remover o componente `PrintContent` (portal antigo) que ficou no arquivo mas não é usado mais.
  - Isso evita confusão futura e reduz risco de alguém reativar o portal por engano.

### 3) Etiqueta (`src/components/modals/ServiceTagModal.tsx`)
- Não precisa mudar a estrutura agora (ela já usa `.print-portal print-only`).
- Depois do CSS unificado, o print preview volta a mostrar o conteúdo.

## Como vamos testar (passo a passo)
1) **Ficha (A4)**:
- Abrir a ficha, conferir que:
  - o header com botões aparece no topo
  - a `.print-sheet` rola normalmente na tela
- Clicar “Imprimir”:
  - o preview do Safari/Chrome deve mostrar a ficha (não branco)
  - deve sair 1 página A4 (ou mais, se o conteúdo exceder)

2) **Etiqueta**:
- Abrir a etiqueta e clicar “Imprimir Etiqueta”
- O preview deve mostrar a etiqueta (não branco).
- Confirmar QR code e logo aparecem.

3) Regressão:
- Verificar que imprimir a ficha não “some” com botões permanentemente após fechar o print (sem travar UI).

## Arquivos envolvidos
- `src/index.css` (mudança principal: consolidar e corrigir regras de impressão)
- `src/components/modals/ServicePrintModal.tsx` (opcional: limpeza do PrintContent antigo)

## Nota sobre tamanho do papel da Etiqueta (opcional, para depois)
O CSS atual tenta fazer `@page size: 80mm 170mm` dentro de `body.print-type-tag { @media print { @page { ... }}}`, mas isso não é CSS válido (é estilo de SCSS). Se vocês realmente precisam que o Safari mude o tamanho do papel automaticamente para etiqueta, a abordagem mais confiável é injetar dinamicamente um `<style>` com `@page { size: 80mm 170mm }` antes do `window.print()` e remover no `afterprint`. Posso implementar isso depois que o “branco” estiver resolvido.
