

# Plano: Implementacao Completa dos Fluxos Sequenciais de Execucao dos Tecnicos

## Sumario Executivo

Este plano implementa os fluxos de execucao do tecnico exactamente como especificado, garantindo:
- Fluxo sequencial estrito (um passo de cada vez)
- Resumo tecnico de continuidade quando ha historico
- Persistencia de estado via localStorage
- Titulos descritivos nas assinaturas
- Estados finais correctos

---

## 1. Componentes Novos a Criar

### 1.1 Hook de Persistencia: `src/hooks/useFlowPersistence.ts`

Guarda o estado do fluxo em localStorage para evitar perda de dados.

```typescript
// Estrutura do estado guardado
interface FlowState {
  serviceId: string;
  flowType: 'visita' | 'instalacao' | 'oficina' | 'entrega';
  currentStep: string;
  formData: Record<string, any>;
  savedAt: string;
}

// Funcoes: load, save, clear, hasState
```

### 1.2 Resumo Tecnico Anterior: `src/components/technician/ServicePreviousSummary.tsx`

Componente que mostra o resumo do atendimento anterior quando existe historico.

| Campo | Fonte |
|-------|-------|
| Tecnico que executou | `activity_logs` + `profiles` |
| Data e hora | `activity_logs.created_at` |
| Tipo de atendimento | Visita / Oficina |
| Diagnostico descrito | `service.detected_fault` |
| Decisao tomada | Metadata do activity_log |
| Fotos do aparelho | `service_photos` |

Botoes:
- "Continuar Execucao"
- "Ver Ficha Completa"

### 1.3 Modal de Pecas/Materiais: `src/components/modals/UsedPartsModal.tsx`

Modal reutilizavel para registo de pecas usadas ou materiais.

| Campo | Obrigatorio |
|-------|-------------|
| Nome da peca/material | Sim |
| Referencia | Nao |
| Quantidade | Sim (default: 1) |

- Botao "Adicionar outra"
- Botao "Concluir registo"

---

## 2. Alteracoes nos Fluxos Existentes

### 2.1 Fluxo de Visita (`VisitFlowModals.tsx`)

**Estado Actual:**
- 7 passos basicos ja implementados
- Falta resumo anterior + persistencia

**Alteracoes Necessarias:**

1. **Adicionar verificacao de historico no passo 1**
   - Antes de mostrar "Comecar Visita", verificar se existe diagnostico anterior
   - Se sim, mostrar `ServicePreviousSummary` com botoes "Continuar" e "Ver Ficha"

2. **Inverter ordem diagnostico/foto** (alinhado com especificacao)
   - Especificacao diz: Diagnostico → depois Foto do aparelho
   - Actual: Foto → Diagnostico
   - Alterar para: Diagnostico → Foto

3. **Melhorar titulos das assinaturas:**
   - Levar oficina: "Autorizacao para transporte do aparelho"
   - Pedir peca: "Confirmacao de pedido de peca"
   - Concluir: "Confirmacao de reparacao concluida"

4. **Adicionar persistencia localStorage**
   - Usar `useFlowPersistence` hook
   - Guardar estado a cada mudanca de step

5. **Actualizar estado final correcto:**
   - Reparar no local → `a_precificar` + `pending_pricing: true`
   - Levar oficina → `na_oficina` + `service_location: oficina`
   - Pedir peca → `para_pedir_peca`

### 2.2 Fluxo de Oficina (`WorkshopFlowModals.tsx`)

**Estado Actual:**
- 5 passos: resumo → contexto/foto → identificacao → revisao → finalizacao
- Demasiado complexo, faltam perguntas de pecas

**Alteracoes Necessarias:**

1. **Simplificar fluxo para:**
   - Resumo (com historico se existir)
   - Iniciar Reparacao (marca `em_execucao`)
   - Diagnostico Complementar (campo opcional)
   - Pecas Usadas? (Sim/Nao)
   - Pedir Peca? (Sim/Nao)
   - Conclusao (campo "Resumo da reparacao")

2. **Remover passo de identificacao**
   - Marca/modelo ja devem estar preenchidos na criacao
   - Se faltarem, podem ser actualizados no passo de contexto

3. **Corrigir estado final:**
   - Concluir → `concluidos` + `pending_pricing: true` (NAO finalizado)
   - Pedir peca → `para_pedir_peca`

4. **Sem assinatura** (cliente nao presente na oficina)

5. **Adicionar `ServicePreviousSummary`** quando ha historico

### 2.3 Fluxo de Instalacao (`InstallationFlowModals.tsx`)

**Estado Actual:**
- Resumo → Deslocacao → Foto Antes → Foto Depois → Assinatura
- Falta registo de materiais

**Alteracoes Necessarias:**

1. **Adicionar etapa "Registo de Materiais"** apos Foto Antes
   - Usar `UsedPartsModal` componente
   - Campo para registo de tubagem, cabos, etc.

2. **Adicionar campo "Descricao do Trabalho"** (work_performed)
   - Antes das fotos depois
   - Campo de texto livre

3. **Actualizar titulo assinatura:**
   - "Confirmacao de instalacao realizada"

