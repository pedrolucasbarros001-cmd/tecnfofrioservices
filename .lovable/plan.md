
# Plano: Ajustes de Texto/Tamanho e Verificação do Workflow do Técnico

## Resumo das Alterações

Este plano aborda dois objetivos principais:
1. **Ajustes de texto e tamanho** - Prevenir sobreposição visual e simplificar botões
2. **Verificação do workflow** - Confirmar que o fluxo está correto segundo as especificações

---

## Parte 1: Ajustes de UI

### 1.1 Simplificar Botão "Começar" em ServicosPage.tsx

**Ficheiro:** `src/pages/ServicosPage.tsx`

**Alteração:** Mudar o texto de "Começar Visita/Instalação/Entrega" para simplesmente "Começar"

**Linhas 152-180:** Actualizar a função `getButtonConfig`:
```typescript
const getButtonConfig = (service: Service) => {
  if (service.service_type === 'entrega') {
    return { 
      label: 'Começar',  // Era "Começar Entrega"
      color: 'bg-green-500 hover:bg-green-600 text-white',
      // ... resto mantém
    };
  }
  if (service.service_type === 'instalacao') {
    return { 
      label: 'Começar',  // Era "Começar Instalação"
      color: 'bg-yellow-500 hover:bg-yellow-600 text-black',
      // ... resto mantém
    };
  }
  return { 
    label: 'Começar',  // Era "Começar Visita"
    color: 'bg-blue-500 hover:bg-blue-600 text-white',
    // ... resto mantém
  };
};
```

### 1.2 Melhorar Responsividade dos Cards

**Ficheiro:** `src/pages/ServicosPage.tsx`

**Alterações no ServiceCard (linhas 182-254):**
- Reduzir padding do botão
- Usar `text-[11px]` em mobile para o botão
- Garantir que ícones e textos não sobrepõem

```typescript
// Linha 242-249 - Botão mais compacto
<Button
  size="sm"
  className={cn('w-full h-7 text-[11px] md:h-8 md:text-xs mt-1.5', buttonConfig.color)}
  onClick={(e) => handleStartFlow(service, e)}
>
  <Play className="h-3 w-3 mr-1" />
  {buttonConfig.label}
</Button>
```

### 1.3 Corrigir Espaçamentos nos Modais

**Ficheiros afetados:**
- `VisitFlowModals.tsx`
- `InstallationFlowModals.tsx`
- `DeliveryFlowModals.tsx`
- `WorkshopFlowModals.tsx`

**Alterações comuns:**
- Reduzir padding do header de `py-3` para `py-2`
- Usar tamanho de fonte menor no título do modal (`text-base` em vez de `text-lg`)
- Garantir que o DialogContent tem `overflow-hidden` para evitar scroll horizontal

---

## Parte 2: Verificação do Workflow do Técnico

### Análise do Fluxo Actual vs. Especificação

#### Fluxo de Visita (VisitFlowModals.tsx) ✅ CORRECTO

| Passo | Especificação | Implementação Actual | Status |
|-------|---------------|----------------------|--------|
| 1 | Resumo (Cliente, Morada, Aparelho, Avaria) | ✅ Presente | OK |
| 2 | Deslocação (Caminho p/ Cliente, Cheguei ao Local) | ✅ Presente | OK |
| 3 | Foto (obrigatória) | ✅ Presente, obrigatória | OK |
| 4 | Diagnóstico (Textarea obrigatória) | ✅ Presente, obrigatória | OK |
| 5 | Decisão (Reparar no Local, Levantar para Oficina, Pedir Peça) | ✅ Presente | OK |
| 6 | Finalização (Assinatura obrigatória) | ✅ Presente | OK |

**Transições de Estado Correctas:**
- "Reparar no Local" → `status: 'concluidos'`, `pending_pricing: true` ✅
- "Levantar para Oficina" → `status: 'na_oficina'`, `service_location: 'oficina'` ✅
- "Pedir Peça" → `status: 'para_pedir_peca'` ✅

---

#### Fluxo de Instalação (InstallationFlowModals.tsx) ✅ CORRECTO

| Passo | Especificação | Implementação Actual | Status |
|-------|---------------|----------------------|--------|
| 1 | Resumo | ✅ Presente | OK |
| 2 | Deslocação | ✅ Presente | OK |
| 3 | Foto Antes (obrigatória) | ✅ Presente | OK |
| 4 | Foto Depois (obrigatória) | ✅ Presente | OK |
| 5 | Assinatura (obrigatória) | ✅ Presente | OK |

**Transição de Estado Correcta:**
- Conclusão → `status: 'finalizado'`, `service_location: 'entregue'` ✅

---

#### Fluxo de Entrega (DeliveryFlowModals.tsx) ✅ CORRECTO

