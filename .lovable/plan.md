

## Diagnóstico: Bug de Fluxo de Visita (Reparar no Local → "Oficina Reparados")

### Causa Raiz

O problema principal está na linha 570 de `VisitFlowModals.tsx`. Quando o técnico escolhe **"Reparar no Local"** (casa do cliente), a conclusão define `status: 'concluidos'`. Mas `concluidos` é semanticamente "Oficina Reparados" — um estado desenhado para serviços de oficina que foram reparados e aguardam precificação/entrega.

Para reparações no local do cliente, `concluidos` é o estado ERRADO porque:
- O label "Oficina Reparados" confunde o utilizador
- O Dashboard conta "Oficina Reparados" apenas para `service_location === 'oficina'`, então estas reparações client-side "desaparecem" das estatísticas
- `SecretaryConcluidosPage` filtra por `service_location === 'oficina'`, então a secretária NÃO vê estes serviços concluídos no cliente

### Fluxo Correcto (o que deve acontecer)

```text
Reparação no LOCAL do cliente:
├── Sem preço definido → status = 'a_precificar' + pending_pricing = true
└── Com preço pré-definido pelo admin → status = 'finalizado' (se pago) ou manter 'a_precificar'

Reparação na OFICINA (workshop):
└── Sempre → status = 'concluidos' (Oficina Reparados) — aguarda pricing + entrega
```

A diferença: serviço de oficina precisa de entrega física ao cliente. Serviço no local do cliente já está "entregue" — só falta precificar.

### Ficheiros a Modificar

**1. `src/components/technician/VisitFlowModals.tsx` (linha ~568-575)**
- Mudar o status final de `'concluidos'` para `'a_precificar'` quando `decision === "reparar_local"` (e não tem pricing pré-definido)
- Se já tem pricing pré-definido E está pago → `'finalizado'`
- Manter `'concluidos'` apenas quando `decision === "levantar_oficina"` (que já usa a RPC `lift_service_to_workshop`)

**2. `src/pages/DashboardPage.tsx` (linhas ~126-135)**
- Adicionar contagem para serviços "a_precificar" de visitas (client-side) se necessário
- Garantir que reparações client-side com `a_precificar` aparecem no card correcto

**3. `src/pages/secretary/SecretaryConcluidosPage.tsx`**
- Verificar se precisa incluir serviços `a_precificar` com `service_location='cliente'` para que a secretária os veja

**4. Verificação adicional**: Confirmar que `SecretaryPrecificarPage` já mostra serviços com `pending_pricing=true` independentemente de location — isto garantirá que visitas reparadas no local apareçam para precificação.

### Resumo da Mudança Core

Uma única linha em `VisitFlowModals.tsx`:
```typescript
// ANTES (bug):
status: 'concluidos',

// DEPOIS (correcto):
status: hasPricingPreDefined ? 'finalizado' : 'a_precificar',
```

Isto resolve o bug porque:
- Reparação no cliente sem preço → vai para "Precificar" (visível pela secretária)
- Reparação no cliente com preço → vai para "Finalizado" (concluído)
- Reparação na oficina → continua como `concluidos` (Oficina Reparados, aguarda entrega)

