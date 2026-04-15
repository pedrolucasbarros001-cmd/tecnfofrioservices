import { useQuery } from '@tanstack/react-query';
import { Package, Wrench, Truck } from 'lucide-react';
import { formatLocalDate } from '@/utils/dateUtils';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ServiceStatusBadge } from '@/components/shared/ServiceStatusBadge';
import { useTechnicians } from '@/hooks/useTechnicians';
import { supabase } from '@/integrations/supabase/client';

// STATUS_LABELS removed — now using ServiceStatusBadge component for consistent rendering

export default function PerformancePage() {
  const { data: technicians = [] } = useTechnicians(false);

  // BUG-03 FIX: Only fetch the fields needed for charts + service list.
  // Removed cascaded JOINs (customers, profiles) — technician names come from useTechnicians().
  // Added .limit(500) to prevent browser timeout with large datasets.
  const { data: services = [] } = useQuery({
    queryKey: ['services-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('id, code, technician_id, customer_id, service_type, is_sale, is_installation, status, pending_pricing, final_price, amount_paid, service_location, scheduled_date, appliance_type, fault_description, created_at')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      return data || [];
    },
  });

  const getServiceType = (service: any) => {
    if (service.service_type === 'entrega' || service.is_sale) return 'entregas';
    if (service.service_type === 'instalacao' || service.is_installation) return 'instalacoes';
    return 'reparacoes';
  };

  const getTechnicianData = (techId: string) => {
    const techServices = services.filter((s) => s.technician_id === techId);

    const entregas = techServices.filter((s) => getServiceType(s) === 'entregas');
    const instalacoes = techServices.filter((s) => getServiceType(s) === 'instalacoes');
    const reparacoes = techServices.filter((s) => getServiceType(s) === 'reparacoes');

    const hasData = techServices.length > 0;
    const chartData = hasData
      ? [
        { name: 'Entregas', value: entregas.length, color: '#10b981' },
        { name: 'Instalações', value: instalacoes.length, color: '#f59e0b' },
        { name: 'Reparações', value: reparacoes.length, color: '#3b82f6' },
      ].filter((item) => item.value > 0)
      : [{ name: 'Sem serviços', value: 1, color: 'hsl(var(--muted))' }];

    return {
      services: techServices,
      entregas,
      instalacoes,
      reparacoes,
      chartData,
      total: techServices.length,
      isEmpty: !hasData,
    };
  };

  const getServiceIcon = (type: string) => {
    switch (type) {
      case 'entregas':
        return <Truck className="h-4 w-4" />;
      case 'instalacoes':
        return <Package className="h-4 w-4" />;
      default:
        return <Wrench className="h-4 w-4" />;
    }
  };

  const getServiceColor = (type: string) => {
    switch (type) {
      case 'entregas':
        return 'bg-green-100 text-green-700';
      case 'instalacoes':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-blue-100 text-blue-700';
    }
  };

  const getServiceLabel = (type: string) => {
    switch (type) {
      case 'entregas':
        return 'Entrega';
      case 'instalacoes':
        return 'Instalação';
      default:
        return 'Reparação';
    }
  };

  const techniciansWithData = technicians.map((tech) => ({
    ...tech,
    data: getTechnicianData(tech.id),
  }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Performance de Técnicos</h1>
        <p className="text-muted-foreground">Visualização da carga de trabalho por técnico</p>
      </div>

      {/* Technicians Grid */}
      <div className="space-y-6" data-tour="performance-cards" data-demo="performance-cards">
        {techniciansWithData.map((tech) => (
          <Card key={tech.id} className="overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                    style={{ backgroundColor: tech.color || '#3B82F6' }}
                  >
                    {tech.profile?.full_name?.charAt(0).toUpperCase() || 'T'}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{tech.profile?.full_name || 'Técnico'}</h3>
                    <p className="text-sm text-muted-foreground">{tech.data.total} serviços</p>
                  </div>
                </div>

                {/* Summary by type */}
                <div className="flex gap-6">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Entregas</p>
                    <p className="text-xl font-bold text-green-600">{tech.data.entregas.length}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Instalações</p>
                    <p className="text-xl font-bold text-orange-600">{tech.data.instalacoes.length}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Reparações</p>
                    <p className="text-xl font-bold text-blue-600">{tech.data.reparacoes.length}</p>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Pie Chart */}
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={tech.data.chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={tech.data.isEmpty ? 0 : 2}
                        dataKey="value"
                        stroke="none"
                      >
                        {tech.data.chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} opacity={tech.data.isEmpty ? 0.3 : 1} />
                        ))}
                      </Pie>
                      {!tech.data.isEmpty && <Tooltip />}
                      {!tech.data.isEmpty && <Legend />}
                    </PieChart>
                  </ResponsiveContainer>
                  {tech.data.isEmpty && (
                    <p className="text-xs text-muted-foreground text-center -mt-4">Sem serviços</p>
                  )}
                </div>

                {/* Services List */}
                <div className="lg:col-span-2 space-y-2 max-h-[300px] overflow-y-auto">
                  {tech.data.isEmpty ? (
                    <div className="flex items-center justify-center h-full min-h-[100px] text-muted-foreground text-sm">
                      Nenhum serviço atribuído
                    </div>
                  ) : (
                    <>
                      {tech.data.services.slice(0, 10).map((service) => {
                        const serviceType = getServiceType(service);
                        return (
                          <div
                            key={service.id}
                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${getServiceColor(serviceType)}`}>
                                {getServiceIcon(serviceType)}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-sm font-semibold text-primary">
                                    {service.code}
                                  </span>
                                  <Badge variant="secondary" className="text-xs">
                                    {getServiceLabel(serviceType)}
                                  </Badge>
                                </div>
                                <p className="text-sm">{service.customer?.name || 'Cliente'}</p>
                                <p className="text-xs text-muted-foreground">
                                  {service.appliance_type}
                                  {service.fault_description && ` - ${service.fault_description}`}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              {service.scheduled_date && (
                                <p className="text-xs text-muted-foreground">
                                  {formatLocalDate(service.scheduled_date, 'dd/MM/yyyy')}
                                </p>
                              )}
                              <ServiceStatusBadge
                                service={{
                                  status: service.status as any,
                                  pending_pricing: service.pending_pricing,
                                  final_price: service.final_price ?? 0,
                                  amount_paid: service.amount_paid ?? 0,
                                  service_location: service.service_location as any,
                                  service_type: service.service_type as any,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                      {tech.data.services.length > 10 && (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          +{tech.data.services.length - 10} serviços adicionais
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {technicians.length === 0 && (
        <Card className="p-12">
          <p className="text-center text-muted-foreground">Nenhum técnico cadastrado</p>
        </Card>
      )}
    </div>
  );
}
