
# Plano: Lista "A Precificar" + Painel Lateral com Detalhes Completos

## Resumo do Pedido

1. **Lista "A Precificar"**: Incluir todos os serviços com `pending_pricing=true`, independentemente do status atual
2. **Painel Lateral (ServiceDetailSheet)**: Ao clicar numa ficha, abre um painel com todos os detalhes - incluindo fotos, assinaturas e histórico de atividades
3. **Garantir que dados estejam sempre visíveis**: Fotos, assinaturas, peças, pagamentos e histórico devem aparecer em TODAS as fichas (quando existirem dados), sem bugs
4. **Histórico completo de atividades**: Todas as ações realizadas no serviço devem ser rastreáveis

---

## Diagnóstico Atual

### O que já existe e funciona:
- ServiceDetailSheet já busca `servicePhotos`, `serviceSignatures`, `servicePayments`, `serviceParts` e `activityLogs`
- As seções condicionais renderizam quando há dados (`servicePhotos.length > 0`, etc.)
- O histórico de atividades foi adicionado recentemente com timeline visual

### Problemas identificados:

| Problema | Causa | Solução |
|----------|-------|---------|
| Lista "A Precificar" no Dashboard só conta `pending_pricing` mas não filtra na lista | Lógica de contagem separada da listagem | Unificar a query para buscar todos com `pending_pricing=true` |
| Página GeralPage não tem filtro específico para "A Precificar" | O filtro de status não considera `pending_pricing` | Adicionar lógica híbrida no useServices |
| Técnicos não veem histórico de pagamentos | Query de payments é restrita a dono/secretaria | Remover restrição de role na query |
| Histórico de atividades pode estar vazio | Activity logs não são criados em todos os fluxos | Adicionar chamadas de log nos modais/fluxos |
| Fotos de instalação não mostram Antes/Depois | `photo_type` salvo como "instalacao_antes"/"instalacao_depois" mas helper só mostra "Instalação" | Corrigir função `getPhotoTypeLabel` |

---

## Alterações por Arquivo

### 1. `src/hooks/useServices.ts` - Adicionar Suporte a pending_pricing

Modificar o hook para aceitar um parâmetro `pendingPricing` que filtra serviços com `pending_pricing = true`:

```typescript
interface UseServicesOptions {
  status?: ServiceStatus | 'all' | 'a_precificar_all'; // NOVO
  location?: 'cliente' | 'oficina' | 'all';
  technicianId?: string;
}

// Na query:
if (status === 'a_precificar_all') {
  query = query.eq('pending_pricing', true);
} else if (status !== 'all') {
  query = query.eq('status', status);
}
```

### 2. `src/pages/GeralPage.tsx` - Usar Filtro Híbrido

Quando o URL tiver `?status=a_precificar`, usar o novo filtro `a_precificar_all`:

```typescript
const selectedStatus = searchParams.get('status') as ServiceStatus || 'all';
const effectiveStatus = selectedStatus === 'a_precificar' 
  ? 'a_precificar_all' 
  : selectedStatus;
```

### 3. `src/components/services/ServiceDetailSheet.tsx` - Corrigir Visibilidade

#### 3.1. Remover restrição de role para pagamentos
Atualmente os pagamentos só são buscados para dono/secretaria. Conforme solicitado, técnicos também devem ver:

```typescript
// ANTES:
enabled: !!service?.id && open && (role === 'dono' || role === 'secretaria'),

// DEPOIS:
enabled: !!service?.id && open,
```

#### 3.2. Corrigir labels de fotos de instalação
Atualizar `getPhotoTypeLabel` para reconhecer os tipos "instalacao_antes" e "instalacao_depois":

```typescript
const getPhotoTypeLabel = (type: string | null): string => {
  switch (type) {
    case 'visita': return 'Visita';
    case 'oficina': return 'Oficina';
    case 'entrega': return 'Entrega';
    case 'instalacao': return 'Instalação';
    case 'instalacao_antes': return 'Antes (Instalação)';  // NOVO
    case 'instalacao_depois': return 'Depois (Instalação)'; // NOVO
    case 'antes': return 'Antes';
    case 'depois': return 'Depois';
    default: return 'Foto';
  }
};
```

### 4. Adicionar Logs de Atividade nos Fluxos Críticos

Os seguintes arquivos precisam chamar as funções de `activityLogUtils.ts`:

