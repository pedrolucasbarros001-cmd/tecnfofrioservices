
# Plano: Renomear "Concluídos" para "Oficina Reparados"

## Objectivo

Alterar a nomenclatura do estado **"Concluídos"** para **"Oficina Reparados"** em todo o sistema, garantindo que o novo nome aparece correctamente sem sobreposição de texto.

---

## Ficheiros a Alterar

| Ficheiro | Localização | Alteração |
|----------|-------------|-----------|
| `src/types/database.ts` | Linha 209 | `label: 'Concluídos'` → `label: 'Oficina Reparados'` |
| `src/pages/DashboardPage.tsx` | Linha 40 | `label: 'Concluídos'` → `label: 'Of. Reparados'` (abreviado para card) |
| `src/components/layouts/SecretarySidebar.tsx` | Linha 29 | `title: 'Concluídos'` → `title: 'Of. Reparados'` |
| `src/pages/secretary/SecretaryConcluidosPage.tsx` | Linhas 74, 84, 95 | Actualizar títulos e textos |
| `src/pages/PerformancePage.tsx` | Linha 13 | `concluidos: 'Concluído'` → `concluidos: 'Of. Reparados'` |
| `src/pages/TVMonitorPage.tsx` | Linha 79 | `label: 'Concluídos'` → `label: 'Of. Reparados'` |
| `src/components/shared/ServiceTimeline.tsx` | Linhas 29, 39, 48 | Labels "Concluído" para step → Manter "Reparado" |
| `src/components/services/ServiceDetailSheet.tsx` | Linhas 129, 139, 148 | Labels de progresso |

---

## Detalhes por Ficheiro

### 1. `src/types/database.ts` (Configuração Central)

Esta é a **fonte de verdade** para o label do status. A alteração aqui propaga para todos os badges.

```typescript
// Linha 209
concluidos: { label: 'Oficina Reparados', color: 'bg-primary/20 text-primary font-medium', intensity: 'active' },
```

### 2. `src/pages/DashboardPage.tsx` (Cards do Dashboard)

Para evitar sobreposição no card, usar abreviação:

```typescript
// Linha 40
{ key: 'concluidos' as const, label: 'Of. Reparados', icon: Truck, route: '/geral?status=concluidos' },
```

### 3. `src/components/layouts/SecretarySidebar.tsx` (Menu Secretária)

```typescript
// Linha 29
{ title: 'Of. Reparados', url: '/concluidos', icon: CheckCircle2 },
```

A rota permanece `/concluidos` (não afecta funcionamento, apenas o label visível).

### 4. `src/pages/secretary/SecretaryConcluidosPage.tsx` (Página da Secretária)

```tsx
// Linha 74 - Título da página
<h1 className="text-2xl font-bold tracking-tight">Oficina Reparados</h1>

// Linha 75-77 - Descrição
<p className="text-muted-foreground">
  Serviços reparados na oficina aguardando entrega ou recolha
</p>

// Linha 84 - Título do card
<CardTitle className="flex items-center gap-2">
  Serviços Reparados na Oficina
  <Badge variant="secondary">{workshopServices.length}</Badge>
</CardTitle>

// Linha 95 - Estado vazio
<div className="py-12 text-center text-muted-foreground">
  Não há serviços reparados aguardando entrega.
</div>
```

### 5. `src/pages/PerformancePage.tsx` (Página de Performance)

```typescript
// Linha 13
concluidos: 'Of. Reparados',
```

### 6. `src/pages/TVMonitorPage.tsx` (Monitor TV)

```typescript
// Linha 78-82
{ 
  key: 'concluidos', 
  label: 'Of. Reparados', 
  icon: CheckCircle, 
  color: 'text-emerald-400',
  filter: (s: TVMonitorService) => s.status === 'concluidos'
},
```

### 7. `src/components/shared/ServiceTimeline.tsx` (Timeline de Progresso)

Os labels da timeline indicam etapas do processo. Para serviços de oficina, mudar "Concluído" para "Reparado":

```typescript
// Linha 29 (Instalação - manter "Concluído" pois não é oficina)
{ id: 'done', label: 'Concluído', icon: Check, status: ['concluidos', 'em_debito', 'finalizado'] },

// Linha 39 (Oficina - mudar para "Reparado")
{ id: 'done', label: 'Reparado', icon: Check, status: ['concluidos', 'em_debito', 'finalizado'] },

// Linha 48 (Visita - manter "Concluído")
{ id: 'done', label: 'Concluído', icon: Check, status: ['a_precificar', 'concluidos', 'em_debito', 'finalizado'] },
```

### 8. `src/components/services/ServiceDetailSheet.tsx` (Ficha de Detalhes)

Mesma lógica da timeline - apenas oficina usa "Reparado":

```typescript
// Linha 129 (Instalação - manter)
{ label: 'Concluído', statuses: ['concluidos', 'em_debito', 'finalizado'] },

// Linha 139 (Oficina - mudar)
{ label: 'Reparado', statuses: ['concluidos', 'em_debito', 'finalizado'] },

// Linha 148 (Visita - manter)
{ label: 'Concluído', statuses: ['concluidos', 'em_debito', 'finalizado'] },
```

---

## Estratégia de Abreviação

Para evitar sobreposição de texto em espaços limitados:

| Contexto | Nome Completo | Nome Abreviado |
|----------|---------------|----------------|
| SERVICE_STATUS_CONFIG (badges) | Oficina Reparados | - |
| Dashboard cards | - | Of. Reparados |
| Menu sidebar | - | Of. Reparados |
| TV Monitor | - | Of. Reparados |
| Performance page | - | Of. Reparados |
| Página SecretaryConcluidosPage (título) | Oficina Reparados | - |
| Timeline steps (oficina) | - | Reparado |

---

## Nota Técnica

O **status interno** permanece `'concluidos'` (no código e base de dados). Apenas os **labels visíveis** são alterados para "Oficina Reparados" ou "Of. Reparados".

Isto significa:
- Nenhuma migração de base de dados necessária
- Nenhuma alteração em queries
- A rota `/concluidos` permanece igual
- Apenas alterações visuais/UI

---

## Resumo de Alterações

| Ficheiro | Linhas Afectadas |
|----------|------------------|
| `src/types/database.ts` | 1 |
| `src/pages/DashboardPage.tsx` | 1 |
| `src/components/layouts/SecretarySidebar.tsx` | 1 |
| `src/pages/secretary/SecretaryConcluidosPage.tsx` | 4 |
| `src/pages/PerformancePage.tsx` | 1 |
| `src/pages/TVMonitorPage.tsx` | 1 |
| `src/components/shared/ServiceTimeline.tsx` | 1 |
| `src/components/services/ServiceDetailSheet.tsx` | 1 |

**Total: 8 ficheiros, ~11 alterações**
