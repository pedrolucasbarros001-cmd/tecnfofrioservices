
# Onboarding Completo Baseado em Navegacao Real

## Resumo

Criar um onboarding modal central premium com screenshots reais capturados por navegacao automatizada do sistema, cobrindo TODAS as paginas, sidebars, botoes, modais e interaccoes para cada nivel de acesso (Dono, Secretaria, Tecnico). Sem tour automatico nesta fase.

## Abordagem

1. Navegar pelo sistema com browser automatizado para cada role
2. Capturar screenshots reais de cada pagina e interaccao
3. Guardar screenshots em `public/onboarding/{role}/`
4. Expandir `onboardingContent.ts` com 20-25 passos por role, cada um com screenshot real e texto didactico detalhado
5. Refactorizar `OnboardingModal.tsx` para mostrar screenshots reais num card central com texto abaixo

## Estrutura do Modal

```text
+------------------------------------------+
|  [X]                                      |
|                                           |
|  +--------------------------------------+ |
|  |                                      | |
|  |        SCREENSHOT REAL               | |
|  |        (aspect-ratio 16:9)           | |
|  |                                      | |
|  +--------------------------------------+ |
|                                           |
|  Titulo do Passo                          |
|  Descricao principal detalhada            |
|                                           |
|  * Bullet point explicativo 1             |
|  * Bullet point explicativo 2             |
|  * Bullet point explicativo 3             |
|                                           |
|  [ o o o O o o o ]  4/20                  |
|                                           |
|  [Saltar guia]           [Proximo ->]     |
+------------------------------------------+
```

---

## CONTEUDO COMPLETO POR ROLE

### DONO (22 passos)

**1. Boas-vindas**
- Screenshot: Logo TECNOFRIO (sem screenshot externo, usa logo interna)
- Texto: "Bem-vindo ao TECNOFRIO. Este e o seu centro de controlo. Aqui gere toda a operacao -- servicos, tecnicos, financas e equipas. Vamos mostrar-lhe tudo o que precisa saber."

**2. Sidebar -- Navegacao Principal**
- Screenshot: Sidebar expandida com todos os 8 itens de menu (Dashboard, Geral, Oficina, Clientes, Orcamentos, Performance, Colaboradores, Preferencias)
- Texto: "A barra lateral e a sua bussola. Cada seccao tem uma funcao especifica."
- Detalhes:
  - Dashboard: visao geral com contadores de estado
  - Geral: gestao completa de todos os servicos
  - Oficina: servicos fisicamente na oficina
  - Clientes: base de dados de clientes
  - Orcamentos: propostas e conversoes
  - Performance: carga de trabalho por tecnico
  - Colaboradores: gerir equipa e acessos
  - Preferencias: tema, notificacoes, senha e guia

**3. Dashboard -- Contadores de Estado**
- Screenshot: Dashboard com grid de 10 cards coloridos (Aberto, Em Execucao, Oficina, Pedir Peca, Espera de Peca, Oficina Reparados, Precificar, Em Debito, Concluidos, Orcamentos)
- Texto: "O Dashboard mostra o estado de toda a operacao num relance. Cada card e um contador que se actualiza em tempo real."
- Detalhes:
  - Cards com contagem > 0 ficam destacados (mais claros)
  - Cards vazios ficam discretos (mais escuros)
  - Clicar num card leva directamente para a lista filtrada
  - Historico de actividades recentes aparece abaixo

**4. Dashboard -- Historico de Actividades**
- Screenshot: Seccao inferior do Dashboard com lista de actividades (hora + descricao + tempo relativo)
- Texto: "Abaixo dos contadores, o historico mostra tudo o que aconteceu recentemente: servicos criados, tecnicos atribuidos, pecas pedidas e pagamentos registados."

**5. Pagina Geral -- Visao Completa**
- Screenshot: Pagina Geral com header, botao "Novo Servico", barra de pesquisa, agenda semanal e tabela de servicos
- Texto: "A pagina Geral e onde tudo acontece. Aqui ve, pesquisa, filtra e gere todos os servicos do sistema."
- Detalhes:
  - Botao "Novo Servico" no canto superior direito
  - Barra de pesquisa por codigo, cliente ou equipamento
  - Agenda semanal dinamica (quando sem filtro activo)
  - Tabela com Tipo, Codigo, Cliente, Descricao, Estado, Tags, Tecnico, Data + Turno e Accoes

