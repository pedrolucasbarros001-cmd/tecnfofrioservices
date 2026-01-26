import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Wrench, Sun, Moon, Sunrise, Play, UserPlus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { WorkshopFlowModals } from '@/components/technician/WorkshopFlowModals';
import { useUpdateService } from '@/hooks/useServices';
import { toast } from 'sonner';
import type { Service } from '@/types/database';

const SHIFT_ICONS: Record<string, { icon: typeof Sun; color: string }> = {
  manha: { icon: Sunrise, color: 'text-amber-500' },
  tarde: { icon: Sun, color: 'text-orange-500' },
  noite: { icon: Moon, color: 'text-indigo-500' },
};

export default function TechnicianOfficePage() {
  const { profile } = useAuth();
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [flowOpen, setFlowOpen] = useState(false);
  const queryClient = useQueryClient();
  const updateService = useUpdateService();

  // Query for services assigned to current technician
  const { data: services = [], isLoading, refetch } = useQuery({
    queryKey: ['technician-office-services', profile?.id],
    queryFn: async () => {
      if (!profile) return [];

      // Get technician record
      const { data: tech, error: techError } = await supabase
        .from('technicians')
        .select('id')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (techError || !tech) return [];

      // Fetch workshop services assigned to this technician
      const { data, error } = await supabase
        .from('services')
        .select('*, customer:customers(*)')
        .eq('technician_id', tech.id)
        .eq('service_location', 'oficina')
        .in('status', ['por_fazer', 'em_execucao', 'na_oficina', 'para_pedir_peca', 'em_espera_de_peca'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as Service[]) || [];
    },
    enabled: !!profile,
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  // Query for available services (no technician assigned)
  const { data: availableServices = [], isLoading: isLoadingAvailable, refetch: refetchAvailable } = useQuery({
    queryKey: ['available-workshop-services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*, customer:customers(*)')
        .is('technician_id', null)
        .eq('service_location', 'oficina')
        .in('status', ['por_fazer', 'na_oficina'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as Service[]) || [];
    },
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  // Handle assuming a service
  const handleAssumeService = async (service: Service) => {
    if (!profile) return;

    try {
      // Get technician ID
      const { data: tech, error: techError } = await supabase
        .from('technicians')
        .select('id')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (techError || !tech) {
        toast.error('Não foi possível identificar o técnico.');
        return;
      }

      await updateService.mutateAsync({
        id: service.id,
        technician_id: tech.id,
        status: 'na_oficina',
      });

      toast.success('Serviço assumido com sucesso!');
      refetch();
      refetchAvailable();
      queryClient.invalidateQueries({ queryKey: ['services'] });
    } catch (error) {
      console.error('Error assuming service:', error);
      toast.error('Erro ao assumir serviço');
    }
  };

  const handleStartFlow = (service: Service) => {
    setSelectedService(service);
    setFlowOpen(true);
  };

  const handleFlowComplete = () => {
    setFlowOpen(false);
    setSelectedService(null);
    refetch();
  };

  const handleFlowClose = () => {
    setFlowOpen(false);
    setSelectedService(null);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      por_fazer: { label: 'Por Fazer', className: 'bg-slate-100 text-slate-700' },
      em_execucao: { label: 'Em Execução', className: 'bg-blue-100 text-blue-700' },
      na_oficina: { label: 'Na Oficina', className: 'bg-orange-100 text-orange-700' },
      para_pedir_peca: { label: 'Pedir Peça', className: 'bg-amber-100 text-amber-700' },
      em_espera_de_peca: { label: 'Aguarda Peça', className: 'bg-purple-100 text-purple-700' },
    };
    const info = statusMap[status] || { label: status, className: 'bg-muted text-muted-foreground' };
    return <Badge className={cn('text-xs', info.className)}>{info.label}</Badge>;
  };

  // Service card component for reuse
  const ServiceCard = ({ service, isAvailable = false }: { service: Service; isAvailable?: boolean }) => {
    const shiftInfo = service.scheduled_shift ? SHIFT_ICONS[service.scheduled_shift] : null;
    const ShiftIcon = shiftInfo?.icon || Sun;

    return (
      <Card
        className={cn(
          'hover:shadow-md transition-shadow',
          isAvailable 
            ? 'bg-slate-50 border-l-4 border-l-slate-400' 
            : 'bg-orange-50 border-l-4 border-l-orange-500'
        )}
      >
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="font-mono font-bold text-sm">{service.code}</span>
                <p className="font-medium text-sm truncate mt-0.5">
                  {service.customer?.name || 'Cliente não definido'}
                </p>
              </div>
              {getStatusBadge(service.status || 'por_fazer')}
            </div>

            {/* Appliance */}
            <div className="text-sm">
              <p className="text-muted-foreground text-xs">Aparelho</p>
              <p className="font-medium truncate">{service.appliance_type || 'Não especificado'}</p>
            </div>

            {/* Fault */}
            <div className="text-sm">
              <p className="text-muted-foreground text-xs">Avaria</p>
              <p className="line-clamp-2">{service.fault_description || 'Sem descrição'}</p>
            </div>

            {/* Tags + Shift */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1">
                {service.is_urgent && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                    Urgente
                  </Badge>
                )}
                {service.is_warranty && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-500 text-green-700">
                    Garantia
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <ShiftIcon className={cn('h-3.5 w-3.5', shiftInfo?.color)} />
                <span className="capitalize">{service.scheduled_shift || 'Sem turno'}</span>
              </div>
            </div>

            {/* Action Button */}
            {isAvailable ? (
              <Button
                className="w-full bg-slate-600 hover:bg-slate-700 h-9"
                onClick={() => handleAssumeService(service)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Assumir Serviço
              </Button>
            ) : (
              <Button
                className="w-full bg-orange-500 hover:bg-orange-600 h-9"
                onClick={() => handleStartFlow(service)}
              >
                <Play className="h-4 w-4 mr-2" />
                Começar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6 h-full flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500">
          <Wrench className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Oficina</h1>
          <p className="text-sm text-muted-foreground">
            {services.length} {services.length === 1 ? 'serviço atribuído' : 'serviços atribuídos'}
            {availableServices.length > 0 && ` • ${availableServices.length} disponíveis para assumir`}
          </p>
        </div>
      </div>

      {/* Available Services Section */}
      {availableServices.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Serviços Disponíveis para Assumir
          </h2>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {availableServices.map((service) => (
              <ServiceCard key={service.id} service={service} isAvailable />
            ))}
          </div>
        </div>
      )}

      {/* My Services Section */}
      <div className="space-y-3 flex-1">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Meus Serviços na Oficina
        </h2>
        
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground py-12">
            A carregar serviços...
          </div>
        ) : services.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-12">
            <Wrench className="h-12 w-12 mb-4 opacity-30" />
            <p className="font-medium">Sem serviços atribuídos</p>
            <p className="text-sm">
              {availableServices.length > 0 
                ? 'Pode assumir serviços da secção acima.' 
                : 'Quando tiver serviços atribuídos, aparecerão aqui.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        )}
      </div>

      {/* Workshop Flow Modals */}
      {selectedService && (
        <WorkshopFlowModals
          service={selectedService}
          isOpen={flowOpen}
          onClose={handleFlowClose}
          onComplete={handleFlowComplete}
        />
      )}
    </div>
  );
}
