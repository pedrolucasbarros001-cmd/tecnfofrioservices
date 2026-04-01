

## Plano: Corrigir datas, navegação fluida e atualizações instantâneas

### Problema 1 — Datas recuam um dia (RAIZ DO BUG)

A gravação já usa `toLocalDateString(date)` correctamente. Mas a **leitura** continua quebrada: quando o sistema lê `scheduled_date` do banco (string `"2026-04-01"`) e a converte de volta para `Date`, usa `new Date("2026-04-01")` — que o JavaScript interpreta como **UTC meia-noite**. Em Portugal (UTC+0/+1), isso pode mostrar **31 de março** no calendário do formulário.

Isto acontece em pelo menos 4 ficheiros críticos:
- `AssignTechnicianModal.tsx` (linhas 81, 91)
- `RescheduleServiceModal.tsx` (linhas 86)
- `PartArrivedModal.tsx` (ao preencher a data de reagendamento)
- Displays em `GeralPage.tsx`, `CustomerDetailSheet.tsx`, `ServicePrintModal.tsx`

**Correção**: Adicionar `parseLocalDate(dateStr)` a `dateUtils.ts` que faz `new Date(year, month-1, day)` — forçando fuso local. Substituir todos os `new Date(service.scheduled_date)` por `parseLocalDate(...)`.

### Problema 2 — Navegação lenta da secretária

Os painéis da secretária (`GeralPage`, `OficinaPage`, `SecretaryConcluidosPage`, `SecretaryDebitoPage`, `SecretaryPrecificarPage`) não têm realtime e dependem apenas de `refetchOnWindowFocus`. Ao navegar entre eles, os dados ficam stale durante 2 minutos (`staleTime: 120s`).

**Correção**: Reduzir `staleTime` para 30s no `queryClient` global e adicionar `useRealtime('services', ...)` nos painéis principais da secretária para que as mudanças feitas por técnicos/admin apareçam instantaneamente sem precisar trocar de aba.

### Problema 3 — Atualizações não instantâneas

Após mutações (atribuir técnico, reagendar, registar pagamento), o utilizador precisa refrescar ou mudar de aba. O `invalidateServiceQueries` já existe mas algumas mutações não o chamam, e o `staleTime` de 2 min impede refetch imediato.

**Correção**: Garantir que `invalidateServiceQueries` é chamado após cada mutação relevante nos modais. A redução do `staleTime` resolve o resto.

---

### Ficheiros a alterar

1. **`src/utils/dateUtils.ts`** — Adicionar `parseLocalDate(dateStr: string): Date`
2. **`src/components/modals/AssignTechnicianModal.tsx`** — Usar `parseLocalDate` em vez de `new Date(scheduled_date)`
3. **`src/components/modals/RescheduleServiceModal.tsx`** — Idem
4. **`src/components/modals/PartArrivedModal.tsx`** — Idem
5. **`src/lib/queryClient.ts`** — Reduzir `staleTime` para 30s
6. **`src/pages/GeralPage.tsx`** — Adicionar `useRealtime('services')`; usar `parseLocalDate` nos displays
7. **`src/pages/OficinaPage.tsx`** — Adicionar `useRealtime('services')`
8. **`src/pages/secretary/SecretaryConcluidosPage.tsx`** — Adicionar `useRealtime('services')`
9. **`src/pages/secretary/SecretaryDebitoPage.tsx`** — Adicionar `useRealtime('services')`
10. **`src/pages/secretary/SecretaryPrecificarPage.tsx`** — Adicionar `useRealtime('services')`

### Secção técnica

```typescript
// Nova função em dateUtils.ts
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d); // local timezone, not UTC
}
```

O bug de data é que `new Date("2026-04-01")` = UTC midnight = 31 março 23h em Portugal. `parseLocalDate` elimina isso completamente.