**6. Agenda Semanal/Mensal**
- Screenshot: WeeklyAgenda expandida mostrando dias da semana com bolhas de servicos por tecnico
- Texto: "A agenda mostra quantos servicos existem por dia e por tecnico, com codigos de cores."
- Detalhes:
  - Pode alternar entre vista Semanal e Mensal
  - Cada dia mostra bolhas coloridas por tecnico
  - Clicar num dia abre o drawer lateral com a lista detalhada
  - Navegar entre semanas/meses com as setas

**7. Criar Servico -- Dropdown**
- Screenshot: Botao "Novo Servico" com dropdown aberto mostrando 3 opcoes (Nova Reparacao, Nova Instalacao, Nova Entrega Directa)
- Texto: "Clique em 'Novo Servico' para escolher o tipo. O tipo escolhido define todo o fluxo do servico."
- Detalhes:
  - Nova Reparacao: o tecnico diagnostica e repara
  - Nova Instalacao: montagem de equipamento novo
  - Nova Entrega Directa: levar equipamento ao cliente

**8. Criar Reparacao -- Modal**
- Screenshot: Modal CreateServiceModal com campos (Cliente, Equipamento, Marca, Modelo, Avaria, Urgente, Garantia, Tipo de servico: Visita/Oficina)
- Texto: "Ao criar uma reparacao, preencha os dados do cliente e do equipamento. Escolha se o tecnico vai ao cliente (Visita) ou se o aparelho ja esta na oficina."
- Detalhes:
  - Campo Cliente com autocomplete
  - Botao para criar cliente novo inline
  - Checkbox "Urgente" marca servico como prioritario
  - Checkbox "Garantia" marca servico sem cobranca
  - A escolha Visita vs Oficina define o fluxo do tecnico

**9. Tabela de Servicos -- Colunas e Badges**
- Screenshot: Tabela com servicos mostrando badges de tipo (REPARACAO, INSTALACAO, ENTREGA), estado, tags (Urgente, Garantia, A Precificar, Em Debito)
- Texto: "Cada linha da tabela mostra toda a informacao essencial do servico."
- Detalhes:
  - Badge de Tipo: azul para visita, roxo para oficina, amarelo para instalacao, verde para entrega
  - Badge de Estado: cor distinta para cada fase do fluxo
  - Tags coexistentes: um servico pode ser Urgente + Garantia + A Precificar ao mesmo tempo
  - O tecnico aparece com avatar colorido
  - Data e turno (Manha/Tarde/Noite) com icone

**10. Botoes de Accao por Estado (StateActionButtons)**
- Screenshot: Coluna de accoes na tabela mostrando botoes contextuais
- Texto: "Os botoes de accao mudam conforme o estado do servico. O sistema mostra apenas as accoes possiveis naquele momento."
- Detalhes:
  - "Atribuir" quando sem tecnico
  - "Precificar" quando pending_pricing
  - "Registar Pagamento" quando em debito
  - "Gerir Entrega" quando concluido na oficina
  - "Forcar Estado" para excepcoes administrativas

**11. Ficha Lateral (ServiceDetailSheet)**
- Screenshot: Sheet lateral aberta mostrando cabecalho (codigo, estado, tipo, cliente), separadores de informacao (equipamento, tecnico, datas)
- Texto: "Clique em qualquer servico para abrir a ficha completa. Aqui ve tudo: dados, historico, fotos, assinaturas e pagamentos."
- Detalhes:
  - Cabecalho com codigo grande, badge de estado e tipo
  - Seccao do cliente com nome, telefone, email e morada
  - Seccao do equipamento com tipo, marca, modelo e avaria
  - Seccao do tecnico com avatar e nome
  - Botoes de accao na ficha (Atribuir, Precificar, Contactar, etc.)

