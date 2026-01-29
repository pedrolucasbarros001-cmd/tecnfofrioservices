
# Plano: Correcao do Display de Informacoes e Funcionalidade de Reagendamento

## Resumo

Este plano aborda tres objetivos principais:
1. **Corrigir a exibicao de informacoes do servico** nos cards da pagina Oficina Tecnico
2. **Criar modal de reagendamento** para secretarias com opcao de mudar tecnico e/ou data/turno
3. **Sugestoes de melhorias** para tornar o sistema mais completo e intuitivo

---

## 1. Problema Identificado: Informacoes do Servico

### Analise do Codigo Atual

O componente `ServiceCard` em `TechnicianOfficePage.tsx` (linhas 141-221) exibe:

```text
┌──────────────────────────────────────┐
│ OS-00002          [Na Oficina]       │
│ Pedro                                │
│                                      │
│ Aparelho                             │
│ geladeira                            │
│                                      │
│ Avaria                               │
│ caiu                 (line-clamp-2)  │
│                                      │
│       [Urgente] [Gar]    ☀ Manha    │
│                                      │
│        [Comecar]                     │
└──────────────────────────────────────┘
```

### Problemas Visuais

1. Labels "Aparelho" e "Avaria" em cinza muito claro (`text-muted-foreground text-xs`)
2. Valores podem ficar truncados pelo `line-clamp-2` ou por falta de espaco
3. Espacamento excessivo entre seccoes
4. Falta de indicacao visual clara dos dados

### Solucao Proposta

Reformular o card para um layout mais compacto e legivel:

```text
┌──────────────────────────────────────┐
│ OS-00002          [Na Oficina]       │
│ Pedro                                │
├──────────────────────────────────────┤
│ 📦 geladeira • teka                  │  <-- Aparelho + Marca inline
│ ⚠️ caiu                              │  <-- Avaria com icone
├──────────────────────────────────────┤
│ [Urgente] [Garantia]    ☀ Manha     │
│           [Comecar]                  │
└──────────────────────────────────────┘
```

---

## 2. Nova Funcionalidade: Modal de Reagendamento

### Requisitos

- Acessivel por secretarias e donos
- Opcao de **mudar tecnico** (opcional)
- Se tecnico nao mudar, permite alterar **data e turno**
- Logica: Se mudar tecnico, obrigatorio nova data/turno
- Se manter tecnico, pode mudar apenas data/turno

### Design do Modal

```text
┌─────────────────────────────────────────────┐
│ Reagendar Servico - OS-00002           [X]  │
├─────────────────────────────────────────────┤
│                                             │
│ ┌───────────────────────────────────────┐   │
│ │ Atribuicao Atual                      │   │
│ │ Tecnico: Pedro Lucas                  │   │
│ │ Data: 26/01/2026 • Turno: Manha       │   │
│ └───────────────────────────────────────┘   │
│                                             │
│ [✓] Alterar Tecnico                         │
│ ┌─────────────────────────────────────┐     │
│ │ Selecionar tecnico            ▼     │     │
│ └─────────────────────────────────────┘     │
│                                             │
│ Nova Data *                                 │
│ ┌─────────────────────────────────────┐     │
│ │ 28/01/2026                     📅   │     │
│ └─────────────────────────────────────┘     │
│                                             │
│ Novo Turno *                                │
│ ○ Manha   ○ Tarde   ○ Noite                 │
│                                             │
│      [Cancelar]  [Confirmar Reagendamento]  │
└─────────────────────────────────────────────┘
```

### Fluxo de Logica

1. Ao abrir modal, mostra dados atuais do servico
2. Checkbox "Alterar Tecnico" - quando ativado, mostra dropdown
3. Campos de data e turno sao sempre visiveis (pre-preenchidos com valores atuais)
4. Ao confirmar:
   - Atualiza `technician_id` (se alterado)
   - Atualiza `scheduled_date` e `scheduled_shift`
   - Envia notificacao ao tecnico (novo ou atual)
   - Regista log de atividade

---

