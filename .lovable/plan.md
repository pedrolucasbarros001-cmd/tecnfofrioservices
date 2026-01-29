
# Plano: Corrigir Design para Padrão Institucional TECNOFRIO

## Diagnóstico

O design actual tem problemas de legibilidade e coerência:

| Problema | Actual | Impacto |
|----------|--------|---------|
| **Sombras cartoon** | `5px 5px 0px 0px #000` (borda dura) | Efeito "recortado", não profissional |
| **Bordas pretas** | `--border: 0 0% 0%` | Linhas de contorno pesadas |
| **Primary = preto** | `--primary: 0 0% 0%` | Botões pretos, não azuis |
| **Sidebar ilegível** | foreground preto sobre fundo escuro | Texto invisível |
| **Radius = 0** | `--radius: 0rem` | Cantos rectos, estilo cartoon |
| **Cards slate** | `bg-slate-50/80` | Inconsistente com azul da marca |

---

## Solução: Paleta Azul Institucional #2B4F84

### Paleta de Cores Coerente

```text
┌─────────────────────────────────────────────────────────────┐
│                 PALETA AZUL TECNOFRIO                        │
├─────────────────────────────────────────────────────────────┤
│  COR PRINCIPAL: #2B4F84 (azul institucional)                │
│  HSL: 214 50% 34%                                            │
├─────────────────────────────────────────────────────────────┤
│  VARIAÇÕES LIGHT MODE:                                       │
│  ├── Primary:      214 50% 34% (#2B4F84)                    │
│  ├── Background:   214 30% 98% (quase branco azulado)       │
│  ├── Card:         214 30% 100% (branco)                    │
│  ├── Border:       214 20% 85% (azul muito claro)           │
│  ├── Muted:        214 20% 96% (azul subtil)                │
├─────────────────────────────────────────────────────────────┤
│  VARIAÇÕES DARK MODE:                                        │
│  ├── Primary:      214 50% 60% (azul mais claro)            │
│  ├── Background:   214 30% 8% (quase preto azulado)         │
│  ├── Card:         214 30% 12%                              │
│  ├── Border:       214 20% 25%                              │
│  ├── Muted:        214 20% 18%                              │
├─────────────────────────────────────────────────────────────┤
│  SIDEBAR (sempre escura para contraste):                    │
│  ├── Background:   214 45% 15% (azul escuro)                │
│  ├── Foreground:   214 20% 95% (texto claro legível)        │
│  ├── Accent:       214 40% 25% (hover)                      │
│  ├── Border:       214 30% 25%                              │
└─────────────────────────────────────────────────────────────┘
```

### Sombras Suaves (remover efeito cartoon)

```css
/* ANTES (cartoon) */
--shadow-sm: 3px 3px 0px 0px #000000;

/* DEPOIS (suave profissional) */
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
```

### Bordas Suaves (remover contornos pretos)

```css
/* ANTES */
--border: 0 0% 0%;  /* preto */
--radius: 0rem;     /* cantos rectos */

/* DEPOIS */
--border: 214 20% 85%;  /* azul muito claro */
--radius: 0.5rem;       /* cantos suaves */
```

---

## Ficheiros a Modificar

| Ficheiro | Alterações |
|----------|------------|
| `src/index.css` | Actualizar todas as variáveis CSS para azul institucional + sombras suaves |
| `src/pages/DashboardPage.tsx` | Mudar cards de slate para azul |
| `src/types/database.ts` | Mudar estados de slate para azul |
| `src/components/layouts/OwnerSidebar.tsx` | Remover bordas duras, usar cores legíveis |
| `src/components/layouts/SecretarySidebar.tsx` | Mesmas correcções |
| `src/components/layouts/TechnicianSidebar.tsx` | Mesmas correcções |
| `src/components/ui/card.tsx` | Remover sombras cartoon |

---

## Detalhes Técnicos

### A) Actualizar index.css - Variáveis CSS

