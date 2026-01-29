
# Plano: Corrigir Sistema de Impressão (Ficha A4 e Etiqueta 80mm)

## Problema Identificado
O preview de impressão aparece **em branco** em todos os dispositivos (iPhone, Android, MacBook, Windows). Além disso:
- A etiqueta (tag) precisa aparecer com **formato 80mm obrigatório** no preview
- Ao clicar em Imprimir, **não pode navegar** para nenhuma outra página

## Causa Raiz
O sistema atual usa uma abordagem de "in-place printing" que:

1. **Cria um container com `display: none`** e depois muda para `display: block`
2. **O CSS tem `.print-root { display: none !important; }`** que bloqueia a visibilidade
3. **No iOS/Safari**, o print engine captura o conteúdo antes do DOM estar pronto
4. **Cleanup de 1 segundo** pode remover o conteúdo antes do preview ser gerado

O resultado é que o navegador "captura" uma tela em branco porque:
- O container ainda está invisível quando `window.print()` é chamado
- Ou o container já foi removido quando o preview tenta renderizar

## Solução Proposta

### Abordagem: Visibilidade Controlada por Classes CSS

Em vez de criar/destruir elementos dinamicamente, vamos usar uma abordagem mais simples e confiável:

1. **O container de impressão fica sempre presente no DOM** (dentro do modal)
2. **No screen**: o container fica invisível (mas presente)
3. **No print**: apenas o container aparece, todo o resto fica oculto
4. **Sem JavaScript manipulando visibilidade** - tudo via CSS `@media print`

---

## Alterações Detalhadas

### 1. Reescrever `src/utils/printUtils.ts`

Simplificar para apenas chamar `window.print()` sem criar elementos:

```typescript
// Nova versão simplificada
export function printServiceSheet(): void {
  window.print();
}

export function printServiceTag(): void {
  window.print();
}
```

A lógica de qual conteúdo mostrar será controlada por CSS + atributos `data-print-type` nos modais.

---

### 2. Atualizar `src/index.css` - Seção de Print

Remover a lógica complexa de `.print-root` e usar uma abordagem mais robusta:

```css
/* ========== PRINT MEDIA STYLES ========== */

/* Na tela: esconder elementos marcados como print-only */
.print-only {
  display: none !important;
}

@media print {
  /* Esconder TUDO na página */
  body > * {
    display: none !important;
  }
  
  /* Mostrar apenas o container de impressão */
  body > .print-portal {
    display: block !important;
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    background: white !important;
  }
  
  /* Estilos para ficha A4 */
  @page {
    size: A4 portrait;
    margin: 10mm;
  }
  
  /* Quando imprimindo tag, sobrescrever tamanho */
  body.print-type-tag {
    /* Tag 80mm */
  }
}

/* Tag-specific @page */
body.print-type-tag {
  @media print {
    @page {
      size: 80mm auto;
      margin: 2mm;
    }
  }
}
```

---

### 3. Atualizar `src/components/modals/ServicePrintModal.tsx`

Adicionar um portal que renderiza o conteúdo para impressão diretamente no body:

```tsx
// Usar ReactDOM.createPortal para renderizar o conteúdo imprimível
// diretamente no body, com classe 'print-portal'

import { createPortal } from 'react-dom';

// No componente:
{open && createPortal(
  <div className="print-portal print-only print-content">
    {/* Conteúdo da ficha aqui */}
  </div>,
  document.body
)}
```

E no `handlePrint`:
```tsx
const handlePrint = () => {
  document.body.classList.remove('print-type-tag');
  document.body.classList.add('print-type-sheet');
  window.print();
};
```

---

### 4. Atualizar `src/components/modals/ServiceTagModal.tsx`

Mesmo padrão, mas para tag:

```tsx
const handlePrint = () => {
  document.body.classList.remove('print-type-sheet');
  document.body.classList.add('print-type-tag');
  window.print();
};

// Portal com conteúdo da tag
{open && createPortal(
  <div className="print-portal print-only print-tag">
    {/* Conteúdo da etiqueta */}
  </div>,
  document.body
)}
```

---

## Resumo das Mudanças

| Arquivo | Alteração |
|---------|-----------|
| `src/utils/printUtils.ts` | Simplificar para apenas `window.print()` |
| `src/index.css` | Nova estratégia CSS: `.print-only` + `.print-portal` + `@page` dinâmico |
| `src/components/modals/ServicePrintModal.tsx` | Usar `createPortal` para renderizar conteúdo no body |
| `src/components/modals/ServiceTagModal.tsx` | Usar `createPortal` + classe `print-type-tag` |

---

## Como Funciona (Fluxo)

```text
1. Usuário abre modal de Ficha ou Etiqueta
   ↓
2. React renderiza um portal no <body> com classe "print-portal print-only"
   (invisível na tela porque .print-only tem display:none)
   ↓
3. Usuário clica em "Imprimir"
   ↓
4. JavaScript adiciona classe ao body (print-type-sheet ou print-type-tag)
   ↓
5. window.print() é chamado
   ↓
6. @media print ativa:
   - Esconde tudo exceto .print-portal
   - @page usa tamanho correto (A4 ou 80mm)
   ↓
7. Preview mostra APENAS o conteúdo correto no tamanho correto
   ↓
8. Após imprimir, classe é removida do body
```

---

## Resultado Esperado

- **Ficha A4**: Preview mostra documento A4 com logo, QR, dados do serviço
- **Tag 80mm**: Preview mostra etiqueta estreita 80mm centralizada
- **Sem navegação**: Não abre nenhuma outra página
- **Sem delay**: Impressão é instantânea
- **Cross-platform**: Funciona em iPhone, Android, MacBook, Windows

---

## Detalhes Técnicos

### Por que usar Portal?
O `createPortal` do React permite renderizar um elemento como filho direto do `<body>`, fora da hierarquia normal de componentes. Isso garante que:
1. O elemento não está dentro de nenhum container com `overflow: hidden` ou `position: relative`
2. O CSS `body > *` pode facilmente selecionar apenas filhos diretos
3. O conteúdo existe no DOM enquanto o modal está aberto

### Por que classes no body para @page?
Infelizmente CSS não permite `@page` condicional dentro de `@media print`. A solução é:
1. Usar uma classe no `<body>` (`print-type-tag` ou `print-type-sheet`)
2. Ter dois blocos `@page` com seletores específicos
3. O navegador aplica o `@page` correto baseado na classe presente

### Cleanup
Após o `window.print()`, um listener de `afterprint` remove a classe do body para limpar o estado.
