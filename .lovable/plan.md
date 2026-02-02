
# Plano: Renomear "Finalizado" para "Concluídos"

## Resumo

Alterar a nomenclatura do estado **"Finalizado"** para **"Concluídos"** em todo o sistema. Este é o estado final dos serviços - quando tudo está terminado (pago e entregue).

**Importante**: O estado interno permanece `'finalizado'` no código e base de dados. Apenas os labels visíveis ao utilizador serão alterados.

---

## Mapeamento Final de Estados

| Estado Interno | Label Antigo | Label Novo |
|----------------|--------------|------------|
| `concluidos` | Concluídos | **Of. Reparados** (já feito) |
| `finalizado` | Finalizado | **Concluídos** |

---

## Ficheiros a Alterar

| Ficheiro | Alteração |
|----------|-----------|
| `src/types/database.ts` | `label: 'Finalizado'` → `label: 'Concluídos'` |
| `src/pages/DashboardPage.tsx` | `label: 'Finalizados'` → `label: 'Concluídos'` |
| `src/pages/PerformancePage.tsx` | `finalizado: 'Finalizado'` → `finalizado: 'Concluídos'` |
| `src/components/shared/ServiceTimeline.tsx` | Labels `'Finalizado'` → `'Concluído'` (4 instâncias) |
| `src/components/services/ServiceDetailSheet.tsx` | Labels `'Finalizado'` → `'Concluído'` (4 instâncias) |
| `src/utils/feedbackMessages.ts` | `finalizado com sucesso` → `concluído com sucesso` |
| `src/pages/GeralPage.tsx` | `Serviço finalizado!` → `Serviço concluído!` |

---

## Detalhes por Ficheiro

### 1. `src/types/database.ts` (Configuração Central)

Esta é a fonte de verdade para badges. Linha 211:

```typescript
// De:
finalizado: { label: 'Finalizado', color: 'bg-primary/5 text-primary/60', intensity: 'dim' },

// Para:
finalizado: { label: 'Concluídos', color: 'bg-primary/5 text-primary/60', intensity: 'dim' },
```

### 2. `src/pages/DashboardPage.tsx` (Cards do Dashboard)

Linha 43 - o card do dashboard:

```typescript
// De:
{ key: 'finalizado' as const, label: 'Finalizados', icon: CheckSquare, route: '/geral?status=finalizado' },

// Para:
{ key: 'finalizado' as const, label: 'Concluídos', icon: CheckSquare, route: '/geral?status=finalizado' },
```

### 3. `src/pages/PerformancePage.tsx` (Página de Performance)

Linha 15:

```typescript
// De:
finalizado: 'Finalizado',

// Para:
finalizado: 'Concluídos',
```

### 4. `src/components/shared/ServiceTimeline.tsx` (Timeline de Progresso)

4 instâncias do label `'Finalizado'` nos steps da timeline (linhas 21, 30, 40, 49):

```typescript
// Todas as instâncias de:
{ id: 'finished', label: 'Finalizado', icon: Check, status: ['finalizado'] },

// Para:
{ id: 'finished', label: 'Concluído', icon: Check, status: ['finalizado'] },
```

### 5. `src/components/services/ServiceDetailSheet.tsx` (Ficha de Detalhes)

4 instâncias nos progress steps (linhas 121, 130, 140, 149):

```typescript
// Todas as instâncias de:
{ label: 'Finalizado', statuses: ['finalizado'] },

// Para:
{ label: 'Concluído', statuses: ['finalizado'] },
```

### 6. `src/utils/feedbackMessages.ts` (Mensagens de Feedback)

Linha 148:

```typescript
// De:
return `${serviceCode} finalizado com sucesso!`;

// Para:
return `${serviceCode} concluído com sucesso!`;
```

### 7. `src/pages/GeralPage.tsx` (Página Geral)

Linha 175 - toast de sucesso:

```typescript
// De:
toast.success('Serviço finalizado!');

// Para:
toast.success('Serviço concluído!');
```

---

## Nota sobre Minúsculas vs Maiúsculas

- **Badge/Label geral**: "Concluídos" (plural, usado em listas)
- **Timeline steps**: "Concluído" (singular, representa um passo)
- **Mensagens**: "concluído" (minúscula dentro de frase)

---

## Resumo de Alterações

| Ficheiro | Linhas |
|----------|--------|
| `src/types/database.ts` | 1 |
| `src/pages/DashboardPage.tsx` | 1 |
| `src/pages/PerformancePage.tsx` | 1 |
| `src/components/shared/ServiceTimeline.tsx` | 4 |
| `src/components/services/ServiceDetailSheet.tsx` | 4 |
| `src/utils/feedbackMessages.ts` | 1 |
| `src/pages/GeralPage.tsx` | 1 |

**Total: 7 ficheiros, ~13 alterações**

---

## Resultado Final

Após estas alterações:

| Estado Interno | Label Visível | Uso |
|----------------|---------------|-----|
| `concluidos` | Of. Reparados | Serviços reparados na oficina, aguardam entrega |
| `finalizado` | Concluídos | Serviços totalmente terminados (pagos e entregues) |