## 3. Ficheiros a Modificar/Criar

| Ficheiro | Acao | Descricao |
|----------|------|-----------|
| `src/pages/technician/TechnicianOfficePage.tsx` | Modificar | Melhorar layout do ServiceCard |
| `src/components/modals/RescheduleServiceModal.tsx` | Criar | Novo modal de reagendamento |
| `src/components/services/StateActionButtons.tsx` | Modificar | Adicionar botao de reagendar para secretaria |
| `src/pages/GeralPage.tsx` | Modificar | Integrar modal de reagendamento |
| `src/components/services/ServiceDetailSheet.tsx` | Modificar | Adicionar opcao de reagendar |

---

## 4. Seccao Tecnica

### 4.1 TechnicianOfficePage.tsx - ServiceCard Melhorado

```typescript
const ServiceCard = ({ service, isAvailable = false }: { service: Service; isAvailable?: boolean }) => {
  const shiftInfo = service.scheduled_shift ? SHIFT_ICONS[service.scheduled_shift] : null;
  const ShiftIcon = shiftInfo?.icon || Sun;

  return (
    <Card
      className={cn(
        'hover:shadow-md transition-shadow',
        isAvailable 
          ? 'bg-slate-50 border-l-4 border-l-slate-400' 
          : 'bg-orange-50 border-l-4 border-l-orange-500'
      )}
    >
      <CardContent className="p-4">
        <div className="space-y-2">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <span className="font-mono font-bold text-primary">{service.code}</span>
              <p className="font-medium truncate">
                {service.customer?.name || 'Cliente nao definido'}
              </p>
            </div>
            {getStatusBadge(service.status || 'por_fazer')}
          </div>

          {/* Separador */}
          <div className="border-t border-border/50" />

          {/* Equipamento - Layout inline compacto */}
          <div className="flex items-center gap-2 text-sm">
            <Package className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-medium">
              {[service.appliance_type, service.brand, service.model]
                .filter(Boolean)
                .join(' • ') || 'Nao especificado'}
            </span>
          </div>

          {/* Avaria - Se existir */}
          {service.fault_description && (
            <div className="flex items-start gap-2 text-sm">
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-muted-foreground">{service.fault_description}</p>
            </div>
          )}

          {/* Tags + Shift */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap gap-1">
              {service.is_urgent && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                  Urgente
                </Badge>
              )}
              {service.is_warranty && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-500 text-green-700">
                  Garantia
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <ShiftIcon className={cn('h-3.5 w-3.5', shiftInfo?.color)} />
              <span className="capitalize">{service.scheduled_shift || 'Sem turno'}</span>
            </div>
          </div>

          {/* Action Button */}
          {/* ... botoes existentes ... */}
        </div>
      </CardContent>
    </Card>
  );
};
```

### 4.2 RescheduleServiceModal.tsx - Novo Componente

```typescript
interface RescheduleServiceModalProps {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const formSchema = z.object({
  change_technician: z.boolean(),
  technician_id: z.string().optional(),
  scheduled_date: z.date({ required_error: 'Selecione uma data' }),
  scheduled_shift: z.enum(['manha', 'tarde', 'noite'], {
    required_error: 'Selecione um turno',
  }),
});

export function RescheduleServiceModal({
  service,
  open,
  onOpenChange,
  onSuccess,
}: RescheduleServiceModalProps) {
  const { data: technicians = [] } = useTechnicians();
  const updateService = useUpdateService();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      change_technician: false,
      technician_id: service?.technician_id || '',
      scheduled_date: service?.scheduled_date 
        ? new Date(service.scheduled_date) 
        : undefined,
      scheduled_shift: service?.scheduled_shift || undefined,
    },
  });

  const changeTechnician = form.watch('change_technician');

  // Reset form when service changes
  useEffect(() => {
    if (service && open) {
      form.reset({
        change_technician: false,
        technician_id: service.technician_id || '',
        scheduled_date: service.scheduled_date 
          ? new Date(service.scheduled_date) 
          : undefined,
        scheduled_shift: service.scheduled_shift || undefined,
      });
    }
  }, [service, open]);

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!service) return;

    try {
      await updateService.mutateAsync({
        id: service.id,
        ...(values.change_technician && values.technician_id 
          ? { technician_id: values.technician_id } 
          : {}),
        scheduled_date: values.scheduled_date.toISOString().split('T')[0],
        scheduled_shift: values.scheduled_shift,
      });

      // Enviar notificacao ao tecnico
      // Registar log de atividade

      toast.success('Servico reagendado com sucesso!');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error rescheduling service:', error);
      toast.error('Erro ao reagendar servico');
    }
  };

  // ... render do modal ...
}
```

