import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Snowflake, Wrench, Clock, User, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SERVICE_STATUS_CONFIG, SHIFT_CONFIG, type Service, type ServiceStatus } from '@/types/database';
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

  // Fetch services in workshop
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
        .in('status', ['na_oficina', 'em_execucao', 'para_pedir_peca', 'em_espera_de_peca', 'a_precificar', 'concluidos'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as unknown as Service[]) || [];
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

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

  const statusOrder: ServiceStatus[] = ['em_execucao', 'na_oficina', 'para_pedir_peca', 'em_espera_de_peca', 'a_precificar', 'concluidos'];

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 lg:p-8">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-cyan-500">
            <Snowflake className="h-10 w-10 lg:h-12 lg:w-12 text-white" />
          </div>
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">TECNOFRIO</h1>
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

      {/* Stats Bar */}
      <div className="grid grid-cols-6 gap-4 mb-8">
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
              <p className="text-3xl lg:text-4xl font-bold">{count}</p>
              <p className="text-sm opacity-90">{config.label}</p>
            </div>
          );
        })}
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {services.map((service) => {
          const statusConfig = SERVICE_STATUS_CONFIG[service.status as ServiceStatus];
          const isUrgent = service.is_urgent;
          
          return (
            <div
              key={service.id}
              className={cn(
                "rounded-xl p-5 bg-slate-800 border-l-4 transition-all",
                isUrgent ? "border-red-500 animate-pulse" : "border-slate-600",
                statusConfig.color.replace('bg-', 'border-l-')
              )}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-mono text-xl font-bold text-primary">
                    {service.code}
                  </p>
                  <div className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1",
                    statusConfig.color
                  )}>
                    {statusConfig.label}
                  </div>
                </div>
                {isUrgent && (
                  <div className="flex items-center gap-1 bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs">
                    <AlertCircle className="h-3 w-3" />
                    URGENTE
                  </div>
                )}
              </div>

              {/* Customer */}
              <div className="mb-3">
                <p className="text-lg font-semibold truncate">
                  {service.customer?.name || 'Sem cliente'}
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
                  <p className="text-xs text-slate-400 uppercase mb-1">Avaria</p>
                  <p className="text-sm line-clamp-2">{service.fault_description}</p>
                </div>
              )}

              {/* Technician */}
              {service.technician?.profile && (
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: service.technician.color || '#3B82F6' }}
                  >
                    {service.technician.profile.full_name?.charAt(0) || 'T'}
                  </div>
                  <span className="text-sm text-slate-300">
                    {service.technician.profile.full_name}
                  </span>
                </div>
              )}

              {!service.technician && (
                <div className="flex items-center gap-2 text-slate-500">
                  <User className="h-4 w-4" />
                  <span className="text-sm">Sem técnico</span>
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
        })}
      </div>

      {/* Empty State */}
      {services.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Wrench className="h-20 w-20 mb-4" />
          <p className="text-2xl">Nenhum serviço na oficina</p>
        </div>
      )}

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-slate-800/90 backdrop-blur-sm py-3 px-6">
        <div className="flex items-center justify-between text-slate-400 text-sm">
          <span>TECNOFRIO - Sistema de Gestão</span>
          <span>{services.length} serviço{services.length !== 1 ? 's' : ''} na oficina</span>
        </div>
      </footer>
    </div>
  );
}
