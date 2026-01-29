
# Plano: Implementar Filosofia de Design TECNOFRIO

## Resumo Executivo

Transformar o design do sistema de um "arco-íris de estados" para um sistema **monocromático azul institucional** com lógica **"aceso/apagado"**, onde a clareza e a hierarquia substituem cores saturadas e botões coloridos.

---

## Diagnóstico do Estado Actual

### Problemas Identificados

| Área | Problema Actual | Impacto |
|------|-----------------|---------|
| **Dashboard** | Cada card com cor diferente (cinza, azul, laranja, roxo, amarelo, teal, verde, vermelho, violeta) | Competição visual, arco-íris confuso |
| **Botões de acção** | Cada estado tem botão de cor diferente (verde, amarelo, laranja, teal, emerald, roxo+rosa) | Sem hierarquia clara |
| **Badges de estado** | Cores saturadas (blue-500, cyan-500, purple-500, yellow-500, etc.) | Gritam por atenção |
| **Tags** | Cores fortes (red-500, purple-500, yellow-500) | Protagonismo excessivo |

---

## Solução: Sistema Monocromático Azul

### 1. Paleta de Cores Unificada

```text
┌─────────────────────────────────────────────────────────────┐
│                    PALETA INSTITUCIONAL                      │
├─────────────────────────────────────────────────────────────┤
│  AZUL PRINCIPAL                                              │
│  ├── Aceso:    slate-800 (texto) + slate-100 (bg sutil)     │
│  ├── Apagado:  slate-300 (texto) + slate-50 (bg)            │
│  └── Hover:    ring-slate-300 + shadow suave                │
├─────────────────────────────────────────────────────────────┤
│  ACÇÕES (Sempre azul)                                        │
│  ├── Primária:   bg-primary (azul escuro) text-white        │
│  ├── Secundária: border-primary text-primary                │
│  └── Ghost:      text-primary hover:bg-primary/5            │
├─────────────────────────────────────────────────────────────┤
│  TIPOS DE SERVIÇO (Discretos, mantidos)                     │
│  ├── Visita:     blue-100/blue-700                          │
│  ├── Oficina:    orange-100/orange-700                      │
│  ├── Instalação: yellow-100/yellow-700                      │
│  └── Entrega:    green-100/green-700                        │
├─────────────────────────────────────────────────────────────┤
│  EXCEPÇÕES (Únicas)                                          │
│  ├── Destrutivo: red-600 (apenas eliminar/irreversível)     │
│  └── Alerta:     amber-600 (apenas "forçar estado")         │
└─────────────────────────────────────────────────────────────┘
```

### 2. Lógica "Aceso/Apagado" no Dashboard

```text
┌───────────────────────────────────────────────────────────┐
│                    DASHBOARD CARDS                         │
├───────────────────────────────────────────────────────────┤
│  TODOS OS CARDS:                                           │
│  ├── Mesmo fundo base: bg-slate-50/80                     │
│  ├── Mesmo layout e tamanho                                │
│  ├── Glass effect sutil: backdrop-blur-sm                 │
│  ├── Borda: border-slate-200                              │
│                                                            │
│  ESTADO APAGADO (0 serviços):                             │
│  ├── opacity-50                                            │
│  ├── shadow-none                                           │
│  ├── Número: text-slate-400                               │
│  ├── Ícone: text-slate-400                                │
│                                                            │
│  ESTADO ACESO (≥1 serviço):                               │
│  ├── opacity-100                                           │
│  ├── shadow-sm + ring-1 ring-slate-200                    │
│  ├── Número: text-slate-900 font-bold                     │
│  ├── Ícone: text-slate-600                                │
└───────────────────────────────────────────────────────────┘
```

### 3. Estados: Texto > Cor

Todos os estados usam a mesma cor base com variações de intensidade:

| Estado | Actual | Novo |
|--------|--------|------|
| Por Fazer | bg-blue-500 | bg-slate-100 text-slate-700 |
| Em Execução | bg-cyan-500 | bg-slate-200 text-slate-800 font-medium |
| Na Oficina | bg-purple-500 | bg-slate-100 text-slate-700 |
| Para Pedir Peça | bg-yellow-500 | bg-slate-100 text-slate-700 border-dashed |
| Em Espera de Peça | bg-orange-500 | bg-slate-100 text-slate-700 |
| A Precificar | bg-fuchsia-500 | bg-slate-100 text-slate-700 |
| Concluídos | bg-green-500 | bg-slate-200 text-slate-800 |
| Em Débito | bg-red-500 | bg-slate-100 text-slate-700 border-l-2 border-l-red-400 |
| Finalizado | bg-teal-500 | bg-slate-50 text-slate-500 (mais apagado) |

### 4. Botões: Uma Cor para Governar Todas

| Acção | Actual | Novo |
|-------|--------|------|
| Atribuir Técnico | gradient purple/pink | bg-primary text-primary-foreground |
| Iniciar | bg-green-600 | bg-primary text-primary-foreground |
| Registar Pedido | bg-yellow-600 | bg-primary text-primary-foreground |
| Peça Chegou | bg-green-600 | bg-primary text-primary-foreground |
| Definir Preço | bg-emerald-600 | bg-primary text-primary-foreground |
| Gerir Entrega | bg-teal-600 | bg-primary text-primary-foreground |
| Registar Pagamento | bg-orange-600 | bg-primary text-primary-foreground |
| **Eliminar** | text-destructive | text-destructive (mantém - destrutivo) |
| **Forçar Estado** | text-amber-600 | text-amber-600 (mantém - alerta) |

