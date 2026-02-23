import type { AppRole } from '@/types/database';

// ─── Step Type ─────────────────────────────────────────────────────────────
export type DemoStepType =
    | 'explain'      // Modal central com explicação (sem highlight)
    | 'highlight'    // Spotlight num elemento existente
    | 'navigate'     // Navegar para rota
    | 'click'        // Clicar num elemento (abre algo)
    | 'openModal'    // Indicar que modal abre — explica dentro do modal
    | 'fillDemo'     // Mostrar que campo seria preenchido

export interface DemoStep {
    id: string;
    type: DemoStepType;
    title: string;
    description: string;
    details?: string[];
    // Targeting
    selector?: string;       // [data-demo="..."] ou CSS selector
    route?: string;          // Para type='navigate'
    // Comportamento
    autoClickSelector?: string; // Clicar neste selector ao chegar ao passo
    waitForSelector?: string;   // Aguardar elemento antes de mostrar tooltip
    position?: 'center' | 'auto';
}

// ═══════════════════════════════════════════════════════════════════════════
// DONO — 25 Passos
// ═══════════════════════════════════════════════════════════════════════════
const DONO_DEMO: DemoStep[] = [
    {
        id: 'dono-welcome',
        type: 'explain',
        title: '👋 Bem-vindo ao TECNOFRIO',
        description: 'Esta é uma demonstração interativa do sistema. Vou guiá-lo pelas principais funcionalidades do seu papel como Dono/Administrador.',
        details: [
            'Duração: aproximadamente 5 minutos',
            'Todos os dados mostrados são fictícios',
            'Nenhuma alteração será guardada na base de dados',
        ],
        position: 'center',
    },
    {
        id: 'dono-navigate-dashboard',
        type: 'navigate',
        title: 'A navegar para o Dashboard...',
        description: 'O Dashboard é o ponto de partida. Mostra tudo o que precisa de saber à primeira vista.',
        route: '/dashboard',
        position: 'center',
    },
    {
        id: 'dono-dashboard-cards',
        type: 'highlight',
        title: 'Dashboard — Contadores de Estado',
        description: 'Cada card representa um estado do fluxo. Os cards com serviços ativos ficam mais claros; os vazios ficam discretos.',
        details: [
            'Clique num card para filtrar diretamente a lista de serviços',
            'Atualização em tempo real — sem necessidade de refrescar',
            'Badges vermelhos indicam atenção imediata (ex: Em Débito)',
        ],
        selector: '[data-demo="dashboard-cards"]',
    },
    {
        id: 'dono-activity-history',
        type: 'highlight',
        title: 'Histórico de Atividades',
        description: 'Registo automático de tudo o que acontece: serviços criados, técnicos atribuídos, peças pedidas, pagamentos registados.',
        details: [
            'Ordenado do mais recente para o mais antigo',
            'Clique numa entrada para ir ao serviço correspondente',
        ],
        selector: '[data-demo="activity-history"]',
    },
    {
        id: 'dono-navigate-geral',
        type: 'navigate',
        title: 'A navegar para Geral...',
        description: 'A página Geral é onde toda a gestão acontece.',
        route: '/geral',
        position: 'center',
    },
    {
        id: 'dono-sidebar-menu',
        type: 'highlight',
        title: 'Sidebar — Navegação Principal',
        description: 'A barra lateral é a sua bússola. Cada secção tem uma função específica.',
        details: [
            'Dashboard: visão geral com contadores',
            'Geral: gestão completa de todos os serviços',
            'Oficina: serviços fisicamente na oficina',
            'Clientes: base de dados de clientes',
            'Orçamentos: propostas e conversões',
            'Performance: carga de trabalho por técnico',
            'Colaboradores: gerir equipa e acessos',
        ],
        selector: '[data-demo="sidebar-menu"]',
    },
    {
        id: 'dono-geral-header',
        type: 'highlight',
        title: 'Página Geral — Centro de Controlo',
        description: 'Aqui vê, pesquisa, filtra e gere todos os serviços. O botão "Novo Serviço" permite criar qualquer tipo de serviço.',
        details: [
            'Agenda semanal dinâmica quando sem filtro ativo',
            'Tabela com Tipo, Código, Cliente, Estado, Técnico, Data e Ações',
            'Pesquisa instantânea por código, cliente ou equipamento',
        ],
        selector: '[data-demo="geral-header"]',
    },
    {
        id: 'dono-agenda',
        type: 'highlight',
        title: 'Agenda Semanal/Mensal',
        description: 'A agenda mostra quantos serviços existem por dia e por técnico, com códigos de cores.',
        details: [
            'Bolhinhas coloridas = serviços de cada técnico',
            'Clicar num dia abre o drawer lateral com a lista detalhada',
            'Alternar entre vista Semanal e Mensal',
        ],
        selector: '[data-demo="weekly-agenda"]',
    },
    {
        id: 'dono-search-bar',
        type: 'highlight',
        title: 'Barra de Pesquisa e Filtros',
        description: 'Pesquise por código TF-, nome do cliente, tipo de equipamento ou marca. A tabela filtra instantaneamente.',
        details: [
            'Filtros combinados: estado + técnico + data',
            'Ao ativar filtros, a agenda semanal é substituída pela tabela filtrada',
        ],
        selector: '[data-demo="search-bar"]',
    },
    {
        id: 'dono-new-service-btn',
        type: 'highlight',
        title: 'Criar Novo Serviço — Dropdown',
        description: 'Clique em "Novo Serviço" para escolher o tipo. O tipo define todo o fluxo seguinte.',
        details: [
            'Nova Reparação: o técnico diagnostica e repara',
            'Nova Instalação: montagem de equipamento novo',
            'Nova Entrega Direta: levar equipamento ao cliente',
            'Novo Orçamento: proposta sem compromisso imediato',
        ],
        selector: '[data-demo="new-service-btn"]',
        autoClickSelector: '[data-demo="new-service-btn"]',
    },
    {
        id: 'dono-create-modal-open',
        type: 'highlight',
        title: 'Modal de Criação — Reparação',
        description: 'Este modal recolhe todos os dados para criar uma reparação. Veja os campos principais.',
        details: [
            'Campo Cliente com autocomplete — comece a escrever o nome',
            'Botão para criar cliente novo inline sem sair do modal',
            'Checkbox "Urgente" para prioridade máxima',
            'Checkbox "Garantia" para serviços sem cobrança',
            'Escolha: Visita domiciliária ou o aparelho já está na Oficina',
        ],
        selector: '[data-demo="create-service-modal"]',
        waitForSelector: '[data-demo="create-service-modal"]',
        position: 'auto',
    },
    {
        id: 'dono-create-modal-close',
        type: 'explain',
        title: 'Serviço Criado — Código Automático',
        description: 'Ao submeter, o sistema gera automaticamente um código único (ex: TF-00042) e envia notificação por email ao cliente.',
        details: [
            'O técnico só vê o serviço depois de ser atribuído',
            'O estado inicial é sempre "Aberto" (por_fazer)',
            'Notificações por email automáticas ao cliente',
        ],
        position: 'center',
    },
    {
        id: 'dono-services-table',
        type: 'highlight',
        title: 'Tabela de Serviços — Informação Completa',
        description: 'Cada linha mostra toda a informação essencial. Os badges têm cores consistentes em todo o sistema.',
        details: [
            'Badge Tipo: azul (visita), roxo (oficina), amarelo (instalação), verde (entrega)',
            'Badge Estado: cor distinta para cada fase',
            'Tags: Urgente, Garantia, A Precificar (sobrepostas)',
            'Avatar colorido do técnico atribuído',
        ],
        selector: '[data-demo="services-table"]',
    },
    {
        id: 'dono-action-buttons',
        type: 'highlight',
        title: 'Botões de Ação Contextuais',
        description: 'Os botões de ação mudam conforme o estado do serviço. O sistema só mostra o que é possível naquele momento.',
        details: [
            '"Atribuir" → quando sem técnico',
            '"Precificar" → quando a_precificar',
            '"Registar Pagamento" → quando em_debito',
            '"Gerir Entrega" → serviços concluídos na oficina',
            '"Forçar Estado" → para exceções administrativas',
        ],
        selector: '[data-demo="action-buttons"]',
    },
    {
        id: 'dono-assign-explain',
        type: 'explain',
        title: 'Atribuir Técnico — Fluxo',
        description: 'Ao clicar "Atribuir", abre um modal com a lista de técnicos, campos de data e turno.',
        details: [
            'Técnicos listados com avatar e cor própria',
            'Seletor de turno: Manhã (08h-12h), Tarde (14h-18h), Noite (18h-22h)',
            'Ao confirmar, o técnico recebe o serviço na sua agenda',
            'A secretária também pode reatribuir e remarcar serviços',
        ],
        position: 'center',
    },
    {
        id: 'dono-pricing-explain',
        type: 'explain',
        title: 'Precificar Serviço',
        description: 'Quando o técnico conclui, o serviço pode ficar "A Orçamentar". Adicione linhas de preço: mão de obra, peças, deslocação.',
        details: [
            'Cada linha: descrição, referência, quantidade, preço unitário',
            'Cálculo automático do total',
            'Desconto global aplicável',
            'Serviços em garantia não exigem precificação',
        ],
        position: 'center',
    },
    {
        id: 'dono-notifications',
        type: 'highlight',
        title: 'Notificações — Sino no Topo',
        description: 'Badge vermelho com contagem de não lidas. Inclui pedidos de peça, precificações, atribuições e alertas.',
        details: [
            'Clique na notificação para ir diretamente ao serviço',
            'Marcar como lida individualmente ou todas de uma vez',
        ],
        selector: '[data-demo="notifications-btn"]',
    },
    {
        id: 'dono-navigate-oficina',
        type: 'navigate',
        title: 'A navegar para Oficina...',
        description: 'A página Oficina mostra serviços fisicamente presentes na oficina.',
        route: '/oficina',
        position: 'center',
    },
    {
        id: 'dono-oficina-cards',
        type: 'highlight',
        title: 'Oficina — Cards Visuais',
        description: 'Cards com borda colorida à esquerda. Urgente = borda vermelha. Normal = borda roxa.',
        details: [
            'Sem técnico: destaque amarelo + botão "Atribuir"',
            'Com técnico: avatar + botão "Reatribuir"',
            'Botão "Enviar Tarefa" para dar instruções específicas',
            'Indicador de dias na oficina (vermelho se > 30 dias)',
        ],
        selector: '[data-demo="oficina-cards"]',
    },
    {
        id: 'dono-navigate-clientes',
        type: 'navigate',
        title: 'A navegar para Clientes...',
        description: 'Gestão completa da base de clientes.',
        route: '/clientes',
        position: 'center',
    },
    {
        id: 'dono-clientes',
        type: 'highlight',
        title: 'Clientes — Base de Dados',
        description: 'Pesquise, crie novos clientes e veja o histórico de serviços de cada um diretamente aqui.',
        details: [
            'Tipo: Final (particular) ou Empresa (badge distinto)',
            'Botão "..." → Ver Perfil, Editar, Eliminar',
            'Ficha lateral com histórico completo de serviços',
            'NIF incluído para faturação',
        ],
        selector: '[data-demo="clientes-header"]',
    },
    {
        id: 'dono-navigate-colaboradores',
        type: 'navigate',
        title: 'A navegar para Colaboradores...',
        description: 'Gestão da equipa e acessos.',
        route: '/colaboradores',
        position: 'center',
    },
    {
        id: 'dono-colaboradores',
        type: 'highlight',
        title: 'Colaboradores — Equipa e Acessos',
        description: 'Convide novos colaboradores por email, defina o cargo e gerencie acessos.',
        details: [
            'Cargos: Administrador (acesso total), Secretária, Técnico',
            'Convite com password inicial',
            'Técnicos podem ser desativados (não recebem serviços)',
            'Eliminar remove permanentemente o utilizador',
        ],
        selector: '[data-demo="colaboradores-header"]',
    },
    {
        id: 'dono-navigate-performance',
        type: 'navigate',
        title: 'A navegar para Performance...',
        description: 'Análise de carga de trabalho por técnico.',
        route: '/performance',
        position: 'center',
    },
    {
        id: 'dono-performance',
        type: 'highlight',
        title: 'Performance — Métricas da Equipa',
        description: 'Card por técnico com avatar, cor e gráfico de pizza com distribuição de serviços.',
        details: [
            'Entregas, Instalações, Reparações — contador por tipo',
            'Lista dos últimos 10 serviços com estado',
            'Útil para equilibrar carga entre técnicos',
        ],
        selector: '[data-demo="performance-cards"]',
    },
    {
        id: 'dono-final',
        type: 'explain',
        title: '✅ Demo Concluída — Dono/Administrador',
        description: 'Conhece agora as principais ferramentas de gestão. O sistema cuida do registo automático, notificações e continuidade.',
        details: [
            'Para rever este guia: Preferências → "Rever Demo"',
            'O tour passivo (spotlight) está disponível em "Rever Guia"',
            'Suporte disponível por email: suporte@tecnofrio.pt',
        ],
        position: 'center',
    },
];

