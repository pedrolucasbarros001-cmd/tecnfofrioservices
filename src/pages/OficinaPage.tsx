import { useState } from 'react';
import { Search, Wrench, Copy, Monitor } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ServiceDetailSheet } from '@/components/services/ServiceDetailSheet';
import { useServices } from '@/hooks/useServices';
import { SERVICE_STATUS_CONFIG, type Service } from '@/types/database';
import { toast } from 'sonner';

export default function OficinaPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  
  const { data: services = [], isLoading } = useServices({ location: 'oficina' });

  const filteredServices = services.filter((service) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      service.code?.toLowerCase().includes(search) ||
      service.customer?.name?.toLowerCase().includes(search) ||
      service.appliance_type?.toLowerCase().includes(search)
    );
  });

  const handleCopyTVLink = () => {
    const url = `${window.location.origin}/tv-monitor`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado para a área de transferência!');
  };

  const handleOpenMonitor = () => {
    window.open('/tv-monitor', '_blank');
  };

  const handleServiceClick = (service: Service) => {
    setSelectedService(service);
    setShowDetailSheet(true);
  };

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
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCopyTVLink}>
            <Copy className="h-4 w-4 mr-2" />
            Copiar Link TV
          </Button>
          <Button onClick={handleOpenMonitor} className="bg-purple-600 hover:bg-purple-700">
            <Monitor className="h-4 w-4 mr-2" />
            Abrir Monitor
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="secondary">
          {filteredServices.length} na oficina
        </Badge>
      </div>

      {/* Services List */}
      <div className="space-y-3">
        {isLoading ? (
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
                onClick={() => handleServiceClick(service)}
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
                          <Badge variant="destructive" className="animate-pulse">Urgente</Badge>
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
                    {service.technician?.profile && (
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: service.technician.color || '#3B82F6' }}
                        />
                        <span className="text-sm text-muted-foreground">
                          {service.technician.profile.full_name}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <ServiceDetailSheet
        service={selectedService}
        open={showDetailSheet}
        onOpenChange={setShowDetailSheet}
      />
    </div>
  );
}