### 5. Tags Discretas

| Tag | Actual | Novo |
|-----|--------|------|
| Urgente | bg-red (animate-pulse) | border border-red-300 text-red-600 text-xs |
| Garantia | bg-purple-500 | border border-purple-200 text-purple-600 text-xs |
| A Precificar | bg-yellow-500 | border border-amber-200 text-amber-600 text-xs |
| Em Débito | bg-red-500 | border border-red-200 text-red-600 text-xs |

---

## Ficheiros a Modificar

| Ficheiro | Alterações |
|----------|------------|
| `src/index.css` | Adicionar classes utilitárias para estados monocromáticos e glass sutil |
| `src/types/database.ts` | Actualizar SERVICE_STATUS_CONFIG com novas cores neutras |
| `src/pages/DashboardPage.tsx` | Remover cores por card, implementar lógica aceso/apagado |
| `src/components/services/StateActionButtons.tsx` | Unificar todos os botões para usar `bg-primary` |
| `src/pages/GeralPage.tsx` | Actualizar badges de estado e tags para estilo neutro |
| `src/components/ui/badge.tsx` | Adicionar variante `subtle` para tags discretas |

---

## Detalhes Técnicos

### A) Actualizar index.css

Adicionar novas classes utilitárias:

```css
/* Card states - aceso/apagado */
.card-dim {
  @apply opacity-50 shadow-none;
}

.card-lit {
  @apply opacity-100 shadow-sm ring-1 ring-slate-200;
}

/* Status badge - monocromático */
.status-badge {
  @apply inline-flex items-center gap-1.5 px-2.5 py-1 
         rounded-full text-xs font-medium
         bg-slate-100 text-slate-700;
}

.status-badge-active {
  @apply bg-slate-200 text-slate-800 font-semibold;
}

/* Tag - discreto */
.tag-subtle {
  @apply inline-flex items-center gap-1 px-2 py-0.5 
         rounded text-xs font-medium
         border bg-transparent;
}
```

### B) Actualizar SERVICE_STATUS_CONFIG

```typescript
export const SERVICE_STATUS_CONFIG: Record<ServiceStatus, { 
  label: string; 
  color: string;
  intensity: 'dim' | 'normal' | 'active';
}> = {
  por_fazer: { label: 'Por Fazer', color: 'bg-slate-100 text-slate-700', intensity: 'normal' },
  em_execucao: { label: 'Em Execução', color: 'bg-slate-200 text-slate-800 font-medium', intensity: 'active' },
  na_oficina: { label: 'Na Oficina', color: 'bg-slate-100 text-slate-700', intensity: 'normal' },
  para_pedir_peca: { label: 'Para Pedir Peça', color: 'bg-slate-100 text-slate-700 border border-dashed border-slate-300', intensity: 'normal' },
  em_espera_de_peca: { label: 'Em Espera de Peça', color: 'bg-slate-100 text-slate-700', intensity: 'normal' },
  a_precificar: { label: 'A Precificar', color: 'bg-slate-100 text-slate-700', intensity: 'normal' },
  concluidos: { label: 'Concluídos', color: 'bg-slate-200 text-slate-800', intensity: 'active' },
  em_debito: { label: 'Em Débito', color: 'bg-slate-100 text-slate-700 border-l-2 border-l-red-400', intensity: 'normal' },
  finalizado: { label: 'Finalizado', color: 'bg-slate-50 text-slate-500', intensity: 'dim' },
};
```

### C) Actualizar DashboardPage

```typescript
// Remover bgClass e iconClass individuais
// Usar lógica aceso/apagado baseada em count

const isLit = count > 0;

<Card className={cn(
  "cursor-pointer transition-all duration-200",
  "bg-slate-50/80 backdrop-blur-sm border-slate-200",
  isLit 
    ? "opacity-100 shadow-sm ring-1 ring-slate-200 hover:shadow-md hover:-translate-y-0.5" 
    : "opacity-50 hover:opacity-70"
)}>
```

### D) Actualizar StateActionButtons

```typescript
// Remover todas as classes de cor específicas
// Usar apenas:
className: 'bg-primary text-primary-foreground hover:bg-primary/90'
```

---

## Resultado Esperado

```text
┌─────────────────────────────────────────────────────────────┐
│                    ANTES vs DEPOIS                           │
├─────────────────────────────────────────────────────────────┤
│  ANTES:                                                      │
│  • Dashboard = arco-íris de cores                           │
│  • Olho não sabe onde focar                                 │
│  • Cada botão uma cor diferente                             │
│  • Tags berrantes                                            │
│                                                              │
│  DEPOIS:                                                     │
│  • Dashboard = azul institucional uniforme                  │
│  • Cards "acendem" apenas onde há trabalho                  │
│  • Botões azuis, hierarquia por contexto                    │
│  • Tags discretas, informativas                             │
│  • Sensação premium, confiável, profissional               │
└─────────────────────────────────────────────────────────────┘
```

---

## Filosofia Preservada

✅ **Tipos de serviço mantêm cores** (visita=azul, oficina=laranja, instalação=amarelo, entrega=verde) - como badges pequenos, não dominantes

✅ **Vermelho apenas para destruição** (eliminar serviço)

✅ **Amber apenas para alerta** (forçar estado)

✅ **Glass sutil** - blur leve, transparência baixa

✅ **Hierarquia clara** - Estado → Acção → Informação → Histórico
