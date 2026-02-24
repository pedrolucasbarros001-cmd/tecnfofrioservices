import { useState } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Wrench, Settings, Truck } from 'lucide-react';
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
import { formatShiftLabel } from '@/utils/dateUtils';
import type { Service } from '@/types/database';
import { AgendaDrawer } from './AgendaDrawer';

interface WeeklyAgendaProps {
  services: Service[];
  onServiceClick: (service: Service) => void;
}


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
    if (!services || !Array.isArray(services)) return [];
    return services.filter(service => {
      if (!service || !service.scheduled_date) return false;
      try {
        const serviceDate = parseISO(service.scheduled_date);
        return isSameDay(serviceDate, date);
      } catch (e) {
        return false;
      }
    });
  };

  const getServicesSortedByTime = (date: Date) => {
    try {
      const dayServices = getServicesForDay(date);
      const shiftOrder: Record<string, number> = { manha: 1, tarde: 2, noite: 3 };

      return [...dayServices].sort((a, b) => {
        const orderA = shiftOrder[a.scheduled_shift || ''] || 99;
        const orderB = shiftOrder[b.scheduled_shift || ''] || 99;
        return orderA - orderB;
      });
    } catch (e) {
      console.error("Error sorting services by time:", e);
      return [];
    }
  };

  const isToday = (date: Date) => isSameDay(date, new Date());

  const safeFormat = (date: Date | number, formatStr: string, options?: any) => {
    try {
      if (!date || (date instanceof Date && isNaN(date.getTime()))) return '-';
      return format(date, formatStr, options);
    } catch (e) {
      console.error("Format error in WeeklyAgenda:", e);
      return '-';
    }
  };

  const handleDayClick = (day: Date) => {
    const dayServices = getServicesForDay(day);
    setSelectedDay(day);
    setDrawerOpen(true);
  };

  const dateRangeText = viewMode === 'week'
    ? `${safeFormat(weekStart, "d MMM", { locale: pt })} - ${safeFormat(weekEnd, "d MMM yyyy", { locale: pt })}`
    : safeFormat(currentDate, "MMMM 'de' yyyy", { locale: pt });

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
              const sortedServices = getServicesSortedByTime(day);
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
                      {safeFormat(day, 'EEE', { locale: pt })}
                    </p>
                    <p className={cn(
                      "text-lg font-semibold",
                      isToday(day) && "text-primary"
                    )}>
                      {safeFormat(day, 'd')}
                    </p>
                    {hasServices && (
                      <Badge variant="secondary" className="text-xs mt-1">
                        {dayServices.length}
                      </Badge>
                    )}
                  </div>

                  {/* Services sorted by time */}
                  <div className="space-y-1">
                    {sortedServices.slice(0, 5).map(service => (
                      <div key={service.id}>
                        {service.scheduled_shift && (
                          <span className="text-[10px] text-muted-foreground">
                            {formatShiftLabel(service.scheduled_shift)}
                          </span>
                        )}
                        <ServiceCard
                          service={service}
                          onClick={() => onServiceClick(service)}
                        />
                      </div>
                    ))}
                    {sortedServices.length > 5 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{sortedServices.length - 5} mais
                      </p>
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
                          {safeFormat(day, 'd')}
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

// Get service type configuration for colors and icons
function getServiceTypeConfig(service: Service) {
  if (!service) return {
    bg: 'bg-gray-50',
    borderColor: '#ccc',
    iconColor: 'text-gray-400',
    Icon: Settings
  };

  if (service.service_type === 'instalacao') {
    return {
      bg: 'bg-yellow-50',
      borderColor: '#EAB308',
      iconColor: 'text-yellow-600',
      Icon: Settings
    };
  }
  if (service.service_type === 'entrega') {
    return {
      bg: 'bg-green-50',
      borderColor: '#22C55E',
      iconColor: 'text-green-600',
      Icon: Truck
    };
  }
  // Reparação
  if (service.service_location === 'cliente') {
    return {
      bg: 'bg-blue-50',
      borderColor: '#3B82F6',
      iconColor: 'text-blue-500',
      Icon: MapPin
    };
  }
  return {
    bg: 'bg-orange-50',
    borderColor: '#F97316',
    iconColor: 'text-orange-500',
    Icon: Wrench
  };
}

function ServiceCard({ service, onClick }: ServiceCardProps) {
  if (!service) return null;
  const config = getServiceTypeConfig(service);
  const techColor = service.technician?.color;

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "p-1.5 rounded text-xs cursor-pointer transition-all hover:scale-[1.02] hover:shadow-sm border-l-2",
        config.bg
      )}
      style={{ borderLeftColor: techColor || config.borderColor }}
    >
      <div className="flex items-center gap-1">
        <config.Icon className={cn("h-3 w-3", config.iconColor)} />
        <span className="font-medium truncate">
          {[service.appliance_type, service.brand].filter(Boolean).join(' ') || service.fault_description || 'Serviço'}
        </span>
      </div>
      <p className="text-[10px] text-muted-foreground truncate italic">
        {service.technician?.profile?.full_name || 'Sem técnico'}
      </p>
    </div>
  );
}
