# Gerar orçamento (seguro) depois da assistência feita

A secretaria não consegue passar um serviço já realizado para orçamento de seguro. A causa está confirmada no código: a opção "Gerar Orçamento" no menu de ações do serviço só aparece em quatro situações (a precificar, por fazer, em execução, na oficina) e **apenas para o dono**. Depois da assistência concluída — ou para quem tem acesso de secretaria — a opção simplesmente não existe.

## O que vai mudar

1. **A secretaria passa a ver a opção "Gerar Orçamento"**, tal como o dono.
2. **A opção passa a existir também depois da assistência feita** — em serviços concluídos, finalizados e à espera de peça. Fica indisponível apenas em serviços cancelados e nos que já têm um orçamento pendente de aprovação.
3. **A opção fica acessível nos sítios onde estas pessoas trabalham**: lista Geral, Oficina, Serviços, páginas da secretaria (Precificar, Débito, Concluídos) e no painel de detalhe do serviço.
4. Ao gerar o orçamento, a janela já vem preenchida com o cliente, aparelho, marca, modelo, avaria e peças usadas, e há a caixa "Orçamento para seguro" que faz o documento sair como "Relatório / Orçamento".

## Cuidado importante (para não alterar o funcionamento actual)

Hoje, ao criar um orçamento a partir de um serviço, o serviço fica marcado como "aguarda aprovação de orçamento". Isso faz sentido num serviço em curso, mas num serviço **já concluído ou finalizado** iria fazê-lo reaparecer como pendente nos painéis e contagens.

Por isso: em serviços já concluídos/finalizados, o orçamento é criado e fica ligado ao serviço (histórico, ficha do cliente, impressão), mas **o estado do serviço não é alterado** — continua concluído/finalizado, sem entrar em nenhuma fila de pendentes. Em serviços ainda em curso, o comportamento mantém-se exactamente como hoje.

## Detalhes técnicos

- `src/components/services/StateActionButtons.tsx`: alargar a condição do item "Gerar Orçamento" para `(isDono || isSecretaria)` e para os estados `a_precificar`, `por_fazer`, `em_execucao`, `na_oficina`, `para_pedir_peca`, `em_espera_de_peca`, `concluidos`, `finalizado`; manter a exclusão de `cancelado` e de `awaiting_budget_approval === true`.
- `src/components/modals/CreateBudgetModal.tsx`: o `update({ awaiting_budget_approval: true })` passa a ser condicional — só quando `sourceService.status` não é `concluidos`, `finalizado` nem `cancelado`. Inserção do orçamento (incluindo `source_service_id` e `is_insurance_budget`) fica igual.
- Ligar `onCreateBudgetFromAdmin` + o `CreateBudgetModal` (estado `budgetService`, como já existe em `GeralPage.tsx`) em: `src/pages/OficinaPage.tsx`, `src/pages/ServicosPage.tsx`, `src/pages/secretary/SecretaryPrecificarPage.tsx`, `src/pages/secretary/SecretaryDebitoPage.tsx`, `src/pages/secretary/SecretaryConcluidosPage.tsx` e `src/components/services/ServiceDetailSheet.tsx`.
- Após sucesso, invalidar as chaves já usadas nessas páginas (`services-paginated`, `budgets`, `dashboard-stats`) para a lista reflectir de imediato.
- Sem alterações de base de dados, RLS ou permissões no servidor; a tabela `budgets` já aceita estes registos (121 orçamentos existentes, 60 ligados a serviços).
- Validação: type-check, lint, testes e build.
