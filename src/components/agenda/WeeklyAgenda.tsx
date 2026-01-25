import { useState } from 'react';
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  addWeeks, 
  subWeeks, 
  eachDayOfInterval,
  isSameDay,
  parseISO
} from 'date-fns';
import { pt } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Service } from '@/types/database';

interface WeeklyAgendaProps {
  services: Service[];
  onServiceClick: (service: Service) => void;
  onDayClick?: (date: Date) => void;
}

const SHIFT_ORDER = ['manha', 'tarde', 'noite'] as const;

const SHIFT_LABELS: Record<string, string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
};

export function WeeklyAgenda({ services, onServiceClick, onDayClick }: WeeklyAgendaProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const goToPreviousWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const goToNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const getServicesForDay = (date: Date) => {
    return services.filter(service => {
      if (!service.scheduled_date) return false;
      const serviceDate = parseISO(service.scheduled_date);
      return isSameDay(serviceDate, date);
    });
  };

  const getServicesGroupedByShift = (date: Date) => {
    const dayServices = getServicesForDay(date);
    const grouped: Record<string, Service[]> = {};
    
    SHIFT_ORDER.forEach(shift => {
      grouped[shift] = dayServices.filter(s => s.scheduled_shift === shift);
    });
    
    // Services without shift
    grouped['sem_turno'] = dayServices.filter(s => !s.scheduled_shift);
    
    return grouped;
  };

  const isToday = (date: Date) => isSameDay(date, new Date());

  return (
    <div className="bg-card rounded-xl border shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={goToNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goToToday}>
            Hoje
          </Button>
        </div>
        
        <h3 className="font-semibold text-lg">
          {format(weekStart, "d MMM", { locale: pt })} - {format(weekEnd, "d MMM yyyy", { locale: pt })}
        </h3>
        
        <div className="w-[120px]" /> {/* Spacer for alignment */}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 divide-x">
        {daysOfWeek.map((day) => {
          const dayServices = getServicesForDay(day);
          const groupedServices = getServicesGroupedByShift(day);
          const hasServices = dayServices.length > 0;
          
          return (
            <div 
              key={day.toISOString()} 
              className={cn(
                "min-h-[200px] p-2",
                isToday(day) && "bg-primary/5"
              )}
            >
              {/* Day Header */}
              <div 
                className={cn(
                  "text-center pb-2 mb-2 border-b cursor-pointer hover:bg-accent/50 rounded transition-colors",
                  isToday(day) && "bg-primary/10"
                )}
                onClick={() => onDayClick?.(day)}
              >
                <p className="text-xs text-muted-foreground uppercase">
                  {format(day, 'EEE', { locale: pt })}
                </p>
                <p className={cn(
                  "text-lg font-semibold",
                  isToday(day) && "text-primary"
                )}>
                  {format(day, 'd')}
                </p>
                {hasServices && (
                  <Badge variant="secondary" className="text-xs mt-1">
                    {dayServices.length}
                  </Badge>
                )}
              </div>

              {/* Services by Shift */}
              <div className="space-y-2">
                {SHIFT_ORDER.map(shift => {
                  const shiftServices = groupedServices[shift];
                  if (!shiftServices || shiftServices.length === 0) return null;
                  
                  return (
                    <div key={shift}>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
                        {SHIFT_LABELS[shift]}
                      </p>
                      <div className="space-y-1">
                        {shiftServices.slice(0, 3).map(service => (
                          <ServiceCard 
                            key={service.id} 
                            service={service} 
                            onClick={() => onServiceClick(service)}
                          />
                        ))}
                        {shiftServices.length > 3 && (
                          <p className="text-xs text-muted-foreground text-center">
                            +{shiftServices.length - 3} mais
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {/* Services without shift */}
                {groupedServices['sem_turno']?.length > 0 && (
                  <div className="space-y-1">
                    {groupedServices['sem_turno'].map(service => (
                      <ServiceCard 
                        key={service.id} 
                        service={service} 
                        onClick={() => onServiceClick(service)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ServiceCardProps {
  service: Service;
  onClick: () => void;
}

function ServiceCard({ service, onClick }: ServiceCardProps) {
  const isVisit = service.service_location === 'cliente';
  const techColor = service.technician?.color || '#3B82F6';
  
  return (
    <div
      onClick={onClick}
      className={cn(
        "p-1.5 rounded text-xs cursor-pointer transition-all hover:scale-[1.02] hover:shadow-sm",
        isVisit ? "bg-blue-50 border-l-2 border-blue-500" : "bg-purple-50 border-l-2 border-purple-500"
      )}
      style={{ borderLeftColor: techColor }}
    >
      <div className="flex items-center gap-1">
        {isVisit && <MapPin className="h-3 w-3 text-blue-500" />}
        <span className="font-medium truncate">{service.code}</span>
      </div>
      <p className="text-muted-foreground truncate">
        {service.customer?.name || 'Sem cliente'}
      </p>
    </div>
  );
}
