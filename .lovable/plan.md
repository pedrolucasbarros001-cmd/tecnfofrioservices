

## Plano de Implementação

### Resumo das Alterações

1. **Remover "Monitor TV" da sidebar do proprietário** - O item não foi pedido e deve estar acessível apenas via botão na página Oficina
2. **Corrigir a visualização dos serviços no TV Monitor** - Garantir que todos os serviços na oficina aparecem corretamente nos cards
3. **Remover os travessões separadores** - Eliminar as linhas divisórias (`border-b`) dos cabeçalhos das secções

---

### Alterações Detalhadas

#### 1. Remover "Monitor TV" da Sidebar (OwnerSidebar.tsx)

Localização: `src/components/layouts/OwnerSidebar.tsx` (linha 17)

```text
ANTES:
const menuItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  ...
  { title: 'Monitor TV', url: '/tv-monitor', icon: Tv },  ← REMOVER
  { title: 'Preferências', url: '/preferencias', icon: Settings },
];

DEPOIS:
const menuItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  ...
  { title: 'Preferências', url: '/preferencias', icon: Settings },
];
```

Também será removido o import do ícone `Tv` da linha 2.

---

#### 2. Corrigir Query do TV Monitor para Mostrar Serviços

Localização: `src/pages/TVMonitorPage.tsx` (linhas 126-140)

O problema atual é que a query filtra por estes status:
- `na_oficina`
- `em_execucao`
- `para_pedir_peca`
- `em_espera_de_peca`
- `concluidos`

Mas pode existir um serviço com `status = 'por_fazer'` e `service_location = 'oficina'` que não está a aparecer.

Alteração na query:
```text
ANTES:
.in('status', ['na_oficina', 'em_execucao', 'para_pedir_peca', 'em_espera_de_peca', 'concluidos'])

DEPOIS:
.in('status', ['por_fazer', 'na_oficina', 'em_execucao', 'para_pedir_peca', 'em_espera_de_peca', 'concluidos'])
```

Também será adicionada uma secção para "Por Fazer" no `MONITOR_SECTIONS`:
```typescript
{ status: 'por_fazer' as ServiceStatus, label: 'Por Fazer', icon: Clock, color: 'text-blue-400' },
```

---

#### 3. Remover Travessões Separadores das Secções

Localização: `src/pages/TVMonitorPage.tsx` (linha 228)

```text
ANTES:
<div className="flex items-center gap-3 mb-3 pb-2 border-b border-slate-700">

DEPOIS:
<div className="flex items-center gap-3 mb-3 pb-2">
```

Remover `border-b border-slate-700` do cabeçalho de cada secção.

---

### Ficheiros a Modificar

| Ficheiro | Ação |
|----------|------|
| `src/components/layouts/OwnerSidebar.tsx` | Remover item "Monitor TV" do menu e import do ícone Tv |
| `src/pages/TVMonitorPage.tsx` | Adicionar status `por_fazer` à query, adicionar secção, remover travessões |

---

### Resultado Esperado

- A sidebar do proprietário terá apenas as páginas: Dashboard, Geral, Oficina, Clientes, Orçamentos, Performance, Colaboradores, Preferências
- O Monitor TV continuará acessível através do botão "Abrir Monitor" na página Oficina
- Todos os serviços que estão na oficina (com qualquer status relevante) aparecerão nos cards do Monitor TV
- As secções no Monitor TV não terão linhas divisórias (travessões)

