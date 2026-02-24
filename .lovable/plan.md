
# Plano: Acelerar Carregamento da Pagina Geral e Abrir Fichas Sem Delay

## Problema

A pagina Geral (`/geral`) demora muito a carregar e as fichas demoram a abrir porque:

1. **Sem prefetch nos cards da tabela** -- ao clicar num servico, so DEPOIS comeca a carregar fotos, pecas, assinaturas e pagamentos. Na OficinaPage ja existe prefetch mas na GeralPage nao.

2. **WeeklyAgenda usa os mesmos 50 servicos paginados** -- a agenda recebe `services` (max 50 da pagina atual), entao mostra "Sem servicos" na maioria dos dias porque os servicos agendados podem estar na pagina 2 ou 3.

3. **Pesquisa dispara 4 queries separadas** -- quando ha texto no campo de pesquisa, o sistema faz: 1 query a customers, 1 a technicians, 1 a services por campos, e 2 por IDs. Isto e pesado e lento.

4. **Todos os modais sao renderizados sempre** -- 15+ modais sao montados no DOM mesmo quando fechados, aumentando o tempo de render inicial.

## Solucao

### 1. Adicionar prefetch na GeralPage (como na OficinaPage)

**Ficheiro: `src/pages/GeralPage.tsx`**

Importar `prefetchFullServiceData` e `useQueryClient`. Nos `TableRow`, adicionar `onMouseEnter` e `onTouchStart` para pre-carregar os dados completos do servico:

```typescript
const queryClient = useQueryClient();
const handlePrefetch = (serviceId: string) => {
  prefetchFullServiceData(queryClient, serviceId);
};

// No TableRow:
<TableRow
  onMouseEnter={() => handlePrefetch(service.id)}
  onTouchStart={() => handlePrefetch(service.id)}
  onClick={() => handleServiceClick(service)}
>
```

Isto faz com que quando o utilizador passa o rato ou toca na linha, os dados ja estejam no cache quando clicar.

### 2. Query separada e leve para a Agenda

**Ficheiro: `src/pages/GeralPage.tsx`**

A agenda precisa de TODOS os servicos com data agendada, nao apenas os 50 da pagina. Criar uma query separada e leve que carrega apenas os campos necessarios para a agenda:

```typescript
const { data: agendaServices = [] } = useQuery({
  queryKey: ['agenda-services'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('services')
      .select(`
        id, code, scheduled_date, scheduled_shift,
        appliance_type, brand, fault_description,
        service_type, service_location, status,
        technician:technicians!services_technician_id_fkey(id, color, profile:profiles(full_name))
      `)
      .not('scheduled_date', 'is', null)
      .in('status', ['por_fazer', 'em_execucao', 'para_pedir_peca', 'em_espera_de_peca', 'na_oficina'])
      .order('scheduled_date', { ascending: true });
    if (error) throw error;
    return data || [];
  },
});
```

Passa `agendaServices` para o `WeeklyAgenda` em vez de `services`. A query e leve porque:
- So carrega servicos COM data agendada
- So carrega servicos ativos (nao finalizados)
- Nao carrega customer completo, so os campos necessarios para renderizar o card

### 3. Lazy render dos modais (so montar quando necessario)

**Ficheiro: `src/pages/GeralPage.tsx`**

Envolver cada modal em condicao para so renderizar quando aberto ou quando tem servico selecionado:

```typescript
{showAssignModal && currentService && (
  <AssignTechnicianModal ... />
)}
{showSetPriceModal && currentService && (
  <SetPriceModal ... />
)}
// ... etc para todos os 15 modais
```

Isto reduz o numero de componentes montados de ~15 para 0 no render inicial, melhorando drasticamente o tempo de first paint.

### 4. `placeholderData` para transicoes sem "A carregar..."

**Ficheiro: `src/hooks/useServices.ts`**

O `usePaginatedServices` ja tem `placeholderData: (prev) => prev` -- isto e bom. Mas a GeralPage mostra "A carregar servicos..." no primeiro load. Adicionar um skeleton/spinner mais leve em vez do texto simples, e mostrar a tabela vazia com skeleton rows para feedback visual imediato.

**Ficheiro: `src/pages/GeralPage.tsx`**

Substituir o texto "A carregar servicos..." por skeleton rows na tabela:

```typescript
{isLoading ? (
  <Table>
    <TableHeader>...</TableHeader>
    <TableBody>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-5 w-20" /></TableCell>
          <TableCell><Skeleton className="h-5 w-16" /></TableCell>
          <TableCell><Skeleton className="h-5 w-32" /></TableCell>
          <TableCell><Skeleton className="h-5 w-40" /></TableCell>
          <TableCell><Skeleton className="h-5 w-24" /></TableCell>
          <TableCell><Skeleton className="h-5 w-16" /></TableCell>
          <TableCell><Skeleton className="h-5 w-24" /></TableCell>
          <TableCell><Skeleton className="h-5 w-20" /></TableCell>
          <TableCell><Skeleton className="h-5 w-16" /></TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
) : ...}
```

## Ficheiros Alterados

| Ficheiro | Alteracao |
|---|---|
| `src/pages/GeralPage.tsx` | Prefetch nos TableRow; query separada para agenda; lazy render modais; skeleton loading |

## Resultado Esperado

- Pagina carrega visivelmente mais rapido (skeletons em vez de tela vazia)
- Agenda mostra TODOS os servicos agendados (nao apenas 50)
- Fichas abrem instantaneamente (dados pre-carregados no hover)
- Render inicial ~15 modais mais leve (so monta quando necessario)
- Zero impacto na BD (prefetch usa cache existente; query da agenda e leve e cached por 2min)
