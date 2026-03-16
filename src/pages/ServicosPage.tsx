import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Clock, CalendarDays, Play, Phone, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format, addDays, subDays, isSameDay, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { formatShiftLabel } from '@/utils/dateUtils';
import { VisitFlowModals } from '@/components/technician/VisitFlowModals';
import { InstallationFlowModals } from '@/components/technician/InstallationFlowModals';
import { DeliveryFlowModals } from '@/components/technician/DeliveryFlowModals';
import { TechQuickServiceModal } from '@/components/technician/TechQuickServiceModal';
import { useServices, prefetchFullServiceData } from '@/hooks/useServices';
import { CustomerLink } from '@/components/shared/CustomerLink';
import { useQueryClient } from '@tanstack/react-query';
import type { Service } from '@/types/database';

type FlowType = 'visit' | 'installation' | 'delivery' | null;

export default function ServicosPage() {
  const { profile } = useAuth();

  // Current date state for daily navigation
  const [currentDate, setCurrentDate] = useState(() => new Date());

  // Modal state
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [activeFlow, setActiveFlow] = useState<FlowType>(null);
  const [flowMode, setFlowMode] = useState<"normal" | "continuacao_peca">("normal");
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);

  // Use React Query for proper caching and refetch
  const queryClient = useQueryClient();
  const { data: services = [], isLoading: loading, error } = useQuery({
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
    // Realtime handles updates — no polling needed
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
      // Show services scheduled for today OR unfinished services from past
      // But mainly filtered by scheduled date as per original logic
      if (!service.scheduled_date) return false;
      return isSameDay(parseISO(service.scheduled_date), currentDate);
    });
  }, [services, currentDate]);

  // sort services by the assigned time (scheduled_shift) lexicographically;
  // entries without a time appear last
  const sortedDayServices = useMemo(() => {
    return [...dayServices].sort((a, b) => {
      const aTime = a.scheduled_shift || 'zzz';
      const bTime = b.scheduled_shift || 'zzz';
      return aTime.localeCompare(bTime);
    });
  }, [dayServices]);

  const handleStartFlow = (service: Service, e: React.MouseEvent, mode: "normal" | "continuacao_peca" = "normal") => {
    e.stopPropagation();
    setSelectedService(service);
    setFlowMode(mode);

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
    setFlowMode("normal");
  };

  const handleFlowComplete = () => {
    setSelectedService(null);
    setActiveFlow(null);
    setFlowMode("normal");
    invalidateServiceQueries(queryClient);
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
    const serviceConfig = getServiceConfig(service);

    // Logic for blocking and continuation
    const isAwaitingPart = service.status === 'para_pedir_peca' || service.status === 'em_espera_de_peca';

    // Check if it's a continuation (resumed after part arrival)
    // It is a continuation if status is 'por_fazer' (resumed status) AND it has a previous status before part request
    const isContinuation = service.status === 'por_fazer' && !!service.last_status_before_part_request;

    return (
      <Card
        className={cn('border-l-4 transition-shadow hover:shadow-md cursor-pointer', serviceConfig.cardBorder, service.status === 'cancelado' && 'opacity-40 grayscale')}
        data-tour="service-cards"
        data-demo="service-cards"
      >
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

            {/* Client Name + Phone */}
            <div className="flex items-center justify-between">
              <div className="font-medium text-base">
                <CustomerLink customer={service.customer} />
              </div>
              {(service.contact_phone || service.customer?.phone) && (
                <a
                  href={`tel:${service.contact_phone || service.customer?.phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 text-xs text-primary hover:underline shrink-0"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {service.contact_phone || service.customer?.phone}
                </a>
              )}
            </div>

            {/* Appliance + Fault */}
            <p className="text-sm text-muted-foreground line-clamp-2">
              {service.appliance_type || 'Aparelho'} - {service.fault_description || 'Sem descrição'}
            </p>

            {/* Time + Tags */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {formatShiftLabel(service.scheduled_shift) || 'Sem turno'}
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
                {isAwaitingPart && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-yellow-500 text-yellow-700 bg-yellow-50">
                    Peça
                  </Badge>
                )}
              </div>
            </div>

            {/* Start/Continue/Block Button */}
            {isAwaitingPart ? (
              <Button
                size="sm"
                className="w-full h-9 text-sm mt-2 bg-muted text-muted-foreground cursor-not-allowed hover:bg-muted"
                disabled
              >
                <Clock className="h-4 w-4 mr-1.5" />
                Aguardar Peça
              </Button>
            ) : (
              <Button
                size="sm"
                className={cn('w-full h-9 text-sm mt-2', serviceConfig.buttonColor)}
                data-demo="start-service-btn"
                onClick={(e) => handleStartFlow(service, e, isContinuation ? "continuacao_peca" : "normal")}
              >
                <Play className="h-4 w-4 mr-1.5" />
                {isContinuation ? "Continuar" : "Começar"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };


  return (
    <div className="p-4 md:p-6 space-y-6 h-full flex flex-col overflow-hidden" data-tour="servicos-agenda" data-demo="servicos-agenda">
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
        <div className="flex-1 space-y-3 overflow-y-auto">
          {sortedDayServices.map(service => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      )}

      {/* Flow Modals — use ternary to avoid DOM removal crashes */}
      {selectedService && activeFlow === 'visit' ? (
        <VisitFlowModals
          service={selectedService}
          isOpen={true}
          onClose={handleCloseFlow}
          onComplete={handleFlowComplete}
          mode={flowMode}
        />
      ) : null}

      {selectedService && activeFlow === 'installation' ? (
        <InstallationFlowModals
          service={selectedService}
          isOpen={true}
          onClose={handleCloseFlow}
          onComplete={handleFlowComplete}
        />
      ) : null}

      {selectedService && activeFlow === 'delivery' ? (
        <DeliveryFlowModals
          service={selectedService}
          isOpen={true}
          onClose={handleCloseFlow}
          onComplete={handleFlowComplete}
        />
      ) : null}
      {/* Quick Create FAB */}
      <Button
        size="icon"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-40"
        onClick={() => setQuickCreateOpen(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>

      <TechQuickServiceModal open={quickCreateOpen} onOpenChange={setQuickCreateOpen} />
    </div>
  );
}
