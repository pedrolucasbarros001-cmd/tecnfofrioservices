

# Plano: Modo Claro Fixo + Cards Azuis Corrigidos

## Parte 1: Remover Toggle de Tema

O sistema passara a funcionar apenas em modo claro.

### Alteracoes:

**1. `src/App.tsx`**
- Alterar `defaultTheme="system"` para `defaultTheme="light"`
- Remover `enableSystem` do ThemeProvider

**2. `src/components/layouts/AppLayout.tsx`**
- Remover import do `ThemeToggle`
- Remover o componente `<ThemeToggle />` do header

**3. `src/components/ThemeToggle.tsx`**
- Eliminar o ficheiro (nao sera mais utilizado)

---

## Parte 2: Corrigir Cards do Dashboard

Baseado na imagem de referencia, todos os cards devem ser azuis:

| Estado | Fundo | Icone/Numero | Label |
|--------|-------|--------------|-------|
| **Aceso** (count > 0) | Azul claro `hsl(220,60%,92%)` | Azul escuro `hsl(220,70%,35%)` | Azul escuro `hsl(220,60%,30%)` |
| **Apagado** (count = 0) | Azul medio `hsl(220,40%,72%)` | Branco | Branco |

### Alteracoes em `src/pages/DashboardPage.tsx`:

**Card Container (linhas 153-158):**

```typescript
className={cn(
  "cursor-pointer transition-all duration-200",
  isLit 
    ? "bg-[hsl(220,60%,92%)] border-[hsl(220,50%,85%)] shadow-md ring-1 ring-[hsl(220,70%,50%)]/20 hover:shadow-lg hover:-translate-y-0.5" 
    : "bg-[hsl(220,40%,72%)] border-[hsl(220,35%,65%)] hover:bg-[hsl(220,40%,68%)]"
)}
```

**Icone (linhas 163-166):**

```typescript
<Icon className={cn(
  "h-6 w-6",
  isLit ? "text-[hsl(220,70%,35%)]" : "text-white"
)} />
```

**Numero (linhas 167-172):**

```typescript
<span className={cn(
  "text-3xl font-bold",
  isLit ? "text-[hsl(220,70%,35%)]" : "text-white"
)}>
```

**Label (linhas 174-177):**

```typescript
<p className={cn(
  "text-sm font-medium mt-auto",
  isLit ? "text-[hsl(220,60%,30%)]" : "text-white"
)}>
```

---

## Resultado Visual

```text
CARD ACESO (count > 0):
+---------------------------+
|  [icon]            2      |  <- azul escuro
|                           |
|  A Precificar             |  <- azul escuro
+---------------------------+
   Fundo: azul claro (#D4DEF5)
   Sombra + ring

CARD APAGADO (count = 0):
+---------------------------+
|  [icon]            0      |  <- branco
|                           |
|  Por Fazer                |  <- branco
+---------------------------+
   Fundo: azul medio (#9AADD4)
```

---

## Ficheiros Alterados

| Ficheiro | Accao |
|----------|-------|
| `src/App.tsx` | Modificar ThemeProvider para modo claro fixo |
| `src/components/layouts/AppLayout.tsx` | Remover ThemeToggle do header |
| `src/components/ThemeToggle.tsx` | Eliminar ficheiro |
| `src/pages/DashboardPage.tsx` | Corrigir cores dos cards |

