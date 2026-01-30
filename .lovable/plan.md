
# Plano: Melhorar Fluxo de Gestão de Peças

## Problema Actual

Quando o administrador gere pedidos de peças, o fluxo é muito simplista:
1. "Registar Pedido" → apenas muda status, sem definir previsão de chegada
2. "Peça Chegou" → apenas restaura status anterior, sem atribuir técnico ou agendar

O serviço "desaparece" porque não há continuidade no fluxo.

## Solução Proposta

### Novo Fluxo Completo

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    FLUXO DE GESTÃO DE PEÇAS                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. TÉCNICO SOLICITA PEÇA                                               │
│     └─ RequestPartModal (já existe) → status: 'para_pedir_peca'         │
│                                                                         │
│  2. ADMIN REGISTA PEDIDO (NOVO MODAL)                                   │
│     ├─ Previsão de chegada: "3 dias" / "1 semana" / data específica     │
│     ├─ Fornecedor (opcional)                                            │
│     ├─ Custo da peça (opcional)                                         │
│     └─ status: 'em_espera_de_peca'                                      │
│                                                                         │
│  3. VISUALIZAÇÃO COM TERMÓMETRO                                         │
│     ├─ Verde: faltam mais de 2 dias                                     │
│     ├─ Amarelo: falta 1-2 dias                                          │
│     ├─ Vermelho: atrasada / hoje                                        │
│     └─ Tooltip com data prevista                                        │
│                                                                         │
│  4. ADMIN MARCA PEÇA CHEGOU (NOVO MODAL)                                │
│     ├─ Confirma chegada da peça                                         │
│     ├─ Marca peça como 'arrived: true' na tabela service_parts          │
│     ├─ Atribui técnico (selector de técnicos)                           │
│     ├─ Define data de agendamento                                       │
│     ├─ Define turno (Manhã/Tarde/Noite)                                 │
│     └─ status: restaura 'last_status_before_part_request' ou 'na_oficina'│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Componentes a Criar

### 1. ConfirmPartOrderModal.tsx (Novo)
Modal para quando o admin regista que a peça foi encomendada:

```typescript
interface ConfirmPartOrderModalProps {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Campos do formulário:
// - Tempo estimado de chegada (select: "3 dias", "1 semana", "2 semanas", ou data específica)
// - Fornecedor (texto opcional)
// - Custo da peça (número opcional) - actualiza service_parts.cost
// - Notas (opcional)

// Acções:
// 1. Actualiza service_parts com estimated_arrival e cost
// 2. Muda status do serviço para 'em_espera_de_peca'
```

### 2. PartArrivedModal.tsx (Novo)
Modal para quando a peça chega, encadeando atribuição:

```typescript
interface PartArrivedModalProps {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Campos do formulário:
// - Confirmação de chegada (checkbox ou automático)
// - Técnico (selector - pode ser o mesmo ou outro)
// - Data de agendamento (obrigatória)
// - Turno (obrigatório)
// - Notas (opcional)

// Acções:
// 1. Actualiza service_parts.arrived = true
// 2. Actualiza serviço com technician_id, scheduled_date, scheduled_shift
// 3. Restaura status anterior (last_status_before_part_request ou 'na_oficina')
```

### 3. Indicador Visual (Termómetro)
Componente para mostrar urgência baseada na previsão:

```typescript
// PartArrivalIndicator.tsx
const getIndicatorColor = (estimatedArrival: string | null) => {
  if (!estimatedArrival) return 'bg-gray-400'; // Sem previsão
  
  const today = new Date();
  const arrival = new Date(estimatedArrival);
  const daysRemaining = differenceInDays(arrival, today);
  
  if (daysRemaining < 0) return 'bg-red-500';      // Atrasada
  if (daysRemaining === 0) return 'bg-red-500';    // Hoje
  if (daysRemaining <= 2) return 'bg-yellow-500';  // Próxima
  return 'bg-green-500';                            // OK
};

// Exibição na tabela: badge colorido com tooltip mostrando a data
```

## Ficheiros a Criar

| Ficheiro | Descrição |
|----------|-----------|
| `src/components/modals/ConfirmPartOrderModal.tsx` | Modal para registar pedido com previsão |
| `src/components/modals/PartArrivedModal.tsx` | Modal para confirmar chegada + atribuição |
| `src/components/shared/PartArrivalIndicator.tsx` | Indicador visual de urgência |

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/pages/GeralPage.tsx` | Adicionar modals e handlers |
| `src/components/services/StateActionButtons.tsx` | Manter botões, mas chamar novos modals |
| `src/components/services/ServiceDetailSheet.tsx` | Adicionar modals e indicador |

## Fluxo Visual na Lista de Serviços

Na coluna de estado, para serviços `em_espera_de_peca`:

```text
┌──────────────────────────────────────┐
│ TF-00005 │ ... │ Em Espera de Peça  │
│          │     │ 🟢 Chega em 3 dias │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ TF-00006 │ ... │ Em Espera de Peça  │
│          │     │ 🟡 Chega amanhã    │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ TF-00007 │ ... │ Em Espera de Peça  │
│          │     │ 🔴 Atrasada 2 dias │
└──────────────────────────────────────┘
```

## Detalhes Técnicos

### Tabela service_parts (existente)
Campos relevantes:
- `estimated_arrival`: date - previsão de chegada
- `arrived`: boolean - se a peça já chegou
- `cost`: numeric - custo da peça

### Tabela services (existente)
Campos relevantes:
- `last_status_before_part_request`: text - status antes do pedido de peça
- `technician_id`: uuid - técnico atribuído
- `scheduled_date`: date - data agendada
- `scheduled_shift`: text - turno agendado

### Query para buscar peças pendentes
```sql
SELECT sp.*, s.code, s.status
FROM service_parts sp
JOIN services s ON sp.service_id = s.id
WHERE sp.is_requested = true AND sp.arrived = false
ORDER BY sp.estimated_arrival ASC NULLS LAST
```

## Resumo das Alterações

1. **ConfirmPartOrderModal**: Admin define previsão de chegada ao registar pedido
2. **PartArrivedModal**: Quando peça chega, modal força atribuição de técnico + data
3. **PartArrivalIndicator**: Badge colorido mostra urgência (verde/amarelo/vermelho)
4. **Integração**: Botões existentes passam a abrir estes modals em vez de acções directas

## Benefícios

- Previsibilidade: admin vê quando cada peça deve chegar
- Urgência visual: termómetro indica peças atrasadas
- Continuidade: quando peça chega, serviço já fica agendado
- Rastreabilidade: histórico de custos e fornecedores das peças