**12. Ficha Lateral -- Timeline e Historico**
- Screenshot: Parte inferior da ficha lateral mostrando timeline de eventos, fotos do diagnostico, assinaturas e pagamentos
- Texto: "A ficha regista toda a historia do servico automaticamente."
- Detalhes:
  - Timeline com cada mudanca de estado datada
  - Galeria de fotos do diagnostico (aparelho, etiqueta, estado)
  - Assinaturas digitais do cliente (recolha, entrega, pedido de peca)
  - Historico de pagamentos com valores e datas
  - Pecas usadas e pecas encomendadas

**13. Atribuir Tecnico -- Modal**
- Screenshot: Modal AssignTechnicianModal com lista de tecnicos (avatar, nome, especializacao), data e turno
- Texto: "Atribua um tecnico e agende a data. O tecnico recebe o servico automaticamente na sua agenda."
- Detalhes:
  - Lista de tecnicos activos com avatar colorido
  - Campo de data com calendario
  - Seleccao de turno: Manha, Tarde ou Noite
  - Ao confirmar, o tecnico e notificado

**14. Precificar Servico -- Modal**
- Screenshot: Modal SetPriceModal com linhas de preco (descricao, referencia, quantidade, preco unitario, total), resumo com subtotal e total
- Texto: "Defina o preco do servico adicionando linhas de orcamento. Pode incluir mao-de-obra, pecas e deslocacao."
- Detalhes:
  - Adicionar multiplas linhas de preco
  - Cada linha: descricao, referencia, quantidade, preco unitario
  - Calculo automatico do total
  - Resumo com subtotal e total final
  - Servicos em garantia nao exigem precificacao

**15. Pedido de Peca -- Fluxo Completo**
- Screenshot: Notificacao de pedido de peca + Modal ConfirmPartOrderModal
- Texto: "Quando o tecnico pede uma peca, voce recebe uma notificacao. Registe a encomenda com fornecedor e previsao de chegada."
- Detalhes:
  - O tecnico regista a necessidade de peca no terreno
  - Notificacao aparece no sino (canto superior direito)
  - Modal de confirmacao: fornecedor, referencia e data prevista
  - Indicador de termometro mostra proximidade da chegada
  - Quando a peca chega, registar via "Peca Chegou"

**16. Notificacoes**
- Screenshot: Painel de notificacoes aberto (Sheet lateral) com lista de notificacoes categorizadas
- Texto: "O sino no canto superior mostra notificacoes nao lidas. Inclui pedidos de peca, atribuicoes, precificacoes e alertas."
- Detalhes:
  - Badge vermelho com contagem de nao lidas
  - Tipos: peca pedida, peca chegou, servico atribuido, precificacao, entrega agendada, servico atrasado
  - Marcar como lida individualmente ou todas de uma vez
  - Clique na notificacao para ir ao servico

**17. Pagina Oficina -- Cards de Servico**
- Screenshot: Pagina Oficina com grid de cards (codigo, estado, cliente, equipamento, avaria, tecnico, urgente, botao Enviar Tarefa)
- Texto: "A pagina Oficina mostra servicos fisicamente presentes na oficina, organizados em cards visuais."
- Detalhes:
  - Borda esquerda colorida: roxa para normal, vermelha para urgente
  - Badge de estado dinâmico
  - Se sem tecnico: destaque amarelo com botao "Atribuir"
  - Se com tecnico: avatar e botao "Reatribuir"
  - Botao "Enviar Tarefa" para dar instrucoes especificas

**18. Pagina Clientes**
- Screenshot: Pagina Clientes com tabela (Nome, Telefone, Email, Tipo, Morada, Codigo Postal, Accoes), botao Criar Cliente, pesquisa, contador
- Texto: "Gerir toda a base de clientes. Pesquise, crie novos e veja o historico de servicos de cada um."
- Detalhes:
  - Pesquisa por nome, email ou telefone
  - Tipo: Final ou Empresa (badge)
  - Botao "..." com opcoes: Ver Perfil, Editar, Eliminar
  - Ficha do cliente abre em Sheet lateral com historico de servicos
  - Paginacao para grandes volumes

