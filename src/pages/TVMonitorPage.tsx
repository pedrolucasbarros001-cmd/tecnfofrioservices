import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Wrench, Clock, AlertCircle, RefreshCw, User, Activity, Play, Building2, Package, CheckCircle, DollarSign } from 'lucide-react';
import tecnofrioLogoIcon from '@/assets/tecnofrio-logo-icon.png';
import { supabase } from '@/integrations/supabase/client';
import { SERVICE_STATUS_CONFIG } from '@/types/database';
import { usePublicActivityLogs } from '@/hooks/useActivityLogs';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

// TV Monitor Service type (sanitized view)
interface TVMonitorService {
  id: string;
  code: string;
  status: string;
  appliance_type: string | null;
  brand: string | null;
  model: string | null;
  fault_description: string | null;
  is_urgent: boolean | null;
  technician_id: string | null;
  created_at: string;
  service_location: string;
  customer_name: string | null; // Sanitized - only first initial
  tech_id: string | null;
  tech_color: string | null;
  tech_active: boolean | null;
  tech_name: string | null;
}

// Section definitions with functional filters for composite logic
const MONITOR_SECTIONS = [
  { 
    key: 'para_assumir', 
    label: 'Para Assumir', 
    icon: User, 
    color: 'text-blue-400',
    filter: (s: TVMonitorService) => !s.technician_id && ['por_fazer', 'na_oficina'].includes(s.status || '')
  },
  { 
    key: 'na_oficina', 
    label: 'Na Oficina', 
    icon: Building2, 
    color: 'text-green-400',
    filter: (s: TVMonitorService) => !!s.technician_id && ['por_fazer', 'na_oficina'].includes(s.status || '')
  },
  { 
    key: 'em_execucao', 
    label: 'Em Execução', 
    icon: Play, 
    color: 'text-cyan-400',
    filter: (s: TVMonitorService) => s.status === 'em_execucao'
  },
  { 
    key: 'para_pedir_peca', 
    label: 'Para Pedir Peça', 
    icon: Package, 
    color: 'text-yellow-400',
    filter: (s: TVMonitorService) => s.status === 'para_pedir_peca'
  },
  { 
    key: 'em_espera_de_peca', 
    label: 'Em Espera de Peça', 
    icon: Clock, 
    color: 'text-orange-400',
    filter: (s: TVMonitorService) => s.status === 'em_espera_de_peca'
  },
  { 
    key: 'a_precificar', 
    label: 'A Precificar', 
    icon: DollarSign, 
    color: 'text-lime-400',
    filter: (s: TVMonitorService) => s.status === 'a_precificar'
  },
  { 
    key: 'concluidos', 
    label: 'Of. Reparados', 
    icon: CheckCircle, 
    color: 'text-emerald-400',
    filter: (s: TVMonitorService) => s.status === 'concluidos'
  },
];

// TV Monitor Service type (sanitized view)
interface TVMonitorService {
  id: string;
  code: string;
  status: string;
  appliance_type: string | null;
  brand: string | null;
  model: string | null;
  fault_description: string | null;
  is_urgent: boolean | null;
  technician_id: string | null;
  created_at: string;
  service_location: string;
  customer_name: string | null; // Sanitized - only first initial
  tech_id: string | null;
  tech_color: string | null;
  tech_active: boolean | null;
  tech_name: string | null;
}

// Service Card Component - using sanitized data
function ServiceCard({ service }: { service: TVMonitorService }) {
  const statusConfig = SERVICE_STATUS_CONFIG[service.status as keyof typeof SERVICE_STATUS_CONFIG];
  const isUrgent = service.is_urgent;
  const hasTechnician = !!service.technician_id;

  return (
    <div
      className={cn(
        "rounded-xl p-5 bg-slate-800 border-l-4 transition-all",
        isUrgent ? "border-red-500" : "border-slate-600",
        statusConfig?.color?.replace('bg-', 'border-l-')
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-mono text-xl lg:text-2xl font-bold text-primary">
            {service.code}
          </p>
          <div className={cn(
            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1",
            statusConfig?.color
          )}>
            {statusConfig?.label}
          </div>
        </div>
        {isUrgent && (
          <div className="flex items-center gap-1 bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs animate-pulse">
            <AlertCircle className="h-3 w-3" />
            URGENTE
          </div>
        )}
      </div>

      {/* Customer - sanitized (only first initial shown) */}
      <div className="mb-3">
        <p className="text-lg font-semibold truncate">
          {service.customer_name || 'Cliente'}
        </p>
        <p className="text-slate-400 text-sm truncate">
          {[service.appliance_type, service.brand, service.model]
            .filter(Boolean)
            .join(' • ') || 'Equipamento não especificado'}
        </p>
      </div>

      {/* Fault */}
      {service.fault_description && (
        <div className="bg-slate-700/50 rounded-lg p-2 mb-3">
          <p className="text-xs text-slate-400 uppercase mb-0.5">Avaria</p>
          <p className="text-sm line-clamp-2">{service.fault_description}</p>
        </div>
      )}

      {/* Technician or DISPONÍVEL */}
      {hasTechnician ? (
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ backgroundColor: service.tech_color || '#3B82F6' }}
          >
            {service.tech_name?.charAt(0) || 'T'}
          </div>
          <span className="text-sm text-slate-300">
            {service.tech_name}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 bg-yellow-500/20 rounded-lg p-2">
          <User className="h-5 w-5 text-yellow-400" />
          <span className="text-sm font-semibold text-yellow-400">
            DISPONÍVEL
          </span>
        </div>
      )}

      {/* Entry date */}
      <div className="flex items-center gap-2 mt-3 text-slate-500 text-xs">
        <Clock className="h-3 w-3" />
        <span>
          Entrada: {format(new Date(service.created_at), "dd/MM 'às' HH:mm")}
        </span>
      </div>
    </div>
  );
}

