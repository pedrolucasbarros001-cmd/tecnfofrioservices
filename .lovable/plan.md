
# Plano: Corrigir TV Monitor para Mostrar Todos os Serviços da Oficina

## Diagnóstico

O TV Monitor tem dois problemas:

1. **Agrupamento por status simples**: A lógica atual agrupa por `service.status`, mas a nova regra de coexistência define que serviços na oficina devem ser agrupados por lógica composta (technician_id + status).

2. **Seções desalinhadas**: As seções atuais não refletem a lógica correta:
   - "Por Fazer" deveria ser "Para Assumir" (sem técnico)
   - "Na Oficina" deveria mostrar serviços COM técnico aguardando início

## Dados Atuais

O serviço OS-00002 está corretamente:
- `service_location = 'oficina'`
- `status = 'na_oficina'`
- `technician_id` preenchido

A RLS policy permite acesso e os dados estão corretos. O problema é a lógica de exibição no frontend.

## Solução

Atualizar o TVMonitorPage.tsx para usar **filtros funcionais** que consideram tanto o `status` quanto o `technician_id`:

### Nova Definição de MONITOR_SECTIONS

| Coluna | Condição de Filtro | Descrição |
|--------|-------------------|-----------|
| Para Assumir | `!technician_id && ['por_fazer', 'na_oficina'].includes(status)` | Serviços sem técnico |
| Na Oficina | `technician_id && ['por_fazer', 'na_oficina'].includes(status)` | Com técnico, aguarda início |
| Em Execução | `status === 'em_execucao'` | Trabalho em andamento |
| Para Pedir Peça | `status === 'para_pedir_peca'` | Precisa encomendar |
| Em Espera de Peça | `status === 'em_espera_de_peca'` | Aguarda chegada |
| A Precificar | `status === 'a_precificar'` | Trabalho feito, sem preço |
| Concluídos | `status === 'concluidos'` | Prontos para entrega |

### Alterações no Ficheiro

**Ficheiro**: `src/pages/TVMonitorPage.tsx`

#### A) Atualizar MONITOR_SECTIONS (linhas 14-22)

Adicionar função `filter` a cada seção:

```typescript
const MONITOR_SECTIONS = [
  { 
    key: 'para_assumir', 
    label: 'Para Assumir', 
    icon: User, 
    color: 'text-blue-400',
    filter: (s: Service) => !s.technician_id && ['por_fazer', 'na_oficina'].includes(s.status)
  },
  { 
    key: 'na_oficina', 
    label: 'Na Oficina', 
    icon: Building2, 
    color: 'text-green-400',
    filter: (s: Service) => !!s.technician_id && ['por_fazer', 'na_oficina'].includes(s.status)
  },
  { 
    key: 'em_execucao', 
    label: 'Em Execução', 
    icon: Play, 
    color: 'text-cyan-400',
    filter: (s: Service) => s.status === 'em_execucao'
  },
  { 
    key: 'para_pedir_peca', 
    label: 'Para Pedir Peça', 
    icon: Package, 
    color: 'text-yellow-400',
    filter: (s: Service) => s.status === 'para_pedir_peca'
  },
  { 
    key: 'em_espera_de_peca', 
    label: 'Em Espera de Peça', 
    icon: Clock, 
    color: 'text-orange-400',
    filter: (s: Service) => s.status === 'em_espera_de_peca'
  },
  { 
    key: 'a_precificar', 
    label: 'A Precificar', 
    icon: DollarSign, 
    color: 'text-lime-400',
    filter: (s: Service) => s.status === 'a_precificar'
  },
  { 
    key: 'concluidos', 
    label: 'Concluídos', 
    icon: CheckCircle, 
    color: 'text-emerald-400',
    filter: (s: Service) => s.status === 'concluidos'
  },
];
```

#### B) Atualizar Lógica de Agrupamento (linhas 157-162)

Substituir agrupamento por status por agrupamento por seção:

```typescript
// Agrupar serviços por seção usando os filtros
const groupedServices = MONITOR_SECTIONS.reduce((acc, section) => {
  acc[section.key] = services.filter(section.filter);
  return acc;
}, {} as Record<string, Service[]>);
```

#### C) Atualizar Stats Bar (linhas 201-217)

Usar as seções ao invés do array de status:

```typescript
<div className="grid grid-cols-7 gap-3 mb-6">
  {MONITOR_SECTIONS.map((section) => {
    const count = groupedServices[section.key]?.length || 0;
    return (
      <div
        key={section.key}
        className={cn(
          "rounded-lg p-3 text-center",
          count > 0 ? "bg-slate-700" : "bg-slate-800"
        )}
      >
        <p className="text-3xl lg:text-4xl font-bold">{count}</p>
        <p className="text-xs lg:text-sm opacity-90">{section.label}</p>
      </div>
    );
  })}
</div>
```

#### D) Atualizar Renderização das Seções (linhas 222-259)

Usar `section.key` para aceder aos serviços agrupados:

```typescript
{MONITOR_SECTIONS.map((section) => {
  const sectionServices = groupedServices[section.key] || [];
  // ... resto igual, mas usar section.key
})}
```

## Diagrama da Nova Lógica

```text
┌──────────────────────────────────────────────────────────────────┐
│                  TV MONITOR - FLUXO DE COLUNAS                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Serviço chega (service_location = 'oficina')                    │
│       │                                                          │
│       ▼                                                          │
│  ┌────────────────┐    technician_id     ┌────────────────┐      │
│  │ PARA ASSUMIR   │ ──────────────────►  │   NA OFICINA   │      │
│  │ (sem técnico)  │    atribuído         │ (com técnico)  │      │
│  └────────────────┘                      └───────┬────────┘      │
│                                                  │               │
│                                          "Começar" clicado       │
│                                                  │               │
│                                                  ▼               │
│                                         ┌────────────────┐       │
│                                         │  EM EXECUÇÃO   │       │
│                                         └───────┬────────┘       │
│                                                 │                │
│                     ┌───────────────────────────┼────────┐       │
│                     │                           │        │       │
│                     ▼                           ▼        ▼       │
│            ┌────────────────┐          ┌────────────────────┐    │
│            │ PARA PEDIR PEÇA│          │   A PRECIFICAR     │    │
│            └───────┬────────┘          │   ou CONCLUÍDOS    │    │
│                    │                   └────────────────────┘    │
│                    ▼                                             │
│            ┌────────────────┐                                    │
│            │ ESPERA DE PEÇA │                                    │
│            └────────────────┘                                    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Resultado Esperado

Com o serviço OS-00002:
- `technician_id` = preenchido
- `status` = 'na_oficina'

**Antes**: Não aparece (bug no agrupamento)
**Depois**: Aparece na coluna "Na Oficina"

## Validação

1. Serviço na oficina SEM técnico → Coluna "Para Assumir"
2. Serviço na oficina COM técnico → Coluna "Na Oficina"
3. Serviço em execução → Coluna "Em Execução"
4. Stats Bar reflete as contagens corretas das seções