4. **Corrigir estado final:**
   - Instalacao concluida → vai para `a_precificar` + `pending_pricing: true`
   - (NAO vai directamente para finalizado)

5. **Adicionar persistencia localStorage**

### 2.4 Fluxo de Entrega (`DeliveryFlowModals.tsx`)

**Estado Actual:**
- Bem implementado, apenas ajustes menores

**Alteracoes Necessarias:**

1. **Actualizar titulo assinatura:**
   - "Comprovativo de entrega"

2. **Confirmar estado final:**
   - `finalizado` + `service_location: entregue` + `delivery_date`

3. **Foto opcional** (ja esta correcto)

---

## 3. Logica de Resumo Tecnico Anterior

### Quando Mostrar

O componente `ServicePreviousSummary` aparece quando:

```typescript
const shouldShowPreviousSummary = useMemo(() => {
  // Tem diagnostico anterior guardado
  const hasPreviousDiagnosis = !!service.detected_fault;
  
  // Tem activity logs de execucao anterior
  const hasExecutionHistory = activityLogs.some(log => 
    ['inicio_execucao', 'levantamento', 'pedido_peca'].includes(log.action_type)
  );
  
  // Tecnico diferente do anterior
  const differentTechnician = lastTechnicianId && lastTechnicianId !== currentTechnicianId;
  
  return hasPreviousDiagnosis || hasExecutionHistory || differentTechnician;
}, [service, activityLogs, currentTechnicianId]);
```

### Conteudo do Resumo

Consulta de dados:
1. Buscar ultimo `activity_log` com `action_type` relevante
2. Buscar fotos do servico (`service_photos`)
3. Mostrar `detected_fault` do servico

---

## 4. Persistencia de Estado (localStorage)

### Estrutura

```typescript
// Chave: technician_flow_${serviceId}
const flowState = {
  serviceId: 'uuid',
  flowType: 'visita',
  currentStep: 'diagnostico',
  formData: {
    detectedFault: 'texto do diagnostico',
    photoFile: 'base64...',
    decision: 'reparar_local',
  },
  savedAt: '2026-01-30T12:00:00Z'
};
```

### Comportamento

1. **Ao abrir fluxo:**
   - Verificar se existe estado guardado
   - Se existir e for < 24h, restaurar estado
   - Se existir e for > 24h, limpar e comecar do inicio

2. **Durante o fluxo:**
   - Guardar estado a cada mudanca de step
   - Guardar dados do formulario

3. **Ao concluir:**
   - Limpar estado do localStorage

---

## 5. Estados Finais Correctos

| Fluxo | Accao | Estado Final |
|-------|-------|--------------|
| Visita | Levar para oficina | `na_oficina`, `service_location: oficina` |
| Visita | Pedir peca | `para_pedir_peca`, `last_status_before_part_request` guardado |
| Visita | Concluir reparacao | `a_precificar`, `pending_pricing: true` |
| Oficina | Pedir peca | `para_pedir_peca` |
| Oficina | Concluir | `concluidos`, `pending_pricing: true` |
| Instalacao | Concluir | `a_precificar`, `pending_pricing: true` |
| Entrega | Entregue | `finalizado`, `service_location: entregue`, `delivery_date` |

---

## 6. Titulos das Assinaturas (Actualizados)

| Contexto | Titulo |
|----------|--------|
| Levar para oficina | "Autorizacao para transporte do aparelho" |
| Pedir peca (visita) | "Confirmacao de pedido de peca" |
| Concluir visita | "Confirmacao de reparacao concluida" |
| Concluir instalacao | "Confirmacao de instalacao realizada" |
| Entrega | "Comprovativo de entrega" |

---

## 7. Ficheiros a Criar/Modificar

| Ficheiro | Accao | Prioridade |
|----------|-------|------------|
| `src/hooks/useFlowPersistence.ts` | Criar | Alta |
| `src/components/technician/ServicePreviousSummary.tsx` | Criar | Alta |
| `src/components/modals/UsedPartsModal.tsx` | Criar | Alta |
| `src/components/technician/VisitFlowModals.tsx` | Modificar | Alta |
| `src/components/technician/WorkshopFlowModals.tsx` | Modificar extensivamente | Alta |
| `src/components/technician/InstallationFlowModals.tsx` | Modificar | Media |
| `src/components/technician/DeliveryFlowModals.tsx` | Ajustes menores | Baixa |
| `src/utils/activityLogUtils.ts` | Adicionar log de instalacao | Media |

---

## 8. Diagrama de Fluxos

