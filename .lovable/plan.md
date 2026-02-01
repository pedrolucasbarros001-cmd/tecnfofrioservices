
# Plano: Agenda Diária do Técnico + Corrigir Propagação de Eventos

## Objectivo

1. **Transformar a agenda do técnico de semanal para diária** - mostrar apenas os serviços do dia actual, com navegação para outros dias
2. **Impedir que cliques nos botões de acção abram a ficha** - adicionar `stopPropagation` nos itens do dropdown

---

## Problema 1: Agenda Semanal → Diária

### Situação Actual

A página `ServicosPage.tsx` mostra **6 dias numa grelha**:
- Em mobile: 2 colunas (difícil ler quando há muitos serviços)
- Os cards ficam comprimidos quando há vários serviços no mesmo dia
- O técnico tem de procurar o dia correcto

### Solução: Vista Diária

Mostrar **apenas um dia de cada vez**:
- Por defeito: dia actual
- Navegação: anterior / hoje / próximo
- Cards maiores com mais espaço para informação
- Agrupamento por turno (Manhã → Tarde → Noite)

### Layout Proposto

```
┌─────────────────────────────────────────────────────┐
│ 📅 Agenda                                           │
│                                                     │
│ [◀] [Hoje] Segunda, 3 de Fevereiro [▶]             │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ── MANHÃ ───────────────────────────────────────── │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ TF-00123                        [Visita]        │ │
│ │ João Silva                                      │ │
│ │ Frigorífico - Não arrefece                      │ │
│ │ 🌅 Manhã       [Urgente] [Garantia]            │ │
│ │                                                 │ │
│ │        [ ▶ Começar ]                           │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ── TARDE ───────────────────────────────────────── │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ TF-00124                     [Instalação]       │ │
│ │ Maria Santos                                    │ │
│ │ Ar Condicionado - Instalação nova               │ │
│ │ ☀️ Tarde                                        │ │
│ │                                                 │ │
│ │        [ ▶ Começar ]                           │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ── SEM TURNO ───────────────────────────────────── │
│                                                     │
│           (Sem serviços)                           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Problema 2: Cliques Propagam para Abrir Ficha

### Causa

No ficheiro `StateActionButtons.tsx`, os `DropdownMenuItem` não têm `stopPropagation`:

```tsx
// Actual - PROBLEMA
<DropdownMenuItem onClick={onAssignTechnician}>
  Reatribuir Técnico
</DropdownMenuItem>

<DropdownMenuItem onClick={onReschedule}>
  Reagendar Serviço
</DropdownMenuItem>
```

Quando clica num item do dropdown, o evento sobe até à `TableRow` que tem:
```tsx
<TableRow onClick={() => handleServiceClick(service)}>
```

### Solução

Adicionar wrapper com `stopPropagation` em TODOS os `DropdownMenuItem`:

```tsx
// Corrigido
<DropdownMenuItem onClick={(e) => {
  e.stopPropagation();
  onAssignTechnician();
}}>
  Reatribuir Técnico
</DropdownMenuItem>
```

---

## Ficheiros a Alterar

| Ficheiro | Alteração |
|----------|-----------|
| `src/pages/ServicosPage.tsx` | **Reescrever** - Vista diária em vez de semanal |
| `src/components/services/StateActionButtons.tsx` | **Editar** - Adicionar `stopPropagation` aos `DropdownMenuItem` |

---

## Implementação Detalhada

### 1. Nova ServicosPage (Vista Diária)

**Estrutura:**

```tsx
export default function ServicosPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Navegação
  const goToPrevious = () => setCurrentDate(prev => subDays(prev, 1));
  const goToToday = () => setCurrentDate(new Date());
  const goToNext = () => setCurrentDate(prev => addDays(prev, 1));
  
  // Filtrar serviços do dia actual
  const dayServices = useMemo(() => {
    return services.filter(service => {
      if (!service.scheduled_date) return false;
      return isSameDay(parseISO(service.scheduled_date), currentDate);
    });
  }, [services, currentDate]);
  
  // Agrupar por turno
  const groupedByShift = useMemo(() => {
    return {
      manha: dayServices.filter(s => s.scheduled_shift === 'manha'),
      tarde: dayServices.filter(s => s.scheduled_shift === 'tarde'),
      noite: dayServices.filter(s => s.scheduled_shift === 'noite'),
      sem_turno: dayServices.filter(s => !s.scheduled_shift),
    };
  }, [dayServices]);
}
```

**Header com navegação:**

```tsx
<div className="flex items-center justify-between">
  <div className="flex items-center gap-3">
    <CalendarDays className="h-6 w-6 text-blue-500" />
    <h1 className="text-2xl font-bold">Agenda</h1>
  </div>
  
  <div className="flex items-center gap-2">
    <Button variant="ghost" size="icon" onClick={goToPrevious}>
      <ChevronLeft className="h-5 w-5" />
    </Button>
    
    <Button 
      variant={isToday ? "default" : "outline"} 
      onClick={goToToday}
      className="min-w-[200px]"
    >
      {format(currentDate, "EEEE, d 'de' MMMM", { locale: pt })}
    </Button>
    
    <Button variant="ghost" size="icon" onClick={goToNext}>
      <ChevronRight className="h-5 w-5" />
    </Button>
  </div>
