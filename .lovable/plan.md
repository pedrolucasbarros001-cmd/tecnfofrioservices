# Dashboard — saúde da empresa e equipa

## Objetivo
Acrescentar uma leitura clara da saúde do negócio ao dashboard atual, disponível para dono e secretaria, sem retirar os atalhos, o histórico de atividades ou qualquer função operacional. Não alterar impressões, criação de serviços, autenticação nem a página de Performance existente.

## 1. Adaptar as métricas aos dados reais
- **Recebido este mês:** soma dos pagamentos confirmados pela data do pagamento, com comparação com o mês anterior. Não apresentar o valor dos serviços como dinheiro recebido ou lucro.
- **Por precificar:** manter a regra atual de `pending_pricing` e preço zero; não classificar automaticamente garantias sem preço como não faturadas.
- **Orçamentos aceites:** percentagem de aprovados e convertidos entre os aprovados, convertidos e recusados criados nos últimos 30 dias; mostrar “Sem decisões” quando não houver base de cálculo.
- **Valor médio dos serviços:** média dos preços positivos dos serviços criados nos últimos 30 dias, identificando esse período claramente; não chamar a este valor lucro ou receita recebida.
- **Operação:** serviços abertos por estado e serviços criados esta semana, conservando as contagens independentes atuais.
- Não mostrar tempo médio de resolução: não existe uma data de conclusão fiável. Não inventar datas nem alterar os serviços antigos para obter esta métrica.

## 2. Organizar o dashboard
- Cabeçalho simples com botão de atualizar e indicação dos períodos usados.
- Resumo financeiro com quatro indicadores, sem alertas exagerados.
- Gráfico de pagamentos confirmados dos últimos seis meses, incluindo meses a zero e valores em euros.
- Distribuição dos serviços abertos por estado, usando os nomes atuais do sistema.
- Secção da equipa com técnicos ativos e inativos, incluindo quem não tem serviços; ordenação por nome, sem pódio ou competição.
- Para a equipa, apresentar serviços criados nos últimos 30 dias: total, atualmente reparados/concluídos, ainda em curso e valor dos serviços. Deixar explícito que a seleção é pela criação, não pela data de conclusão, e que o valor não mede qualidade nem pagamentos recebidos.
- Preservar todos os atalhos atuais e o histórico, organizados em secções próprias.
- Computador: gráficos lado a lado quando houver espaço. Telemóvel: sequência vertical, indicadores em duas colunas e tabela com deslocamento próprio, sem alargar a página.
- Carregamento com skeletons; falhas com mensagem discreta e opção de tentar novamente, nunca apresentadas como zeros reais.

## 3. Acesso e segurança
- Disponibilizar o endereço atual do dashboard a dono e secretaria; acrescentar o respetivo acesso no menu da secretaria sem mudar o seu ecrã inicial.
- Técnicos e monitores continuam sem acesso ao dashboard administrativo.
- Validar também as permissões no Supabase: não confiar apenas na ocultação da página.

## Detalhes técnicos
- Criar uma função agregadora própria, protegida por verificação do papel dono/secretaria, com `search_path` fixo e execução revogada para público/anónimo.
- Devolver apenas indicadores, séries mensais e totais por técnico; não enviar listas completas de serviços ao browser.
- Transferir as contagens atuais para a mesma resposta agregada, preservando exatamente as suas regras, incluindo o indicador de dívida atual.
- Usar React Query com cache de cinco minutos e atualização manual, sem novos canais Realtime nem consultas periódicas.
- Reutilizar Recharts e os componentes existentes, cores semânticas e modo claro. Não instalar dependências desnecessárias.
- Conter as alterações na página do dashboard, novos ficheiros de apoio, autorização da rota existente e entrada do menu da secretaria.

## Verificação
- Testar concretamente pagamentos pendentes excluídos, meses sem pagamentos, denominador zero, orçamentos convertidos e técnicos sem atividade.
- Verificar que as novas contagens coincidem com as atuais e que a função recusa chamadas sem acesso administrativo.
- Verificar carregamento, erro, atualização e disposição a 1280 e 428 px.
- A ligação externa ao Supabase limita testes com sessão real: não afirmar validação autenticada no ecrã se não houver uma sessão disponível. Não usar dados simulados como prova de funcionamento real.

## Fora deste trabalho
Aparelhos do cliente, GPS, modo offline, alterações à Performance existente e novas datas de conclusão ficam fora deste dashboard.