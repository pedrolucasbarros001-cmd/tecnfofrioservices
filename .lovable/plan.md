
Objetivo: corrigir de forma segura os 4 blocos de problemas que a análise confirmou, sem mexer às cegas.

1. Datas desalinhadas
- Erro ainda não está 100% resolvido.
- A gravação principal já usa `toLocalDateString`, mas ainda há pontos com `type="date"` + `new Date(...)`/strings ISO e pelo menos um caso crítico em `AssignDeliveryModal` com `min={new Date().toISOString().split('T')[0]}`.
- Isso pode empurrar o dia para trás em UTC+0/+1 e causar diferenças entre data escolhida, data mostrada e data persistida.
- Plano:
  - centralizar utilitários de datas locais para `Date -> YYYY-MM-DD` e `YYYY-MM-DD -> Date local`;
  - substituir parsing solto nos modais de atribuição/reagendamento/continuação;
  - remover qualquer dependência de `toISOString().split('T')[0]` em inputs de data ligados a agenda/agendamento.

2. Técnicos não conseguem avançar etapas / concluir / editar
- Aqui há mais de uma causa real confirmada:
  - `VisitFlowModals` ainda não protege o fechamento entre trocas de modal como `WorkshopFlowModals`, `DeliveryFlowModals` e `InstallationFlowModals`; isso explica casos de “pisca/fecha”, travar etapa ou parecer que não avança.
  - vários `insert/update` dos fluxos técnicos não validam `error` devolvido pelo Supabase; em falha de RLS/permissão a UI pode seguir como se tivesse dado certo.
  - `TechnicianEditServiceModal` permite tentar apagar peças, mas a policy de `service_parts` só deixa o dono ou quem criou o registo apagar; então há falhas intermitentes conforme quem criou o artigo.
- Plano:
  - aplicar no fluxo de visita o mesmo transition guard robusto dos outros fluxos;
  - auditar todos os `supabase.from(...).insert/update/delete` dos fluxos técnicos para sempre capturar e lançar `error`;
  - alinhar UI e permissões para edição/remoção de peças, evitando prometer ao técnico uma ação que a policy hoje bloqueia.

3. Reatribuição na oficina às vezes não chega ao técnico
- A invalidação de cache está correta em `queryInvalidation.ts`, então não parece ser o núcleo do problema.
- O ponto mais provável é combinação de:
  - serviço reatribuído com estado/flow antigo guardado;
  - falhas silenciosas nas mutações do fluxo;
  - fechamento incorreto do modal/flow no lado do técnico;
  - uso inconsistente de status ao retomar após peça (`PartArrivedModal`) e ao assumir na oficina.
- Plano:
  - revisar a cadeia completa: `AssignTechnicianModal` → `TechnicianOfficePage` → `start_workshop_service` → `WorkshopFlowModals` → `PartArrivedModal`;
  - garantir que serviços de oficina reassumidos/reatribuídos sempre aterrizam num estado visível e abrível;
  - limpar/normalizar `flow_step` e persistência quando o contexto do serviço muda de técnico ou de fase.

4. Técnicos não conseguem ver/adicionar preços em artigos
- A tabela `service_parts` tem `cost` e RLS de SELECT/INSERT/UPDATE suficiente para técnicos com acesso ao serviço.
- Mas a UX ainda é inconsistente:
  - no modal de edição técnica houve evolução, porém a parte de remoção continua desalinhada com RLS;
  - nos fluxos técnicos existem artigos com preço em alguns pontos, mas falta padronização entre visita, oficina, continuação e edição posterior;
  - erros de gravação podem estar sendo engolidos, o que faz parecer que “o preço não ficou”.
- Plano:
  - padronizar entrada e exibição de preço em todos os pontos onde técnico adiciona artigo;
  - validar e normalizar `cost`/`unit_price` sempre como número local;
  - mostrar feedback específico quando a falha for de permissão, e não um erro genérico.

Implementação proposta
1. Revisar e unificar utilitários de data local.
2. Corrigir todos os pontos restantes de agenda/agendamento com parsing local consistente.
3. Aplicar o guard de transição no `VisitFlowModals`.
4. Tornar todas as mutações técnicas fail-fast: se Supabase devolver `error`, o fluxo para e mostra motivo real.
5. Revisar o fluxo de oficina/reatribuição/continuação para eliminar estados fantasmas.
6. Ajustar a experiência de artigos/preços para ficar coerente com as policies atuais.
7. Se necessário, propor uma segunda etapa de RLS apenas para peças, caso a regra de negócio seja “qualquer técnico do serviço pode editar/remover”.

Secção técnica
- Ficheiros mais prováveis:
  - `src/utils/dateUtils.ts`
  - `src/components/modals/AssignTechnicianModal.tsx`
  - `src/components/modals/RescheduleServiceModal.tsx`
  - `src/components/modals/AssignDeliveryModal.tsx`
  - `src/components/modals/PartArrivedModal.tsx`
  - `src/components/technician/VisitFlowModals.tsx`
  - `src/components/technician/WorkshopFlowModals.tsx`
  - `src/components/technician/TechnicianEditServiceModal.tsx`
  - `src/hooks/useFlowPersistence.ts`
- Possível necessidade de backend:
  - só se quiser que técnicos possam remover/editar qualquer artigo do serviço; hoje a policy de `service_parts` não garante isso.
- Risco:
  - baixo a médio, porque parte do problema é UX/estado local, mas a parte de permissões pode exigir ajuste fino para não abrir acesso demais.
