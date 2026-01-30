import {
  LayoutDashboard,
  Calendar,
  ClipboardList,
  Wrench,
  UserPlus,
  FileText,
  CheckCircle,
  Truck,
  CreditCard,
  Camera,
  PenTool,
  Package,
  Play,
  MapPin,
  Settings,
  Users,
  BarChart3,
  BookOpen,
  type LucideIcon,
} from 'lucide-react';
import type { AppRole } from '@/types/database';

export interface OnboardingStepContent {
  id: string;
  title: string;
  description: string;
  fallbackIcon: LucideIcon;
  page?: string;
}

// ONBOARDING DONO - 12 Passos
const DONO_STEPS: OnboardingStepContent[] = [
  {
    id: 'dono-welcome',
    title: 'Bem-vindo ao TECNOFRIO',
    description: 'Este é o seu centro de controlo. Aqui gere toda a operação da empresa, desde serviços até colaboradores.',
    fallbackIcon: BookOpen,
  },
  {
    id: 'dono-dashboard',
    title: 'Dashboard - Visão Geral',
    description: 'O Dashboard mostra o estado de todos os serviços num relance. Clique em qualquer cartão para ver os detalhes.',
    fallbackIcon: LayoutDashboard,
    page: '/dashboard',
  },
  {
    id: 'dono-geral',
    title: 'Gestão Geral',
    description: 'A página Geral é onde tudo acontece. Veja todos os serviços, filtre por estado e use a agenda semanal.',
    fallbackIcon: ClipboardList,
    page: '/geral',
  },
  {
    id: 'dono-agenda',
    title: 'Agenda Dinâmica',
    description: 'A agenda no topo mostra quantos serviços existem por dia e por técnico. Clique num dia para filtrar.',
    fallbackIcon: Calendar,
    page: '/geral',
  },
  {
    id: 'dono-criar-servico',
    title: 'Criar Serviços',
    description: 'Clique em "Novo Serviço" para criar uma Reparação, Instalação ou Entrega. O tipo escolhido define todo o fluxo.',
    fallbackIcon: FileText,
    page: '/geral',
  },
  {
    id: 'dono-reparacao',
    title: 'Reparação: Visita ou Oficina',
    description: 'Ao criar uma reparação, escolha se o técnico vai ao cliente ou se o aparelho já está na oficina.',
    fallbackIcon: Wrench,
    page: '/geral',
  },
  {
    id: 'dono-atribuir',
    title: 'Atribuir Técnicos',
    description: 'Atribua um técnico e agende a data. O técnico recebe o serviço automaticamente na sua agenda.',
    fallbackIcon: UserPlus,
    page: '/geral',
  },
  {
    id: 'dono-ficha',
    title: 'Ficha de Serviço',
    description: 'Clique em qualquer serviço para ver todos os detalhes: histórico, fotos, assinaturas e pagamentos.',
    fallbackIcon: FileText,
    page: '/geral',
  },
  {
    id: 'dono-estados',
    title: 'Estados Coexistentes',
    description: 'Um serviço pode estar "Concluído" e "Em Débito" ao mesmo tempo. Isso não é erro, é controlo inteligente.',
    fallbackIcon: CheckCircle,
  },
  {
    id: 'dono-pecas',
    title: 'Pedidos de Peça',
    description: 'Quando o técnico pede uma peça, você recebe uma notificação. Registe a encomenda e a previsão de chegada.',
    fallbackIcon: Package,
    page: '/geral',
  },
  {
    id: 'dono-colaboradores',
    title: 'Colaboradores',
    description: 'Convide novos utilizadores por email. Escolha o cargo: Administrador, Secretária ou Técnico.',
    fallbackIcon: Users,
    page: '/colaboradores',
  },
  {
    id: 'dono-final',
    title: 'Comece a Usar',
    description: 'Você controla decisões, excepções e dinheiro. O sistema cuida do resto. Bom trabalho!',
    fallbackIcon: BarChart3,
  },
];

