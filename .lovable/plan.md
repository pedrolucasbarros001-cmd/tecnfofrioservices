

# Correcao: "Resumo do atendimento anterior" aparece em todos os servicos e tem delay

## Problema

Dois issues relacionados:

### 1. Aparece em servicos sem historico
A condicao actual (linha 112-116 do `ServicePreviousSummary.tsx`):
```typescript
const hasHistoryIndicators = !!(
  service.detected_fault ||
  service.work_performed ||
  service.service_location === 'oficina'  // ← PROBLEMA
);
```
`service_location === 'oficina'` e verdadeiro para TODOS os servicos de oficina, incluindo os que acabaram de entrar e nunca foram abertos. Dados confirmados:
- TF-00039: oficina, `na_oficina`, 0 logs, 0 fotos, sem diagnostico → mostra "Resumo" indevidamente
- TF-00035: oficina, `na_oficina`, 4 logs de tentativas falhadas, 0 fotos → mostra "Resumo" sem conteudo util

Mesma logica repetida no `WorkshopFlowModals.tsx` linha 133:
```typescript
const hasPreviousHistory = !!(
  service.detected_fault ||
  service.work_performed ||
  (service.service_location === 'oficina' && service.status !== 'por_fazer')
);
```

### 2. Delay de segundos ao expandir
Os dados (logs e fotos) so carregam quando o utilizador clica na seta (`enabled: isExpanded`). Isto causa um delay visivel de 1-3 segundos enquanto as queries correm. E ma experiencia.

## Plano de correcao

### 1. Carregar dados logo ao montar (sem lazy loading)

Mudar as duas queries de `enabled: !!service.id && isExpanded` para `enabled: !!service.id`. Sao queries leves (5 logs com filtro, fotos com indice) e ja tem `staleTime: 30_000`. Isto:
- Elimina o delay ao expandir (dados ja estao prontos)
- Permite usar os dados carregados para decidir se o componente deve aparecer

### 2. Condicao de visibilidade baseada em dados reais

Substituir a heuristica de campos do servico por verificacao dos dados carregados:

```typescript
// Mostrar apenas se existem registos reais
const hasRealHistory = !!(
  service.detected_fault ||
  service.work_performed ||
  (activityLogs && activityLogs.length > 0) ||
  (photos && photos.length > 0)
);

if (!hasRealHistory) return null;
```

Isto garante que:
- Servicos novos na oficina sem nenhum registo → NAO mostra
- Servicos com visita anterior que registou fotos/diagnostico → mostra
- Servicos com logs de execucao real (levantamento, conclusao) → mostra

### 3. Actualizar `hasPreviousHistory` no WorkshopFlowModals

A mesma logica precisa ser espelhada no `WorkshopFlowModals.tsx`. Como o componente pai nao tem acesso aos counts sem query adicional, a abordagem sera:

- Remover `service.service_location === 'oficina'` da condicao
- Manter apenas `detected_fault || work_performed || last_status_before_part_request`
- O `ServicePreviousSummary` ja se auto-esconde quando nao ha dados, portanto mesmo que `hasPreviousHistory` seja `false` para um caso edge, o componente corrige-se sozinho

### Ficheiros a alterar

| Ficheiro | Alteracao |
|---|---|
| `src/components/technician/ServicePreviousSummary.tsx` | Remover lazy loading; condicao baseada em dados reais |
| `src/components/technician/WorkshopFlowModals.tsx` | Remover `service_location === 'oficina'` do `hasPreviousHistory` |

### Impacto no Supabase
- Mesmas 2 queries que ja existiam, apenas carregam mais cedo (ao montar em vez de ao expandir)
- Queries sao leves: 5 logs filtrados + fotos por service_id (indexado)
- `staleTime: 30_000` mantido — nao recarrega a cada render

