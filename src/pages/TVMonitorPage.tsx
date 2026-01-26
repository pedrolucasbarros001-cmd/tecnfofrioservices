import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Wrench, Clock, AlertCircle, RefreshCw, User, Activity } from 'lucide-react';
import tecnofrioLogoIcon from '@/assets/tecnofrio-logo-icon.png';
import { supabase } from '@/integrations/supabase/client';
import { SERVICE_STATUS_CONFIG, type Service, type ServiceStatus } from '@/types/database';
import { usePublicActivityLogs } from '@/hooks/useActivityLogs';
import { cn } from '@/lib/utils';

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

  // Fetch services in workshop (removed 'a_precificar')
  const { data: services = [], refetch } = useQuery({
    queryKey: ['tv-monitor-services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          customer:customers(*),
          technician:technicians(*, profile:profiles(*))
        `)
        .eq('service_location', 'oficina')
        .in('status', ['na_oficina', 'em_execucao', 'para_pedir_peca', 'em_espera_de_peca', 'concluidos'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as unknown as Service[]) || [];
    },
    refetchInterval: 30000, // Refetch every 30 seconds
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

  // Group services by status
  const groupedServices = services.reduce((acc, service) => {
    const status = service.status as ServiceStatus;
    if (!acc[status]) acc[status] = [];
    acc[status].push(service);
    return acc;
  }, {} as Record<ServiceStatus, Service[]>);

  // Status order WITHOUT 'a_precificar'
  const statusOrder: ServiceStatus[] = ['em_execucao', 'na_oficina', 'para_pedir_peca', 'em_espera_de_peca', 'concluidos'];

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 lg:p-8 pb-32">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <img
            src={tecnofrioLogoIcon}
            alt="TECNOFRIO"
            className="h-16 w-16 lg:h-20 lg:w-20 object-contain"
          />
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">
              <span className="text-[#2B4F84]">TECNO</span>
              <span className="text-slate-300">FRIO</span>
            </h1>
            <p className="text-slate-400 text-lg">Monitor da Oficina</p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-4xl lg:text-5xl font-mono font-bold">
            {format(currentTime, 'HH:mm:ss')}
          </p>
          <p className="text-slate-400 text-lg">
            {format(currentTime, "EEEE, d 'de' MMMM", { locale: pt })}
          </p>
          <div className="flex items-center justify-end gap-2 mt-2 text-slate-500 text-sm">
            <RefreshCw className="h-4 w-4" />
            <span>Atualizado às {format(lastRefresh, 'HH:mm:ss')}</span>
          </div>
        </div>
      </header>

      {/* Stats Bar - 5 columns without 'a_precificar' */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {statusOrder.map((status) => {
          const config = SERVICE_STATUS_CONFIG[status];
          const count = groupedServices[status]?.length || 0;
          return (
            <div
              key={status}
              className={cn(
                "rounded-xl p-4 text-center",
                count > 0 ? config.color : "bg-slate-800"
              )}
            >
              <p className="text-4xl lg:text-5xl font-bold">{count}</p>
              <p className="text-sm lg:text-base opacity-90">{config.label}</p>
            </div>
          );
        })}
      </div>

      {/* Services Grid - Larger cards, max 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
        {services.map((service) => {
          const statusConfig = SERVICE_STATUS_CONFIG[service.status as ServiceStatus];
          const isUrgent = service.is_urgent;
          const hasTechnician = !!service.technician;

          return (
            <div
              key={service.id}
              className={cn(
                "rounded-xl p-6 bg-slate-800 border-l-4 transition-all",
                isUrgent ? "border-red-500" : "border-slate-600",
                statusConfig.color.replace('bg-', 'border-l-')
              )}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-mono text-2xl lg:text-3xl font-bold text-primary">
                    {service.code}
                  </p>
                  <div className={cn(
                    "inline-flex items-center px-3 py-1 rounded text-sm font-medium mt-2",
                    statusConfig.color
                  )}>
                    {statusConfig.label}
                  </div>
                </div>
                {isUrgent && (
                  <div className="flex items-center gap-1 bg-red-500/20 text-red-400 px-3 py-1.5 rounded text-sm animate-pulse">
                    <AlertCircle className="h-4 w-4" />
                    URGENTE
                  </div>
                )}
              </div>

              {/* Customer - Larger text */}
              <div className="mb-4">
                <p className="text-xl lg:text-2xl font-semibold truncate">
                  {service.customer?.name || 'Sem cliente'}
                </p>
                <p className="text-slate-400 text-base lg:text-lg truncate">
                  {[service.appliance_type, service.brand, service.model]
                    .filter(Boolean)
                    .join(' • ') || 'Equipamento não especificado'}
                </p>
              </div>

              {/* Fault */}
              {service.fault_description && (
                <div className="bg-slate-700/50 rounded-lg p-3 mb-4">
                  <p className="text-xs text-slate-400 uppercase mb-1">Avaria</p>
                  <p className="text-sm lg:text-base line-clamp-2">{service.fault_description}</p>
                </div>
              )}

              {/* Technician or DISPONÍVEL */}
              {hasTechnician ? (
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold"
                    style={{ backgroundColor: service.technician?.color || '#3B82F6' }}
                  >
                    {service.technician?.profile?.full_name?.charAt(0) || 'T'}
                  </div>
                  <span className="text-base lg:text-lg text-slate-300">
                    {service.technician?.profile?.full_name}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-yellow-500/20 rounded-lg p-3">
                  <User className="h-6 w-6 text-yellow-400" />
                  <span className="text-lg font-semibold text-yellow-400">
                    DISPONÍVEL
                  </span>
                </div>
              )}

              {/* Entry date */}
              <div className="flex items-center gap-2 mt-4 text-slate-500 text-sm">
                <Clock className="h-4 w-4" />
                <span>
                  Entrada: {format(new Date(service.created_at), "dd/MM 'às' HH:mm")}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {services.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Wrench className="h-20 w-20 mb-4" />
          <p className="text-2xl">Nenhum serviço na oficina</p>
        </div>
      )}

      {/* Footer with Activity Feed */}
      <footer className="fixed bottom-0 left-0 right-0 bg-slate-800/95 backdrop-blur-sm">
        {/* Activity Feed */}
        <div className="border-t border-slate-700 px-6 py-3">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-400 font-medium">Atividades Recentes</span>
          </div>
          <div className="flex overflow-x-auto gap-4 pb-2">
            {activityLogs.length === 0 ? (
              <span className="text-slate-500 text-sm">Nenhuma atividade recente</span>
            ) : (
              activityLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex-shrink-0 bg-slate-700/50 rounded-lg px-4 py-2 max-w-md"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">
                      {format(new Date(log.created_at), 'HH:mm')}
                    </span>
                    <span className="text-sm text-slate-300 truncate">
                      {log.description}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Brand Bar */}
        <div className="flex items-center justify-between text-slate-400 text-sm px-6 py-3 border-t border-slate-700">
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
