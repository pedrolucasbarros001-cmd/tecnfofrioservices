import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Filter, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { SERVICE_STATUS_CONFIG, type Service, type ServiceStatus } from '@/types/database';

export default function GeralPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<ServiceStatus | 'all'>(
    (searchParams.get('status') as ServiceStatus) || 'all'
  );

  useEffect(() => {
    fetchServices();
  }, [selectedStatus]);

  async function fetchServices() {
    setLoading(true);
    try {
      let query = supabase
        .from('services')
        .select(`
          *,
          customer:customers(*),
          technician:technicians!services_technician_id_fkey(*, profile:profiles(*))
        `)
        .order('created_at', { ascending: false });

      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      setServices((data as unknown as Service[]) || []);
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
      service.appliance_type?.toLowerCase().includes(search) ||
      service.brand?.toLowerCase().includes(search)
    );
  });

  const handleStatusFilter = (status: ServiceStatus | 'all') => {
    setSelectedStatus(status);
    if (status === 'all') {
      searchParams.delete('status');
    } else {
      searchParams.set('status', status);
    }
    setSearchParams(searchParams);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Geral</h1>
          <p className="text-muted-foreground">Todos os serviços do sistema</p>
        </div>
        <Button className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Novo Serviço
        </Button>
      </div>

      {/* Status Filter Cards */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <Button
          variant={selectedStatus === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleStatusFilter('all')}
          className="shrink-0"
        >
          Todos
        </Button>
        {Object.entries(SERVICE_STATUS_CONFIG).map(([status, config]) => (
          <Button
            key={status}
            variant={selectedStatus === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleStatusFilter(status as ServiceStatus)}
            className="shrink-0"
          >
            {config.label}
          </Button>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por código, cliente, equipamento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
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
              {searchTerm || selectedStatus !== 'all'
                ? 'Nenhum serviço encontrado com os filtros aplicados.'
                : 'Ainda não existem serviços. Crie o primeiro!'}
            </CardContent>
          </Card>
        ) : (
          filteredServices.map((service) => {
            const statusConfig = SERVICE_STATUS_CONFIG[service.status];
            return (
              <Card
                key={service.id}
                className="cursor-pointer hover:shadow-md transition-all"
              >
                <CardContent className="p-4">
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
                        {service.is_warranty && (
                          <Badge variant="secondary">Garantia</Badge>
                        )}
                      </div>
                      <p className="font-medium truncate">
                        {service.customer?.name || 'Cliente não definido'}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {[service.appliance_type, service.brand, service.model]
                          .filter(Boolean)
                          .join(' • ') || 'Equipamento não definido'}
                      </p>
                      {service.fault_description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                          {service.fault_description}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {service.scheduled_date && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(service.scheduled_date).toLocaleDateString('pt-PT')}
                        </div>
                      )}
                      {service.technician?.profile && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {service.technician.profile.full_name}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Results count */}
      {!loading && (
        <p className="text-sm text-muted-foreground">
          {filteredServices.length} serviço{filteredServices.length !== 1 ? 's' : ''} encontrado{filteredServices.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