// ═══════════════════════════════════════════════════════════════════════════
// SECRETÁRIA — 18 Passos
// ═══════════════════════════════════════════════════════════════════════════
const SECRETARIA_DEMO: DemoStep[] = [
    {
        id: 'sec-welcome',
        type: 'explain',
        title: '👋 Bem-vinda ao TECNOFRIO',
        description: 'Esta é uma demonstração interativa do seu painel de secretária. Vou guiá-la pelo dia-a-dia: criar serviços, gerir entregas e cobrar pagamentos.',
        details: [
            'Duração: aproximadamente 3 minutos',
            'Nenhuma alteração será guardada',
        ],
        position: 'center',
    },
    {
        id: 'sec-navigate-geral',
        type: 'navigate',
        title: 'A navegar para Geral...',
        description: 'A sua página principal.',
        route: '/geral',
        position: 'center',
    },
    {
        id: 'sec-sidebar',
        type: 'highlight',
        title: 'A Sua Sidebar — Simplificada',
        description: 'O seu painel tem acesso direto às secções do dia-a-dia. Sem o excesso de opções administrativas.',
        details: [
            'Geral: criar e acompanhar serviços',
            'Oficina: serviços na oficina',
            'Oficina Reparados: gerir entregas',
            'Em Débito: cobranças pendentes',
            'Clientes: base de dados',
        ],
        selector: '[data-demo="sidebar-menu"]',
    },
    {
        id: 'sec-new-service',
        type: 'highlight',
        title: 'Criar Serviço — Quando o Cliente Liga',
        description: 'Quando um cliente liga, clique aqui para registar o serviço. Escolha o tipo de intervenção no dropdown.',
        selector: '[data-demo="new-service-btn"]',
        autoClickSelector: '[data-demo="new-service-btn"]',
    },
    {
        id: 'sec-create-modal',
        type: 'highlight',
        title: 'Modal de Criação — Dados do Cliente',
        description: 'Preencha o nome do cliente (autocomplete encontra clientes existentes), o equipamento e a avaria descrita.',
        details: [
            'Se o cliente é novo → clique "Criar cliente" dentro do modal',
            'Campo de notas para registar detalhes adicionais',
            'Urgente = sinalização visual especial em todo o sistema',
        ],
        selector: '[data-demo="create-service-modal"]',
        waitForSelector: '[data-demo="create-service-modal"]',
        position: 'auto',
    },
    {
        id: 'sec-assign-explain',
        type: 'explain',
        title: 'Atribuir Técnico e Agendar',
        description: 'Após criar o serviço, clique em "Atribuir" para escolher o técnico, a data e o turno (Manhã/Tarde/Noite).',
        details: [
            'O técnico recebe o serviço automaticamente na sua agenda',
            'Pode reatribuir ou remarcar a qualquer momento',
            'A secretária tem permissão para reatribuir e editar detalhes',
        ],
        position: 'center',
    },
    {
        id: 'sec-search',
        type: 'highlight',
        title: 'Pesquisa Instantânea',
        description: 'Pesquise por código TF-, nome do cliente ou tipo de equipamento. Resultados filtrados em tempo real.',
        selector: '[data-demo="search-bar"]',
    },
    {
        id: 'sec-navigate-oficina',
        type: 'navigate',
        title: 'A navegar para Oficina...',
        description: 'Acompanhe os serviços na oficina.',
        route: '/oficina',
        position: 'center',
    },
    {
        id: 'sec-oficina',
        type: 'highlight',
        title: 'Oficina — Acompanhamento',
        description: 'Veja o estado de cada reparação. Identifique urgências e serviços sem técnico atribuído.',
        details: [
            'Borda vermelha = urgente',
            'Destaque amarelo = sem técnico (precisa de atenção)',
            'Indicador de dias (vermelho se > 30 dias na oficina)',
        ],
        selector: '[data-demo="oficina-cards"]',
    },
    {
        id: 'sec-navigate-concluidos',
        type: 'navigate',
        title: 'A navegar para Oficina Reparados...',
        description: 'Serviços prontos a entregar.',
        route: '/concluidos',
        position: 'center',
    },
    {
        id: 'sec-concluidos',
        type: 'highlight',
        title: 'Oficina Reparados — Gerir Entregas',
        description: 'Quando um serviço é reparado, aparece aqui. Decida como o aparelho regressa ao cliente.',
        details: [
            '"Gerir Entrega" → técnico entrega em casa ou cliente recolhe na loja',
            '"Dar Baixa" → cliente está a recolher pessoalmente agora',
            'Botão de telefone para contactar o cliente diretamente',
        ],
        selector: '[data-demo="concluidos-header"]',
    },
    {
        id: 'sec-navigate-debito',
        type: 'navigate',
        title: 'A navegar para Em Débito...',
        description: 'Pagamentos por cobrar.',
        route: '/em-debito',
        position: 'center',
    },
    {
        id: 'sec-debito',
        type: 'highlight',
        title: 'Em Débito — Cobranças Pendentes',
        description: 'Todos os serviços com pagamento em aberto. Valor total, já pago e em falta — tudo à vista.',
        details: [
            'Total em preto, já pago em verde, em falta em vermelho',
            'Badge no cabeçalho com total geral em débito',
            '"Registar Pagamento" → modal para registar valor parcial ou total',
        ],
        selector: '[data-demo="debito-header"]',
    },
    {
        id: 'sec-payment-explain',
        type: 'explain',
        title: 'Registar Pagamento',
        description: 'O modal de pagamento mostra o valor exato em falta. Pode registar pagamento parcial (o serviço continua em débito) ou total (liquida o débito).',
        details: [
            'Métodos: Dinheiro, Multibanco, Transferência, MBWay',
            'Campo pré-preenchido com o montante em falta',
            'Historial completo de pagamentos na ficha do serviço',
        ],
        position: 'center',
    },
    {
        id: 'sec-navigate-clientes',
        type: 'navigate',
        title: 'A navegar para Clientes...',
        description: 'Gestão de clientes.',
        route: '/clientes',
        position: 'center',
    },
    {
        id: 'sec-clientes',
        type: 'highlight',
        title: 'Clientes — Gestão e Histórico',
        description: 'Consulte, edite e crie clientes. A ficha lateral mostra o histórico completo de serviços do cliente.',
        selector: '[data-demo="clientes-header"]',
    },
    {
        id: 'sec-notifications',
        type: 'highlight',
        title: 'Notificações',
        description: 'O sino alerta para peças pedidas, serviços prontos e outros eventos. Clique para ir ao serviço relevante.',
        selector: '[data-demo="notifications-btn"]',
    },
    {
        id: 'sec-final',
        type: 'explain',
        title: '✅ Demo Concluída — Secretária',
        description: 'Conhece agora o essencial: criar serviços, acompanhar na oficina, gerir entregas e cobrar pagamentos.',
        details: [
            'Para rever: Preferências → "Rever Demo"',
        ],
        position: 'center',
    },
];

