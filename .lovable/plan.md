

# Plano: Azul Claro Vibrante com Lógica Aceso/Apagado

## Conceito

Aplicar o tom de azul claro vibrante (`hsl(220, 80%, 65%)`) da imagem de referência, **mantendo a lógica de opacidade**:
- **Cards com 0** = apagados (opacity reduzida)
- **Cards com 1+** = acesos (opacity total)

---

## Paleta Derivada (Hue 220°)

Base de cor vibrante: `#5B8DEF` → `hsl(220, 80%, 65%)`

| Elemento | Valor |
|----------|-------|
| **Fundo base** | `hsl(220, 60%, 96%)` |
| **Borda base** | `hsl(220, 50%, 88%)` |
| **Ícone/Número aceso** | `hsl(220, 80%, 50%)` |
| **Ícone/Número apagado** | `hsl(220, 40%, 70%)` |
| **Label aceso** | `hsl(220, 50%, 35%)` |
| **Label apagado** | `hsl(220, 25%, 55%)` |

---

## Alterações Técnicas

### Ficheiro: `src/pages/DashboardPage.tsx`

**Card Container (linhas 153-158):**

```typescript
className={cn(
  "cursor-pointer transition-all duration-200",
  "bg-[hsl(220,60%,96%)] border-[hsl(220,50%,88%)]",
  isLit 
    ? "opacity-100 shadow-md ring-1 ring-[hsl(220,80%,65%)]/30 hover:shadow-lg hover:-translate-y-0.5" 
    : "opacity-50 hover:opacity-70"
)}
```

**Ícone (linhas 163-166):**

```typescript
<Icon className={cn(
  "h-6 w-6",
  isLit ? "text-[hsl(220,80%,50%)]" : "text-[hsl(220,40%,70%)]"
)} />
```

**Número (linhas 167-172):**

```typescript
<span className={cn(
  "text-3xl font-bold",
  isLit ? "text-[hsl(220,80%,50%)]" : "text-[hsl(220,35%,70%)]"
)}>
```

**Label (linhas 174-177):**

```typescript
<p className={cn(
  "text-sm font-medium mt-auto",
  isLit ? "text-[hsl(220,50%,35%)]" : "text-[hsl(220,25%,55%)]"
)}>
```

---

## Comparativo

| Aspecto | Actual | Novo |
|---------|--------|------|
| **Hue (matiz)** | 214° (azul institucional) | 220° (azul vibrante) |
| **Lógica lit/dim** | Cores diferentes | **Opacity** (como pedido) |
| **Fundo** | Cor varia por estado | Cor única + opacity |
| **Cards com 0** | opacity-50 | opacity-50 ✓ |
| **Cards com 1+** | opacity-100 | opacity-100 ✓ |

---

## Resultado Visual

```text
CARD APAGADO (count = 0):
• Fundo azul claro vibrante
• opacity-50 → efeito "esbatido"
• Clicável mas visualmente secundário

CARD ACESO (count > 0):
• Mesmo fundo azul claro
• opacity-100 → totalmente visível
• Sombra e ring para destacar
• Ícone/número em azul vibrante (#5B8DEF)
```

A lógica de opacidade está **restabelecida**, agora usando o tom de azul claro vibrante da imagem de referência.

