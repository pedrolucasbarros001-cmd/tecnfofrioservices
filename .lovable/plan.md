
# Correcoes e Melhorias — 11 Problemas Identificados

## Resumo dos Problemas e Solucoes

### 1. Modal de Editar Cliente abre vazio (nao pre-preenche dados)

**Causa**: O `CreateCustomerModal` usa `defaultValues` no `useForm`, que so sao aplicados na primeira renderizacao. Quando o `customer` muda (ao abrir para editar), o formulario nao e reinicializado.

**Solucao**: Adicionar `useEffect` que chama `form.reset()` com os dados do cliente quando `open` muda para `true` e `customer` existe.

**Ficheiro**: `src/components/modals/CreateCustomerModal.tsx`

---

### 2. Morada nao editavel ao criar servico com cliente associado

**Causa**: Na `CreateServiceModal`, os campos de morada ficam `disabled={!!selectedCustomer}`. Se o cliente nao tem morada preenchida, o utilizador nao consegue preencher manualmente.

**Solucao**: Permitir edicao dos campos de morada (`customer_address`, `customer_postal_code`, `customer_city`) mesmo quando o cliente esta associado. Apenas desactivar os campos de identificacao (nome, telefone, NIF, email).

**Ficheiro**: `src/components/modals/CreateServiceModal.tsx`

---

### 3. ConvertBudgetModal — Local do Servico condicional + morada para entrega/instalacao

**Causa**: O radio de "Local do Servico" (Cliente vs Oficina) aparece sempre, mas so faz sentido para reparacao. Para instalacao e entrega, o servico e sempre no cliente e precisa de morada.

**Solucao**: 
- Se `serviceType === 'reparacao'`: mostrar radio Cliente/Oficina (comportamento actual)
- Se `serviceType === 'instalacao'` ou `'entrega'`: esconder radio, definir `serviceLocation = 'cliente'` automaticamente, e mostrar campos de Morada + Codigo Postal
- Guardar `service_address` e `service_postal_code` no INSERT do servico

**Ficheiro**: `src/components/modals/ConvertBudgetModal.tsx`

---

### 4. Substituir dropdown de Turno por input de Hora em todos os modais

**Causa**: O utilizador quer especificar hora exacta em vez de "Manha/Tarde/Noite".

**Solucao**: 
- Substituir todos os `Select` de turno (`manha/tarde/noite`) por um `<Input type="time" />` que guarda a hora no formato `HH:MM`
- O campo `scheduled_shift` na base de dados passa a guardar valores como `"10:00"`, `"14:30"` em vez de `"manha"`, `"tarde"`
- A ordenacao cronologica nos tecnicos ja funciona naturalmente: ordenar por `scheduled_shift ASC` coloca `"08:00"` antes de `"14:00"`
- Actualizar labels de "Turno" para "Hora" em toda a interface

**Ficheiros afectados**:
- `src/components/modals/CreateServiceModal.tsx` — substituir Select por Input time
- `src/components/modals/AssignTechnicianModal.tsx` — substituir RadioGroup por Input time
- `src/components/modals/RescheduleServiceModal.tsx` — substituir RadioGroup por Input time
- `src/components/modals/ConvertBudgetModal.tsx` — substituir Select por Input time
- `src/components/modals/PartArrivedModal.tsx` — se tiver turno, substituir
- `src/pages/technician/TechnicianOfficePage.tsx` — mostrar hora em vez de turno
- `src/pages/OficinaPage.tsx` — mostrar hora se existir
- `src/components/agenda/WeeklyAgenda.tsx` — ordenar por hora e mostrar hora
- `src/pages/GeralPage.tsx` / `src/pages/ServicosPage.tsx` — mostrar hora na coluna "Data + Turno"

Nota: O schema Zod em cada modal muda de `z.enum(['manha', 'tarde', 'noite'])` para `z.string().regex(/^\d{2}:\d{2}$/)` ou semelhante.

---

### 5. Erro "Erro ao concluir visita" — Assinatura de recolha nao persiste

**Causa**: Na `VisitFlowModals`, ao escolher "Levantar para Oficina" e assinar, o `handleSignatureComplete` tenta fazer update com `technician_id: null` e `status: 'por_fazer'`. O problema pode ser que o update falha silenciosamente (RLS ou tipo de dados) e o toast generico "Erro ao concluir visita" nao mostra o erro real.

**Solucao**: 
- Substituir `toast.error('Erro ao concluir visita')` por `toast.error(humanizeError(error))` para mostrar o erro real
- Verificar que o `updateService.mutateAsync` recebe os campos correctos
- Garantir que `scheduled_date` e `scheduled_shift` sao passados como `null` (string null, nao undefined)

**Ficheiro**: `src/components/technician/VisitFlowModals.tsx` (linha 347)

---

### 6. Pecas usadas — "Sim" selecionado mas continua sem registar pecas

**Causa**: Na `VisitFlowModals` (pecas_usadas step), a validacao em `handlePecasUsadasConfirm` verifica `hasValidPart` mas o botao "Continuar" nao esta desactivado visualmente. Na `WorkshopFlowModals`, o botao "Continuar" no step `pecas_usadas` nao tem validacao nenhuma — avanca directamente para `pedir_peca` sem verificar se pecas foram registadas.

**Solucao**:
- `VisitFlowModals`: desactivar botao "Continuar" quando `usedParts === true` e nenhuma peca com nome valido existe
- `WorkshopFlowModals`: adicionar a mesma validacao — se `usedParts === true`, verificar que `usedPartsList` tem pelo menos uma entrada com nome, e desactivar botao se nao tiver

