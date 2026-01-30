

# Plano: Garantir Persistência de Estado em Todos os Fluxos dos Técnicos

## Análise do Estado Actual

| Fluxo | Tem Persistência? | Estado |
|-------|-------------------|--------|
| Instalação | ✅ Sim | Funcional |
| Oficina | ✅ Sim | Funcional |
| **Visita** | ❌ Não | Precisa implementar |
| **Entrega** | ❌ Não | Precisa implementar |

O hook `useFlowPersistence` já existe e funciona bem, mas não está a ser usado nos fluxos de **Visita** e **Entrega**.

---

## O Que Será Garantido

1. **Persistência automática** - O estado é guardado no localStorage a cada mudança de etapa
2. **Restauro automático** - Ao reabrir o fluxo, o técnico continua exactamente onde parou
3. **Expiração de 24h** - Estados antigos são automaticamente limpos
4. **Limpeza ao concluir** - O estado é removido após conclusão do serviço

---

## Alterações Necessárias

### 1. VisitFlowModals.tsx

**Adicionar import do hook:**
```typescript
import { useFlowPersistence } from '@/hooks/useFlowPersistence';
```

**Adicionar interface compatível:**
```typescript
interface VisitFormData {
  detectedFault: string;
  photoFile: string | null;
  decision: DecisionType;
  usedParts: boolean;
  usedPartsList: PartEntry[];
  needsPartOrder: boolean;
  partToOrder: { name: string; reference: string };
  [key: string]: unknown;
}
```

**Usar o hook de persistência:**
```typescript
// Flow persistence
const { loadState, saveState, clearState } = useFlowPersistence(service.id, 'visita');
```

**Modificar o useEffect de inicialização:**
```typescript
useEffect(() => {
  if (isOpen) {
    const savedState = loadState();
    if (savedState) {
      setCurrentStep(savedState.currentStep as ModalStep);
      setFormData(savedState.formData as VisitFormData);
    } else {
      setCurrentStep('resumo');
      setFormData({
        detectedFault: service.detected_fault || '',
        photoFile: null,
        decision: 'reparar_local',
        usedParts: false,
        usedPartsList: [{ name: '', reference: '', quantity: 1 }],
        needsPartOrder: false,
        partToOrder: { name: '', reference: '' },
      });
    }
  }
}, [isOpen, service, loadState]);
```

**Adicionar auto-save:**
```typescript
useEffect(() => {
  if (isOpen && currentStep !== 'resumo') {
    saveState(currentStep, formData);
  }
}, [isOpen, currentStep, formData, saveState]);
```

**Limpar estado ao concluir** (em `handleSignatureComplete`):
```typescript
// Clear persisted state
clearState();
```

---

### 2. DeliveryFlowModals.tsx

**Adicionar import do hook:**
```typescript
import { useFlowPersistence } from '@/hooks/useFlowPersistence';
```

**Actualizar interface:**
```typescript
interface DeliveryFormData {
  photoFile: string | null;
  [key: string]: unknown;
}
```

**Usar o hook de persistência:**
```typescript
// Flow persistence
const { loadState, saveState, clearState } = useFlowPersistence(service.id, 'entrega');
```

**Modificar o useEffect de inicialização:**
```typescript
useEffect(() => {
  if (isOpen) {
    const savedState = loadState();
    if (savedState) {
      setCurrentStep(savedState.currentStep as ModalStep);
      setFormData(savedState.formData as DeliveryFormData);
    } else {
      setCurrentStep('resumo');
      setFormData({ photoFile: null });
    }
  }
}, [isOpen, loadState]);
```

**Adicionar auto-save:**
```typescript
useEffect(() => {
  if (isOpen && currentStep !== 'resumo') {
    saveState(currentStep, formData);
  }
}, [isOpen, currentStep, formData, saveState]);
```

**Limpar estado ao concluir** (em `handleSignatureComplete`):
```typescript
// Clear persisted state
clearState();
```

---

## Comportamento Após Implementação

```text
CENÁRIO: Técnico a meio de uma Visita
┌─────────────────────────────────────────────┐
│ 1. Técnico abre visita                      │
│ 2. Avança até etapa "Diagnóstico"           │
│ 3. Escreve diagnóstico parcial              │
│ 4. Página recarrega (acidente/demora/etc)   │
│                                             │
│ 5. Técnico reabre a mesma visita            │
│    → Sistema detecta estado guardado        │
│    → Restaura etapa "Diagnóstico"           │
│    → Restaura texto do diagnóstico          │
│    → Técnico continua de onde parou ✅       │
└─────────────────────────────────────────────┘
```

---

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/technician/VisitFlowModals.tsx` | Adicionar persistência |
| `src/components/technician/DeliveryFlowModals.tsx` | Adicionar persistência |

---

## Resultado Final

Após esta implementação:
- ✅ **Visita**: Persistência completa
- ✅ **Instalação**: Persistência completa (já existe)
- ✅ **Oficina**: Persistência completa (já existe)
- ✅ **Entrega**: Persistência completa

O técnico **nunca perde progresso** independentemente de:
- Recarregar a página
- Fechar o browser acidentalmente
- Demorar muito tempo numa etapa
- Perda de conexão temporária

