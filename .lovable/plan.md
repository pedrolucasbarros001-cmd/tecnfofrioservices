

# Plano: Remover Linhas de Assinatura Vazias da Ficha de Impressao

## Problema Identificado

Actualmente, quando nao existem assinaturas digitais recolhidas, a ficha mostra linhas vazias para assinatura manual:

```
_________________________________    _________________________________
  Assinatura do Cliente                Assinatura do Funcionario
```

O utilizador quer que:
- Aparecam **apenas** as assinaturas digitais ja recolhidas
- Se nao houver assinaturas, **nao mostrar nada**

---

## Alteracoes Necessarias

### Ficheiro: `src/components/modals/ServicePrintModal.tsx`

**1. Remover secao de assinatura vazia no PrintContent (linhas 448-458)**

Remover completamente este bloco:
```typescript
{/* Signature Area - Only show if no digital signatures */}
{signatures.length === 0 && (
  <div style={{ display: 'grid', ... }}>
    <div style={{ borderTop: '1px solid #9ca3af', ... }}>
      <p>Assinatura do Cliente</p>
    </div>
    <div style={{ borderTop: '1px solid #9ca3af', ... }}>
      <p>Assinatura do Funcionário</p>
    </div>
  </div>
)}
```

**2. Remover secao de assinatura vazia no Preview (linhas 814-824)**

Remover completamente este bloco:
```typescript
{/* Signature Area */}
{signatures.length === 0 && (
  <div className="grid grid-cols-2 gap-6 mt-4 pt-3">
    <div className="border-t border-gray-400 pt-1">
      <p>Assinatura do Cliente</p>
    </div>
    <div className="border-t border-gray-400 pt-1">
      <p>Assinatura do Funcionário</p>
    </div>
  </div>
)}
```

---

## Resultado Visual

**Antes (sem assinaturas digitais):**
```
┌─────────────────────────────────────────────────────┐
│ IMPORTANTE - Termos de Guarda                 [QR] │
│ Os equipamentos so podem permanecer...             │
├─────────────────────────────────────────────────────┤
│ _________________     _________________            │
│ Assinatura Cliente    Assinatura Funcionario       │
└─────────────────────────────────────────────────────┘
```

**Depois (sem assinaturas digitais):**
```
┌─────────────────────────────────────────────────────┐
│ IMPORTANTE - Termos de Guarda                 [QR] │
│ Os equipamentos so podem permanecer...             │
└─────────────────────────────────────────────────────┘
```

**Quando ha assinaturas digitais (mantido igual):**
```
┌─────────────────────────────────────────────────────┐
│ Assinaturas Recolhidas                             │
│ ┌────────┐ Cliente                                 │
│ │[assin.]│ Autorizacao de levantamento...          │
│ └────────┘ 15/01/26 10:30                          │
├─────────────────────────────────────────────────────┤
│ IMPORTANTE - Termos de Guarda                 [QR] │
└─────────────────────────────────────────────────────┘
```

---

## Ficheiro Modificado

| Ficheiro | Linhas | Accao |
|----------|--------|-------|
| `src/components/modals/ServicePrintModal.tsx` | 448-458 | Remover bloco |
| `src/components/modals/ServicePrintModal.tsx` | 814-824 | Remover bloco |

---

## Impacto

- A ficha fica mais limpa quando nao ha assinaturas
- As assinaturas digitais continuam a aparecer quando existem
- Sem impacto noutras funcionalidades

