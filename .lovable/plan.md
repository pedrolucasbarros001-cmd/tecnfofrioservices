

# Acesso Seguro ao Monitor da Oficina

## Resumo

Remover os botoes "Copiar Link TV" e "Abrir Monitor" da pagina Oficina. Tornar a rota `/tv-monitor` protegida por autenticacao. Criar um utilizador dedicado `monitor@tecnofrio.pt` com uma role `monitor` que, ao fazer login, e redirecionado directamente para a pagina do monitor.

## Alteracoes

### 1. Nova role `monitor` no enum `app_role`

Migracoes SQL:

```text
ALTER TYPE public.app_role ADD VALUE 'monitor';
```

### 2. Criar utilizador via Edge Function `invite-user`

Depois de actualizar o enum, sera necessario criar o utilizador `monitor@tecnofrio.pt` com senha `Tecnofrio` e atribuir-lhe a role `monitor` na tabela `user_roles`. Isto pode ser feito via a edge function `invite-user` existente ou manualmente via SQL no painel Supabase.

### 3. Actualizar RLS para `tv_monitor_services` e `activity_logs`

A pagina do monitor consulta a view `tv_monitor_services` e os activity logs publicos. As policies actuais permitem leitura anonima. Vamos adicionar policies para a role `monitor`:

```text
-- Funcao auxiliar
CREATE OR REPLACE FUNCTION public.is_monitor(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_role(_user_id, 'monitor') $$;

-- tv_monitor_services: permitir SELECT para monitor
CREATE POLICY "Monitor can view tv_monitor_services"
ON public.services FOR SELECT
USING (is_monitor(auth.uid()) AND service_location = 'oficina' AND status <> 'finalizado');

-- activity_logs: monitor pode ver logs publicos
-- (ja coberto pela policy existente "Public activity logs viewable by anyone")
```

### 4. Remover botoes do Monitor na OficinaPage

**`src/pages/OficinaPage.tsx`**:
- Remover os botoes "Copiar Link TV" e "Abrir Monitor" (linhas 65-72)
- Remover as funcoes `handleCopyTVLink` e `handleOpenMonitor` (linhas 25-33)
- Remover imports nao utilizados: `Copy`, `Monitor`

### 5. Tornar `/tv-monitor` uma rota protegida

**`src/App.tsx`**:
- Mover a rota `/tv-monitor` de rota publica para rota protegida
- Permitir a role `monitor` (e opcionalmente `dono`/`secretaria`)

```text
Antes (rota publica):
  <Route path="/tv-monitor" element={<TVMonitorPage />} />

Depois (rota protegida, sem layout):
  <Route path="/tv-monitor" element={
    <ProtectedRoute allowedRoles={['monitor', 'dono', 'secretaria']}>
      <TVMonitorPage />
    </ProtectedRoute>
  } />
```

### 6. Actualizar redireccao por role

**`src/contexts/AuthContext.tsx`** - funcao `getDefaultRouteForRole`:

```text
case 'monitor':
  return '/tv-monitor';
```

**`src/components/auth/ProtectedRoute.tsx`** - redirect por role:

```text
const redirectPath = role === 'dono' ? '/dashboard'
  : role === 'secretaria' ? '/geral'
  : role === 'monitor' ? '/tv-monitor'
  : '/servicos';
```

### 7. Actualizar tipo `AppRole`

**`src/types/database.ts`**:

```text
Antes: export type AppRole = 'dono' | 'secretaria' | 'tecnico';
Depois: export type AppRole = 'dono' | 'secretaria' | 'tecnico' | 'monitor';
```

### 8. Criar o utilizador monitor

Apos as migracoes, criar o utilizador na base de dados Supabase Auth com email `monitor@tecnofrio.pt` e senha `Tecnofrio`, e inserir o registo na tabela `user_roles` com role `monitor`. Isto sera feito via a edge function `invite-user` existente (que ja cria utilizadores com senha e role).

## Sequencia de implementacao

1. Migracao SQL: adicionar valor `monitor` ao enum `app_role` e criar funcao `is_monitor`
2. Migracao SQL: adicionar RLS policy para monitor na tabela `services`
3. Actualizar `src/types/database.ts` com nova role
4. Actualizar `src/contexts/AuthContext.tsx` com redireccionamento
5. Actualizar `src/components/auth/ProtectedRoute.tsx` com redireccionamento
6. Actualizar `src/App.tsx` para proteger a rota `/tv-monitor`
7. Actualizar `src/pages/OficinaPage.tsx` removendo botoes do monitor
8. Criar utilizador `monitor@tecnofrio.pt` via edge function