| Arquivo | Ação a Registar | Função a Chamar |
|---------|-----------------|-----------------|
| `InstallationFlowModals.tsx` | Conclusão da instalação | `logServiceCompletion` |
| `DeliveryFlowModals.tsx` | Conclusão da entrega | `logDelivery` |
| `VisitFlowModals.tsx` | Levantamento para oficina | `logWorkshopPickup` |
| `VisitFlowModals.tsx` | Pedido de peça | `logPartRequest` |
| `SetPriceModal.tsx` | Definição de preço | `logPricingSet` |
| `RegisterPaymentModal.tsx` | Registo de pagamento | `logPayment` |

#### Exemplo para `SetPriceModal.tsx`:

```typescript
import { logPricingSet } from '@/utils/activityLogUtils';
import { useAuth } from '@/contexts/AuthContext';

// No handleSubmit, após updateService.mutateAsync:
await logPricingSet(
  service.code || 'N/A',
  service.id,
  finalPrice,
  user?.id,
  profile?.full_name
);
```

### 5. Atualizar RLS para Activity Logs (técnico ver histórico completo)

O técnico atribuído deve ver todos os logs do seu serviço, não apenas os públicos. Adicionar migration:

```sql
-- Permitir que técnico atribuído veja todos os logs do seu serviço
DROP POLICY IF EXISTS "Activity logs viewable by dono secretaria or public" ON public.activity_logs;

CREATE POLICY "Activity logs viewable by authorized users"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (
    is_dono(auth.uid()) OR 
    is_secretaria(auth.uid()) OR 
    is_public = true OR
    (service_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.services s
      JOIN public.technicians t ON s.technician_id = t.id
      WHERE s.id = activity_logs.service_id 
        AND t.profile_id = get_technician_profile_id(auth.uid())
    ))
  );
```

---

## Resumo de Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useServices.ts` | Adicionar filtro `a_precificar_all` para pending_pricing |
| `src/pages/GeralPage.tsx` | Mapear status "a_precificar" para o novo filtro |
| `src/pages/DashboardPage.tsx` | Manter contagem atual (já funciona) |
| `src/components/services/ServiceDetailSheet.tsx` | Remover restrição de role em pagamentos + corrigir labels de fotos |
| `src/components/modals/SetPriceModal.tsx` | Adicionar log de precificação |
| `src/components/modals/RegisterPaymentModal.tsx` | Adicionar log de pagamento |
| `src/components/technician/InstallationFlowModals.tsx` | Adicionar log de conclusão |
| `src/components/technician/DeliveryFlowModals.tsx` | Adicionar log de entrega |
| `src/components/technician/VisitFlowModals.tsx` | Adicionar logs de levantamento e pedido de peça |
| `supabase/migrations/` | Nova migration para RLS de activity_logs |

---

## Resultado Esperado

| Cenário | Antes | Depois |
|---------|-------|--------|
| Lista "A Precificar" | Só serviços com status="a_precificar" | Todos com pending_pricing=true |
| Ficha de Instalação | Sem fotos/assinaturas visíveis | Fotos "Antes/Depois" + Assinatura + Histórico |
| Técnico abre ficha | Não vê pagamentos nem histórico completo | Vê tudo do seu serviço |
| Histórico de atividades | Vazio em muitos serviços | Timeline com todas as ações |

---

## Fluxo de Dados Visual

```text
┌─────────────────────────────────────────────────────────┐
│                      Dashboard                          │
│  ┌─────────────┐                                        │
│  │ A Precificar│ ← conta pending_pricing=true           │
│  │     12      │                                        │
│  └─────────────┘                                        │
│         │ clique                                        │
│         ▼                                               │
│  ┌─────────────────────────────────────────────┐       │
│  │ GeralPage (?status=a_precificar)            │       │
│  │                                              │       │
│  │  Lista com TODOS serviços pending_pricing   │       │
│  │  (não só status='a_precificar')             │       │
│  └─────────────────────────────────────────────┘       │
│                    │ clique na linha                   │
│                    ▼                                    │
│  ┌─────────────────────────────────────────────┐       │
│  │ ServiceDetailSheet (Painel Lateral)          │       │
│  │                                              │       │
│  │  ✅ Progresso do Serviço                    │       │
│  │  ✅ Cliente                                  │       │
│  │  ✅ Detalhes do Serviço                     │       │
│  │  ✅ Agendamento                              │       │
│  │  ✅ Informação Financeira                   │       │
│  │  ✅ Peças Utilizadas                         │       │
│  │  ✅ Histórico de Pagamentos ← agora técnico vê│      │
│  │  ✅ Fotos (Antes/Depois para instalações)   │       │
│  │  ✅ Assinaturas                              │       │
│  │  ✅ Histórico de Atividades ← timeline      │       │
│  │  ✅ Observações                              │       │
│  └─────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────┘
```
