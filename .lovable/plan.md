
# Plano: Corrigir Cores dos Cards do Dashboard para Azul Institucional

## Problema Actual

Olhando para o screenshot, os cards estão a usar:
- **Fundo**: `bg-primary/5` (apenas 5% do azul - aparece quase cinzento)
- **Borda**: `bg-primary/10` (muito subtil)
- **Ícone dim**: `text-primary/40` (40% do azul)
- **Ícone lit**: `text-primary` (azul total)

O resultado visual é que os cards parecem cinzentos em vez de azuis, perdendo coerência com a paleta da sidebar.

---

## Solução: Intensificar o Azul Mantendo Lógica de Opacidade

### Tabela de Mudanças

| Elemento | Actual | Novo |
|----------|--------|------|
| **Card base (fundo)** | `bg-primary/5` | `bg-[hsl(214,45%,97%)]` (azul claro sólido) |
| **Card borda** | `border-primary/10` | `border-[hsl(214,30%,88%)]` (azul suave) |
| **Card lit ring** | `ring-primary/20` | `ring-primary/30` (mais visível) |
| **Card lit fundo** | mesmo | `bg-[hsl(214,45%,94%)]` (azul mais intenso) |
| **Ícone dim** | `text-primary/40` | `text-[hsl(214,30%,70%)]` (azul claro) |
| **Ícone lit** | `text-primary` | `text-primary` (mantém) |
| **Número dim** | `text-muted-foreground/50` | `text-[hsl(214,20%,70%)]` (azul claro) |
| **Número lit** | `text-foreground` | `text-primary` (azul institucional) |
| **Label** | `text-muted-foreground` | `text-[hsl(214,20%,50%)]` (azul médio) |

---

## Código a Alterar

### Ficheiro: `src/pages/DashboardPage.tsx`

**Actualizar Card styling (linhas 151-159):**

```typescript
<Card
  key={card.key}
  className={cn(
    "cursor-pointer transition-all duration-200",
    // Base: fundo azul claro sólido, borda azul suave
    "bg-[hsl(214,45%,97%)] border-[hsl(214,30%,88%)]",
    isLit 
      ? "opacity-100 bg-[hsl(214,45%,94%)] shadow-md ring-1 ring-primary/30 hover:shadow-lg hover:-translate-y-0.5" 
      : "opacity-50 hover:opacity-70"
  )}
  onClick={() => navigate(card.route)}
>
```

**Actualizar Ícone styling (linhas 164-167):**

```typescript
<Icon className={cn(
  "h-6 w-6",
  isLit ? "text-primary" : "text-[hsl(214,30%,70%)]"
)} />
```

**Actualizar Número styling (linhas 168-173):**

```typescript
<span className={cn(
  "text-3xl font-bold",
  isLit ? "text-primary" : "text-[hsl(214,20%,70%)]"
)}>
  {loading ? '...' : count}
</span>
```

**Actualizar Label styling (linha 175):**

```typescript
<p className={cn(
  "text-sm font-medium mt-auto",
  isLit ? "text-[hsl(214,30%,35%)]" : "text-[hsl(214,20%,60%)]"
)}>
  {card.label}
</p>
```

---

## Resultado Esperado

```text
┌─────────────────────────────────────────────────────────────┐
│                     ANTES vs DEPOIS                          │
├─────────────────────────────────────────────────────────────┤
│  CARD APAGADO (count = 0):                                   │
│  ├── Fundo: quase branco        → azul muito claro (97%)    │
│  ├── Ícone: cinzento apagado    → azul claro (70%)          │
│  ├── Número: cinzento           → azul claro (70%)          │
│  ├── Label: cinzento            → azul médio (60%)          │
│  └── Opacity: 40%               → 50% (um pouco mais visível)│
│                                                              │
│  CARD ACESO (count > 0):                                     │
│  ├── Fundo: quase branco        → azul claro (94%)          │
│  ├── Ícone: azul                → azul institucional        │
│  ├── Número: preto              → azul institucional        │
│  ├── Label: cinzento            → azul escuro (35%)         │
│  └── Ring: azul 20%             → azul 30% (mais visível)   │
└─────────────────────────────────────────────────────────────┘
```

---

## Filosofia Mantida

- **Lógica "aceso/apagado"** preservada através de opacidade e intensidade de cor
- **Coerência com sidebar** usando a mesma família HSL (214°)
- **Hierarquia visual** clara entre estados
- **Sem cores cartoon** - todas as cores são azuis suaves