// ═══════════════════════════════════════════════════════════════════════════
// TÉCNICO — 20 Passos
// ═══════════════════════════════════════════════════════════════════════════
const TECNICO_DEMO: DemoStep[] = [
    {
        id: 'tec-welcome',
        type: 'explain',
        title: '👋 Bem-vindo ao TECNOFRIO',
        description: 'Esta é a sua ferramenta de trabalho. Vou mostrar-lhe como ver os seus serviços, executar visitas e registar tudo corretamente.',
        details: [
            'Duração: aproximadamente 4 minutos',
            'Nenhuma alteração será guardada',
        ],
        position: 'center',
    },
    {
        id: 'tec-navigate-servicos',
        type: 'navigate',
        title: 'A navegar para Serviços...',
        description: 'A sua agenda diária.',
        route: '/servicos',
        position: 'center',
    },
    {
        id: 'tec-sidebar',
        type: 'highlight',
        title: 'Sidebar do Técnico — Simples e Direta',
        description: 'O seu painel tem apenas o essencial.',
        details: [
            'Serviços: agenda diária com serviços atribuídos',
            'Oficina: serviços na oficina para reparar',
            'Histórico: todos os seus serviços',
            'Perfil: os seus dados e estatísticas',
        ],
        selector: '[data-demo="sidebar-menu"]',
    },
    {
        id: 'tec-agenda',
        type: 'highlight',
        title: 'Agenda Diária — Os Seus Serviços',
        description: 'Os serviços aparecem organizados por dia e por turno. Navegue entre dias com as setas.',
        details: [
            'Botão central = data atual (destacado quando é hoje)',
            'Secções por turno: Manhã 🌅, Tarde ☀️, Noite 🌙',
            'Cada secção mostra o total de serviços nesse turno',
            '"Sem serviços" → mensagem clara quando o dia está vazio',
        ],
        selector: '[data-demo="servicos-agenda"]',
    },
    {
        id: 'tec-service-cards',
        type: 'highlight',
        title: 'Cards de Serviço — Tipos Visuais',
        description: 'Cada card mostra o tipo, cliente e equipamento. As cores ajudam a distinguir rapidamente.',
        details: [
            'Borda esquerda: azul (Visita), amarelo (Instalação), verde (Entrega)',
            'Badge de tipo no canto superior direito',
            'Tag "URGENTE" com borda vermelha pulsante',
            'Tag "GARANTIA" em verde — sem cobrança',
            'Botão "Começar" na cor do tipo de serviço',
        ],
        selector: '[data-demo="service-cards"]',
    },
    {
        id: 'tec-start-btn',
        type: 'highlight',
        title: 'Botão "Começar" — Inicia o Fluxo',
        description: 'Quando estiver no local, clique "Começar". O sistema guia-o passo a passo sem esquecer nada.',
        selector: '[data-demo="start-service-btn"]',
    },
    {
        id: 'tec-flow-resumo',
        type: 'explain',
        title: 'Fluxo de Visita — Passo 1: Resumo',
        description: 'O primeiro ecrã mostra o resumo do serviço: dados do cliente, equipamento e avaria descrita pelo escritório.',
        details: [
            'Se outro técnico já fez trabalho anterior, aparece o histórico completo',
            'Garante continuidade mesmo quando técnicos mudam',
            'Leia com atenção antes de avançar para o GPS',
        ],
        position: 'center',
    },
    {
        id: 'tec-flow-gps',
        type: 'explain',
        title: 'Fluxo de Visita — Passo 2: Deslocação GPS',
        description: 'O endereço do cliente aparece com botão para abrir a navegação GPS diretamente.',
        details: [
            'Clique no endereço para abrir Google Maps / Waze',
            'Confirme a chegada para avançar no fluxo',
        ],
        position: 'center',
    },
    {
        id: 'tec-flow-fotos',
        type: 'explain',
        title: 'Fluxo de Visita — Passo 3: Fotos Obrigatórias',
        description: 'Tire 3 fotos obrigatórias do aparelho. A câmera abre diretamente no modal.',
        details: [
            '📸 Foto do Aparelho — vista geral',
            '📸 Foto da Etiqueta — modelo e número de série',
            '📸 Foto do Estado — danos visíveis, amassados, sujidade',
            'Pode retomar se o telemóvel reiniciar — as fotos ficam guardadas',
        ],
        position: 'center',
    },
    {
        id: 'tec-flow-produto',
        type: 'explain',
        title: 'Fluxo de Visita — Passo 4: Informação do Produto',
        description: 'Confirme ou preencha a marca, modelo e número de série. O sistema pode já ter estes dados do escritório.',
        position: 'center',
    },
    {
        id: 'tec-flow-diagnostico',
        type: 'explain',
        title: 'Fluxo de Visita — Passo 5: Diagnóstico',
        description: 'Descreva a avaria que detetou. Este campo é obrigatório e fica visível para toda a equipa.',
        details: [
            'Seja preciso: ex. "Condensador com refrigerante em falta"',
            'O escritório vê isto em tempo real na ficha do serviço',
        ],
        position: 'center',
    },
    {
        id: 'tec-flow-decisao',
        type: 'explain',
        title: 'Fluxo de Visita — Passo 6: Decisão Principal ⚡',
        description: 'Esta é a decisão mais importante do fluxo. O que escolher determina tudo o que acontece a seguir.',
        details: [
            '🔧 Reparar no Local → regista peças usadas + assinatura de conclusão',
            '🚚 Levar para Oficina → pedido de autorização de transporte + assinatura do cliente',
            '📦 Precisa de Peça → regista a peça necessária + assinatura de autorização',
        ],
        position: 'center',
    },
    {
        id: 'tec-flow-pecas',
        type: 'explain',
        title: 'Peças Usadas — Modal',
        description: 'Se reparou no local, registe as peças que utilizou. Pode adicionar múltiplas peças com nome, referência e quantidade.',
        details: [
            'Nome da peça (obrigatório)',
            'Referência/código (opcional)',
            'Quantidade utilizada',
            'Estes dados ficam no registo permanente do serviço',
        ],
        position: 'center',
    },
    {
        id: 'tec-flow-assinatura',
        type: 'explain',
        title: 'Assinatura Digital do Cliente',
        description: 'O cliente assina no ecrã do telemóvel para confirmar a decisão. Canvas de desenho livre.',
        details: [
            'Botão "Limpar" para recomeçar a assinatura',
            'Tipos: autorização de transporte, confirmação de reparação, pedido de peça',
            'Assinatura guardada permanentemente na ficha do serviço',
        ],
        position: 'center',
    },
    {
        id: 'tec-pedir-peca',
        type: 'explain',
        title: 'Pedir Peça — Fluxo Completo',
        description: 'Quando precisa de uma peça, descreva o que precisa. O escritório é notificado e encomenda por si.',
        details: [
            '1. Técnico regista peça necessária no campo de texto',
            '2. Escritório recebe notificação imediata',
            '3. Escritório encomenda e regista previsão de chegada',
            '4. Indicador de termómetro mostra aproximação da data',
            '5. Quando a peça chega → serviço reaparece na sua agenda',
        ],
        position: 'center',
    },
    {
        id: 'tec-navigate-oficina',
        type: 'navigate',
        title: 'A navegar para Oficina...',
        description: 'A sua área de reparações na loja.',
        route: '/oficina-tecnico',
        position: 'center',
    },
    {
        id: 'tec-oficina-page',
        type: 'highlight',
        title: 'Oficina do Técnico',
        description: 'Veja serviços disponíveis para assumir e os seus próprios serviços em oficina.',
        details: [
            'Cards cinzentos → serviços sem técnico (pode assumir)',
            'Cards laranjas → os seus serviços em curso',
            'Botão "Assumir Serviço" nos cinzentos',
            'Botão "Transferir" para passar para outro técnico',
        ],
        selector: '[data-demo="oficina-tecnico"]',
    },
    {
        id: 'tec-workshop-flow',
        type: 'explain',
        title: 'Fluxo de Oficina — Diferenças',
        description: 'O fluxo de oficina é semelhante ao de visita mas sem o GPS nem a foto de visita.',
        details: [
            'Fotos do aparelho, etiqueta e estado',
            'Diagnóstico e trabalho realizado',
            'Peças usadas com referências',
            'Conclusão sem assinatura (cliente já autorizou)',
        ],
        position: 'center',
    },
    {
        id: 'tec-navigate-perfil',
        type: 'navigate',
        title: 'A navegar para Perfil...',
        description: 'Os seus dados e estatísticas.',
        route: '/perfil',
        position: 'center',
    },
    {
        id: 'tec-final',
        type: 'explain',
        title: '✅ Demo Concluída — Técnico',
        description: 'Execute com rigor. O sistema garante que nada se perde — mesmo se mudar de telemóvel ou reiniciar o browser.',
        details: [
            'O progresso de cada serviço é guardado automaticamente',
            'Pode retomar de onde ficou a qualquer momento',
            'Para rever: Preferências → "Rever Demo"',
        ],
        position: 'center',
    },
];

// ─── Lookup ────────────────────────────────────────────────────────────────
export function getDemoScript(role: AppRole): DemoStep[] {
    switch (role) {
        case 'dono':
            return DONO_DEMO;
        case 'secretaria':
            return SECRETARIA_DEMO;
        case 'tecnico':
            return TECNICO_DEMO;
        default:
            return [];
    }
}
