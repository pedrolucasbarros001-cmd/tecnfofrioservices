
# Plano: Serviço Levantado para Oficina Fica Disponível

## Regra de Negócio

Quando um técnico faz uma visita e decide "Levantar para Oficina":
1. O serviço vai para `service_location: 'oficina'`
2. O `technician_id` é **removido** (fica `null`)
3. O status fica `na_oficina` com técnico nulo → trigger corrige para `por_fazer`
4. O serviço aparece como **"Disponível para Assumir"** na página de oficina

Isto permite:
- Qualquer técnico da oficina pode assumir o serviço
- A secretária/dono pode atribuir a um técnico específico
- Flexibilidade na distribuição de trabalho na oficina

## Alteração Necessária

### Ficheiro: `src/components/technician/VisitFlowModals.tsx`

**Linha ~227-232 - Código actual:**
```typescript
// Update to workshop
await updateService.mutateAsync({
  id: service.id,
  status: 'na_oficina',
  service_location: 'oficina',
  detected_fault: formData.detectedFault,
});
```

**Código corrigido:**
```typescript
// Update to workshop - remove technician so service becomes available
await updateService.mutateAsync({
  id: service.id,
  status: 'por_fazer',           // Trigger will enforce this anyway
  service_location: 'oficina',
  technician_id: null,           // REMOVE technician - service becomes available
  detected_fault: formData.detectedFault,
  scheduled_date: null,          // Clear schedule - will be set when assumed
  scheduled_shift: null,
});
```

## Fluxo Completo

```text
VISITA NO CLIENTE
       │
       ▼
┌──────────────────────┐
│ Técnico decide:      │
│ "Levantar Oficina"   │
└──────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│ Actualização do Serviço:                     │
│ • service_location: 'oficina'                │
│ • technician_id: NULL (removido)             │
│ • status: 'por_fazer' (trigger garante)      │
│ • scheduled_date: NULL                       │
│ • scheduled_shift: NULL                      │
└──────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│ PÁGINA OFICINA (TechnicianOfficePage)        │
├──────────────────────────────────────────────┤
│ Serviços Disponíveis para Assumir:           │
│ ┌────────────────────────────────────────┐   │
│ │ TF-00006 • Cliente X                   │   │
│ │ Frigorífico • Não refrigera            │   │
│ │        [Assumir Serviço]               │   │
│ └────────────────────────────────────────┘   │
└──────────────────────────────────────────────┘
```

## Opção: Manter Técnico (Opcional)

Se em alguns casos o técnico que levantou quiser ficar responsável, podemos adicionar uma opção no fluxo. Mas pela regra de negócio actual, o levantamento sempre liberta o serviço.

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/technician/VisitFlowModals.tsx` | Adicionar `technician_id: null` ao levantar para oficina |

## Detalhes Técnicos

A trigger `normalize_workshop_status_trigger` já garante que:
- Serviço na oficina **sem** técnico → status = `por_fazer`
- Serviço na oficina **com** técnico → status = `na_oficina` ou mais avançado

Portanto, ao definir `technician_id: null`, a trigger automaticamente corrige o status para `por_fazer` se necessário.

## Validação

Após implementação:
1. Técnico faz visita e escolhe "Levantar para Oficina"
2. Serviço aparece em "Disponíveis para Assumir" na página da oficina
3. Qualquer técnico pode clicar "Assumir Serviço"
4. Ou secretária pode atribuir via modal de atribuição