**19. Pagina Orcamentos**
- Screenshot: Pagina Orcamentos com tabela (Codigo, Cliente, Artigo, Ref, Qtd, Total, Estado, Accoes), filtro por estado, botao Criar Orcamento
- Texto: "Crie e gira propostas de orcamento. Aprove, recuse ou converta em servico."
- Detalhes:
  - Estados: Pendente (amarelo), Aprovado (verde), Recusado (vermelho), Convertido (azul)
  - Accoes contextuais: Aprovar, Recusar, Converter em Servico, Editar, Excluir
  - Converter: transforma orcamento aprovado em servico real
  - Ficha detalhada em painel lateral com impressao PDF

**20. Pagina Performance**
- Screenshot: Pagina Performance com cards por tecnico (avatar, nome, contadores por tipo, grafico de pizza, lista de servicos)
- Texto: "Visualize a carga de trabalho de cada tecnico com graficos e metricas."
- Detalhes:
  - Card por tecnico com avatar e cor
  - Contadores: Entregas, Instalacoes, Reparacoes
  - Grafico de pizza com proporcao por tipo
  - Lista dos ultimos 10 servicos com estado

**21. Pagina Colaboradores**
- Screenshot: Pagina Colaboradores com tabela (Utilizador com avatar, Email, Telefone, Nivel de Acesso, Estado, Accoes), botao Convidar, filtros
- Texto: "Gira a equipa. Convide novos colaboradores, edite dados e controle acessos."
- Detalhes:
  - Convidar por email com password inicial e cargo
  - Cargos: Administrador, Secretaria, Tecnico
  - Tecnicos podem ser desactivados (nao recebem servicos)
  - Excluir permanentemente remove o utilizador
  - Filtro por cargo e pesquisa por nome/email

**22. Comecar a Usar**
- Screenshot: Logo TECNOFRIO (usa logo interna)
- Texto: "Voce controla decisoes, excepcoes e financas. O sistema cuida do resto -- regista, notifica e garante continuidade. Bom trabalho!"

---

### SECRETARIA (16 passos)

**1. Boas-vindas**
- Texto: "Bem-vinda ao TECNOFRIO. O seu papel e essencial: organizar servicos, gerir entregas e manter o caixa em dia."

**2. Sidebar -- Navegacao**
- Screenshot: Sidebar com 6 itens (Geral, Oficina, Oficina Reparados, Em Debito, Clientes, Preferencias)
- Texto: "A sua barra lateral tem acesso directo as seccoes mais importantes para o dia-a-dia."
- Detalhes:
  - Geral: criar e acompanhar servicos
  - Oficina: ver servicos na oficina
  - Oficina Reparados: gerir entregas de servicos concluidos
  - Em Debito: cobrar pagamentos pendentes
  - Clientes: base de dados
  - Preferencias: tema, notificacoes, senha

**3. Pagina Geral -- Criar e Gerir**
- Screenshot: Pagina Geral com dropdown "Novo Servico" e tabela
- Texto: "Quando um cliente liga, crie o servico aqui. Preencha os dados, escolha o tipo e atribua a um tecnico."

**4. Pesquisa e Filtros**
- Screenshot: Barra de pesquisa e tabela filtrada
- Texto: "Pesquise por codigo, nome do cliente ou equipamento. A tabela filtra instantaneamente."

**5. Atribuir Tecnico e Agendar**
- Screenshot: Modal AssignTechnicianModal
- Texto: "Seleccione o tecnico, a data e o turno. O tecnico ve o servico automaticamente na sua agenda."

**6. Pagina Oficina -- Acompanhamento**
- Screenshot: Pagina Oficina com cards
- Texto: "Acompanhe os servicos na oficina. Veja o estado, o tecnico atribuido e se ha urgencias."

**7. Oficina Reparados -- Gerir Entregas**
- Screenshot: Pagina Concluidos com tabela (Codigo, Cliente, Telefone, Aparelho, Tempo na Oficina, Metodo, Accoes)
- Texto: "Servicos reparados aparecem aqui. Defina o metodo de entrega e contacte o cliente."
- Detalhes:
  - "Gerir Entrega": escolher entre tecnico entrega ou cliente recolhe
  - "Dar Baixa": quando o cliente recolhe pessoalmente
  - Indicador de dias na oficina (vermelho se > 30 dias)
  - Botao telefone para contactar o cliente

