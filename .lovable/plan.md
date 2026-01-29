
Objetivo
- Implementar a regra de coexistência/normalização de estados para SERVIÇOS DA OFICINA:
  - “por_fazer” (na oficina) só pode existir quando NÃO há técnico atribuído (technician_id = null) → serviço “para assumir/atribuir”.
  - Quando há técnico atribuído (technician_id != null) e o serviço está na oficina, ele deve ser “na_oficina” (aguarda início).
  - Ao técnico clicar “Começar”, o status vira “em_execucao”, mas o serviço continua “na oficina” porque isso é definido por service_location = 'oficina'.
  - Estados “para_pedir_peca” e “em_espera_de_peca” continuam coexistindo com “estar na oficina” via service_location (não mudamos location nesses estados).

Diagnóstico (por que está acontecendo hoje)
- Existe um bug claro no fluxo de atribuição: `src/components/modals/AssignTechnicianModal.tsx` sempre faz update com `status: 'por_fazer'` (linha ~93 do arquivo).
  - Isso “joga para trás” serviços da oficina para “por_fazer” mesmo após terem técnico atribuído.
  - Resultado: em telas/cards que esperam “na_oficina” para “serviços na oficina”, o serviço “some” (porque está como por_fazer).
- Além disso, os modais de criação de serviço na oficina hoje setam `status: 'na_oficina'` mesmo sem técnico (isso conflita com sua nova regra). Exemplos:
  - `src/components/modals/CreateServiceModal.tsx`
  - `src/components/shared/CustomerDetailSheet.tsx`

Estratégia de correção (garantir que não some nunca)
Vou aplicar a correção em 2 camadas (defensivo):
1) Banco de dados (garantia forte): normalizar status automaticamente para evitar inconsistências futuras, mesmo se algum ponto do frontend “errar”.
2) Frontend (origem do erro): corrigir os pontos que estão gravando status errado (atribuição e criação), para que o app já gere dados consistentes.

A) Correção no Banco (migração SQL)
A1. Backfill (corrigir registros já existentes)
- Atualizar serviços inconsistentes já gravados:
  - Se service_location='oficina' AND technician_id IS NOT NULL AND status='por_fazer' → status='na_oficina'
  - Se service_location='oficina' AND technician_id IS NULL AND status='na_oficina' → status='por_fazer'
Isso resolve imediatamente o caso do serviço “na oficina” que está “por_fazer” com técnico atribuído.

A2. Trigger de normalização (impede regressões)
- Criar uma função trigger (plpgsql) que roda BEFORE INSERT/UPDATE em `public.services`:
  - Se NEW.service_location = 'oficina':
    - Se NEW.technician_id IS NULL e NEW.status = 'na_oficina' → NEW.status := 'por_fazer'
    - Se NEW.technician_id IS NOT NULL e NEW.status = 'por_fazer' → NEW.status := 'na_oficina'
  - Caso contrário, não mexe (não afeta serviços em “cliente”, nem mexe em “em_execucao/para_pedir_peca/em_espera_de_peca/concluidos/a_precificar/finalizado”).
- Benefício: mesmo que alguém force status errado via UI (ou ForceStateModal), o banco garante o mínimo da regra para oficina.

B) Correção no Frontend (onde o status errado nasce)
B1. AssignTechnicianModal (principal bug)
Arquivo: `src/components/modals/AssignTechnicianModal.tsx`
- Alterar a lógica de update para NÃO setar sempre `status: 'por_fazer'`.
- Regra:
  - Se `service.service_location === 'oficina'`:
    - Se o serviço estiver em `por_fazer` (ou “estado inicial”) e está sendo atribuído a um técnico → setar `status: 'na_oficina'`.
    - Se o serviço já estiver em `em_execucao/para_pedir_peca/em_espera_de_peca/concluidos/...` → NÃO alterar status (evita “voltar atrás”).
  - Se `service.service_location !== 'oficina'`:
    - Não alterar status (deixa como está), para não quebrar a lógica de visitas/instalações que podem estar `por_fazer` mesmo com técnico.
