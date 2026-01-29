
# Plano: Corrigir Tamanhos de Ficha (A4) e Tag (~17cm)

## Resumo do Problema
1. **Ficha A4**: Deve ocupar a página inteira A4 (210mm x 297mm)
2. **Tag**: Estava com 80mm, mas deve ter aproximadamente **17cm (170mm)** de altura

## Alterações a Realizar

### Arquivo: `src/index.css`

#### 1. Ajustar a Tag para 170mm de altura

Atualmente a tag tem `width: 80mm` (largura para impressora térmica). O usuário quer uma tag de aproximadamente **17cm de altura** - isso sugere uma etiqueta para ser impressa em papel comum, não térmica.

**Antes:**
```css
.print-tag {
  width: 80mm !important;
  max-width: 80mm !important;
  ...
}
```

**Depois:**
```css
.print-tag {
  width: 80mm !important;        /* Largura mantida */
  max-width: 80mm !important;
  min-height: 170mm !important;  /* ADICIONAR - altura ~17cm */
  height: auto !important;       /* ADICIONAR */
  ...
}
```

#### 2. Ajustar @page para Tag

**Antes:**
```css
body.print-type-tag {
  @media print {
    @page {
      size: 80mm auto;
      margin: 2mm;
    }
  }
}
```

**Depois:**
```css
body.print-type-tag {
  @media print {
    @page {
      size: 80mm 170mm;  /* Largura x Altura específica */
      margin: 2mm;
    }
  }
}
```

#### 3. Garantir que a Ficha A4 ocupe toda a página

O CSS atual para `.print-content` já está configurado para ocupar toda a página. Vou verificar se precisa de ajustes adicionais para garantir que funcione corretamente.

---

## Resumo das Alterações

| Elemento | Antes | Depois |
|----------|-------|--------|
| `.print-tag` width | 80mm | 80mm (mantido) |
| `.print-tag` height | auto | min-height: 170mm |
| `@page` para tag | 80mm auto | 80mm 170mm |
| `.print-content` (ficha) | A4 inteiro | Sem alteração (já correto) |

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/index.css` | Adicionar min-height na `.print-tag` e ajustar @page |