**8. Gerir Entrega -- Modal**
- Screenshot: Modal DeliveryManagementModal com opcoes (Cliente Recolhe, Tecnico Entrega)
- Texto: "Escolha como o aparelho chega ao cliente. Se por tecnico, atribua a entrega a um tecnico especifico."

**9. Em Debito -- Pagamentos Pendentes**
- Screenshot: Pagina Em Debito com tabela (Codigo, Cliente, Telefone, Aparelho, Valor Total, Ja Pago, Em Falta, Accoes)
- Texto: "Todos os servicos com pagamento pendente estao aqui. Veja exactamente quanto falta cobrar."
- Detalhes:
  - Valor total em preto
  - Ja pago em verde
  - Em falta em vermelho e negrito
  - Badge com total em debito no cabecalho

**10. Registar Pagamento -- Modal**
- Screenshot: Modal RegisterPaymentModal com campo de valor, metodo de pagamento e notas
- Texto: "Registe pagamentos parciais ou totais. O sistema calcula automaticamente o valor restante."
- Detalhes:
  - Campo de valor pre-preenchido com o montante em falta
  - Pagamento parcial: o servico continua em debito
  - Pagamento total: o debito e liquidado

**11. Contactar Cliente -- Modal**
- Screenshot: Modal ContactClientModal com dados do cliente (telefone, email)
- Texto: "Contacte o cliente directamente. O modal mostra todos os dados de contacto disponiveis."

**12. Ficha Lateral do Servico**
- Screenshot: ServiceDetailSheet aberta com todas as seccoes
- Texto: "Clique em qualquer servico para ver os detalhes completos. A ficha lateral mostra tudo sem mudar de pagina."

**13. Clientes -- Gestao**
- Screenshot: Pagina Clientes
- Texto: "Consulte e edite os dados dos clientes. Crie novos clientes e veja o historico de servicos associados."

**14. Notificacoes**
- Screenshot: Painel de notificacoes
- Texto: "O sino no topo alerta-a para eventos importantes: pecas pedidas, servicos atribuidos e alertas urgentes."

**15. Preferencias**
- Screenshot: Pagina Preferencias com cards (Aparencia, Notificacoes, Seguranca, Guia do Sistema, Sobre)
- Texto: "Configure o tema (claro/escuro), as notificacoes, altere a password e reveja este guia a qualquer momento."

**16. Comecar a Usar**
- Texto: "Mantem o fluxo a andar e o caixa organizado. O sistema ajuda-a em cada passo."

---

### TECNICO (18 passos)

**1. Boas-vindas**
- Texto: "Bem-vindo ao TECNOFRIO. Este e o seu espaco de trabalho. Aqui ve o que tem de fazer e regista tudo o que faz."

**2. Sidebar -- Navegacao**
- Screenshot: Sidebar com 4 itens (Servicos, Oficina, Perfil, Preferencias)
- Texto: "A sua barra lateral e simples e directa."
- Detalhes:
  - Servicos: agenda diaria com servicos atribuidos
  - Oficina: servicos na oficina para reparar
  - Perfil: os seus dados e estatisticas
  - Preferencias: tema, notificacoes e senha

**3. Pagina Servicos -- Agenda Diaria**
- Screenshot: Pagina Servicos com navegacao por dia, seccoes por turno (Manha, Tarde, Noite) e cards de servico
- Texto: "Os seus servicos aparecem organizados por dia. Navegue entre dias com as setas."
- Detalhes:
  - Botao central mostra a data actual (destacado quando e hoje)
  - Seccoes por turno: Manha (sol nascente), Tarde (sol), Noite (lua)
  - Cada seccao mostra o total de servicos
  - Se nao ha servicos, mensagem "Sem servicos para este dia"

