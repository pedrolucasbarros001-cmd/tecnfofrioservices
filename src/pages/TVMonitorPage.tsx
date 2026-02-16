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
    label: 'Oficina',
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
    label: 'Pedir Peça',
    icon: Package,
    color: 'text-yellow-400',
    filter: (s: TVMonitorService) => s.status === 'para_pedir_peca'
  },
  {
    key: 'em_espera_de_peca',
    label: 'Espera de Peça',
    icon: Clock,
    color: 'text-orange-400',
    filter: (s: TVMonitorService) => s.status === 'em_espera_de_peca'
  },
  {
    key: 'a_precificar',
    label: 'Precificar',
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
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 lg:p-6 pb-64">
      {/* Header */}
      <header className="flex items-center justify-between mb-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-6">
          <img
            src={tecnofrioLogoIcon}
            alt="TECNOFRIO"
            className="h-16 w-16 lg:h-20 lg:w-20 object-contain"
          />
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">
              <span className="text-[#2B4F84]">TECNO</span>
              <span className="text-slate-400">FRIO</span>
            </h1>
            <p className="text-slate-500 text-lg font-medium">Monitor de Fluxo da Oficina</p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-4xl lg:text-5xl font-mono font-bold text-[#2B4F84]">
            {format(currentTime, 'HH:mm:ss')}
          </p>
          <p className="text-slate-600 text-lg lg:text-xl font-medium">
            {format(currentTime, "EEEE, d 'de' MMMM", { locale: pt })}
          </p>
          <div className="flex items-center justify-end gap-2 mt-2 text-slate-400 text-sm">
            <RefreshCw className="h-4 w-4" />
            <span>Sincronizado: {format(lastRefresh, 'HH:mm:ss')}</span>
          </div>
        </div>
      </header>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <RefreshCw className="h-10 w-10 animate-spin mx-auto text-primary" />
          <p className="text-slate-500 mt-3 text-lg">A atualizar dados...</p>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 mb-8 text-center shadow-sm">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
          <p className="text-red-600 font-bold text-lg">Falha na ligação. A tentar reconectar...</p>
        </div>
      )}

      {/* Section Counters */}
      <div className="grid grid-cols-7 gap-4 mb-8">
        {MONITOR_SECTIONS.map((section) => {
          const count = groupedServices[section.key]?.length || 0;
          return (
            <div
              key={section.key}
              className={cn(
                "rounded-2xl p-5 text-center transition-all border-2",
                count > 0
                  ? "bg-white border-[#2B4F84] shadow-md ring-4 ring-[#2B4F84]/5"
                  : "bg-slate-100 border-transparent opacity-60"
              )}
            >
              <p className={cn(
                "text-4xl lg:text-5xl font-black mb-1",
                count > 0 ? "text-[#2B4F84]" : "text-slate-400"
              )}>{count}</p>
              <p className="text-sm lg:text-base font-bold text-slate-600 uppercase tracking-wider">
                {section.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Unified Services Grid */}
      {services.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 mb-8">
          {services.map((service) => (
            <div
              key={service.id}
              className={cn(
                "rounded-2xl p-6 bg-white border-2 transition-all shadow-sm flex flex-col justify-between",
                service.is_urgent ? "border-red-500 animate-pulse-subtle bg-red-50/30" : "border-slate-200"
              )}
            >
              {/* Card Header */}
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-mono text-2xl lg:text-3xl font-black text-[#2B4F84]">
                      {service.code}
                    </p>
                    <Badge className={cn(
                      "mt-2 text-sm font-bold",
                      SERVICE_STATUS_CONFIG[service.status as keyof typeof SERVICE_STATUS_CONFIG]?.color
                    )}>
                      {SERVICE_STATUS_CONFIG[service.status as keyof typeof SERVICE_STATUS_CONFIG]?.label}
                    </Badge>
                  </div>
                  {service.is_urgent && (
                    <div className="bg-red-600 text-white px-3 py-1.5 rounded-full text-xs font-black shadow-lg flex items-center gap-1.5 tracking-tighter">
                      <AlertCircle className="h-4 w-4" />
                      URGENTE
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <p className="text-xl font-black text-slate-800 line-clamp-1 mb-1">
                    {service.customer_name || 'Cliente'}
                  </p>
                  <p className="text-slate-500 font-bold text-sm lg:text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {[service.appliance_type, service.brand]
                      .filter(Boolean)
                      .join(' • ') || 'Aparelho s/ especificação'}
                  </p>
                </div>

                {service.fault_description && (
                  <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-slate-100 shadow-inner">
                    <p className="text-[10px] text-slate-400 font-black uppercase mb-1 tracking-widest">Sintoma / Avaria</p>
                    <p className="text-base text-slate-700 font-medium line-clamp-3 leading-relaxed">
                      {service.fault_description}
                    </p>
                  </div>
                )}
              </div>

              {/* Card Footer: Tech & Time */}
              <div>
                {service.technician_id ? (
                  <div className="flex items-center gap-3 bg-blue-50/50 p-2 rounded-xl mb-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-black text-white shadow-md border-2 border-white"
                      style={{ backgroundColor: service.tech_color || '#2B4F84' }}
                    >
                      {service.tech_name?.charAt(0) || 'T'}
                    </div>
                    <span className="text-base font-bold text-slate-700 uppercase">
                      {service.tech_name}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 bg-amber-50 rounded-xl p-3 mb-4 border border-amber-100 ring-2 ring-amber-500/10">
                    <User className="h-6 w-6 text-amber-500" />
                    <span className="text-base font-black text-amber-600">
                      DISPONÍVEL
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-wider border-t border-slate-50 pt-3">
                  <Clock className="h-4 w-4" />
                  <span>
                    Entrada: {format(new Date(service.created_at), "dd/MM 'às' HH:mm")}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {services.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-slate-300">
          <Wrench className="h-24 w-24 mb-6 opacity-20" />
          <p className="text-3xl font-black uppercase tracking-tighter opacity-30">Pátio Limpo • Sem Serviços</p>
        </div>
      )}

      {/* Footer with HIGH VISIBILITY Admin Task Bar */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 shadow-2xl-up">
        {/* BIG Task Bar */}
        <div className="bg-[#2B4F84] border-t-4 border-yellow-400 p-6 shadow-2xl">
          <div className="flex items-center gap-4 mb-3">
            <div className="bg-yellow-400 p-2 rounded-lg animate-bounce">
              <Activity className="h-6 w-6 text-[#2B4F84]" />
            </div>
            <span className="text-xl text-yellow-400 font-black uppercase tracking-widest">
              Tarefas Adicionais & Avisos Administrativos
            </span>
          </div>

          <div className="flex gap-6 overflow-hidden relative h-20">
            {activityLogs.length === 0 ? (
              <span className="text-slate-300 text-2xl font-medium animate-pulse">
                A aguardar novas orientações...
              </span>
            ) : (
              <div className="flex gap-6 animate-marquee">
                {activityLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex-shrink-0 bg-white/10 backdrop-blur border border-white/10 rounded-2xl px-8 py-4 flex items-center gap-4 group hover:bg-white/20 transition-all pointer-events-none"
                  >
                    <span className="text-xl text-yellow-200 font-mono font-bold opacity-60">
                      [{format(new Date(log.created_at), 'HH:mm')}]
                    </span>
                    <span className="text-2xl text-white font-black whitespace-nowrap tracking-tight">
                      {log.description}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Brand Bar */}
        <div className="bg-white px-6 py-4 flex items-center justify-between border-t border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black">
              <span className="text-[#2B4F84]">TECNO</span>
              <span className="text-slate-300">FRIO</span>
            </span>
            <span className="text-slate-400 text-sm font-bold uppercase tracking-widest ml-2 border-l pl-4">Oficina Digital</span>
          </div>

          <div className="flex items-center gap-8 text-slate-600 font-black">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
              <span className="text-lg uppercase tracking-tighter">{services.length} SERVIÇOS ATIVOS</span>
            </div>
          </div>
        </div>
      </header>

      {/* Marquee Animation Styles */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: flex;
          gap: 1.5rem;
          animation: marquee 40s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse-subtle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
        .shadow-2xl-up {
          box-shadow: 0 -25px 50px -12px rgba(0, 0, 0, 0.25);
        }
      `}</style>
    </div>
  );
}

