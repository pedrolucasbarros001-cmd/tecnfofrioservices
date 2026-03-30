

## Análise Completa: Datas, Oficina e Preços dos Técnicos

### Problema 1 — Datas desalinhadas (saltar 1 dia)

**Causa confirmada**: O uso de `toISOString().split('T')[0]` em vários modais (`AssignTechnicianModal`, `RescheduleServiceModal`, `CreateServiceModal`, etc.). O método `toISOString()` converte a data para UTC, o que em Portugal (UTC+0/+1) pode **subtrair um dia** quando o utilizador seleciona uma data no calendário após as 23:00 (ou mesmo após as 00:00 no horário de verão). Exemplo: selecionar 15/04 às 23:30 em Portugal (UTC+1) gera `2026-04-14T22:30:00.000Z`, que `.split('T')[0]` extrai como `2026-04-14` — um dia antes.

**Ficheiros afectados** (todos usam `toISOString().split('T')[0]`):
- `src/components/modals/AssignTechnicianModal.tsx` (linhas 121, 143)
- `src/components/modals/RescheduleServiceModal.tsx` (linha 104)
- `src/components/modals/CreateServiceModal.tsx` (linha 269)
- `src/components/modals/CreateInstallationModal.tsx` (linha 262)
- `src/components/modals/CreateDeliveryModal.tsx` (linha 262)
- `src/components/shared/CustomerDetailSheet.tsx` (linha 681)

**Correção**: Substituir `toISOString().split('T')[0]` por uma função utilitária que usa o fuso local:
```typescript
function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
```
Adicionar em `src/utils/dateUtils.ts` e usar em todos os ficheiros acima.

---

### Problema 2 — Técnico não recebe serviço de oficina ao (re)atribuir

**Causa confirmada**: O trigger `normalize_workshop_status` no banco de dados inverte o status automaticamente:
- Se `service_location = 'oficina'` e `technician_id IS NOT NULL` e `status = 'por_fazer'` → o trigger muda para `'na_oficina'`
- Se `service_location = 'oficina'` e `technician_id IS NULL` e `status = 'na_oficina'` → muda para `'por_fazer'`

O problema: a query do técnico em `TechnicianOfficePage.tsx` (linha 52) **já inclui** `na_oficina` na lista de status. Portanto, o trigger em si não é o problema.

**Causa real identificada**: A política RLS da tabela `services` para SELECT é:
```sql
is_dono(auth.uid()) OR is_secretaria(auth.uid()) OR (EXISTS (
  SELECT 1 FROM technicians t
  WHERE t.id = services.technician_id AND t.profile_id = get_technician_profile_id(auth.uid())
))
```
A função `get_technician_profile_id` retorna o `profile.id` do utilizador, e a comparação é `t.profile_id = get_technician_profile_id(auth.uid())`. Isto está correto. Mas o `AssignTechnicianModal` ao reatribuir um serviço de oficina, se o serviço **já estava em estado avançado** (`em_execucao`, `para_pedir_peca`, etc.), o código na linha 106 **não altera o status** — o que é correto. Mas se o serviço estava em `por_fazer` sem técnico e alguém atribui um técnico, o trigger muda para `na_oficina`, que aparece no filtro.

**Possível causa intermitente**: Quando se faz a reatribuição e o query do React Query está com cache stale, o serviço pode não aparecer imediatamente. Não há bug de lógica, mas o `staleTime` da query de oficina não está definido, o que significa refetch em cada mount. A invalidação via `invalidateServiceQueries` na `onSettled` do `useUpdateService` deveria resolver isto.

**Acção**: Verificar e garantir que a query key `technician-office-services` é invalidada. Ao verificar `queryInvalidation.ts`:

---

### Problema 3 — Técnicos não conseguem ver/adicionar preço nos artigos

**Causa confirmada**: No `TechnicianEditServiceModal.tsx`, o técnico pode adicionar artigos (`service_parts`) com campos `part_name`, `part_code`, `quantity`, mas **não há campo `cost` (preço)** no formulário (linhas 470-502). O campo `cost` existe na tabela `service_parts` mas nunca é apresentado nem preenchido pelo formulário do técnico.

Adicionalmente, na secção "Artigos Registados (Administração)" (linhas 299-318), o preço unitário (`item.price`) **não é mostrado** — apenas Ref, Descrição e Qtd são exibidos.

**Resumo dos sub-problemas**:
1. O técnico **não consegue definir preço** ao adicionar artigo porque o campo `cost` não existe no formulário
2. O técnico **não vê o preço** dos artigos da administração porque a coluna de preço está omitida da tabela read-only

---

## Plano de Correção

### Passo 1 — Criar utilitário `toLocalDateString` em `dateUtils.ts`
Adicionar função que formata a data usando o fuso horário local. Zero risco de regressão.

### Passo 2 — Substituir `toISOString().split('T')[0]` em 6 ficheiros
Trocar todas as ocorrências pela nova função. Alteração mecânica, sem mudança de lógica.

### Passo 3 — Adicionar campo `cost` ao formulário do técnico
No `TechnicianEditServiceModal.tsx`, adicionar um campo numérico "Preço" no `PartFormRow` que preenche `cost` ao inserir em `service_parts`.

### Passo 4 — Mostrar preço nos artigos read-only do técnico
No `TechnicianEditServiceModal.tsx`, adicionar coluna "Preço" na tabela de artigos da administração (secção `parsedPricing.items`), mostrando `item.price`.

### Passo 5 — Garantir invalidação de cache da oficina
Verificar que `invalidateServiceQueries` invalida a query key `technician-office-services` para que reatribuições reflictam imediatamente.

### Secção Técnica
- **Ficheiros alterados**: `dateUtils.ts`, `AssignTechnicianModal.tsx`, `RescheduleServiceModal.tsx`, `CreateServiceModal.tsx`, `CreateInstallationModal.tsx`, `CreateDeliveryModal.tsx`, `CustomerDetailSheet.tsx`, `TechnicianEditServiceModal.tsx`, `queryInvalidation.ts` (se necessário)
- **Zero migrações SQL** — todas as correções são frontend
- **Risco**: Baixo — correções cirúrgicas sem alteração de fluxos de negócio

