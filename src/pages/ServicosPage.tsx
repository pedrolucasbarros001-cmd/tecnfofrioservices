import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Sun, Moon, Sunrise, Building2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format, addDays, isSameDay, startOfWeek } from 'date-fns';
import { pt } from 'date-fns/locale';
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

export default function ServicosPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [technicianId, setTechnicianId] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Get Monday of current week
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  useEffect(() => {
    if (profile) {
      fetchTechnicianAndServices();
    }
  }, [profile]);

  async function fetchTechnicianAndServices() {
    if (!profile) return;
    
    setLoading(true);
    try {
      // Get the technician record for this profile
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

      // Fetch all services assigned to this technician (active ones)
      const { data, error } = await supabase
        .from('services')
        .select(`*, customer:customers(*)`)
        .eq('technician_id', technicianData.id)
        .in('status', ['por_fazer', 'em_execucao', 'na_oficina', 'para_pedir_peca', 'em_espera_de_peca'])
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      setServices((data as Service[]) || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  }

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

  const ServiceCard = ({ service }: { service: Service }) => {
    const isWorkshop = service.service_location === 'oficina';
    const shiftInfo = service.scheduled_shift ? SHIFT_ICONS[service.scheduled_shift] : null;
    const ShiftIcon = shiftInfo?.icon || Sun;
    
    return (
      <Card
        className={cn(
          'cursor-pointer hover:shadow-md transition-all border-l-4',
          isWorkshop 
            ? 'bg-orange-50 border-l-orange-500' 
            : 'bg-blue-50 border-l-blue-500'
        )}
        onClick={() => handleStartService(service)}
      >
        <CardContent className="p-3">
          <div className="space-y-2">
            {/* Code + Badge */}
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono font-bold text-sm text-foreground">
                {service.code}
              </span>
              <Badge 
                variant="secondary" 
                className={cn(
                  'text-xs',
                  isWorkshop ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                )}
              >
                {isWorkshop ? 'Oficina' : 'Visita'}
              </Badge>
            </div>

            {/* Client Name */}
            <p className="font-medium text-sm truncate">
              {service.customer?.name || 'Cliente não definido'}
            </p>

            {/* Appliance + Fault */}
            <p className="text-xs text-muted-foreground line-clamp-2">
              {service.appliance_type || 'Aparelho'} - {service.fault_description || 'Sem descrição'}
            </p>

            {/* Shift indicator */}
            <div className="flex items-center gap-1.5 pt-1">
              <ShiftIcon className={cn('h-4 w-4', shiftInfo?.color || 'text-muted-foreground')} />
              <span className="text-xs text-muted-foreground capitalize">
                {service.scheduled_shift || 'Sem turno'}
              </span>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1 pt-1">
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
              {service.service_type === 'instalacao' && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-purple-500 text-purple-700">
                  Instalação
                </Badge>
              )}
              {service.service_type === 'entrega' && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-teal-500 text-teal-700">
                  Entrega
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-orange-500" />
          <h1 className="text-2xl font-bold tracking-tight">Serviços</h1>
        </div>
        
        {/* Week Navigation */}
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigateWeek(-1)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <Button
            variant={isCurrentWeek ? "default" : "outline"}
            size="sm"
            onClick={goToCurrentWeek}
            className="min-w-[200px]"
          >
            {format(currentWeekStart, "dd/MM", { locale: pt })} - {format(addDays(currentWeekStart, 5), "dd/MM/yyyy", { locale: pt })}
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigateWeek(1)}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Weekly Grid */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          A carregar serviços...
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-6 gap-4 min-h-0">
          {WEEK_DAYS.map((day, idx) => {
            const dayDate = addDays(currentWeekStart, day.offset);
            const dayServices = servicesByDay[idx];
            const isToday = isCurrentWeek && idx === todayIndex;
            
            return (
              <div 
                key={day.key} 
                className={cn(
                  'flex flex-col rounded-lg border bg-card overflow-hidden',
                  isToday && 'ring-2 ring-primary'
                )}
              >
                {/* Day Header */}
                <div className={cn(
                  'p-3 text-center border-b',
                  isToday ? 'bg-primary text-primary-foreground' : 'bg-muted/50'
                )}>
                  <p className="font-semibold">{day.label}</p>
                  <p className={cn(
                    'text-sm',
                    isToday ? 'text-primary-foreground/80' : 'text-muted-foreground'
                  )}>
                    {format(dayDate, "dd/MM", { locale: pt })}
                  </p>
                </div>
                
                {/* Services List */}
                <div className="flex-1 p-2 space-y-2 overflow-y-auto">
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
    </div>
  );
}