**4. Cards de Servico -- Tipos Visuais**
- Screenshot: Cards de servico com cores diferentes (Visita azul, Instalacao amarelo, Entrega verde)
- Texto: "Cada card mostra o tipo, o cliente e o equipamento. As cores ajudam a distinguir rapidamente."
- Detalhes:
  - Borda esquerda colorida: azul (Visita), amarelo (Instalacao), verde (Entrega)
  - Badge de tipo no canto superior direito
  - Tags: Urgente (vermelho pulsante), Garantia (verde)
  - Icone de turno com label
  - Botao "Comecar" em cor do tipo

**5. Comecar Servico -- Botao**
- Screenshot: Card com botao "Comecar" destacado
- Texto: "Quando estiver pronto, clique em 'Comecar'. O sistema guia-o passo a passo ate ao fim."

**6. Fluxo de Visita -- Resumo Anterior**
- Screenshot: Modal de resumo do atendimento anterior (se existir) mostrando tecnico, data, diagnostico, decisoes e fotos
- Texto: "Se outro tecnico ja atendeu este servico, vera o resumo completo antes de comecar. Isto garante continuidade."

**7. Fluxo de Visita -- Deslocacao (GPS)**
- Screenshot: Passo de deslocacao com endereco do cliente e botao "Abrir no Maps"
- Texto: "O primeiro passo mostra o endereco do cliente. Clique para abrir a navegacao GPS."

**8. Fluxo de Visita -- Fotos Obrigatorias**
- Screenshot: Passo de captura de foto com camera activa (3 fotos: aparelho, etiqueta, estado)
- Texto: "Tire fotos obrigatorias do aparelho: foto geral, etiqueta (modelo/serie) e estado actual."
- Detalhes:
  - Camera abre directamente no modal
  - 3 tipos de foto: aparelho, etiqueta, estado
  - Cada foto pode ser retirada se ficar mal
  - As fotos ficam associadas ao servico permanentemente

**9. Fluxo de Visita -- Diagnostico**
- Screenshot: Passo de diagnostico com campo de texto "Avaria detectada" obrigatorio
- Texto: "Descreva a avaria detectada. Este campo e obrigatorio e fica visivel para o escritorio."

**10. Fluxo de Visita -- Decisao Principal**
- Screenshot: Passo de decisao com opcoes (Reparar no Local, Levar para Oficina, Pedir Peca)
- Texto: "Esta e a decisao mais importante. Cada escolha adapta o fluxo seguinte."
- Detalhes:
  - Reparar no Local: pede pecas usadas, conclui e pede assinatura
  - Levar para Oficina: pede assinatura de autorizacao de transporte
  - Precisa de Peca: regista o pedido e pede assinatura de autorizacao

**11. Pecas Usadas -- Modal**
- Screenshot: Modal UsedPartsModal com lista de pecas (descricao, quantidade, botao adicionar/remover)
- Texto: "Se reparou no local, registe as pecas que utilizou. Pode adicionar varias pecas com quantidades."

**12. Assinatura Digital**
- Screenshot: Modal de assinatura com canvas, botoes Limpar, Cancelar e Confirmar
- Texto: "O cliente assina no ecra para confirmar a decisao. Pode limpar e refazer se errar."
- Detalhes:
  - Canvas de desenho livre
  - Botao "Limpar" apaga a assinatura
  - Botao "Cancelar" volta ao passo anterior
  - Tipos de assinatura: autorizacao de transporte, confirmacao de reparacao, autorizacao de pedido de peca

**13. Pedir Peca -- Fluxo**
- Screenshot: Formulario de pedido de peca com campo de descricao e notas
- Texto: "Se precisa de uma peca, registe o pedido. O escritorio e notificado automaticamente e encomenda por si."
- Detalhes:
  - Descricao da peca necessaria
  - Notas adicionais
  - Assinatura do cliente para autorizar
  - O servico muda para "Para Pedir Peca"
  - Quando a peca chega, o servico volta a ficar disponivel

**14. Oficina do Tecnico -- Pagina**
- Screenshot: Pagina TechnicianOfficePage com duas seccoes (Servicos Disponiveis para Assumir + Meus Servicos na Oficina)
- Texto: "Na oficina, veja servicos sem tecnico que pode assumir e os seus proprios servicos."
- Detalhes:
  - Seccao superior: cards cinzentos para servicos disponiveis com botao "Assumir Servico"
  - Seccao inferior: cards laranjas para servicos proprios com botao "Comecar"
  - Badge de estado em cada card
  - Botao de transferencia para solicitar que outro tecnico assuma

