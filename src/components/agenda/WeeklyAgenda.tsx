import { useState } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Package } from 'lucide-react';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  addWeeks, 
  subWeeks, 
  eachDayOfInterval,
  isSameDay,
  parseISO,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  eachWeekOfInterval,
} from 'date-fns';
import { pt } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AgendaDrawer } from './AgendaDrawer';
import type { Service } from '@/types/database';

interface WeeklyAgendaProps {
  services: Service[];
  onServiceClick: (service: Service) => void;
}

const SHIFT_ORDER = ['manha', 'tarde', 'noite'] as const;

const SHIFT_LABELS: Record<string, string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
};

type ViewMode = 'week' | 'month';

export function WeeklyAgenda({ services, onServiceClick }: WeeklyAgendaProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // Week view calculations
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Month view calculations
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const weeksInMonth = eachWeekOfInterval(
    { start: monthStart, end: monthEnd },
    { weekStartsOn: 1 }
  );

  const goToPrevious = () => {
    if (viewMode === 'week') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const goToNext = () => {
    if (viewMode === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

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
    grouped['sem_turno'] = dayServices.filter(s => !s.scheduled_shift);
    
    return grouped;
  };

  const isToday = (date: Date) => isSameDay(date, new Date());

  const handleDayClick = (day: Date) => {
    const dayServices = getServicesForDay(day);
    setSelectedDay(day);
    setDrawerOpen(true);
  };

  const dateRangeText = viewMode === 'week'
    ? `${format(weekStart, "d MMM", { locale: pt })} - ${format(weekEnd, "d MMM yyyy", { locale: pt })}`
    : format(currentDate, "MMMM 'de' yyyy", { locale: pt });

  return (
    <>
      <div className="bg-card rounded-xl border shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg">Agenda</h3>
            <Button variant="outline" size="icon" onClick={goToPrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={goToNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium ml-2">{dateRangeText}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border p-1">
              <Button
                variant={viewMode === 'week' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('week')}
                className="h-7"
              >
                Semana
              </Button>
              <Button
                variant={viewMode === 'month' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('month')}
                className="h-7"
              >
                Mês
              </Button>
            </div>
          </div>
        </div>

        {/* Days Grid */}
        {viewMode === 'week' ? (
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
                      isToday(day) && "bg-primary/10 border-primary/30"
                    )}
                    onClick={() => handleDayClick(day)}
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
                    
                    {/* Empty state */}
                    {!hasServices && (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        Sem serviços
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Month View
          <div className="p-4">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'].map(day => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2 uppercase">
                  {day}
                </div>
              ))}
            </div>
            {weeksInMonth.map((weekStart, weekIndex) => {
              const weekDays = eachDayOfInterval({
                start: weekStart,
                end: endOfWeek(weekStart, { weekStartsOn: 1 })
              });
              
              return (
                <div key={weekIndex} className="grid grid-cols-7 gap-1">
                  {weekDays.map(day => {
                    const dayServices = getServicesForDay(day);
                    const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                    
                    return (
                      <div
                        key={day.toISOString()}
                        onClick={() => handleDayClick(day)}
                        className={cn(
                          "min-h-[60px] p-1 rounded cursor-pointer hover:bg-accent transition-colors",
                          !isCurrentMonth && "opacity-40",
                          isToday(day) && "bg-primary/10 ring-1 ring-primary/30"
                        )}
                      >
                        <p className={cn(
                          "text-sm font-medium",
                          isToday(day) && "text-primary"
                        )}>
                          {format(day, 'd')}
                        </p>
                        {dayServices.length > 0 && (
                          <Badge variant="secondary" className="text-xs mt-1">
                            {dayServices.length}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Day Drawer */}
      <AgendaDrawer
        date={selectedDay}
        services={selectedDay ? getServicesForDay(selectedDay) : []}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onServiceClick={onServiceClick}
      />
    </>
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
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "p-1.5 rounded text-xs cursor-pointer transition-all hover:scale-[1.02] hover:shadow-sm",
        isVisit ? "bg-blue-50 border-l-2 border-blue-500" : "bg-purple-50 border-l-2 border-purple-500"
      )}
      style={{ borderLeftColor: techColor }}
    >
      <div className="flex items-center gap-1">
        {isVisit ? (
          <MapPin className="h-3 w-3 text-blue-500" />
        ) : (
          <Package className="h-3 w-3 text-purple-500" />
        )}
        <span className="font-medium truncate">{service.code}</span>
      </div>
      <p className="text-muted-foreground truncate">
        {service.customer?.name || 'Sem cliente'}
      </p>
      <p className="text-muted-foreground truncate">
        {service.appliance_type || ''}
      </p>
    </div>
  );
}
