

# Plano: Azul Vibrante nos Cards do Dashboard

## Analise da Referencia

Na imagem de referencia, a logica visual e:
- **Cards acesos** = cor vibrante/clara (roxo-azul brilhante)
- **Cards apagados** = mesma cor, mas mais escura/opaca

## Problema Actual

Os valores HSL actuais sao muito "lavados":
- Aceso: `hsl(220, 60%, 92%)` = muito claro, quase branco
- Apagado: `hsl(220, 40%, 72%)` = azul medio desbotado

## Solucao: Aumentar Saturacao e Ajustar Luminosidade

Para obter o efeito vibrante da referencia:

| Estado | Fundo Actual | Fundo Novo |
|--------|--------------|------------|
| **Aceso** | `hsl(220, 60%, 92%)` | `hsl(230, 70%, 65%)` |
| **Apagado** | `hsl(220, 40%, 72%)` | `hsl(230, 50%, 40%)` |

**Nota**: Ajuste do hue de 220 para 230 para aproximar ao tom roxo-azul da referencia, com saturacao elevada (70%) para vibrancia.

---

## Alteracoes Tecnicas

### Ficheiro: `src/pages/DashboardPage.tsx`

**Card Container (linhas 153-158):**

```typescript
className={cn(
  "cursor-pointer transition-all duration-200",
  isLit 
    ? "bg-[hsl(230,70%,65%)] border-[hsl(230,60%,55%)] shadow-md ring-1 ring-[hsl(230,80%,75%)]/30 hover:shadow-lg hover:-translate-y-0.5" 
    : "bg-[hsl(230,50%,40%)] border-[hsl(230,45%,35%)] hover:bg-[hsl(230,50%,45%)]"
)}
```

**Icone, Numero e Label** (linhas 163-177):
- Todos usam `text-white` em ambos os estados (como pedido: "detalhes em branco")

```typescript
<Icon className="h-6 w-6 text-white" />
<span className="text-3xl font-bold text-white">
<p className="text-sm font-medium mt-auto text-white">
```

---

## Resultado Visual

```text
CARD ACESO (count > 0):
+---------------------------+
|  [icon]            2      |  <- branco
|                           |
|  A Precificar             |  <- branco
+---------------------------+
   Fundo: azul vibrante claro (#6B7FD9)

CARD APAGADO (count = 0):
+---------------------------+
|  [icon]            0      |  <- branco
|                           |
|  Por Fazer                |  <- branco
+---------------------------+
   Fundo: azul vibrante escuro (#3D4A80)
```

---

## Resumo das Cores

| Elemento | HSL | Hex Aproximado |
|----------|-----|----------------|
| Fundo Aceso | `hsl(230, 70%, 65%)` | #6B7FD9 |
| Borda Aceso | `hsl(230, 60%, 55%)` | #5968B8 |
| Fundo Apagado | `hsl(230, 50%, 40%)` | #3D4A80 |
| Borda Apagado | `hsl(230, 45%, 35%)` | #36426E |
| Texto/Icones | `white` | #FFFFFF |

## Ficheiro Modificado

| Ficheiro | Accao |
|----------|-------|
| `src/pages/DashboardPage.tsx` | Actualizar cores dos cards para azul vibrante |

