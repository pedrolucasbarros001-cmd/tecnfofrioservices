
# Plano: Intensificar Azul Institucional nos Cards do Dashboard

## Problema Actual

Analisando o screenshot:

| Estado | Problema |
|--------|----------|
| **Cards apagados** | Fundo quase branco (`hsl 214,45%,97%`) com `opacity-50` = aparece cinzento |
| **Cards acesos** | Azul visível mas subtil (`hsl 214,45%,94%`) |

A opacidade está a "lavar" a cor azul, fazendo os cards parecerem cinzentos em vez de azuis claros.

---

## Solução: Usar Cores Sólidas + Variar Lightness

Em vez de usar opacidade para criar a diferença "aceso/apagado", vamos variar a **intensidade da cor** (lightness) mantendo sempre o matiz azul (214).

### Paleta Proposta

```text
┌─────────────────────────────────────────────────────────────┐
│                  CARDS DO DASHBOARD                          │
├─────────────────────────────────────────────────────────────┤
│  CARD APAGADO (count = 0):                                   │
│  ├── Fundo:  hsl(214, 40%, 95%)  (azul muito claro)         │
│  ├── Borda:  hsl(214, 30%, 88%)  (azul suave)               │
│  ├── Ícone:  hsl(214, 35%, 70%)  (azul claro)               │
│  ├── Número: hsl(214, 30%, 75%)  (azul claro)               │
│  ├── Label:  hsl(214, 25%, 60%)  (azul médio)               │
│  └── SEM opacity - cor sólida                                │
│                                                              │
│  CARD ACESO (count > 0):                                     │
│  ├── Fundo:  hsl(214, 50%, 92%)  (azul mais saturado)       │
│  ├── Borda:  hsl(214, 40%, 80%)  (azul mais visível)        │
│  ├── Ícone:  primary (azul institucional)                   │
│  ├── Número: primary (azul institucional)                   │
│  ├── Label:  hsl(214, 40%, 30%)  (azul escuro)              │
│  ├── Ring:   primary/30                                      │
│  └── Shadow: md                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Alterações Técnicas

### Ficheiro: `src/pages/DashboardPage.tsx`

**Card Container (linhas 151-160):**

```typescript
<Card
  key={card.key}
  className={cn(
    "cursor-pointer transition-all duration-200",
    isLit 
      ? "bg-[hsl(214,50%,92%)] border-[hsl(214,40%,80%)] shadow-md ring-1 ring-primary/30 hover:shadow-lg hover:-translate-y-0.5" 
      : "bg-[hsl(214,40%,95%)] border-[hsl(214,30%,88%)] hover:bg-[hsl(214,45%,93%)]"
  )}
  onClick={() => navigate(card.route)}
>
```

**Ícone (linhas 164-167):**

```typescript
<Icon className={cn(
  "h-6 w-6",
  isLit ? "text-primary" : "text-[hsl(214,35%,70%)]"
)} />
```

**Número (linhas 168-173):**

```typescript
<span className={cn(
  "text-3xl font-bold",
  isLit ? "text-primary" : "text-[hsl(214,30%,75%)]"
)}>
  {loading ? '...' : count}
</span>
```

**Label (linhas 175-179):**

```typescript
<p className={cn(
  "text-sm font-medium mt-auto",
  isLit ? "text-[hsl(214,40%,30%)]" : "text-[hsl(214,25%,60%)]"
)}>
  {card.label}
</p>
```

---

## Mudança Chave: Remover Opacity

| Antes | Depois |
|-------|--------|
| `opacity-50` nos cards apagados | **Sem opacity** - cores sólidas |
| Cores muito claras (97%, 94% lightness) | Cores mais azuis (95%, 92%) |
| Efeito "cinzento lavado" | Efeito "azul institucional claro" |

---

## Resultado Esperado

```text
CARDS APAGADOS:
• Fundo azul claro visível (não cinzento)
• Elementos em tons de azul (não cinzento)
• Sem opacity = cores puras

CARDS ACESOS:
• Fundo azul mais intenso
• Borda mais definida
• Elementos no azul institucional #2B4F84
• Sombra e ring para destacar
```

A lógica "aceso/apagado" mantém-se através da **diferença de intensidade** e não da **opacidade**.
