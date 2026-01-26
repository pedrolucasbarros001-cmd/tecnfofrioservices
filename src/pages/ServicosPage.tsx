import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Sun, Moon, Sunrise, CalendarDays, Play, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format, addDays, isSameDay, startOfWeek } from 'date-fns';
import { pt } from 'date-fns/locale';
import { VisitFlowModals } from '@/components/technician/VisitFlowModals';
import { InstallationFlowModals } from '@/components/technician/InstallationFlowModals';
import { DeliveryFlowModals } from '@/components/technician/DeliveryFlowModals';
import type { Service } from '@/types/database';

const WEEK_DAYS = [
  { key: 'segunda', label: 'Segunda', offset: 0 },
  { key: 'terca', label: 'Terça', offset: 1 },
  { key: 'quarta', label: 'Quarta', offset: 2 },
  { key: 'quinta', label: 'Quinta', offset: 3 },
  { key: 'sexta', label: 'Sexta', offset: 4 },
  { key: 'sabado', label: 'Sábado', offset: 5 },
];

const SHIFT_ICONS: Record<string, { icon: typeof Sun; color: string }> = {
  manha: { icon: Sunrise, color: 'text-amber-500' },
  tarde: { icon: Sun, color: 'text-orange-500' },
  noite: { icon: Moon, color: 'text-indigo-500' },
};

type FlowType = 'visit' | 'installation' | 'delivery' | null;

