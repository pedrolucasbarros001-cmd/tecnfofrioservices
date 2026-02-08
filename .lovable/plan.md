

# Plano: Alterar "Of. Reparados" para "Oficina Reparados"

## Objectivo

Actualizar o nome do estado `concluidos` de **"Of. Reparados"** para **"Oficina Reparados"** em todos os locais da aplicação.

---

## Ficheiros a Alterar

| Ficheiro | Linha | Alteração |
|----------|-------|-----------|
| `src/types/database.ts` | 231 | `label: 'Of. Reparados'` → `label: 'Oficina Reparados'` |
| `src/pages/DashboardPage.tsx` | 40 | `label: 'Of. Reparados'` → `label: 'Oficina Reparados'` |
| `src/pages/PerformancePage.tsx` | 13 | `concluidos: 'Of. Reparados'` → `concluidos: 'Oficina Reparados'` |
| `src/pages/TVMonitorPage.tsx` | 79 | `label: 'Of. Reparados'` → `label: 'Oficina Reparados'` |
| `src/components/layouts/SecretarySidebar.tsx` | 29 | `title: 'Of. Reparados'` → `title: 'Oficina Reparados'` |

---

## Alterações Detalhadas

### 1. `src/types/database.ts` (linha 231)

```typescript
// De:
concluidos: { label: 'Of. Reparados', color: 'bg-primary/20 text-primary font-medium', intensity: 'active' },

// Para:
concluidos: { label: 'Oficina Reparados', color: 'bg-primary/20 text-primary font-medium', intensity: 'active' },
```

### 2. `src/pages/DashboardPage.tsx` (linha 40)

```typescript
// De:
{ key: 'concluidos' as const, label: 'Of. Reparados', icon: Truck, route: '/geral?status=concluidos' },

// Para:
{ key: 'concluidos' as const, label: 'Oficina Reparados', icon: Truck, route: '/geral?status=concluidos' },
```

### 3. `src/pages/PerformancePage.tsx` (linha 13)

```typescript
// De:
concluidos: 'Of. Reparados',

// Para:
concluidos: 'Oficina Reparados',
```

### 4. `src/pages/TVMonitorPage.tsx` (linha 79)

```typescript
// De:
label: 'Of. Reparados',

// Para:
label: 'Oficina Reparados',
```

### 5. `src/components/layouts/SecretarySidebar.tsx` (linha 29)

```typescript
// De:
{ title: 'Of. Reparados', url: '/concluidos', icon: CheckCircle2 },

// Para:
{ title: 'Oficina Reparados', url: '/concluidos', icon: CheckCircle2 },
```

---

## Resultado

Após estas alterações, o estado "concluidos" aparecerá como **"Oficina Reparados"** em:

- Cards do Dashboard
- Sidebar da Secretária
- Página de Performance
- Monitor TV
- Badges de status em toda a aplicação

