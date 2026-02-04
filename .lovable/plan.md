

# Plano: Corrigir Páginas de Impressão em Branco + Dimensões Correctas

## Problemas Identificados

### 1. Dimensões da Etiqueta Incorrectas no Ecrã (CSS)
No ficheiro `src/index.css`, as dimensões da etiqueta para **visualização no ecrã** (linhas 387-395) ainda estão com os valores antigos:

```css
/* PROBLEMA - linhas 387-395 */
.print-tag-page .print-tag-container {
  width: 80mm;        /* ❌ Deveria ser 102mm */
  min-height: 170mm;  /* ❌ Deveria ser 152mm */
}
```

As dimensões para impressão (`@media print`) foram corrigidas anteriormente para 102mm x 152mm, mas as dimensões de **visualização no ecrã** ficaram desactualizadas.

### 2. Comentário Desactualizado no CSS
Na linha 364, o comentário ainda menciona "80mm x 170mm":
```css
/* ========== Tag Print Page (80mm x 170mm) ========== */
```

### 3. Possível Problema de Renderização
A página pode estar a renderizar correctamente, mas o conteúdo não está visível por problemas de dimensionamento ou overflow.

---

## Ficheiros a Alterar

| Ficheiro | Acção | Descrição |
|----------|-------|-----------|
| `src/index.css` | Alterar | Corrigir dimensões da etiqueta (ecrã) para 102mm x 152mm |

---

## Alterações Detalhadas

### `src/index.css`

**1. Linha 364 - Corrigir comentário:**
```css
/* ANTES */
/* ========== Tag Print Page (80mm x 170mm) ========== */

/* DEPOIS */
/* ========== Tag Print Page (4x6 inches = 102mm x 152mm) ========== */
```

**2. Linhas 387-395 - Corrigir dimensões de visualização no ecrã:**
```css
/* ANTES */
.print-tag-page .print-tag-container {
  width: 80mm;
  min-height: 170mm;
  background: white;
  padding: 4mm;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  border-radius: 0.25rem;
  box-sizing: border-box;
}

/* DEPOIS */
.print-tag-page .print-tag-container {
  width: 102mm;
  min-height: 152mm;
  background: white;
  padding: 4mm;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  border-radius: 0.25rem;
  box-sizing: border-box;
}
```

**3. Linha 399 - Corrigir comentário:**
```css
/* ANTES */
   Supports: A4 Sheet (via modal) & 80mm Tag (via portal)

/* DEPOIS */
   Supports: A4 Sheet (via modal) & 4x6 Tag (102x152mm via dedicated page)
```

---

## Resumo das Alterações

| Linha | Antes | Depois |
|-------|-------|--------|
| 364 | `80mm x 170mm` | `4x6 inches = 102mm x 152mm` |
| 388 | `width: 80mm` | `width: 102mm` |
| 389 | `min-height: 170mm` | `min-height: 152mm` |
| 399 | `80mm Tag` | `4x6 Tag (102x152mm)` |

---

## Resultado Esperado

1. **Visualização no Ecrã**: A etiqueta aparece com dimensões 102mm x 152mm (4x6 polegadas)
2. **Impressão**: A etiqueta imprime correctamente em formato 4x6
3. **PDF**: O download gera PDF com dimensões 102mm x 152mm
4. **Ficha (A4)**: Continua a funcionar normalmente em formato A4

---

## Verificação

Após a correcção:
1. Abrir `/print/service/:serviceId` → deve mostrar ficha A4 com conteúdo
2. Abrir `/print/tag/:serviceId` → deve mostrar etiqueta 4x6 com conteúdo
3. Clicar em "Imprimir" em ambas → preview deve mostrar o conteúdo correcto
4. Clicar em "Baixar PDF" em ambas → PDF gerado com dimensões correctas