export default function ServicosPage() {
  const { profile } = useAuth();
  
  // Get Monday of current week
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

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

  const navigateWeek = (direction: -1 | 1) => {
    setCurrentWeekStart(prev => addDays(prev, direction * 7));
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  // Organize services by day
  const servicesByDay = useMemo(() => {
    const result: Record<number, Service[]> = {};
    WEEK_DAYS.forEach((_, idx) => { result[idx] = []; });
    
    services.forEach(service => {
      if (!service.scheduled_date) return;
      
      const serviceDate = new Date(service.scheduled_date);
      WEEK_DAYS.forEach((day, idx) => {
        const targetDate = addDays(currentWeekStart, day.offset);
        if (isSameDay(serviceDate, targetDate)) {
          result[idx].push(service);
        }
      });
    });
    
    return result;
  }, [services, currentWeekStart]);

  // Check if current week
  const isCurrentWeek = useMemo(() => {
    const today = new Date();
    const todayWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    return isSameDay(currentWeekStart, todayWeekStart);
  }, [currentWeekStart]);

  // Get today's day index
  const todayIndex = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    // Convert Sunday (0) to -1 (not shown), Monday (1) to 0, etc.
    return dayOfWeek === 0 ? -1 : dayOfWeek - 1;
  }, []);

  // Get button config based on service type
  const getButtonConfig = (service: Service) => {
    if (service.service_type === 'entrega') {
      return { 
        label: 'Começar', 
        color: 'bg-green-500 hover:bg-green-600 text-white',
        badgeColor: 'bg-green-100 text-green-700',
        badgeLabel: 'Entrega',
        cardColor: 'bg-green-50 border-l-green-500'
      };
    }
    if (service.service_type === 'instalacao') {
      return { 
        label: 'Começar', 
        color: 'bg-yellow-500 hover:bg-yellow-600 text-black',
        badgeColor: 'bg-yellow-100 text-yellow-700',
        badgeLabel: 'Instalação',
        cardColor: 'bg-yellow-50 border-l-yellow-500'
      };
    }
    // Default: Visita (blue)
    return { 
      label: 'Começar', 
      color: 'bg-blue-500 hover:bg-blue-600 text-white',
      badgeColor: 'bg-blue-100 text-blue-700',
      badgeLabel: 'Visita',
      cardColor: 'bg-blue-50 border-l-blue-500'
    };
  };

  const ServiceCard = ({ service }: { service: Service }) => {
    const shiftInfo = service.scheduled_shift ? SHIFT_ICONS[service.scheduled_shift] : null;
    const ShiftIcon = shiftInfo?.icon || Sun;
    const buttonConfig = getButtonConfig(service);
    
    return (
      <Card
        className={cn(
          'border-l-4 transition-shadow hover:shadow-md',
          buttonConfig.cardColor
        )}
      >
        <CardContent className="p-2 md:p-3">
          <div className="space-y-1.5 md:space-y-2">
            {/* Code + Badge */}
            <div className="flex items-center justify-between gap-1">
              <span className="font-mono font-bold text-xs md:text-sm text-foreground truncate">
                {service.code}
              </span>
              <Badge 
                variant="secondary" 
                className={cn('text-[10px] md:text-xs shrink-0', buttonConfig.badgeColor)}
              >
                {buttonConfig.badgeLabel}
              </Badge>
            </div>

            {/* Client Name */}
            <p className="font-medium text-xs md:text-sm truncate">
              {service.customer?.name || 'Cliente'}
            </p>

            {/* Appliance + Fault */}
            <p className="text-[10px] md:text-xs text-muted-foreground line-clamp-2">
              {service.appliance_type || 'Aparelho'} - {service.fault_description || 'Sem descrição'}
            </p>

            {/* Shift + Tags */}
            <div className="flex items-center justify-between gap-1 pt-0.5">
              <div className="flex items-center gap-1">
                <ShiftIcon className={cn('h-3 w-3 md:h-4 md:w-4', shiftInfo?.color || 'text-muted-foreground')} />
                <span className="text-[10px] md:text-xs text-muted-foreground capitalize">
                  {service.scheduled_shift || '-'}
                </span>
              </div>
              <div className="flex gap-0.5">
                {service.is_urgent && (
                  <Badge variant="destructive" className="text-[8px] md:text-[10px] px-1 py-0 h-4">
                    Urg
                  </Badge>
                )}
                {service.is_warranty && (
                  <Badge variant="outline" className="text-[8px] md:text-[10px] px-1 py-0 h-4 border-green-500 text-green-700">
                    Gar
                  </Badge>
                )}
              </div>
            </div>

            {/* Start Button */}
            <Button
              size="sm"
              className={cn('w-full h-7 text-[11px] md:h-8 md:text-xs mt-1.5', buttonConfig.color)}
              onClick={(e) => handleStartFlow(service, e)}
            >
              <Play className="h-3 w-3 mr-1" />
              {buttonConfig.label}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 h-full flex flex-col overflow-hidden">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-5 w-5 md:h-6 md:w-6 text-blue-500" />
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Agenda Semanal</h1>
        </div>
        
        {/* Week Navigation */}
        <div className="flex items-center gap-1 md:gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            className="h-8 w-8 md:h-9 md:w-9"
            onClick={() => navigateWeek(-1)}
          >
            <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
          
          <Button
            variant={isCurrentWeek ? "default" : "outline"}
            size="sm"
            onClick={goToCurrentWeek}
            className="min-w-[140px] md:min-w-[200px] text-xs md:text-sm h-8 md:h-9"
          >
            {format(currentWeekStart, "dd/MM", { locale: pt })} - {format(addDays(currentWeekStart, 5), "dd/MM/yy", { locale: pt })}
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon"
            className="h-8 w-8 md:h-9 md:w-9"
            onClick={() => navigateWeek(1)}
          >
            <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
        </div>
      </div>

      {/* Weekly Grid - Responsive */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          A carregar serviços...
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3 min-h-0 overflow-y-auto">
          {WEEK_DAYS.map((day, idx) => {
            const dayDate = addDays(currentWeekStart, day.offset);
            const dayServices = servicesByDay[idx];
            const isToday = isCurrentWeek && idx === todayIndex;
            
            return (
              <div 
                key={day.key} 
                className={cn(
                  'flex flex-col rounded-lg border bg-card overflow-hidden min-h-[200px] md:min-h-0',
                  isToday && 'ring-2 ring-primary'
                )}
              >
                {/* Day Header */}
                <div className={cn(
                  'p-2 md:p-3 text-center border-b shrink-0',
                  isToday ? 'bg-primary text-primary-foreground' : 'bg-muted/50'
                )}>
                  <p className="font-semibold text-sm md:text-base">{day.label}</p>
                  <p className={cn(
                    'text-xs md:text-sm',
                    isToday ? 'text-primary-foreground/80' : 'text-muted-foreground'
                  )}>
                    {format(dayDate, "dd/MM", { locale: pt })}
                  </p>
                </div>
                
                {/* Services List */}
                <div className="flex-1 p-1.5 md:p-2 space-y-1.5 md:space-y-2 overflow-y-auto">
                  {dayServices.length === 0 ? (
                    <p className="text-center text-xs text-muted-foreground py-4">
                      Sem serviços
                    </p>
                  ) : (
                    dayServices.map(service => (
                      <ServiceCard key={service.id} service={service} />
                    ))
                  )}
                </div>
              </div>
            );
          })}
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
