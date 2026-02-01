
# Plano: Garantir que Serviços Aparecem na Agenda do Técnico

## Problema Identificado

Quando um serviço é criado e atribuído a um técnico, ele **não aparece na agenda do técnico** imediatamente.

### Causa Raiz

O sistema tem **múltiplas queries independentes** para serviços:

| Query Key | Usado Em | Propósito |
|-----------|----------|-----------|
| `['services', ...]` | GeralPage, useServices | Lista geral de serviços |
| `['technician-services', profile?.id]` | ServicosPage | Agenda semanal do técnico |
| `['technician-office-services', profile?.id]` | TechnicianOfficePage | Serviços de oficina do técnico |

Quando o `useCreateService()` cria um serviço, apenas invalida `['services']`:

```typescript
// useServices.ts linha 83
queryClient.invalidateQueries({ queryKey: ['services'] });
```

**As queries específicas do técnico nunca são invalidadas**, portanto os dados ficam desactualizados.

---

## Solução Proposta

### Estratégia: Invalidação Centralizada

Em vez de invalidar cada query individualmente, vamos criar uma estratégia de invalidação mais abrangente que garante que **todas as queries de serviços** são actualizadas.

### Implementação

#### 1. Actualizar `useCreateService()` em `src/hooks/useServices.ts`

```typescript
onSuccess: () => {
  // Invalidar TODAS as queries relacionadas a serviços
  queryClient.invalidateQueries({ queryKey: ['services'] });
  queryClient.invalidateQueries({ queryKey: ['technician-services'] });
  queryClient.invalidateQueries({ queryKey: ['technician-office-services'] });
  toast.success('Serviço criado com sucesso!');
}
```

#### 2. Actualizar `useUpdateService()` em `src/hooks/useServices.ts`

```typescript
onSuccess: ({ skipToast }) => {
  queryClient.invalidateQueries({ queryKey: ['services'] });
  queryClient.invalidateQueries({ queryKey: ['technician-services'] });
  queryClient.invalidateQueries({ queryKey: ['technician-office-services'] });
  if (!skipToast) {
    toast.success('Serviço atualizado!');
  }
}
```

#### 3. Actualizar `useDeleteService()` em `src/hooks/useServices.ts`

```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['services'] });
  queryClient.invalidateQueries({ queryKey: ['technician-services'] });
  queryClient.invalidateQueries({ queryKey: ['technician-office-services'] });
  toast.success('Serviço eliminado!');
}
```

---

## Prevenção Futura: Helper de Invalidação

Para garantir que isto **nunca mais acontece**, vamos criar um helper centralizado que invalida todas as queries de serviços de uma só vez:

```typescript
// Em useServices.ts
function invalidateAllServiceQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['services'] });
  queryClient.invalidateQueries({ queryKey: ['technician-services'] });
  queryClient.invalidateQueries({ queryKey: ['technician-office-services'] });
}
```

Assim, qualquer futuro hook ou componente que modifique serviços pode usar este helper e garantir consistência.

---

## Fluxo Corrigido

```
Secretária cria serviço e atribui técnico
            │
            ▼
    useCreateService()
            │
            ▼
  Serviço guardado no Supabase
            │
            ▼
    invalidateQueries:
    ├── ['services']                    ✓ GeralPage actualizada
    ├── ['technician-services']         ✓ Agenda do técnico actualizada
    └── ['technician-office-services']  ✓ Oficina do técnico actualizada
            │
            ▼
  Técnico vê serviço na sua agenda!
```

---

## Ficheiros a Alterar

| Ficheiro | Alteração |
|----------|-----------|
| `src/hooks/useServices.ts` | Adicionar helper + invalidar todas as queries |

---

## Resultado Esperado

1. Serviço criado → Aparece imediatamente na agenda do técnico
2. Serviço actualizado → Reflecte imediatamente em todas as vistas
3. Serviço eliminado → Desaparece imediatamente de todas as vistas
4. **Garantia futura**: Helper centralizado previne esquecimentos

---

## Secção Técnica

### Código Final do Hook

```typescript
import { useQuery, useMutation, useQueryClient, QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Service, ServiceStatus } from '@/types/database';
import { toast } from 'sonner';

// Helper para invalidar TODAS as queries de serviços
function invalidateAllServiceQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['services'] });
  queryClient.invalidateQueries({ queryKey: ['technician-services'] });
  queryClient.invalidateQueries({ queryKey: ['technician-office-services'] });
}

// ... resto do código com onSuccess a usar o helper
```

### Por que não usar apenas `['services']` em todo o lado?

Seria uma opção, mas:
1. As queries específicas do técnico têm **filtros diferentes** (ex: `service_location`, `status`)
2. Cada página precisa de dados diferentes (performance)
3. A invalidação parcial com queryKey prefix **funciona**, mas o React Query precisa de matchear o prefixo exacto

A solução de invalidação explícita é mais segura e previsível.

### Alternativa Considerada: Query Key Hierarchy

Poderíamos renomear as queries para usar hierarquia:
- `['services', 'general', ...]`
- `['services', 'technician', ...]`
- `['services', 'office', ...]`

Assim, `invalidateQueries({ queryKey: ['services'] })` invalidaria todas.

**Porquê não usar?** Requer alterar múltiplos ficheiros e pode causar regressões. A solução proposta é mais segura e atinge o mesmo objectivo.