// ONBOARDING SECRETÁRIA - 8 Passos
const SECRETARIA_STEPS: OnboardingStepContent[] = [
  {
    id: 'sec-welcome',
    title: 'Bem-vinda ao TECNOFRIO',
    description: 'O seu papel é essencial: organizar, cobrar e garantir que os serviços fluem sem problemas.',
    fallbackIcon: BookOpen,
  },
  {
    id: 'sec-geral',
    title: 'Gestão Geral',
    description: 'Aqui veja todos os serviços activos. Pode criar novos, atribuir técnicos e acompanhar o progresso.',
    fallbackIcon: ClipboardList,
    page: '/geral',
  },
  {
    id: 'sec-criar',
    title: 'Criar Serviços',
    description: 'Quando um cliente liga, crie o serviço aqui. Preencha os dados e atribua a um técnico.',
    fallbackIcon: FileText,
    page: '/geral',
  },
  {
    id: 'sec-oficina',
    title: 'Oficina',
    description: 'Acompanhe os serviços que estão fisicamente na oficina. Use o monitor TV para visualização pública.',
    fallbackIcon: Settings,
    page: '/oficina',
  },
  {
    id: 'sec-concluidos',
    title: 'Concluídos',
    description: 'Serviços concluídos aguardam entrega ou recolha. Escolha o método: técnico entrega ou cliente recolhe.',
    fallbackIcon: Truck,
    page: '/concluidos',
  },
  {
    id: 'sec-debito',
    title: 'Em Débito',
    description: 'Serviços com pagamento pendente aparecem aqui. Veja quanto falta e registe pagamentos parciais ou totais.',
    fallbackIcon: CreditCard,
    page: '/em-debito',
  },
  {
    id: 'sec-pagamentos',
    title: 'Registar Pagamentos',
    description: 'Clique em "Registar" para adicionar um pagamento. O sistema calcula automaticamente o valor em falta.',
    fallbackIcon: CreditCard,
    page: '/em-debito',
  },
  {
    id: 'sec-final',
    title: 'Comece a Usar',
    description: 'Mantém o fluxo a andar e o caixa organizado. O sistema ajuda-a em cada passo.',
    fallbackIcon: CheckCircle,
  },
];

// ONBOARDING TÉCNICO - 10 Passos
const TECNICO_STEPS: OnboardingStepContent[] = [
  {
    id: 'tec-welcome',
    title: 'Bem-vindo ao TECNOFRIO',
    description: 'Este é o seu espaço de trabalho. Aqui vê os serviços que tem de executar e regista tudo o que faz.',
    fallbackIcon: BookOpen,
  },
  {
    id: 'tec-agenda',
    title: 'Agenda Semanal',
    description: 'Os seus serviços aparecem organizados por dia. Veja o que tem para hoje e para a semana.',
    fallbackIcon: Calendar,
    page: '/servicos',
  },
  {
    id: 'tec-tipos',
    title: 'Tipos de Serviço',
    description: 'Cada cartão mostra o tipo: Visita (azul), Instalação (amarelo) ou Entrega (verde).',
    fallbackIcon: ClipboardList,
    page: '/servicos',
  },
  {
    id: 'tec-comecar',
    title: 'Começar Serviço',
    description: 'Clique em "Começar" quando estiver pronto. O sistema guia-o passo a passo até ao fim.',
    fallbackIcon: Play,
    page: '/servicos',
  },
  {
    id: 'tec-fluxo',
    title: 'Fluxo de Visita',
    description: 'Primeiro, navegue até ao cliente. Depois, registe o diagnóstico, tire fotos e decida o próximo passo.',
    fallbackIcon: MapPin,
  },
  {
    id: 'tec-decisoes',
    title: 'Decisões na Visita',
    description: 'Pode reparar no local, levar para a oficina ou pedir uma peça. Cada escolha adapta o fluxo.',
    fallbackIcon: Wrench,
  },
  {
    id: 'tec-oficina',
    title: 'Oficina do Técnico',
    description: 'Serviços na oficina aparecem aqui. Pode assumir serviços sem técnico ou continuar os seus.',
    fallbackIcon: Settings,
    page: '/oficina-tecnico',
  },
  {
    id: 'tec-pecas',
    title: 'Pedir Peças',
    description: 'Se precisar de uma peça, registe o pedido. O escritório é notificado e encomenda por si.',
    fallbackIcon: Package,
  },
  {
    id: 'tec-assinaturas',
    title: 'Assinaturas',
    description: 'As assinaturas confirmam decisões importantes. O cliente assina no ecrã. Pode apagar e refazer se errar.',
    fallbackIcon: PenTool,
  },
  {
    id: 'tec-final',
    title: 'Comece a Usar',
    description: 'Execute bem. O sistema regista tudo e garante continuidade se outro técnico assumir.',
    fallbackIcon: CheckCircle,
  },
];

export const ONBOARDING_CONTENT: Record<AppRole, OnboardingStepContent[]> = {
  dono: DONO_STEPS,
  secretaria: SECRETARIA_STEPS,
  tecnico: TECNICO_STEPS,
};

export function getOnboardingSteps(role: AppRole | null): OnboardingStepContent[] {
  if (!role) return [];
  return ONBOARDING_CONTENT[role] || [];
}
