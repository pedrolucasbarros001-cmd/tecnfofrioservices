

# Plano: Ajustar Azul dos Cards para Cor Exacta

## Analise da Cor de Referencia

A imagem mostra um azul ceu vibrante:
- **Hex aproximado**: #5AA9E6
- **HSL**: `hsl(207, 74%, 63%)`

## Problema Actual

As cores actuais usam hue 230 (azul-violeta):
- Aceso: `hsl(230, 70%, 65%)` = tom mais roxo
- Apagado: `hsl(230, 50%, 40%)` = tom escuro roxo

## Solucao: Mudar para Hue 207 (Azul Ceu)

| Estado | Cor Actual | Cor Nova |
|--------|------------|----------|
| **Aceso** | `hsl(230, 70%, 65%)` | `hsl(207, 74%, 63%)` |
| **Apagado** | `hsl(230, 50%, 40%)` | `hsl(207, 55%, 42%)` |

A diferenca principal e o **hue**: 207 (azul ceu) em vez de 230 (azul-violeta).

---

## Alteracoes Tecnicas

### Ficheiro: `src/pages/DashboardPage.tsx`

**Card Container (linhas 153-158):**

```typescript
className={cn(
  "cursor-pointer transition-all duration-200",
  isLit 
    ? "bg-[hsl(207,74%,63%)] border-[hsl(207,65%,53%)] shadow-md ring-1 ring-[hsl(207,80%,73%)]/30 hover:shadow-lg hover:-translate-y-0.5" 
    : "bg-[hsl(207,55%,42%)] border-[hsl(207,50%,35%)] hover:bg-[hsl(207,55%,47%)]"
)}
```

**Icone, Numero e Label**: Mantém `text-white` (sem alteração).

---

## Resultado Visual

```text
CARD ACESO (count > 0):
+---------------------------+
|  [icon]            2      |  <- branco
|                           |
|  A Precificar             |  <- branco
+---------------------------+
   Fundo: azul ceu vibrante (#5AA9E6)

CARD APAGADO (count = 0):
+---------------------------+
|  [icon]            0      |  <- branco
|                           |
|  Por Fazer                |  <- branco
+---------------------------+
   Fundo: azul ceu escuro (#3D7AB3)
```

---

## Resumo das Cores Novas

| Elemento | HSL | Hex Aproximado |
|----------|-----|----------------|
| Fundo Aceso | `hsl(207, 74%, 63%)` | #5AA9E6 |
| Borda Aceso | `hsl(207, 65%, 53%)` | #4691CC |
| Fundo Apagado | `hsl(207, 55%, 42%)` | #3D7AB3 |
| Borda Apagado | `hsl(207, 50%, 35%)` | #2E6491 |
| Texto/Icones | `white` | #FFFFFF |

## Ficheiro Modificado

| Ficheiro | Accao |
|----------|-------|
| `src/pages/DashboardPage.tsx` | Alterar hue de 230 para 207 (azul ceu) |