### 4.3 StateActionButtons.tsx - Adicionar Reagendar

```typescript
// Adicionar prop
onReschedule?: () => void;

// No dropdown menu, apos "Reatribuir Tecnico"
{service.technician_id && service.status !== 'finalizado' && (isDono || isSecretaria) && onReschedule && (
  <DropdownMenuItem onClick={onReschedule}>
    <CalendarClock className="h-4 w-4 mr-2" />
    Reagendar Servico
  </DropdownMenuItem>
)}
```

---

## 5. Sugestoes para Sistema Mais Completo

### 5.1 Navegacao e Usabilidade

| Melhoria | Beneficio | Prioridade |
|----------|-----------|------------|
| **Pesquisa Global** | Encontrar qualquer servico/cliente rapidamente | Alta |
| **Atalhos de Teclado** | Navegar sem mouse (Ctrl+N = novo, Ctrl+S = pesquisar) | Media |
| **Breadcrumbs** | Saber sempre onde esta no sistema | Alta |
| **Dashboard Personalizavel** | Cada role ve metricas relevantes | Media |

### 5.2 Economia de Tempo

| Funcionalidade | Descricao |
|----------------|-----------|
| **Templates de Servico** | Criar reparacoes frequentes com 1 clique (ex: "Limpeza AC") |
| **Duplicar Servico** | Copiar servico existente para novo cliente |
| **Accoes em Lote** | Atribuir varios servicos ao mesmo tecnico de uma vez |
| **Auto-preenchimento** | Ao selecionar cliente, preencher endereco automaticamente |

### 5.3 Visao e Controle

| Recurso | Descricao |
|---------|-----------|
| **KPIs no Dashboard** | Servicos hoje, pendentes, tempo medio de resolucao |
| **Alertas Proativos** | Notificar servicos ha muito tempo no mesmo estado |
| **Relatorio de Performance** | Tempo por servico, por tecnico, por tipo |
| **Mapa de Servicos** | Ver localizacao das visitas do dia |

### 5.4 Interatividade e UX

| Melhoria | Descricao |
|----------|-----------|
| **Drag & Drop na Agenda** | Arrastar servico para outra data/turno |
| **Swipe em Mobile** | Deslizar card para acoes rapidas |
| **Animacoes de Feedback** | Confirmar visualmente que acao foi executada |
| **Modo Offline** | Tecnicos podem registar servicos sem internet |

### 5.5 Gestao Financeira

| Funcionalidade | Descricao |
|----------------|-----------|
| **Relatorio de Faturacao** | Por periodo, cliente, tecnico |
| **Lembretes de Debito** | Envio automatico de SMS/Email |
| **Exportar para Excel/PDF** | Dados para contabilidade |
| **Integracao com Faturacao** | Gerar faturas automaticamente |

---

## 6. Resultado Esperado

### Correcao do Display
- Cards com informacoes visiveis e bem formatadas
- Icones para identificar tipo de informacao
- Layout compacto sem perda de dados

### Modal de Reagendamento
- Secretarias podem mudar data/turno sem mudar tecnico
- Opcao de alterar tecnico quando necessario
- Notificacoes automaticas aos envolvidos

### Sistema Mais Completo
- Roadmap claro de melhorias futuras
- Prioridades definidas por impacto no negocio
- Foco em economia de tempo e visibilidade

