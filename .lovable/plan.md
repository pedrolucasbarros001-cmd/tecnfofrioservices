

# Plano: Cards Apagados Azuis com Texto Branco

## Problema Actual

O `opacity-50` sobre o fundo azul claro (`hsl(220,60%,96%)`) cria um efeito **cinzento**, não azul.

## Solução

Inverter a lógica visual:
- **Cards apagados (count = 0)**: Fundo **azul sólido** + texto **branco**
- **Cards acesos (count > 0)**: Fundo **claro** + texto **azul** (como está)

---

## Paleta Proposta

| Estado | Elemento | Cor |
|--------|----------|-----|
| **Apagado** | Fundo | `hsl(220, 50%, 70%)` (azul médio) |
| **Apagado** | Borda | `hsl(220, 45%, 65%)` |
| **Apagado** | Ícone/Número/Label | `white` |
| **Aceso** | Fundo | `hsl(220, 60%, 96%)` (azul claro) |
| **Aceso** | Borda | `hsl(220, 50%, 88%)` |
| **Aceso** | Ícone/Número | `hsl(220, 80%, 50%)` (azul vibrante) |
| **Aceso** | Label | `hsl(220, 50%, 35%)` (azul escuro) |

---

## Alteracoes Tecnicas

### Ficheiro: `src/pages/DashboardPage.tsx`

**Card Container (linhas 153-159):**

```typescript
className={cn(
  "cursor-pointer transition-all duration-200",
  isLit 
    ? "bg-[hsl(220,60%,96%)] border-[hsl(220,50%,88%)] shadow-md ring-1 ring-[hsl(220,80%,65%)]/30 hover:shadow-lg hover:-translate-y-0.5" 
    : "bg-[hsl(220,50%,70%)] border-[hsl(220,45%,65%)] hover:bg-[hsl(220,50%,65%)]"
)}
```

**Icone (linhas 164-167):**

```typescript
<Icon className={cn(
  "h-6 w-6",
  isLit ? "text-[hsl(220,80%,50%)]" : "text-white"
)} />
```

**Numero (linhas 168-173):**

```typescript
<span className={cn(
  "text-3xl font-bold",
  isLit ? "text-[hsl(220,80%,50%)]" : "text-white"
)}>
```

**Label (linhas 175-179):**

```typescript
<p className={cn(
  "text-sm font-medium mt-auto",
  isLit ? "text-[hsl(220,50%,35%)]" : "text-white"
)}>
```

---

## Resultado Visual

```text
CARD APAGADO (count = 0):
+---------------------------+
|  [icon]            0      |  <- branco
|                           |
|  Por Fazer                |  <- branco
+---------------------------+
   Fundo: azul medio

CARD ACESO (count > 0):
+---------------------------+
|  [icon]            2      |  <- azul vibrante
|                           |
|  A Precificar             |  <- azul escuro
+---------------------------+
   Fundo: azul muito claro
   Sombra + ring
```

A inversao de cores (azul escuro para apagados, claro para acesos) cria o efeito visual correcto sem usar opacidade.