</div>
```

**Secções por turno:**

```tsx
<div className="space-y-6">
  {(['manha', 'tarde', 'noite', 'sem_turno'] as const).map(shift => {
    const shiftServices = groupedByShift[shift];
    const shiftLabel = SHIFT_LABELS[shift] || 'Sem Turno Definido';
    
    return (
      <div key={shift}>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3">
          {shiftLabel}
        </h3>
        
        {shiftServices.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Sem serviços
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {shiftServices.map(service => (
              <ServiceCard key={service.id} service={service} onStart={handleStartFlow} />
            ))}
          </div>
        )}
      </div>
    );
  })}
</div>
```

**Cards maiores (mais legíveis):**

Os cards ocupam mais espaço vertical e horizontal, permitindo:
- Ler nome completo do cliente
- Ver descrição da avaria
- Botões maiores e mais fáceis de clicar

### 2. Corrigir StateActionButtons

**Alterações:**

Todos os `DropdownMenuItem` precisam de `stopPropagation`. São aproximadamente 12 itens no dropdown que precisam desta correcção.

```tsx
// Exemplo de cada item corrigido:
<DropdownMenuItem onClick={(e) => {
  e.stopPropagation();
  onViewDetails();
}}>
  <Eye className="h-4 w-4 mr-2" />
  Ver Detalhes
</DropdownMenuItem>

<DropdownMenuItem onClick={(e) => {
  e.stopPropagation();
  onAssignTechnician();
}}>
  <UserPlus className="h-4 w-4 mr-2" />
  Atribuir Técnico
</DropdownMenuItem>

// ... mesma lógica para todos os outros itens
```

---

## Benefícios da Vista Diária

1. **Maior clareza**: O técnico vê exactamente o que tem para fazer hoje
2. **Cards maiores**: Mais espaço para informação e botões mais fáceis de clicar
3. **Agrupamento por turno**: Organização clara da ordem de trabalho
4. **Navegação simples**: Setas para ver dias anteriores/seguintes
5. **Mobile-friendly**: Um card por linha em mobile, nada comprimido

---

## Resultado Esperado

1. **Agenda diária**: Técnico abre a página e vê apenas os serviços de hoje
2. **Navegação fácil**: Pode ver amanhã, ontem ou qualquer outro dia
3. **Serviços agrupados**: Manhã → Tarde → Noite → Sem turno
4. **Cards legíveis**: Tamanho adequado mesmo com muitos serviços
5. **Dropdowns funcionais**: Clicar em "Reagendar" ou "Reatribuir" NÃO abre a ficha lateral

---

## Secção Técnica

### Mudanças na Query

A query existente já busca todos os serviços do técnico. A filtragem por dia será feita no frontend com `useMemo` para performance:

```tsx
const dayServices = useMemo(() => {
  return services.filter(service => {
    if (!service.scheduled_date) return false;
    return isSameDay(parseISO(service.scheduled_date), currentDate);
  });
}, [services, currentDate]);
```

### Estado Vazio

Quando não há serviços no dia:

```tsx
{dayServices.length === 0 && (
  <div className="flex flex-col items-center justify-center py-12">
    <CalendarDays className="h-16 w-16 text-muted-foreground/30 mb-4" />
    <p className="text-muted-foreground">Sem serviços para este dia</p>
    <p className="text-sm text-muted-foreground">
      Use as setas para ver outros dias
    </p>
  </div>
)}
```

### Indicação do Dia Actual

O botão central mostra a data completa e fica destacado quando é hoje:

```tsx
const isToday = isSameDay(currentDate, new Date());

<Button 
  variant={isToday ? "default" : "outline"} 
  onClick={goToToday}
>
  {format(currentDate, "EEEE, d 'de' MMMM", { locale: pt })}
</Button>
```
