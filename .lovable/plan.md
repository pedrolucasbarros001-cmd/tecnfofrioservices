
Objetivo: corrigir o bug da data como “data pura” (sem depender de UTC/fuso) e fechar os pontos restantes onde a app ainda trata datas de agendamento como `DateTime`, além de consolidar a fluidez/atualização dos painéis.

### O que encontrei
A base do problema não é “hora”, é o sistema ainda misturar dois modelos:
- modelo certo: `scheduled_date` e `delivery_date` como data pura (`YYYY-MM-DD`)
- modelo errado: converter essas strings com `new Date(...)` / `parseISO(...)`, o que reintroduz interpretação temporal

Já existe uma correção parcial com:
- `toLocalDateString(date)`
- `parseLocalDate(dateStr)`

Mas ainda há pontos importantes onde a data continua a ser tratada como instante temporal, e isso pode puxar para o dia anterior.

### Causas restantes do bug
1. `WeeklyAgenda.tsx`
- usa `parseISO(service.scheduled_date)` para comparar dias
- agenda mensal/semanal ainda está vulnerável a deslocamento de data

2. `ServicosPage.tsx`
- usa `isSameDay(parseISO(service.scheduled_date), currentDate)`
- a navegação diária dos técnicos ainda pode filtrar no dia errado

3. `ServiceDetailSheet.tsx`
- o helper `safeFormat()` faz `new Date(date)` para strings
- o bloco “Agendamento” ainda mostra `scheduled_date` por esse caminho genérico

4. `PartArrivalIndicator.tsx`
- faz `new Date(estimatedArrival)`
- previsão de chegada também é data pura e deve seguir a mesma regra

5. `AssignDeliveryModal.tsx`
- o toast usa `format(new Date(deliveryDate), ...)`
- mesmo se a gravação estiver certa, o feedback visual ainda pode mostrar o dia errado

6. `PerformancePage.tsx`
- usa `parseLocalDate(...).toLocaleDateString('pt-PT')`
- funciona melhor que UTC, mas ainda depende de formatação do runtime; é melhor centralizar numa função única de data pura

### Navegação fluida / atualizações instantâneas
O estado atual já melhorou bastante:
- `queryClient` global já está com `staleTime: 30s`
- páginas principais da secretária já têm `useRealtime('services')`

Mas ainda faltam dois refinamentos:
1. `GeralPage` tem queries auxiliares:
- `agenda-services`
- `all-pending-parts`
Essas queries não estão explicitamente cobertas pelo `useRealtime` atual da página e precisam invalidar sempre que houver mudanças em `services` e `service_parts`.

2. `useRealtime()` invalida só quando encontra queries não invalidadas (`hasNonStale`)
- essa proteção pode acabar a suprimir refresh em alguns estados
- para dados operacionais, é melhor simplificar e invalidar diretamente as chaves relevantes ao receber evento

### Plano de implementação
1. Fortalecer o utilitário de “data pura”
- manter `parseLocalDate`
- adicionar helpers explícitos para o domínio:
  - `isSameLocalDateString(dateStr, date)`
  - `formatLocalDate(dateStr, pattern, options?)`
- regra: datas de agendamento/entrega/previsão nunca passam por `new Date("YYYY-MM-DD")`

2. Corrigir todos os pontos restantes de leitura de data pura
- `src/components/agenda/WeeklyAgenda.tsx`
- `src/pages/ServicosPage.tsx`
- `src/components/services/ServiceDetailSheet.tsx`
- `src/components/shared/PartArrivalIndicator.tsx`
- `src/components/modals/AssignDeliveryModal.tsx`
- `src/pages/PerformancePage.tsx`

3. Padronizar exibição
- trocar helpers genéricos que fazem `new Date(string)` quando a origem for `scheduled_date`, `delivery_date`, `estimated_arrival`
- usar apenas os novos utilitários de data pura nos locais de calendário/listagem/detalhe/toast

4. Consolidar atualização instantânea
- em `GeralPage`, garantir invalidação/realtime também para:
  - `['agenda-services']`
  - `['all-pending-parts']`
- avaliar ajuste em `useRealtime()` para invalidar sem a guarda `hasNonStale`, deixando o comportamento mais previsível

5. Revisão final de navegação
- verificar todos os painéis operacionais:
  - Geral
  - Oficina
  - Concluídos
  - Débito
  - Precificar
  - agenda/tarefas dos técnicos
- objetivo: ao mudar um serviço, o reflexo aparecer sem refresh manual e sem depender de trocar de aba

### Ficheiros a alterar
- `src/utils/dateUtils.ts`
- `src/components/agenda/WeeklyAgenda.tsx`
- `src/pages/ServicosPage.tsx`
- `src/components/services/ServiceDetailSheet.tsx`
- `src/components/shared/PartArrivalIndicator.tsx`
- `src/components/modals/AssignDeliveryModal.tsx`
- `src/pages/PerformancePage.tsx`
- `src/pages/GeralPage.tsx`
- `src/hooks/useRealtime.ts`

### Resultado esperado
- `scheduled_date`, `delivery_date` e `estimated_arrival` passam a ser tratadas como “dia civil” puro
- nenhuma dessas datas pode voltar ao dia anterior
- manhã/tarde continua separado da data, sem qualquer mistura com hora
- painéis da secretária e fluxos operacionais ficam mais imediatos e consistentes

### Secção técnica
Regra de ouro:
```ts
// Errado para data pura
new Date("2026-04-01")
parseISO("2026-04-01")

// Certo para data pura
parseLocalDate("2026-04-01")
```

A correção definitiva não é “ajustar fuso”; é impedir que a aplicação trate `YYYY-MM-DD` como timestamp em qualquer ponto do fluxo.