**15. Fluxo de Oficina**
- Screenshot: Modal WorkshopFlowModals com passos (Resumo, Diagnostico, Pecas, Pedir Peca, Conclusao)
- Texto: "O fluxo de oficina e semelhante mas sem deslocacao. Diagnostique, registe o trabalho e conclua."

**16. Perfil -- Estatisticas Pessoais**
- Screenshot: Pagina Perfil com avatar, dados pessoais, 3 contadores (Total, Este Mes, Activos), informacao da conta
- Texto: "O seu perfil mostra as suas estatisticas: total de servicos, servicos este mes e servicos activos."
- Detalhes:
  - Editar nome e telefone
  - Ver especializacao
  - Contador de servicos total, este mes e activos
  - Data de registo e estado da conta

**17. Preferencias**
- Screenshot: Pagina Preferencias
- Texto: "Configure o tema visual, as notificacoes e altere a sua password. Pode rever este guia a qualquer momento."

**18. Comecar a Usar**
- Texto: "Execute bem. O sistema regista tudo e garante continuidade se outro tecnico assumir. Bom trabalho!"

---

## Alteracoes Tecnicas

### 1. Expandir interface OnboardingStepContent

Ficheiro: `src/components/onboarding/onboardingContent.ts`

Adicionar campos:
- `details: string[]` -- lista de bullet points explicativos
- `screenshot?: string` -- caminho para screenshot em `public/onboarding/`

### 2. Expandir conteudo por role

Substituir os 12 passos do Dono por 22, os 8 da Secretaria por 16, e os 10 do Tecnico por 18. Cada passo com titulo, descricao detalhada e lista de detalhes.

### 3. Refactorizar OnboardingModal.tsx

Alteracoes no modal:
- Substituir a zona de icone/logo por uma zona de screenshot com `aspect-ratio: 16/9`
- Se o passo tem `screenshot`, mostrar a imagem; senao, manter o icone actual
- Abaixo do screenshot, mostrar titulo + descricao + lista de `details` como bullet points
- Manter botoes: "Saltar guia", "Anterior", "Proximo/Comecar a usar"
- Manter barra de progresso
- Estilizar a imagem com `rounded-lg`, `shadow-sm` e `border`
- Adicionar `object-contain` ou `object-cover` conforme necessario
- Aumentar `max-w-lg` para `max-w-2xl` para acomodar screenshots maiores

### 4. Capturar screenshots via browser automatizado

Para cada role, navegar por todas as paginas e interaccoes:
- Login como utilizador de cada role (ou criar utilizadores de teste)
- Navegar por cada pagina da sidebar
- Abrir modais, dropdowns e fichas laterais
- Capturar screenshots em resolucao desktop (1366x768)
- Guardar em `public/onboarding/dono/`, `public/onboarding/secretaria/`, `public/onboarding/tecnico/`

### 5. Ficheiros a alterar

- `src/components/onboarding/onboardingContent.ts` -- expandir conteudo
- `src/components/onboarding/OnboardingModal.tsx` -- refactorizar para screenshots
- `public/onboarding/dono/*.png` -- ~20 screenshots (novos)
- `public/onboarding/secretaria/*.png` -- ~14 screenshots (novos)
- `public/onboarding/tecnico/*.png` -- ~16 screenshots (novos)

### 6. Sequencia de implementacao

1. Criar utilizadores de teste (se necessario) via edge function invite-user
2. Navegar pelo sistema como Dono e capturar todos os screenshots
3. Navegar como Secretaria e capturar screenshots
4. Navegar como Tecnico e capturar screenshots
5. Guardar screenshots em `public/onboarding/`
6. Expandir `onboardingContent.ts` com todo o conteudo detalhado
7. Refactorizar `OnboardingModal.tsx` para exibir screenshots + bullet points
8. Testar onboarding para cada role