```text
VISITA:
┌─────────┐   ┌───────────┐   ┌────────────┐   ┌───────┐   ┌─────────┐
│ Resumo  │──▶│ Deslocacao│──▶│ Diagnostico│──▶│ Foto  │──▶│ Decisao │
└─────────┘   └───────────┘   └────────────┘   └───────┘   └────┬────┘
                                                                 │
                    ┌────────────────────────────────────────────┼────────────────┐
                    ▼                                            ▼                │
            ┌───────────────┐                            ┌──────────────┐         │
            │Levar Oficina  │                            │Reparar Local │         │
            └───────┬───────┘                            └──────┬───────┘         │
                    │                                           │                 │
                    ▼                                           ▼                 │
            ┌───────────────┐                            ┌──────────────┐         │
            │ Assinatura    │                            │ Pecas Usadas?│         │
            │(Transporte)   │                            └──────┬───────┘         │
            └───────┬───────┘                                   │                 │
                    │                                           ▼                 │
                    ▼                                    ┌──────────────┐         │
            ┌───────────────┐                            │ Pedir Peca?  │         │
            │  na_oficina   │                            └───────┬──────┘         │
            └───────────────┘                     Sim ◀──────────┼──────────▶ Nao │
                                                   │             │                │
                                                   ▼             ▼                │
                                          ┌────────────┐  ┌────────────┐          │
                                          │ Assinatura │  │ Assinatura │          │
                                          │ (Pedido)   │  │ (Conclusao)│          │
                                          └─────┬──────┘  └─────┬──────┘          │
                                                │               │                 │
                                                ▼               ▼                 │
                                          ┌────────────┐  ┌────────────┐          │
                                          │para_pedir  │  │a_precificar│          │
                                          │_peca       │  │            │          │
                                          └────────────┘  └────────────┘          │
                                                                                  │
OFICINA:                                                                          │
┌─────────┐   ┌─────────────┐   ┌────────────┐   ┌──────────────┐   ┌───────────┐│
│ Resumo  │──▶│   Iniciar   │──▶│ Diagnostico│──▶│ Pecas Usadas?│──▶│Pedir Peca?││
└─────────┘   └─────────────┘   │ (opcional) │   └──────────────┘   └─────┬─────┘│
                                └────────────┘                            │      │
                                                             Sim ◀────────┼────▶ Nao
                                                              │           │       │
                                                              ▼           ▼       │
                                                       ┌────────────┐ ┌─────────┐ │
                                                       │para_pedir  │ │Conclusao│ │
                                                       │_peca       │ │         │ │
                                                       └────────────┘ └────┬────┘ │
                                                                           │      │
                                                                           ▼      │
                                                                    ┌───────────┐ │
                                                                    │ concluidos│ │
                                                                    └───────────┘ │
                                                                                  │
INSTALACAO:                                                                       │
┌─────────┐   ┌───────────┐   ┌────────────┐   ┌───────────┐   ┌───────────┐     │
│ Resumo  │──▶│ Deslocacao│──▶│ Foto Antes │──▶│ Materiais │──▶│Foto Depois│     │
└─────────┘   └───────────┘   └────────────┘   └───────────┘   └─────┬─────┘     │
                                                                      │          │
                                                                      ▼          │
                                                               ┌────────────┐    │
                                                               │ Assinatura │    │
                                                               │(Instalacao)│    │
                                                               └─────┬──────┘    │
                                                                     │           │
                                                                     ▼           │
                                                               ┌────────────┐    │
                                                               │a_precificar│    │
                                                               └────────────┘    │
                                                                                 │
ENTREGA:                                                                         │
┌─────────┐   ┌───────────┐   ┌─────────────┐   ┌────────────┐                   │
│ Resumo  │──▶│ Deslocacao│──▶│Foto(opcion.)│──▶│ Assinatura │                   │
└─────────┘   └───────────┘   └─────────────┘   │ (Entrega)  │                   │
                                                └─────┬──────┘                   │
                                                      │                          │
                                                      ▼                          │
                                                ┌───────────┐                    │
                                                │ finalizado│                    │
                                                └───────────┘                    │
```

---

## 9. Ordem de Implementacao

**Fase 1 - Componentes Base (Primeiro):**
1. `useFlowPersistence.ts` - hook de persistencia
2. `ServicePreviousSummary.tsx` - resumo anterior
3. `UsedPartsModal.tsx` - modal de pecas/materiais

**Fase 2 - Fluxos Principais:**
4. `VisitFlowModals.tsx` - ajustes e persistencia
5. `WorkshopFlowModals.tsx` - simplificacao completa
6. `InstallationFlowModals.tsx` - adicionar materiais

**Fase 3 - Ajustes Finais:**
7. `DeliveryFlowModals.tsx` - titulo assinatura
8. `activityLogUtils.ts` - logs adicionais

---

## 10. Testes Recomendados

Apos implementacao, testar:

1. **Visita - Reparar no local:**
   - Diagnostico → Foto → Reparar → Pecas Usadas (Nao) → Pedir Peca (Nao) → Assinatura → `a_precificar`

2. **Visita - Levar oficina:**
   - Diagnostico → Foto → Levar Oficina → Assinatura → `na_oficina`

3. **Oficina - Concluir:**
   - Iniciar → Diagnostico → Pecas (Nao) → Pedir (Nao) → Conclusao → `concluidos`

4. **Instalacao:**
   - Foto Antes → Materiais → Foto Depois → Assinatura → `a_precificar`

5. **Entrega:**
   - Deslocacao → Foto (opcional) → Assinatura → `finalizado`

6. **Persistencia:**
   - Iniciar fluxo → Fechar browser → Reabrir → Verificar que estado foi restaurado

