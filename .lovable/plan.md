
# Plano: Corrigir Sistema de Impressão (Especificidade CSS)

## Problema Identificado
A regra `* { visibility: hidden !important; }` está escondendo **TUDO**, incluindo o `.print-portal`, porque:
1. O seletor `*` tem a mesma prioridade que `.print-portal` quando ambos usam `!important`
2. A ordem das regras no CSS pode estar fazendo o `*` prevalecer
3. O `.print-only { display: none !important; }` fora do `@media print` pode estar interferindo

## Causa Técnica
No CSS, quando dois seletores têm o mesmo nível de especificidade e ambos usam `!important`, a **última regra** vence. Como o portal tem `visibility: visible`, mas o `*` aplica `visibility: hidden` a todos os elementos (incluindo os filhos do portal novamente), há conflito.

## Solução
Usar uma abordagem híbrida mais específica:

1. **Remover `display: none` do `.print-only`** quando em `@media print`
2. **Usar seletores mais específicos** para garantir que o portal e seus filhos apareçam
3. **Adicionar `display: block` explícito** no `@media print` para o portal

```css
/* Fora do @media print - esconder no screen */
.print-only {
  display: none !important;
}

@media print {
  /* Mostrar elementos print-only */
  .print-only {
    display: block !important;
  }

  /* Esconder todo o resto */
  body > *:not(.print-portal) {
    display: none !important;
    visibility: hidden !important;
  }

  /* Garantir que o portal apareça com alta especificidade */
  body > .print-portal {
    display: block !important;
    visibility: visible !important;
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    width: 100% !important;
    height: auto !important;
    background: white !important;
    z-index: 999999 !important;
  }

  /* Garantir visibilidade de todos os descendentes */
  body > .print-portal * {
    visibility: visible !important;
  }
}
```

## Por que isso funciona?
1. `body > *:not(.print-portal)` esconde tudo **exceto** o portal (usando negação)
2. `body > .print-portal` tem especificidade maior que apenas `*`
3. `.print-only { display: block }` dentro de `@media print` sobrescreve o `display: none` de fora
4. Não usamos mais `* { visibility: hidden }` universal que causava conflitos

---

## Alterações Detalhadas

### Arquivo: `src/index.css`

**Seção @media print (linhas ~294-460)**

Substituir a lógica atual por:

```css
/* Screen: Hide print-only content */
.print-only {
  display: none !important;
}

@media print {
  /* Default page setup - A4 */
  @page {
    size: A4 portrait;
    margin: 10mm;
  }

  /* Reset html/body for print */
  html, body {
    background: white !important;
    margin: 0 !important;
    padding: 0 !important;
    width: 100% !important;
    height: auto !important;
    overflow: visible !important;
  }

  /* CRITICAL: Show print-only elements in print */
  .print-only {
    display: block !important;
    visibility: visible !important;
  }

  /* Hide everything EXCEPT the print portal */
  body > *:not(.print-portal) {
    display: none !important;
    visibility: hidden !important;
  }

  /* Show the print portal with high specificity */
  body > .print-portal {
    display: block !important;
    visibility: visible !important;
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    width: 100% !important;
    height: auto !important;
    background: white !important;
    z-index: 999999 !important;
    overflow: visible !important;
  }

  /* Ensure ALL descendants are visible */
  body > .print-portal *,
  body > .print-portal *::before,
  body > .print-portal *::after {
    visibility: visible !important;
  }

  /* ... resto das regras de .print-content e .print-tag ... */
}
```

---

## Diferença Chave

| Antes (problemático) | Depois (correto) |
|---------------------|------------------|
| `* { visibility: hidden }` esconde TUDO | `body > *:not(.print-portal)` esconde apenas o que não é portal |
| `.print-only { display: none }` sempre ativo | `.print-only { display: block }` dentro de @media print |
| Conflito de especificidade | Seletores específicos com `body >` |

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/index.css` | Reescrever seção `@media print` com seletores mais específicos |

---

## Resultado Esperado

- **Ficha A4**: Preview mostra documento A4 com todo o conteúdo
- **Tag 80mm**: Preview mostra etiqueta no formato 80mm
- **Sem elementos de UI**: Nenhuma barra do Lovable ou navegação aparece
- **Cross-platform**: Funciona em iPhone, Android, MacBook, Windows
