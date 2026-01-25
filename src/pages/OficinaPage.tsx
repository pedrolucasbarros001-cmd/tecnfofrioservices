import { useEffect, useState } from 'react';
import { Search, Wrench } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { SERVICE_STATUS_CONFIG, type Service } from '@/types/database';

export default function OficinaPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchServices();
  }, []);

  async function fetchServices() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          customer:customers(*),
          technician:technicians!services_technician_id_fkey(*, profile:profiles(*))
        `)
        .eq('service_location', 'oficina')
        .order('created_at', { ascending: false });

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
      service.appliance_type?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/10">
            <Wrench className="h-6 w-6 text-purple-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Oficina</h1>
            <p className="text-muted-foreground">Serviços atualmente na oficina</p>
          </div>
        </div>
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
              Nenhum serviço na oficina.
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
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        {filteredServices.length} serviço{filteredServices.length !== 1 ? 's' : ''} na oficina
      </p>
    </div>
  );
}
