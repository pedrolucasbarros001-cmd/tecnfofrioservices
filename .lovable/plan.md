
# Plano Completo: 4 Funcionalidades

Este plano cobre todas as alteracoes pedidas, organizadas por funcionalidade.

---

## Funcionalidade 1: Secretaria pode Editar Detalhes do Servico

**Problema actual:** O botao "Editar Detalhes" no menu de accoes (3 pontos) so aparece para o role `dono`. A secretaria nao tem acesso.

**Alteracoes:**

### Ficheiro: `src/components/services/StateActionButtons.tsx`
- **Linha 327:** Mudar o bloco `{isDono && (` para `{(isDono || isSecretaria) && (` -- isto permite que a secretaria veja as opcoes "Editar Detalhes" no dropdown
- **Manter** as opcoes "Forcar Estado" e "Eliminar" exclusivas ao `dono` (separar as condicoes dentro do bloco)

---

## Funcionalidade 2: Secretaria pode Reatribuir Servicos

**Problema actual:** A opcao "Reatribuir Tecnico" no dropdown so aparece para `isDono` (linha 263).

**Alteracoes:**

### Ficheiro: `src/components/services/StateActionButtons.tsx`
- **Linha 263:** Mudar `service.technician_id && service.status !== 'finalizado' && isDono` para `service.technician_id && service.status !== 'finalizado' && (isDono || isSecretaria)`

---

## Funcionalidade 3: Mudar de Horas para Turnos (Manha/Tarde)

**Problema actual:** O sistema usa `<Input type="time">` para agendar servicos, guardando horarios como "14:34", "09:00" etc. O pedido e reverter para seleccao por turno com apenas duas opcoes: **Manha** e **Tarde** (sem Noite).

### Base de dados
- Nao e necessaria migracao. O campo `scheduled_shift` e do tipo `text` e aceita qualquer valor. Os dados existentes com horarios (ex: "14:34") serao exibidos tal como estao; novos servicos usarao "manha" ou "tarde".

### Ficheiros a alterar (9 ficheiros):

Todos os `<Input type="time">` serao substituidos por um `<Select>` com duas opcoes: "Manha" e "Tarde".

**1. `src/components/modals/CreateServiceModal.tsx`** (linha 834-845)
- Substituir `<Input type="time" {...field} />` por Select com opcoes manha/tarde
- Mudar label "Hora" para "Turno"

**2. `src/components/modals/CreateInstallationModal.tsx`** (linha 577-588)
- Substituir `<Input type="time" {...field} />` por Select manha/tarde
- Mudar label "Horario *" para "Turno"

**3. `src/components/modals/CreateDeliveryModal.tsx`** (linha 577-588)
- Substituir `<Input type="time" {...field} />` por Select manha/tarde
- Mudar label "Horario" para "Turno"

**4. `src/components/modals/AssignTechnicianModal.tsx`** (linha 260-271)
- Substituir `<Input type="time">` por Select manha/tarde
- Mudar label "Hora" para "Turno"

**5. `src/components/modals/RescheduleServiceModal.tsx`** (linha 237-245)
- Substituir `<Input type="time">` por Select manha/tarde
- Mudar label "Nova Hora" para "Novo Turno"

**6. `src/components/modals/ConvertBudgetModal.tsx`** (linha 359-366)
- Substituir `<Input type="time">` por Select manha/tarde
- Mudar label "Hora" para "Turno"

**7. `src/components/modals/PartArrivedModal.tsx`** (linha 256-265)
- Substituir `<Input type="time">` por Select manha/tarde
- Mudar label "Hora" para "Turno"

**8. `src/components/shared/CustomerDetailSheet.tsx`** (linha 1162-1177)
- Substituir `<Input type="time">` por Select manha/tarde
- Mudar label "Hora" para "Turno"

**9. `src/components/modals/AssignDeliveryModal.tsx`** (linha 137-141)
- Substituir `<Input type="time">` por Select manha/tarde
- Mudar label correspondente para "Turno"

### Exibicao de turnos (4 ficheiros):

Os locais que exibem o valor de `scheduled_shift` actualmente mostram o valor em bruto (ex: "14:34" ou "manha"). Criar uma funcao helper `formatShiftLabel` centralizada para capitalizar correctamente:

**Funcao helper** (em `src/utils/dateUtils.ts`):
```
export function formatShiftLabel(shift: string | null | undefined): string {
  if (!shift) return 'Sem turno';
  if (shift === 'manha') return 'Manha';
  if (shift === 'tarde') return 'Tarde';
  return shift; // fallback para dados antigos com horarios
}
```