| Passo | Especificação | Implementação Actual | Status |
|-------|---------------|----------------------|--------|
| 1 | Resumo | ✅ Presente | OK |
| 2 | Deslocação | ✅ Presente | OK |
| 3 | Foto (opcional) | ✅ Presente, opcional | OK |
| 4 | Assinatura (obrigatória) | ✅ Presente | OK |

**Transição de Estado Correcta:**
- "Marcar como Entregue" → `status: 'finalizado'`, `service_location: 'entregue'`, `delivery_date` ✅

---

#### Fluxo de Oficina (WorkshopFlowModals.tsx) ✅ CORRECTO

| Passo | Especificação | Implementação Actual | Status |
|-------|---------------|----------------------|--------|
| 1 | Resumo | ✅ Presente | OK |
| 2 | Contexto + Foto | ✅ Avaria detectada obrigatória, foto opcional | OK |
| 3 | Identificação (Marca, Modelo, Série) | ✅ Presente | OK |
| 4 | Revisão | ✅ Presente | OK |
| 5 | Finalização (Pedir Peça ou Concluir) | ✅ Presente | OK |

**Transições de Estado Correctas:**
- "Iniciar Reparação" → `status: 'em_execucao'` ✅
- "Pedir Peça" → `status: 'para_pedir_peca'` ✅
- "Reparação Concluída" → `status: 'concluidos'`, `pending_pricing: true` ✅

---

## Parte 3: Pequenas Correções Identificadas

### 3.1 Botão já está "Começar" na Oficina

O `TechnicianOfficePage.tsx` já usa apenas "Começar" (linha 171) - CORRECTO

### 3.2 Garantir Consistência Visual

Todos os modais já seguem o padrão correto:
- Cores temáticas nos headers (Azul, Amarelo, Verde, Laranja)
- Barra de progresso presente
- Botões "Anterior" e "Continuar"

---

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/pages/ServicosPage.tsx` | Simplificar label do botão para "Começar", ajustar tamanhos |
| `src/components/technician/VisitFlowModals.tsx` | Pequenos ajustes de espaçamento |
| `src/components/technician/InstallationFlowModals.tsx` | Pequenos ajustes de espaçamento |
| `src/components/technician/DeliveryFlowModals.tsx` | Pequenos ajustes de espaçamento |
| `src/components/technician/WorkshopFlowModals.tsx` | Pequenos ajustes de espaçamento |

---

## Secção Técnica: Diagrama do Workflow do Técnico

```text
                    ┌─────────────────────────────────────────┐
                    │         AGENDA SEMANAL (ServicosPage)   │
                    │  Cards com botão "Começar" por dia      │
                    └─────────────────────┬───────────────────┘
                                          │
           ┌──────────────────────────────┼──────────────────────────────┐
           │                              │                              │
           ▼                              ▼                              ▼
    ┌──────────────┐              ┌───────────────┐              ┌──────────────┐
    │    VISITA    │              │  INSTALAÇÃO   │              │   ENTREGA    │
    │  (6 passos)  │              │   (5 passos)  │              │  (4 passos)  │
    │    AZUL      │              │   AMARELO     │              │    VERDE     │
    └──────┬───────┘              └───────┬───────┘              └──────┬───────┘
           │                              │                              │
           ▼                              ▼                              ▼
    Resumo → Deslocação           Resumo → Deslocação            Resumo → Deslocação
    → Foto → Diagnóstico          → Foto Antes                   → Foto (opcional)
    → Decisão → Assinatura        → Foto Depois                  → Assinatura
           │                      → Assinatura                          │
           │                              │                              │
    ┌──────┼──────┐                       ▼                              ▼
    │      │      │               status: 'finalizado'           status: 'finalizado'
    ▼      ▼      ▼               location: 'entregue'           location: 'entregue'
    │      │      │
    │      │      └─► status: 'para_pedir_peca'
    │      │
    │      └─────────► status: 'na_oficina'
    │                  location: 'oficina'
    │                         │
    │                         ▼
    │              ┌──────────────────┐
    │              │     OFICINA      │
    │              │   (5 passos)     │
    │              │    LARANJA       │
    │              └────────┬─────────┘
    │                       │
    │                       ▼
    │              Resumo → Contexto/Foto
    │              → Identificação → Revisão
    │              → Finalização
    │                       │
    │              ┌────────┴────────┐
    │              │                 │
    │              ▼                 ▼
    │      status: 'para_pedir_peca' │
    │                                │
    └────────────────────────────────┘
                     │
                     ▼
           status: 'concluidos'
           pending_pricing: true
```

---

## Conclusão

O workflow do técnico está **correctamente implementado** segundo as especificações. As únicas alterações necessárias são:

1. **UI**: Simplificar o texto do botão de "Começar [Tipo]" para apenas "Começar"
2. **Layout**: Pequenos ajustes de tamanho/espaçamento para evitar sobreposição visual

Todos os fluxos sequenciais (modal por modal), gatilhos, bifurcações e transições de estado estão a funcionar conforme esperado.
