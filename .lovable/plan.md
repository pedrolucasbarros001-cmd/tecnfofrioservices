
# Plano: Corrigir Visualização de Serviços no TV Monitor

## Diagnóstico

Após investigação profunda, confirmei que:

1. **Os dados existem e estão correctos no banco**:
   - OS-00002 tem `service_location = 'oficina'`, `status = 'na_oficina'`, `technician_id` preenchido

2. **As políticas RLS estão configuradas correctamente**:
   - Policy "Public read for workshop services on TV monitor" permite acesso `anon`
   - Condition: `service_location = 'oficina' AND status != 'finalizado'`

3. **A query da API retorna dados** (confirmado nos logs de rede):
   - Requests autenticados retornam o serviço correctamente

4. **O problema identificado**:
   - O TV Monitor é acedido sem autenticação (role `anon`)
   - Os requests de rede mostram Bearer token preenchido, indicando que a página foi testada com sessão autenticada
   - Quando acedido anonimamente, pode haver um problema no Supabase client que não está a fazer a query correctamente

## Causa Raiz

O código do TVMonitorPage está a usar o client Supabase que pode ter uma sessão autenticada em cache do localStorage. Quando a página é acedida numa TV (sem login), deveria usar o role `anon`, mas se houver sessão expirada ou mal formada, a query pode falhar silenciosamente.

## Solução

Modificar o TVMonitorPage para garantir que funciona em modo anónimo e adicionar tratamento de erro adequado.

### A) Forçar Modo Anónimo no TV Monitor

Criar um client Supabase anónimo dedicado ou limpar a sessão ao carregar o TV Monitor:

**Ficheiro**: `src/pages/TVMonitorPage.tsx`

Adicionar lógica para usar cliente sem autenticação:

```typescript
// No início do componente, antes da query
useEffect(() => {
  // Garantir que o TV Monitor funciona sem sessão
  // Não fazer logout, apenas ignorar erros de sessão
}, []);
```

### B) Adicionar Tratamento de Erro na Query

Modificar a query para ter logs de debug e tratamento de erro:

```typescript
const { data: services = [], refetch, error, isError } = useQuery({
  queryKey: ['tv-monitor-services'],
  queryFn: async () => {
    console.log('[TV Monitor] Fetching services...');
    const { data, error } = await supabase
      .from('services')
      .select(`
        *,
        customer:customers(*),
        technician:technicians(*, profile:profiles(*))
      `)
      .eq('service_location', 'oficina')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[TV Monitor] Query error:', error);
      throw error;
    }
    
    console.log('[TV Monitor] Fetched services:', data?.length);
    return (data as unknown as Service[]) || [];
  },
  refetchInterval: 30000,
  retry: 3,
});
```

### C) Mostrar Estado de Loading e Erro

Adicionar feedback visual quando há erro na query:

```typescript
// Após o header, antes das seções
{isError && (
  <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6 text-center">
    <AlertCircle className="h-6 w-6 text-red-400 mx-auto mb-2" />
    <p className="text-red-400">Erro ao carregar serviços. A tentar novamente...</p>
  </div>
)}

{isLoading && (
  <div className="text-center py-8">
    <RefreshCw className="h-8 w-8 animate-spin mx-auto text-slate-400" />
    <p className="text-slate-400 mt-2">A carregar serviços...</p>
  </div>
)}
```

### D) Fallback para Query Simplificada

Se a query com joins falhar, usar uma query sem joins (fallback):

```typescript
const { data: services = [] } = useQuery({
  queryKey: ['tv-monitor-services'],
  queryFn: async () => {
    // Primeira tentativa: query completa
    const { data, error } = await supabase
      .from('services')
      .select(`
        *,
        customer:customers(*),
        technician:technicians(*, profile:profiles(*))
      `)
      .eq('service_location', 'oficina')
      .order('created_at', { ascending: false });

    if (!error && data) {
      return data as unknown as Service[];
    }

    // Fallback: query sem joins (para debug)
    console.warn('[TV Monitor] Using fallback query');
    const fallback = await supabase
      .from('services')
      .select('*')
      .eq('service_location', 'oficina')
      .order('created_at', { ascending: false });
    
    return (fallback.data || []) as unknown as Service[];
  },
});
```

## Ficheiros a Alterar

| Ficheiro | Alteração |
|----------|-----------|
| `src/pages/TVMonitorPage.tsx` | Adicionar logs de debug, tratamento de erro, e fallback |

## Validação

1. Abrir TV Monitor numa janela anónima (sem login)
2. Verificar console logs para debug
3. Confirmar que o serviço OS-00002 aparece na secção "Na Oficina"

## Nota Importante

O utilizador mencionou estar na rota `/oficina`, mas o screenshot mostra o layout do TV Monitor. Confirmar qual página está realmente a ser visualizada:
- `/oficina` → OficinaPage (layout com cards brancos, sidebar visível)
- `/tv-monitor` → TVMonitorPage (layout escuro, sem sidebar, fullscreen)

Se for a OficinaPage, essa página **usa o hook `useServices`** que já funciona correctamente (confirmado nos logs de rede). O problema seria apenas no TVMonitorPage.