```css
:root {
  /* Fundo levemente azulado para coerência */
  --background: 214 30% 99%;
  --foreground: 214 50% 15%;

  /* Card branco puro com borda azul subtil */
  --card: 0 0% 100%;
  --card-foreground: 214 50% 15%;

  /* Primary = Azul institucional TECNOFRIO #2B4F84 */
  --primary: 214 50% 34%;
  --primary-foreground: 0 0% 100%;

  /* Secondary - azul muito claro */
  --secondary: 214 20% 95%;
  --secondary-foreground: 214 50% 25%;

  /* Muted - para texto secundário */
  --muted: 214 20% 96%;
  --muted-foreground: 214 20% 45%;

  /* Accent - hover states */
  --accent: 214 30% 92%;
  --accent-foreground: 214 50% 20%;

  /* Bordas suaves, não pretas */
  --border: 214 20% 88%;
  --input: 214 20% 88%;
  --ring: 214 50% 34%;

  /* Cantos arredondados, não rectos */
  --radius: 0.5rem;

  /* Sidebar - escura mas legível */
  --sidebar-background: 214 45% 15%;
  --sidebar-foreground: 214 15% 92%;
  --sidebar-primary: 214 50% 60%;
  --sidebar-primary-foreground: 0 0% 100%;
  --sidebar-accent: 214 40% 22%;
  --sidebar-accent-foreground: 214 15% 95%;
  --sidebar-border: 214 30% 25%;
  --sidebar-ring: 214 50% 50%;

  /* Sombras suaves (não cartoon) */
  --shadow-2xs: 0 1px 2px 0 rgb(0 0 0 / 0.03);
  --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
  --shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.25);
}

.dark {
  --background: 214 30% 7%;
  --foreground: 214 15% 95%;

  --card: 214 30% 10%;
  --card-foreground: 214 15% 95%;

  --primary: 214 50% 55%;
  --primary-foreground: 214 50% 10%;

  --secondary: 214 25% 18%;
  --secondary-foreground: 214 15% 90%;

  --muted: 214 25% 15%;
  --muted-foreground: 214 15% 60%;

  --accent: 214 30% 20%;
  --accent-foreground: 214 15% 95%;

  --border: 214 25% 22%;
  --input: 214 25% 22%;
  --ring: 214 50% 55%;

  --sidebar-background: 214 45% 8%;
  --sidebar-foreground: 214 15% 90%;
  --sidebar-primary: 214 50% 60%;
  --sidebar-primary-foreground: 214 50% 10%;
  --sidebar-accent: 214 40% 15%;
  --sidebar-accent-foreground: 214 15% 95%;
  --sidebar-border: 214 30% 18%;
  --sidebar-ring: 214 50% 50%;

  /* Sombras suaves em dark mode */
  --shadow-2xs: 0 1px 2px 0 rgb(0 0 0 / 0.2);
  --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.25);
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.3);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.35);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.4);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.45);
  --shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.5);
}
```

### B) Actualizar DashboardPage - Cards Azuis

```typescript
// Mudar de slate para azul coerente
<Card className={cn(
  "cursor-pointer transition-all duration-200",
  "bg-primary/5 backdrop-blur-sm border-primary/10",
  isLit 
    ? "opacity-100 shadow-md hover:shadow-lg hover:-translate-y-0.5" 
    : "opacity-40 hover:opacity-60"
)}>
```

### C) Actualizar SERVICE_STATUS_CONFIG - Badges Azuis

```typescript
por_fazer: { 
  label: 'Por Fazer', 
  color: 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary', 
  intensity: 'normal' 
},
em_execucao: { 
  label: 'Em Execução', 
  color: 'bg-primary/20 text-primary font-medium dark:bg-primary/30', 
  intensity: 'active' 
},
// ... restantes com variações de opacidade do primary
```

### D) Actualizar Sidebars - Remover Bordas Duras

```typescript
// Remover: border-sidebar-border/50
// Usar simplesmente as cores do tema
<Sidebar collapsible="icon">
  {/* Bordas subtis, não linhas duras */}
</Sidebar>
```

---

## Resultado Esperado

```text
┌─────────────────────────────────────────────────────────────┐
│                     ANTES vs DEPOIS                          │
├─────────────────────────────────────────────────────────────┤
│  ANTES:                                                      │
│  • Sombras duras tipo cartoon (5px 5px 0px 0px #000)        │
│  • Bordas pretas pesadas                                    │
│  • Primary = preto (botões pretos)                          │
│  • Sidebar ilegível (texto preto sobre fundo escuro)        │
│  • Cards cinzento (slate) sem relação com marca             │
│  • Cantos rectos (radius = 0)                               │
│                                                              │
│  DEPOIS:                                                     │
│  • Sombras suaves profissionais (blur, opacity)             │
│  • Bordas azul muito claro, discretas                       │
│  • Primary = azul institucional #2B4F84                     │
│  • Sidebar com texto claro legível                          │
│  • Cards com tonalidade azul coerente com logo              │
│  • Cantos suavemente arredondados (0.5rem)                  │
│  • Sensação premium, coerente, profissional                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Filosofia Mantida

- **Lógica "aceso/apagado"** preservada nos cards (opacity)
- **Tipos de serviço mantêm cores** (visita=azul, oficina=laranja, etc.)
- **Vermelho apenas para destruição**
- **Hierarquia clara** - Estado → Acção → Informação
- **Glass sutil** - backdrop-blur leve, não exagerado
