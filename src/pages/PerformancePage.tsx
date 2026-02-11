import { useQuery } from '@tanstack/react-query';
import { Package, Wrench, Truck } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useTechnicians } from '@/hooks/useTechnicians';
import { supabase } from '@/integrations/supabase/client';

const STATUS_LABELS: Record<string, string> = {
  por_fazer: 'Aberto',
  em_execucao: 'Em Execução',
  na_oficina: 'Oficina',
  concluidos: 'Oficina Reparados',
  em_debito: 'Em Débito',
  finalizado: 'Concluídos',
  entregas: 'Entrega',
};

export default function PerformancePage() {
  const { data: technicians = [] } = useTechnicians(false);

  const { data: services = [] } = useQuery({
    queryKey: ['services-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*, customer:customers(*), technician:technicians!services_technician_id_fkey(*, profile:profiles(*))')
        .order('created_at', { ascending: false });

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

    const chartData = [
      { name: 'Entregas', value: entregas.length, color: '#10b981' },
      { name: 'Instalações', value: instalacoes.length, color: '#f59e0b' },
      { name: 'Reparações', value: reparacoes.length, color: '#3b82f6' },
    ].filter((item) => item.value > 0);

    return {
      services: techServices,
      entregas,
      instalacoes,
      reparacoes,
      chartData,
      total: techServices.length,
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

  const techniciansWithData = technicians
    .map((tech) => ({
      ...tech,
      data: getTechnicianData(tech.id),
    }))
    .filter((tech) => tech.data.total > 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Performance de Técnicos</h1>
        <p className="text-muted-foreground">Visualização da carga de trabalho por técnico</p>
      </div>

      {/* Technicians Grid */}
      <div className="space-y-6" data-tour="performance-cards">
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
                  {tech.data.chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={tech.data.chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {tech.data.chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      Sem dados
                    </div>
                  )}
                </div>

                {/* Services List */}
                <div className="lg:col-span-2 space-y-2 max-h-[300px] overflow-y-auto">
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
                              {new Date(service.scheduled_date).toLocaleDateString('pt-PT')}
                            </p>
                          )}
                          <Badge
                            variant="outline"
                            className={
                              service.status === 'concluidos' || service.status === 'finalizado'
                                ? 'border-green-500 text-green-700'
                                : service.status === 'em_debito'
                                ? 'border-orange-500 text-orange-700'
                                : 'border-blue-500 text-blue-700'
                            }
                          >
                            {STATUS_LABELS[service.status] || service.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                  {tech.data.services.length > 10 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      +{tech.data.services.length - 10} serviços adicionais
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {techniciansWithData.length === 0 && (
        <Card className="p-12">
          <p className="text-center text-muted-foreground">
            {technicians.length === 0
              ? 'Nenhum técnico cadastrado'
              : 'Nenhum técnico com serviços atribuídos'}
          </p>
        </Card>
      )}
    </div>
  );
}
