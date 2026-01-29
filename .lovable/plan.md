
## Plano de Implementação

### Resumo das Alterações

1. **Remover a barra de pesquisa e filtro da página Oficina** - O utilizador não quer esta funcionalidade nesta página
2. **Corrigir a visualização dos serviços no TV Monitor** - Garantir que todos os serviços na oficina aparecem em tempo real, removendo filtros desnecessários

---

### Alterações Detalhadas

#### 1. Remover Barra de Pesquisa/Filtro (OficinaPage.tsx)

Localização: `src/pages/OficinaPage.tsx` (linhas 91-108)

Remover completamente a secção de pesquisa:

```text
ANTES (linhas 91-108):
{/* Search */}
<div className="flex items-center gap-4">
  <div className="relative flex-1 max-w-md">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input
      placeholder="Pesquisar..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="pl-10"
    />
  </div>
  <Badge variant="secondary" className="text-base px-3 py-1">
    {filteredServices.length} na oficina
  </Badge>
  <Button variant="ghost" size="icon" onClick={() => refetch()}>
    <RefreshCw className="h-4 w-4" />
  </Button>
</div>

DEPOIS:
(Remover toda esta secção)
```

Também remover:
- O estado `searchTerm` (linha 20)
- A lógica de filtro `filteredServices` (linhas 30-38)
- O import de `Search` e `Input` se já não forem usados

Usar `services` diretamente em vez de `filteredServices` nos renders.

---

#### 2. Corrigir Query do TV Monitor (TVMonitorPage.tsx)

Localização: `src/pages/TVMonitorPage.tsx` (linhas 127-136)

O problema é que a query filtra por status específicos **E** por `service_location = 'oficina'`. Mas se o serviço tem `status: "na_oficina"` e `service_location: "oficina"`, deveria aparecer.

Vou simplificar a query para apenas filtrar por `service_location = 'oficina'` (sem filtro de status redundante) já que todos os serviços na oficina devem aparecer:

```text
ANTES:
const { data, error } = await supabase
  .from('services')
  .select(`
    *,
    customer:customers(*),
    technician:technicians(*, profile:profiles(*))
  `)
  .eq('service_location', 'oficina')
  .in('status', ['por_fazer', 'na_oficina', 'em_execucao', 'para_pedir_peca', 'em_espera_de_peca', 'concluidos'])
  .order('created_at', { ascending: false });

DEPOIS:
const { data, error } = await supabase
  .from('services')
  .select(`
    *,
    customer:customers(*),
    technician:technicians(*, profile:profiles(*))
  `)
  .eq('service_location', 'oficina')
  .order('created_at', { ascending: false });
```

Ao remover o filtro `.in('status', [...])`, todos os serviços que estão fisicamente na oficina aparecerão, independentemente do status específico.

---

### Ficheiros a Modificar

| Ficheiro | Ação |
|----------|------|
| `src/pages/OficinaPage.tsx` | Remover barra de pesquisa, estado searchTerm, e lógica de filtro |
| `src/pages/TVMonitorPage.tsx` | Remover filtro de status da query para mostrar todos os serviços da oficina |

---

### Resultado Esperado

- A página Oficina não terá mais a barra de pesquisa e filtro
- O Monitor TV mostrará em tempo real todos os serviços que estão na oficina (incluindo o OS-00002 com status "Na Oficina")
- Os serviços serão agrupados por status nas secções do monitor (Por Fazer, Em Execução, Na Oficina, etc.)
- A atualização automática a cada 30 segundos continuará a funcionar
