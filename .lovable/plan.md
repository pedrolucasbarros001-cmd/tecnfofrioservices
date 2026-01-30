
# Plano: Corrigir Lógica de pending_pricing na Criação de Serviços

## Lógica de Negócio Correcta

| Cenário | Na Criação | Após Conclusão Técnica |
|---------|------------|------------------------|
| **SEM preço definido** | `pending_pricing: false` | `pending_pricing: true` (técnico marca ao concluir) |
| **COM preço definido** | `pending_pricing: false` | `pending_pricing: false` (já tem preço) |

O serviço só vai para "A Precificar" **após o trabalho ser concluído**, permitindo que o dono veja o que foi feito (diagnóstico, peças usadas, fotos) antes de definir o preço.

## Problema Actual

Os modais `CreateDeliveryModal.tsx` e `CreateInstallationModal.tsx` foram alterados para marcar `pending_pricing: true` na criação quando não há preço definido. Isto está **incorrecto**.

**Código actual (errado):**
```typescript
const needsPricing = !values.final_price || values.final_price <= 0;
pending_pricing: needsPricing,  // ← Marca logo na criação
```

## Correcção Necessária

Remover a lógica de `pending_pricing` da criação - deve ser sempre `false` ou `null`:

**CreateDeliveryModal.tsx e CreateInstallationModal.tsx:**
```typescript
// REMOVER estas linhas:
// const needsPricing = !values.final_price || values.final_price <= 0;
// pending_pricing: needsPricing,

// Criar serviço SEM pending_pricing (deixar como default false/null)
await createService.mutateAsync({
  // ... outros campos ...
  status: 'por_fazer',
  // pending_pricing NÃO é definido aqui - será definido na conclusão
});
```

## Fluxos de Conclusão (Já Correctos)

Os fluxos do técnico **já estão correctos** - todos verificam e marcam `pending_pricing` apenas na conclusão:

| Fluxo | Ficheiro | Lógica |
|-------|----------|--------|
| Visita (reparo local) | `VisitFlowModals.tsx` | `pending_pricing: true` ao concluir |
| Oficina | `WorkshopFlowModals.tsx` | `pending_pricing: true` ao concluir |
| Instalação | `TechnicianInstallationFlow.tsx` | `needsPricing` verificado na conclusão |
| Entrega | `TechnicianDeliveryFlow.tsx` | `needsPricing` verificado na conclusão |

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/modals/CreateDeliveryModal.tsx` | Remover `pending_pricing` da criação |
| `src/components/modals/CreateInstallationModal.tsx` | Remover `pending_pricing` da criação |

## Fluxo Completo Corrigido

### Serviço de Instalação SEM preço definido

```text
1. CRIAÇÃO:
   status: 'por_fazer'
   final_price: null
   pending_pricing: false (default)
   → Aparece na agenda do técnico ✓

2. TÉCNICO EXECUTA:
   → Faz instalação, tira fotos, recolhe assinatura

3. CONCLUSÃO (TechnicianInstallationFlow):
   const needsPricing = !service.is_warranty && (service.final_price || 0) === 0;
   status: 'finalizado'
   pending_pricing: true  ← Marca AQUI
   → Aparece em "A Precificar" ✓

4. DONO DEFINE PREÇO:
   pending_pricing: false
   → Aparece em "Em Débito" (calculado)
```

### Serviço de Instalação COM preço definido

```text
1. CRIAÇÃO:
   status: 'por_fazer'
   final_price: 120.00
   pending_pricing: false
   → Aparece na agenda do técnico ✓
   → Coexiste com débito (calculado) ✓

2. TÉCNICO EXECUTA:
   → Faz instalação, tira fotos, recolhe assinatura

3. CONCLUSÃO:
   const needsPricing = (service.final_price || 0) === 0; // false - já tem preço
   status: 'finalizado'
   pending_pricing: false  ← Mantém false
   → NÃO aparece em "A Precificar"
   → Aparece em "Em Débito" ✓
```

## Resumo Visual

```text
┌─────────────────────────────────────────────────────────────────┐
│                    CICLO DE VIDA DO SERVIÇO                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CRIAÇÃO                    EXECUÇÃO              CONCLUSÃO     │
│  ────────                   ────────              ─────────     │
│                                                                 │
│  status: por_fazer    →    em_execucao    →    finalizado       │
│  pending_pricing: ✗        pending_pricing: ✗   pending_pricing:│
│  (nunca na criação)        (ainda não)          ✓ se não tem    │
│                                                    preço        │
│                                                                 │
│  final_price: X€           -                    → Em Débito     │
│  final_price: null         -                    → A Precificar  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Impacto

- Serviços sem preço só aparecem em "A Precificar" após conclusão técnica
- Serviços com preço coexistem com débito desde a criação
- Dono pode ver o trabalho realizado antes de definir preço
- Fluxo de negócio respeita a sequência lógica: trabalho → precificação → pagamento
