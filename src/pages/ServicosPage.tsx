import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar, MapPin, Play, UserPlus, CheckCircle, Wrench, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SERVICE_STATUS_CONFIG, SHIFT_CONFIG, type Service } from '@/types/database';
import { toast } from 'sonner';

export default function ServicosPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [technicianId, setTechnicianId] = useState<string | null>(null);
  const [availableServices, setAvailableServices] = useState<Service[]>([]);
  const [myServices, setMyServices] = useState<Service[]>([]);
  const [completedServices, setCompletedServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (profile) {
      fetchTechnicianAndServices();
    }
  }, [profile]);

  async function fetchTechnicianAndServices() {
    if (!profile) return;
    
    setLoading(true);
    try {
      // First get the technician record for this profile
      const { data: technicianData, error: techError } = await supabase
        .from('technicians')
        .select('id')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (techError) {
        console.error('Error fetching technician:', techError);
        setLoading(false);
        return;
      }

      if (!technicianData) {
        setLoading(false);
        return;
      }

      setTechnicianId(technicianData.id);

      // Fetch all three categories in parallel
      const [availableResult, myResult, completedResult] = await Promise.all([
        // Available to assume: workshop services without technician
        supabase
          .from('services')
          .select(`*, customer:customers(*)`)
          .eq('service_location', 'oficina')
          .is('technician_id', null)
          .in('status', ['por_fazer', 'na_oficina'])
          .order('created_at', { ascending: false }),

        // My active services
        supabase
          .from('services')
          .select(`*, customer:customers(*)`)
          .eq('technician_id', technicianData.id)
          .in('status', ['por_fazer', 'em_execucao', 'na_oficina', 'para_pedir_peca', 'em_espera_de_peca'])
          .order('scheduled_date', { ascending: true }),

        // Completed by me (recent)
        supabase
          .from('services')
          .select(`*, customer:customers(*)`)
          .eq('technician_id', technicianData.id)
          .in('status', ['concluidos', 'a_precificar', 'finalizado'])
          .order('updated_at', { ascending: false })
          .limit(20),
      ]);

      if (availableResult.error) throw availableResult.error;
      if (myResult.error) throw myResult.error;
      if (completedResult.error) throw completedResult.error;

      setAvailableServices((availableResult.data as Service[]) || []);
      setMyServices((myResult.data as Service[]) || []);
      setCompletedServices((completedResult.data as Service[]) || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleAssumeService = async (serviceId: string) => {
    if (!technicianId) return;

    try {
      const { error } = await supabase
        .from('services')
        .update({ technician_id: technicianId })
        .eq('id', serviceId);

      if (error) throw error;

      toast.success('Serviço assumido com sucesso!');
      fetchTechnicianAndServices();
    } catch (error) {
      console.error('Error assuming service:', error);
      toast.error('Erro ao assumir serviço');
    }
  };

  const handleStartService = (service: Service) => {
    if (service.service_type === 'entrega') {
      navigate(`/technician/delivery/${service.id}`);
    } else if (service.service_type === 'instalacao') {
      navigate(`/technician/installation/${service.id}`);
    } else if (service.service_location === 'oficina') {
      navigate(`/technician/workshop/${service.id}`);
    } else {
      navigate(`/technician/visit/${service.id}`);
    }
  };

  const filterServices = (services: Service[]) => {
    if (!searchTerm) return services;
    const search = searchTerm.toLowerCase();
    return services.filter(
      (s) =>
        s.code?.toLowerCase().includes(search) ||
        s.customer?.name?.toLowerCase().includes(search) ||
        s.appliance_type?.toLowerCase().includes(search)
    );
  };

  const ServiceCard = ({
    service,
    showAssumeButton = false,
    showStartButton = false,
    isCompleted = false,
  }: {
    service: Service;
    showAssumeButton?: boolean;
    showStartButton?: boolean;
    isCompleted?: boolean;
  }) => {
    const statusConfig = SERVICE_STATUS_CONFIG[service.status];
    const shiftConfig = service.scheduled_shift ? SHIFT_CONFIG[service.scheduled_shift] : null;

    return (
      <Card
        className={`cursor-pointer hover:shadow-md transition-all ${isCompleted ? 'opacity-70' : ''}`}
        onClick={() => !showAssumeButton && handleStartService(service)}
      >
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-mono font-semibold text-primary">{service.code}</span>
                  <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                  {service.is_urgent && <Badge variant="destructive">Urgente</Badge>}
                  {service.is_warranty && (
                    <Badge variant="outline" className="border-green-500 text-green-700">
                      Garantia
                    </Badge>
                  )}
                </div>
                <p className="font-medium truncate">{service.customer?.name || 'Cliente não definido'}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {[service.appliance_type, service.brand, service.model].filter(Boolean).join(' • ')}
                </p>
              </div>

              {showAssumeButton && (
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 border-blue-500 text-blue-600 hover:bg-blue-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAssumeService(service.id);
                  }}
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  Assumir
                </Button>
              )}

              {showStartButton && (
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartService(service);
                  }}
                >
                  <Play className="h-4 w-4 mr-1" />
                  Iniciar
                </Button>
              )}
            </div>

            {service.scheduled_date && (
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {new Date(service.scheduled_date).toLocaleDateString('pt-PT', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                  {shiftConfig && <span className="text-primary font-medium">• {shiftConfig.label}</span>}
                </div>
              </div>
            )}

            {(service.service_address || service.customer?.address) && (
              <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="line-clamp-2">{service.service_address || service.customer?.address}</span>
              </div>
            )}

            <div className="flex gap-2">
              <Badge variant="outline" className="text-xs">
                {service.service_location === 'oficina' ? 'Oficina' : 'Visita'}
              </Badge>
              {service.service_type === 'instalacao' && (
                <Badge variant="outline" className="text-xs bg-purple-50 border-purple-200">
                  Instalação
                </Badge>
              )}
              {service.service_type === 'entrega' && (
                <Badge variant="outline" className="text-xs bg-teal-50 border-teal-200">
                  Entrega
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const filteredAvailable = filterServices(availableServices);
  const filteredMy = filterServices(myServices);
  const filteredCompleted = filterServices(completedServices);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Oficina - Técnico</h1>
        <p className="text-muted-foreground">Gerir serviços atribuídos e disponíveis</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar por código, cliente ou aparelho..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">A carregar serviços...</div>
      ) : (
        <div className="space-y-8">
          {/* Section 1: Available to Assume */}
          <section>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Package className="h-5 w-5 text-blue-600" />
                  Serviços Disponíveis para Assumir
                  <Badge variant="secondary" className="ml-2">
                    {filteredAvailable.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredAvailable.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Não há serviços disponíveis para assumir.
                  </p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {filteredAvailable.map((service) => (
                      <ServiceCard key={service.id} service={service} showAssumeButton />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Section 2: My Workshop Services */}
          <section>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Wrench className="h-5 w-5 text-orange-600" />
                  Meus Serviços na Oficina
                  <Badge variant="secondary" className="ml-2">
                    {filteredMy.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredMy.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Não tem serviços atribuídos no momento.
                  </p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {filteredMy.map((service) => (
                      <ServiceCard key={service.id} service={service} showStartButton />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Section 3: Completed by Me */}
          <section>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Serviços Concluídos por Mim
                  <Badge variant="secondary" className="ml-2">
                    {filteredCompleted.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredCompleted.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Ainda não concluiu nenhum serviço.
                  </p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {filteredCompleted.map((service) => (
                      <ServiceCard key={service.id} service={service} isCompleted />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      )}
    </div>
  );
}