**Ficheiros de exibicao a actualizar:**
- `src/pages/GeralPage.tsx` (linha 412-413): usar `formatShiftLabel`
- `src/pages/ServicosPage.tsx` (linha 209): substituir `service.scheduled_shift || 'Sem hora'` por `formatShiftLabel(service.scheduled_shift)`
- `src/pages/technician/TechnicianOfficePage.tsx` (linha 237): idem
- `src/components/agenda/AgendaDrawer.tsx` (linha 140-142): idem
- `src/components/agenda/WeeklyAgenda.tsx` (linha 31-33): actualizar funcao `formatShiftLabel` existente
- `src/components/services/ServiceDetailSheet.tsx` (linha 496-499): usar `formatShiftLabel`
- `src/components/modals/RescheduleServiceModal.tsx` (linha 154-156): usar `formatShiftLabel`
- `src/components/modals/AssignTechnicianModal.tsx` (linha 156): substituir `values.scheduled_shift || 'sem hora'` por label do turno

### Texto do onboarding:
- `src/components/onboarding/onboardingContent.ts` (linhas 98, 153, 207, 516): substituir referencias a "Hora" por "Turno" e remover mencoes a "Noite"

---

## Funcionalidade 4: Onboarding Interactivo com Demo Pratica

**Situacao actual:** O onboarding e informativo -- mostra tooltips com texto sobre cada seccao, mas nao obriga o utilizador a executar accoes reais. O pedido e transformar isto num tour interactivo onde o utilizador cria servicos demo, executa fluxos, etc.

**Complexidade:** Esta funcionalidade e a mais complexa e requer uma reestruturacao significativa do sistema de onboarding. Dada a dimensao, proponho implementar as 3 primeiras funcionalidades agora e tratar o onboarding interactivo como uma fase separada.

**Razoes:**
- O onboarding interactivo requer criacao de dados demo na BD (servicos, clientes, tecnicos fictivos)
- Requer logica de "modo demo" que intercepte accoes reais vs demo
- Requer re-arquitectura completa do `GuidedTour` para suportar accoes obrigatorias (clicar botoes, abrir modais, preencher formularios)
- Requer testes extensivos em cada nivel de acesso (dono, secretaria, tecnico)
- O risco de introduzir bugs nas funcionalidades existentes e alto se feito tudo de uma vez

**Proposta para o onboarding:** Implementar numa mensagem dedicada posterior, com plano proprio, apos as 3 funcionalidades acima estarem estaveis e testadas.

---

## Resumo de Ficheiros a Alterar

| Ficheiro | Alteracao |
|----------|-----------|
| `StateActionButtons.tsx` | Secretaria: editar detalhes + reatribuir |
| `CreateServiceModal.tsx` | Input time -> Select turno |
| `CreateInstallationModal.tsx` | Input time -> Select turno |
| `CreateDeliveryModal.tsx` | Input time -> Select turno |
| `AssignTechnicianModal.tsx` | Input time -> Select turno + label |
| `RescheduleServiceModal.tsx` | Input time -> Select turno + label |
| `ConvertBudgetModal.tsx` | Input time -> Select turno |
| `PartArrivedModal.tsx` | Input time -> Select turno |
| `CustomerDetailSheet.tsx` | Input time -> Select turno |
| `AssignDeliveryModal.tsx` | Input time -> Select turno |
| `dateUtils.ts` | Adicionar `formatShiftLabel` |
| `GeralPage.tsx` | Exibir turno formatado |
| `ServicosPage.tsx` | Exibir turno formatado |
| `TechnicianOfficePage.tsx` | Exibir turno formatado |
| `AgendaDrawer.tsx` | Exibir turno formatado |
| `WeeklyAgenda.tsx` | Actualizar formatShiftLabel |
| `ServiceDetailSheet.tsx` | Exibir turno formatado |
| `onboardingContent.ts` | Corrigir textos (Hora->Turno) |

## Secao Tecnica

- Nao ha migracao de BD necessaria (campo `scheduled_shift` e `text`)
- Dados existentes com horarios (ex: "14:34") continuam visiveis via fallback
- Novos registos gravam "manha" ou "tarde"
- O Select usa `<Select>` do Radix UI (ja importado nos modais)
- Permissoes de secretaria para editar detalhes nao requerem alteracao de RLS (o update de servicos ja permite `is_secretaria`)
