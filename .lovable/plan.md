

# Corrigir Falhas na Criacao de Servicos e Conversao de Orcamentos

## Problema Identificado

Existem **3 causas raiz** que provocam as falhas:

### Causa 1: ConvertBudgetModal nao verifica sessao
O modal de conversao de orcamento (`ConvertBudgetModal.tsx`) faz `supabase.from('services').insert()` **directamente**, sem verificar se a sessao esta activa. Se o token JWT expirou (mesmo com auto-refresh), o INSERT falha por violacao de RLS (apenas `dono` e `secretaria` podem inserir servicos).

### Causa 2: getSession() nao garante token valido
O `useCreateService` usa `supabase.auth.getSession()` para verificar sessao, mas esta funcao retorna o **token em cache** sem validar com o servidor. Se o token expirou e o auto-refresh ainda nao correu, a sessao parece valida mas o INSERT falha.

### Causa 3: Erros nao tratados causam crash (tela branca)
Quando um Select, Calendar ou outro componente Radix gera erro durante interaccao (ex: seleccionar tecnico, data), o erro propaga-se sem ser capturado, activando o ErrorBoundary e mostrando a tela de "Ocorreu um erro" com opcao de recarregar.

## Solucao

### 1. Criar funcao helper para sessao segura

**Ficheiro**: `src/integrations/supabase/client.ts`

Adicionar funcao `ensureValidSession()` que:
- Chama `supabase.auth.getSession()` para obter sessao em cache
- Se nao ha sessao, lanca erro imediato
- Se ha sessao, verifica se o token expira em menos de 60 segundos
- Se sim, forca `supabase.auth.refreshSession()` para obter token novo
- Retorna a sessao validada ou lanca erro claro

```text
ensureValidSession()
  |
  +-- getSession() -> null? -> throw "Sessao expirada"
  |
  +-- token expira em < 60s?
       |-- Sim -> refreshSession() -> sucesso? -> retorna sessao
       |                            -> falha? -> throw "Sessao expirada"
       |-- Nao -> retorna sessao (token ainda valido)
```

### 2. Usar sessao segura em todas as mutacoes

**Ficheiros**: `src/hooks/useServices.ts`, `src/hooks/useCustomers.ts`

Substituir `supabase.auth.getSession()` por `ensureValidSession()` em:
- `useCreateService`
- `useCreateCustomer`

Isto garante que o token e valido antes de cada INSERT.

### 3. Corrigir ConvertBudgetModal

**Ficheiro**: `src/components/modals/ConvertBudgetModal.tsx`

- Adicionar verificacao de sessao com `ensureValidSession()` antes do INSERT
- Melhorar error handling para mostrar mensagem especifica se sessao expirou
- Adicionar guard contra duplo-clique (verificar `isLoading` no inicio)

### 4. Proteger modais contra crashes

**Ficheiros**: `src/components/modals/CreateServiceModal.tsx`, `src/components/modals/CreateInstallationModal.tsx`, `src/components/modals/CreateDeliveryModal.tsx`

- Envolver `processSubmit` com try/catch robusto que captura erros de RLS e sessao
- Adicionar tratamento especifico para erro "row-level security" -> mostra toast "Sessao expirada, faca login novamente"
- Adicionar `disabled` no botao submit enquanto `isPending` para evitar duplo-clique

### 5. Proteger AssignTechnicianModal contra crash

**Ficheiro**: `src/components/modals/AssignTechnicianModal.tsx`

- Envolver `handleSubmit` com try/catch mais granular
- Se erro de notificacao/log ja e capturado (OK), mas se erro no `updateService.mutateAsync` causar crash, capturar e mostrar toast

## Resumo das alteracoes

| Ficheiro | Alteracao |
|----------|-----------|
| `src/integrations/supabase/client.ts` | Adicionar `ensureValidSession()` |
| `src/hooks/useServices.ts` | Usar `ensureValidSession()` em `useCreateService` e `useUpdateService` |
| `src/hooks/useCustomers.ts` | Usar `ensureValidSession()` em `useCreateCustomer` |
| `src/components/modals/ConvertBudgetModal.tsx` | Adicionar verificacao de sessao + guard duplo-clique |
| `src/components/modals/CreateServiceModal.tsx` | Melhorar error handling com deteccao de erro RLS |
| `src/components/modals/CreateInstallationModal.tsx` | Melhorar error handling com deteccao de erro RLS |
| `src/components/modals/CreateDeliveryModal.tsx` | Melhorar error handling com deteccao de erro RLS |

## Resultado esperado

- Criacao de servico: funciona sempre que o utilizador esta autenticado
- Conversao de orcamento: funciona sem falha
- Seleccao de tecnico/data: nunca mais causa crash/tela branca
- Se sessao expirar: mensagem clara "Sessao expirada, faca login novamente" em vez de erro generico

