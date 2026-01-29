
# Plano: Corrigir Elementos do UI Aparecendo no Print Preview

## Problema Identificado
O conteúdo da impressão (ficha e tag) está aparecendo corretamente, mas **elementos da interface do Lovable** estão "vazando" para o preview de impressão (barra inferior com `/geral?status=finalizado`, botões "Chat", "Preview").

## Causa Raiz
O CSS atual usa `body > *` que só afeta filhos **diretos** do body. No entanto:
1. O app roda dentro de um iframe do Lovable
2. Há elementos injetados pelo ambiente que não são filhos diretos do body
3. O seletor `body > *` não consegue esconder esses elementos adicionais

## Solução Proposta
Usar uma abordagem mais robusta com `visibility: hidden` que afeta **todos** os elementos, não apenas filhos diretos:

```css
@media print {
  /* Esconder TUDO - usando visibility que é herdado */
  * {
    visibility: hidden !important;
  }
  
  /* Mostrar APENAS o portal e seus filhos */
  .print-portal,
  .print-portal * {
    visibility: visible !important;
  }
  
  /* Posicionar o portal no topo */
  .print-portal {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    background: white !important;
    z-index: 999999 !important;
  }
}
```

Esta abordagem:
- `visibility: hidden` em `*` esconde **absolutamente tudo** na página
- `visibility: visible` no `.print-portal` e seus filhos mostra apenas o conteúdo de impressão
- Funciona independentemente da estrutura DOM do ambiente (iframe, elementos injetados, etc.)

---

## Alterações Detalhadas

### Arquivo: `src/index.css`

**Localização**: Linhas 294-452 (seção `@media print`)

**Mudanças**:

1. Substituir `body > *` por `*` universal com visibility
2. Remover `display: none` (visibility é mais confiável para print)
3. Garantir que o portal esteja posicionado corretamente com `position: fixed`
4. Adicionar `height: 100%` e `overflow: visible` para evitar cortes

```css
/* ANTES (problemático) */
body > * {
  display: none !important;
  visibility: hidden !important;
}

body > .print-portal {
  display: block !important;
  visibility: visible !important;
  position: absolute !important;
  ...
}

/* DEPOIS (robusto) */
* {
  visibility: hidden !important;
}

.print-portal,
.print-portal * {
  visibility: visible !important;
}

.print-portal {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  width: 100% !important;
  height: auto !important;
  background: white !important;
  z-index: 999999 !important;
}
```

---

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| Ficha aparece + barra inferior do Lovable | Apenas a ficha aparece |
| Tag aparece + barra inferior do Lovable | Apenas a tag aparece |

- **Ficha A4**: Preview mostra APENAS o documento da ficha, sem elementos de UI
- **Tag 80mm**: Preview mostra APENAS a etiqueta no formato 80mm
- **Cross-platform**: Funciona em iPhone, Android, MacBook, Windows
- **Sem navegação**: Continua não navegando para nenhuma página

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/index.css` | Atualizar regras `@media print` para usar `visibility` universal |

---

## Detalhes Técnicos

### Por que `visibility` em vez de `display`?
- `display: none` remove o elemento do layout, mas não é consistente entre browsers para print
- `visibility: hidden` mantém o espaço mas torna invisível - porém com `position: fixed` no portal, isso não é problema
- `visibility` é mais confiável para esconder elementos injetados por frameworks/ambientes externos

### Por que `*` universal?
- O seletor `body > *` só afeta filhos diretos do body
- Elementos injetados pelo Lovable (iframe tooling) podem estar em níveis diferentes
- `*` garante que TUDO seja escondido, e depois seletivamente mostramos o portal
