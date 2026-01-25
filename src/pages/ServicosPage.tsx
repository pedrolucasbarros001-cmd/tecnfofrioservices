import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar, MapPin, Play } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SERVICE_STATUS_CONFIG, SHIFT_CONFIG, type Service } from '@/types/database';

export default function ServicosPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchServices();
  }, [profile]);

  async function fetchServices() {
    if (!profile) return;
    
    setLoading(true);
    try {
      // First get the technician record for this profile
      const { data: technicianData, error: techError } = await supabase
        .from('technicians')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (techError && techError.code !== 'PGRST116') {
        console.error('Error fetching technician:', techError);
      }

      if (!technicianData) {
        setServices([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          customer:customers(*)
        `)
        .eq('technician_id', technicianData.id)
        .in('status', ['por_fazer', 'em_execucao', 'na_oficina'])
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      setServices((data as Service[]) || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredServices = services.filter((service) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      service.code?.toLowerCase().includes(search) ||
      service.customer?.name?.toLowerCase().includes(search) ||
      service.appliance_type?.toLowerCase().includes(search)
    );
  });

  // Navigate to the appropriate workflow based on service type
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Meus Serviços</h1>
        <p className="text-muted-foreground">Serviços atribuídos a você</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Services List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            A carregar serviços...
          </div>
        ) : filteredServices.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhum serviço atribuído.
            </CardContent>
          </Card>
        ) : (
          filteredServices.map((service) => {
            const statusConfig = SERVICE_STATUS_CONFIG[service.status];
            const shiftConfig = service.scheduled_shift ? SHIFT_CONFIG[service.scheduled_shift] : null;
            
            return (
              <Card
                key={service.id}
                className="cursor-pointer hover:shadow-md transition-all"
                onClick={() => handleStartService(service)}
              >
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-semibold text-primary">
                            {service.code}
                          </span>
                          <Badge className={statusConfig.color}>
                            {statusConfig.label}
                          </Badge>
                          {service.is_urgent && (
                            <Badge variant="destructive">Urgente</Badge>
                          )}
                        </div>
                        <p className="font-medium truncate">
                          {service.customer?.name || 'Cliente não definido'}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {[service.appliance_type, service.brand, service.model]
                            .filter(Boolean)
                            .join(' • ')}
                        </p>
                      </div>

                      {/* Start Button */}
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
                    </div>

                    {/* Schedule info */}
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
                          {shiftConfig && (
                            <span className="text-primary font-medium">
                              • {shiftConfig.label}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Address */}
                    {(service.service_address || service.customer?.address) && (
                      <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">
                          {service.service_address || service.customer?.address}
                        </span>
                      </div>
                    )}

                    {/* Service Type Badge */}
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-xs">
                        {service.service_location === 'oficina' ? 'Oficina' : 'Visita'}
                      </Badge>
                      {service.service_type === 'instalacao' && (
                        <Badge variant="outline" className="text-xs bg-purple-50">
                          Instalação
                        </Badge>
                      )}
                      {service.service_type === 'entrega' && (
                        <Badge variant="outline" className="text-xs bg-teal-50">
                          Entrega
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        {filteredServices.length} serviço{filteredServices.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
