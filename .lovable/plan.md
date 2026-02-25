

# Correcao: Registos anteriores nao aparecem na Oficina e na Ficha Lateral

## Problema confirmado

Dois bugs interdependentes impedem que registos da visita anterior (fotos, diagnostico, assinaturas, linha do tempo) aparecam quando o servico chega a oficina:

### Bug 1: `hasPreviousHistory` demasiado restritivo (`WorkshopFlowModals.tsx`, linha 127)

```
const hasPreviousHistory = !!service.detected_fault;
```

Se o tecnico nao preencheu o campo de diagnostico durante a visita (campo opcional), `detected_fault = NULL`. O sistema assume que nao houve atendimento anterior e:
- Esconde o componente `ServicePreviousSummary`
- Mostra o `DiagnosisPhotosGallery` em vez do resumo
- Obriga o tecnico a repetir 3 fotos obrigatorias (aparelho, etiqueta, estado)
- Nao mostra o botao "Continuar Reparacao" mas sim "Iniciar Reparacao"

### Bug 2: `ServicePreviousSummary` nunca aparece sem `detected_fault` (linha 112)

```
if (!service.detected_fault && (!activityLogs || activityLogs.length === 0)) {
  return null;
}
```

Os `activityLogs` so carregam quando `isExpanded = true` (lazy loading). Na primeira renderizacao, `activityLogs` e `undefined`, logo a condicao e sempre verdadeira e o componente retorna `null`. Circulo vicioso: o componente nunca aparece, nunca e expandido, nunca carrega logs.

### Bug 3: `ServiceDetailSheet` nao mostra fotos da visita

A ficha lateral (`ServiceDetailSheet`) carrega fotos via `useFullServiceData` que funciona correctamente, mas depende do `service-full` query key. Este esta correcto apos a correcao anterior. No entanto, o componente `ServicePreviousSummary` usado dentro do `WorkshopFlowModals` faz queries separadas com keys diferentes que nao sao invalidadas quando fotos sao apagadas ou adicionadas.

## Dados do TF-00035 confirmados

- `detected_fault`: NULL
- `work_performed`: NULL
- `service_location`: oficina
- `status`: na_oficina
- `flow_step`: foto_aparelho (da tentativa na oficina, nao da visita)
- 4 logs de `inicio_execucao` (tentativas repetidas)
- 0 fotos, 0 assinaturas, 0 pecas
- Nenhum log de `levantamento` (confirma que o servico foi movido para oficina pelo admin via ForceState, nao pelo fluxo de visita)

Nota: O TF-00035 especifico nao passou pelo fluxo de visita completo — foi forcado para oficina. Mas o bug e real e afecta todos os servicos que passam pelo fluxo de visita sem preencher diagnostico.

## Plano de correcao

### 1. Expandir `hasPreviousHistory` (`WorkshopFlowModals.tsx`, linha 127)

Substituir a verificacao por uma que considere multiplos indicadores de historico:

```typescript
// Antes:
const hasPreviousHistory = !!service.detected_fault;

// Depois:
const hasPreviousHistory = !!(
  service.detected_fault ||
  service.work_performed ||
  (service.service_location === 'oficina' && service.status !== 'por_fazer')
);
```

Logica: se o servico esta na oficina e nao esta em `por_fazer`, passou por algum fluxo anterior (visita com levantamento, ou entrada directa com atribuicao). Isto e suficiente para:
- Mostrar o `ServicePreviousSummary` em vez do `DiagnosisPhotosGallery`
- Saltar as fotos obrigatorias (aparelho, etiqueta, estado) e ir directo ao diagnostico
- Mostrar "Continuar Reparacao" em vez de "Iniciar Reparacao"

### 2. Corrigir condicao de visibilidade (`ServicePreviousSummary.tsx`, linha 112)

O componente deve ser visivel sempre que houver indicadores de historico, independentemente dos logs (que sao lazy):

```typescript
// Antes:
if (!service.detected_fault && (!activityLogs || activityLogs.length === 0)) {
  return null;
}

// Depois:
const hasHistoryIndicators = !!(
  service.detected_fault ||
  service.work_performed ||
  service.service_location === 'oficina'
);
if (!hasHistoryIndicators && (!activityLogs || activityLogs.length === 0)) {
  return null;
}
```

### 3. Corrigir `deriveStepFromDb` para servicos na oficina com historico (`useFlowPersistence.ts`)

Na funcao `deriveStepFromDb`, quando o fluxo e `oficina` e o servico tem `flow_step: foto_aparelho` salvo no DB de uma tentativa anterior falhada, o sistema retoma no passo de foto mesmo quando ja tem historico. Precisa verificar se o `flow_step` guardado ainda faz sentido dado o estado actual:

Na seccao de workshop flow (linhas 138-141), adicionar uma verificacao: se o `flow_step` guardado e um passo de foto (foto_aparelho, foto_etiqueta, foto_estado) mas o servico ja esta in-progress com fotos anteriores de visita, ignorar o flow_step e saltar para diagnostico.

### Ficheiros a alterar

| Ficheiro | Alteracao |
|---|---|
| `src/components/technician/WorkshopFlowModals.tsx` | Expandir `hasPreviousHistory` (linha 127) para considerar `service_location` e `status` |
| `src/components/technician/ServicePreviousSummary.tsx` | Expandir condicao de visibilidade (linha 112) para nao depender exclusivamente de `detected_fault` |
| `src/hooks/useFlowPersistence.ts` | Corrigir `deriveStepFromDb` para ignorar `flow_step` de foto quando o servico ja tem historico anterior |

### Impacto no Supabase

- Zero queries adicionais — usa apenas campos ja carregados do servico (`service_location`, `status`, `detected_fault`, `work_performed`)
- Sem migracoes SQL
- Sem alteracao de RLS policies