- Resultado: atribuir/reatribuir deixa de “resetar” o serviço para por_fazer e, na oficina, ele passa a ficar como “na_oficina”.

B2. CreateServiceModal e CreateServiceFromCustomerModal (criação coerente com sua regra)
Arquivos:
- `src/components/modals/CreateServiceModal.tsx`
- `src/components/shared/CustomerDetailSheet.tsx` (modal de criar serviço a partir do cliente)
- Ajustar status na criação:
  - Se `service_location === 'oficina'`:
    - Se `technician_id` foi escolhido → `status = 'na_oficina'`
    - Se `technician_id` NÃO foi escolhido → `status = 'por_fazer'` (disponível/para assumir)
  - Se `service_location === 'cliente'` → `status = 'por_fazer'` (como já é o padrão)
- Isso impede que serviços “sem técnico” já nasçam como “na_oficina”.

C) Camada de UX (opcional, mas recomendado para clareza e para “não sumir” visualmente)
Mesmo com banco + frontend corrigidos, posso adicionar uma regra visual defensiva para telas de oficina:
- Em páginas que exibem serviços da oficina, caso chegue algum dado “inconsistente” (ex.: status por_fazer + technician_id preenchido), renderizar o badge como “Na Oficina” e/ou agrupar como “Na Oficina” (fallback).
Isso garante que, mesmo durante a transição/migração, o usuário não veja o serviço “sumindo”.
Arquivos candidatos:
- `src/pages/OficinaPage.tsx`
- `src/pages/TVMonitorPage.tsx` (se quiser manter alinhado, mesmo você não focando nele agora)
- `src/pages/technician/TechnicianOfficePage.tsx` (principalmente a label/badge)

D) Testes ponta-a-ponta (cenários que vamos validar)
1. Criar serviço na oficina SEM técnico
- Deve aparecer como “por_fazer” (para assumir) nas listas pertinentes.
2. Atribuir técnico a um serviço da oficina que estava “por_fazer”
- Deve virar “na_oficina” automaticamente (sem sumir).
3. Reatribuir técnico em serviço da oficina que já estava “em_execucao” ou “para_pedir_peca”
- Não pode voltar para “por_fazer”.
4. Técnico clicar “Começar”
- Status vira “em_execucao”, mas service_location continua “oficina” e o serviço continua aparecendo na página de oficina (coexistência por location).
5. Fluxo de peça:
- `em_execucao → para_pedir_peca → em_espera_de_peca → (volta ao anterior)` mantendo service_location='oficina' o tempo todo.

Entregáveis (o que será alterado)
- Migração SQL nova em `supabase/migrations/`:
  - backfill + trigger de normalização
- Frontend:
  - `src/components/modals/AssignTechnicianModal.tsx` (não resetar status; normalizar oficina)
  - `src/components/modals/CreateServiceModal.tsx` (status inicial depende de técnico na oficina)
  - `src/components/shared/CustomerDetailSheet.tsx` (mesma regra de criação)
- (Opcional) fallback visual para evitar “sumir” em telas de oficina/monitor.

Risco/Impacto
- Impacto é localizado em serviços com `service_location='oficina'`.
- Não altera a lógica financeira (`pending_pricing`, “em débito” calculado) nem mexe em serviços no cliente.
- A trigger impede regressões e garante consistência mesmo se alguém alterar status manualmente.

Sequência de implementação
1) Criar e aplicar migração SQL (backfill + trigger)
2) Ajustar AssignTechnicianModal
3) Ajustar CreateServiceModal + CustomerDetailSheet
4) (Opcional) Adicionar fallback visual em páginas de oficina
5) Testar os 5 cenários ponta-a-ponta

Observação importante
- Não vou mexer em `src/integrations/supabase/types.ts` (esse arquivo não deve ser editado manualmente). A correção será feita via migrações + componentes/hooks do app.