export default function TVMonitorPage() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Update clock every second
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // Fetch services from sanitized view (security: no sensitive customer data exposed)
  const { data: services = [], refetch, isLoading, isError } = useQuery({
    queryKey: ['tv-monitor-services'],
    queryFn: async () => {
      console.log('[TV Monitor] Fetching from sanitized view...');
      
      // Query the sanitized view - only exposes necessary data with masked customer names
      const { data, error } = await supabase
        .from('tv_monitor_services')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[TV Monitor] Query error:', error);
        throw error;
      }
      
      console.log('[TV Monitor] Fetched services:', data?.length);
      return (data || []) as TVMonitorService[];
    },
    refetchInterval: 30000,
    retry: 3,
  });

  // Fetch public activity logs
  const { data: activityLogs = [] } = usePublicActivityLogs(8);

  // Track last refresh
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
      setLastRefresh(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, [refetch]);

  // Group services by section using functional filters
  const groupedServices = MONITOR_SECTIONS.reduce((acc, section) => {
    acc[section.key] = services.filter(section.filter);
    return acc;
  }, {} as Record<string, TVMonitorService[]>);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 lg:p-6 pb-40">
      {/* Header */}
      <header className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <img
            src={tecnofrioLogoIcon}
            alt="TECNOFRIO"
            className="h-14 w-14 lg:h-16 lg:w-16 object-contain"
          />
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
              <span className="text-[#2B4F84]">TECNO</span>
              <span className="text-slate-300">FRIO</span>
            </h1>
            <p className="text-slate-400 text-base">Monitor da Oficina</p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-3xl lg:text-4xl font-mono font-bold">
            {format(currentTime, 'HH:mm:ss')}
          </p>
          <p className="text-slate-400 text-sm lg:text-base">
            {format(currentTime, "EEEE, d 'de' MMMM", { locale: pt })}
          </p>
          <div className="flex items-center justify-end gap-2 mt-1 text-slate-500 text-xs">
            <RefreshCw className="h-3 w-3" />
            <span>Atualizado às {format(lastRefresh, 'HH:mm:ss')}</span>
          </div>
        </div>
      </header>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-slate-400" />
          <p className="text-slate-400 mt-2">A carregar serviços...</p>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6 text-center">
          <AlertCircle className="h-6 w-6 text-red-400 mx-auto mb-2" />
          <p className="text-red-400">Erro ao carregar serviços. A tentar novamente...</p>
        </div>
      )}

      <div className="grid grid-cols-7 gap-3 mb-6">
        {MONITOR_SECTIONS.map((section) => {
          const count = groupedServices[section.key]?.length || 0;
          return (
            <div
              key={section.key}
              className={cn(
                "rounded-lg p-3 text-center",
                count > 0 ? "bg-slate-700" : "bg-slate-800"
              )}
            >
              <p className="text-3xl lg:text-4xl font-bold">{count}</p>
              <p className="text-xs lg:text-sm opacity-90">{section.label}</p>
            </div>
          );
        })}
      </div>

      {/* Unified Services Grid */}
      {services.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 mb-6">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      )}

      {/* Empty State - Only if no services at all */}
      {services.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <Wrench className="h-16 w-16 mb-4" />
          <p className="text-xl">Nenhum serviço na oficina</p>
        </div>
      )}

      {/* Footer with Activity Feed */}
      <footer className="fixed bottom-0 left-0 right-0 bg-slate-800/95 backdrop-blur-sm">
        {/* Activity Feed */}
        <div className="border-t border-slate-700 px-4 py-2">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-4 w-4 text-slate-400" />
            <span className="text-xs text-slate-400 font-medium">Atividades Recentes</span>
          </div>
          <div className="flex overflow-x-auto gap-3 pb-1">
            {activityLogs.length === 0 ? (
              <span className="text-slate-500 text-xs">Nenhuma atividade recente</span>
            ) : (
              activityLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex-shrink-0 bg-slate-700/50 rounded-lg px-3 py-1.5 max-w-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">
                      {format(new Date(log.created_at), 'HH:mm')}
                    </span>
                    <span className="text-xs text-slate-300 truncate">
                      {log.description}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Brand Bar */}
        <div className="flex items-center justify-between text-slate-400 text-xs px-4 py-2 border-t border-slate-700">
          <span>
            <span className="text-[#2B4F84]">TECNO</span>
            <span className="text-slate-300">FRIO</span>
            {' - Sistema de Gestão'}
          </span>
          <span>{services.length} serviço{services.length !== 1 ? 's' : ''} na oficina</span>
        </div>
      </footer>
    </div>
  );
}
