import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Sun, Moon, Sunrise, CalendarDays, Play } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format, addDays, subDays, isSameDay, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { VisitFlowModals } from '@/components/technician/VisitFlowModals';
import { InstallationFlowModals } from '@/components/technician/InstallationFlowModals';
import { DeliveryFlowModals } from '@/components/technician/DeliveryFlowModals';
import type { Service } from '@/types/database';

const SHIFT_CONFIG = {
  manha: { label: 'Manhã', icon: Sunrise, color: 'text-amber-500' },
  tarde: { label: 'Tarde', icon: Sun, color: 'text-orange-500' },
  noite: { label: 'Noite', icon: Moon, color: 'text-indigo-500' },
  sem_turno: { label: 'Sem Turno Definido', icon: CalendarDays, color: 'text-muted-foreground' },
} as const;

type ShiftKey = keyof typeof SHIFT_CONFIG;
type FlowType = 'visit' | 'installation' | 'delivery' | null;

export default function ServicosPage() {
  const { profile } = useAuth();
  
  // Current date state for daily navigation
  const [currentDate, setCurrentDate] = useState(() => new Date());

  // Modal state
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [activeFlow, setActiveFlow] = useState<FlowType>(null);

  // Use React Query for proper caching and refetch
  const { data: services = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['technician-services', profile?.id],
    queryFn: async () => {
      if (!profile) return [];

      // Get the technician record for this profile
      const { data: technicianData, error: techError } = await supabase
        .from('technicians')
        .select('id')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (techError) {
        console.error('Error fetching technician:', techError);
        return [];
      }

      if (!technicianData) {
        return [];
      }

      // Fetch all services assigned to this technician (active ones, NOT in oficina for this view)
      const { data, error } = await supabase
        .from('services')
        .select('*, customer:customers(*)')
        .eq('technician_id', technicianData.id)
        .neq('service_location', 'oficina') // Workshop services go to the Oficina page
        .in('status', ['por_fazer', 'em_execucao', 'para_pedir_peca', 'em_espera_de_peca'])
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      return (data as Service[]) || [];
    },
    enabled: !!profile,
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  // Navigation functions
  const goToPrevious = () => setCurrentDate(prev => subDays(prev, 1));
  const goToToday = () => setCurrentDate(new Date());
  const goToNext = () => setCurrentDate(prev => addDays(prev, 1));

  // Check if current date is today
  const isToday = useMemo(() => isSameDay(currentDate, new Date()), [currentDate]);

  // Filter services for current day
  const dayServices = useMemo(() => {
    return services.filter(service => {
      if (!service.scheduled_date) return false;
      return isSameDay(parseISO(service.scheduled_date), currentDate);
    });
  }, [services, currentDate]);

  // Group services by shift
  const groupedByShift = useMemo(() => {
    return {
      manha: dayServices.filter(s => s.scheduled_shift === 'manha'),
      tarde: dayServices.filter(s => s.scheduled_shift === 'tarde'),
      noite: dayServices.filter(s => s.scheduled_shift === 'noite'),
      sem_turno: dayServices.filter(s => !s.scheduled_shift),
    };
  }, [dayServices]);

  const handleStartFlow = (service: Service, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedService(service);
    
    if (service.service_type === 'entrega') {
      setActiveFlow('delivery');
    } else if (service.service_type === 'instalacao') {
      setActiveFlow('installation');
    } else {
      setActiveFlow('visit');
    }
  };

  const handleCloseFlow = () => {
    setSelectedService(null);
    setActiveFlow(null);
  };

  const handleFlowComplete = () => {
    setSelectedService(null);
    setActiveFlow(null);
    refetch();
  };

  // Get button config based on service type
  const getServiceConfig = (service: Service) => {
    if (service.service_type === 'entrega') {
      return { 
        badgeColor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        badgeLabel: 'Entrega',
        cardBorder: 'border-l-green-500',
        buttonColor: 'bg-green-500 hover:bg-green-600 text-white',
      };
    }
    if (service.service_type === 'instalacao') {
      return { 
        badgeColor: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        badgeLabel: 'Instalação',
        cardBorder: 'border-l-yellow-500',
        buttonColor: 'bg-yellow-500 hover:bg-yellow-600 text-black',
      };
    }
    // Default: Visita (blue)
    return { 
      badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      badgeLabel: 'Visita',
      cardBorder: 'border-l-blue-500',
      buttonColor: 'bg-blue-500 hover:bg-blue-600 text-white',
    };
  };

  const ServiceCard = ({ service }: { service: Service }) => {
    const shiftKey = (service.scheduled_shift || 'sem_turno') as ShiftKey;
    const shiftConfig = SHIFT_CONFIG[shiftKey] || SHIFT_CONFIG.sem_turno;
    const ShiftIcon = shiftConfig.icon;
    const serviceConfig = getServiceConfig(service);
    
    return (
      <Card className={cn('border-l-4 transition-shadow hover:shadow-md', serviceConfig.cardBorder)}>
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Header: Code + Badge */}
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono font-bold text-sm text-foreground">
                {service.code}
              </span>
              <Badge variant="secondary" className={cn('text-xs shrink-0', serviceConfig.badgeColor)}>
                {serviceConfig.badgeLabel}
              </Badge>
            </div>

            {/* Client Name */}
            <p className="font-medium text-base">
              {service.customer?.name || 'Cliente'}
            </p>

            {/* Appliance + Fault */}
            <p className="text-sm text-muted-foreground line-clamp-2">
              {service.appliance_type || 'Aparelho'} - {service.fault_description || 'Sem descrição'}
            </p>

            {/* Shift + Tags */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1.5">
                <ShiftIcon className={cn('h-4 w-4', shiftConfig.color)} />
                <span className="text-xs text-muted-foreground">
                  {shiftConfig.label}
                </span>
              </div>
              <div className="flex gap-1">
                {service.is_urgent && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5">
                    Urgente
                  </Badge>
                )}
                {service.is_warranty && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-green-500 text-green-700 dark:text-green-400">
                    Garantia
                  </Badge>
                )}
              </div>
            </div>

            {/* Start Button */}
            <Button
              size="sm"
              className={cn('w-full h-9 text-sm mt-2', serviceConfig.buttonColor)}
              onClick={(e) => handleStartFlow(service, e)}
            >
              <Play className="h-4 w-4 mr-1.5" />
              Começar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const ShiftSection = ({ shiftKey }: { shiftKey: ShiftKey }) => {
    const shiftServices = groupedByShift[shiftKey];
    const config = SHIFT_CONFIG[shiftKey];
    const ShiftIcon = config.icon;

    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <ShiftIcon className={cn('h-5 w-5', config.color)} />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {config.label}
          </h3>
          {shiftServices.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {shiftServices.length}
            </Badge>
          )}
        </div>
        
        {shiftServices.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg border-dashed">
            Sem serviços
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shiftServices.map(service => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6 h-full flex flex-col overflow-hidden">
      {/* Header with Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-6 w-6 text-primary" />
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Agenda</h1>
        </div>
        
        {/* Day Navigation */}
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            className="h-9 w-9"
            onClick={goToPrevious}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <Button
            variant={isToday ? "default" : "outline"}
            onClick={goToToday}
            className="min-w-[180px] md:min-w-[220px] text-sm h-9"
          >
            {format(currentDate, "EEEE, d 'de' MMMM", { locale: pt })}
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon"
            className="h-9 w-9"
            onClick={goToNext}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          A carregar serviços...
        </div>
      ) : dayServices.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12">
          <CalendarDays className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <p className="text-lg text-muted-foreground">Sem serviços para este dia</p>
          <p className="text-sm text-muted-foreground mt-1">
            Use as setas para ver outros dias
          </p>
        </div>
      ) : (
        <div className="flex-1 space-y-8 overflow-y-auto">
          {(['manha', 'tarde', 'noite', 'sem_turno'] as const).map(shiftKey => (
            <ShiftSection key={shiftKey} shiftKey={shiftKey} />
          ))}
        </div>
      )}

      {/* Flow Modals */}
      {selectedService && activeFlow === 'visit' && (
        <VisitFlowModals
          service={selectedService}
          isOpen={true}
          onClose={handleCloseFlow}
          onComplete={handleFlowComplete}
        />
      )}

      {selectedService && activeFlow === 'installation' && (
        <InstallationFlowModals
          service={selectedService}
          isOpen={true}
          onClose={handleCloseFlow}
          onComplete={handleFlowComplete}
        />
      )}

      {selectedService && activeFlow === 'delivery' && (
        <DeliveryFlowModals
          service={selectedService}
          isOpen={true}
          onClose={handleCloseFlow}
          onComplete={handleFlowComplete}
        />
      )}
    </div>
  );
}