**Ficheiros**: `src/components/technician/VisitFlowModals.tsx`, `src/components/technician/WorkshopFlowModals.tsx`

---

### 7. Fotos obrigatorias na oficina para servicos sem diagnostico anterior

**Causa**: Na `WorkshopFlowModals`, o step de diagnostico tem foto como "Opcional" sempre. Para servicos criados directamente na oficina (sem diagnostico anterior de visita), deveria exigir foto obrigatoria, assim como na visita.

**Solucao**: 
- Se `!hasPreviousHistory` (servico novo na oficina, sem `detected_fault`), adicionar um step de foto obrigatoria entre `iniciar` e `diagnostico`
- Se `hasPreviousHistory`, manter foto opcional no diagnostico (comportamento actual)

**Ficheiro**: `src/components/technician/WorkshopFlowModals.tsx`

---

### 8. Scroll e botoes nos modais do tecnico em telemovel

**Causa**: Os modais do tecnico (camera, fluxos) usam `max-h-[90vh] overflow-y-auto` mas em telemoveis pequenos os botoes ficam cortados ou o scroll nao funciona bem.

**Solucao**: 
- Nos modais de fluxo do tecnico, usar `max-h-[85vh]` e garantir que `DialogFooter` fica fixo no fundo com `sticky bottom-0 bg-background pt-2`
- No `CameraCapture`, reduzir a altura do preview em mobile: `aspect-[4/3] sm:aspect-[4/3]` com `max-h-[50vh]`

**Ficheiros**: `src/components/technician/VisitFlowModals.tsx`, `src/components/technician/WorkshopFlowModals.tsx`, `src/components/shared/CameraCapture.tsx`

---

### 9. PDF da etiqueta censura dados / nao mostra conteudo

**Causa**: O `html2pdf.js` ao clonar o elemento pode nao resolver correctamente as classes Tailwind como `text-foreground` e `text-muted-foreground` porque no clone offscreen as CSS custom properties (`--foreground`) podem nao estar disponiveis. Resultado: texto fica transparente/invisivel.

**Solucao**: 
- No `generatePDF` em `pdfUtils.ts`, apos clonar o elemento, forcar `color: #000` em todos os elementos de texto do clone
- Ou na `ServiceTagModal`, usar cores directas (`text-black`, `text-gray-500`) em vez de CSS variables para o conteudo imprimivel

**Ficheiros**: `src/utils/pdfUtils.ts` ou `src/components/modals/ServiceTagModal.tsx`

---

### 10. Servico forcado para oficina nao aparece na pagina Oficina

**Causa**: A `OficinaPage` usa `useServices({ location: 'oficina' })` que filtra por `service_location = 'oficina'`. O `ForceStateModal` so altera o `status` (ex: para `na_oficina`) mas nao altera o `service_location`. Resultado: o servico tem `status = 'na_oficina'` mas `service_location = 'cliente'`, entao nao aparece.

**Solucao**: No `ForceStateModal`, quando o novo estado e `na_oficina` ou `por_fazer` e o utilizador quer mover para oficina, tambem actualizar `service_location = 'oficina'`. Alternativa mais simples: adicionar logica na `ForceStateModal` para perguntar se quer tambem mudar a localizacao, ou automaticamente definir `service_location = 'oficina'` quando o status e `na_oficina`.

**Ficheiro**: `src/components/modals/ForceStateModal.tsx`

---

### 11. Email no CreateBudgetModal (ja implementado, verificar alinhamento)

O campo de email ja foi adicionado ao `CreateBudgetModal` na iteracao anterior. Verificar que esta alinhado com o schema do banco de dados e que auto-preenche correctamente.

**Ficheiro**: `src/components/modals/CreateBudgetModal.tsx` — verificacao apenas

---

## Detalhe Tecnico — Substituicao de Turno por Hora

A mudanca mais transversal e a substituicao do dropdown de turno por input de hora. O campo `scheduled_shift` no banco de dados e do tipo `text`, portanto aceita qualquer valor string. A migracao e transparente:

```text
Antes: "manha" | "tarde" | "noite"
Depois: "08:00" | "10:30" | "14:00" | etc.
```

Para retrocompatibilidade, ao exibir dados antigos que contenham "manha"/"tarde"/"noite", converter para label legivel. Na ordenacao, valores como "manha" ficariam antes de qualquer hora numerica, o que e aceitavel para dados historicos.

O input time em cada modal:
```text
<Input type="time" value={field.value} onChange={...} />
```

---

## Ordem de Implementacao

1. `CreateCustomerModal` — fix pre-preenchimento ao editar
2. `CreateServiceModal` — permitir morada editavel com cliente associado
3. `ConvertBudgetModal` — local condicional + morada para instalacao/entrega
4. Substituir turno por hora em todos os modais (CreateServiceModal, AssignTechnicianModal, RescheduleServiceModal, ConvertBudgetModal, PartArrivedModal)
5. `VisitFlowModals` — fix erro assinatura + validacao pecas obrigatorias
6. `WorkshopFlowModals` — validacao pecas + foto obrigatoria para novos servicos
7. `ForceStateModal` — actualizar service_location junto com status
8. `ServiceTagModal` / `pdfUtils` — fix cores no PDF
9. Modais de tecnico — melhorar scroll mobile
10. Actualizar paginas de listagem para mostrar hora em vez de turno
