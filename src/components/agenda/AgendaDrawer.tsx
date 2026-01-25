import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Calendar, MapPin, Package } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Service } from '@/types/database';

interface AgendaDrawerProps {
  date: Date | null;
  services: Service[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onServiceClick: (service: Service) => void;
}

const SHIFT_ORDER = ['manha', 'tarde', 'noite'] as const;

const SHIFT_LABELS: Record<string, string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
};

export function AgendaDrawer({ 
  date, 
  services, 
  open, 
  onOpenChange, 
  onServiceClick 
}: AgendaDrawerProps) {
  if (!date) return null;

  const groupedByShift: Record<string, Service[]> = {};
  
  SHIFT_ORDER.forEach(shift => {
    groupedByShift[shift] = services.filter(s => s.scheduled_shift === shift);
  });
  groupedByShift['sem_turno'] = services.filter(s => !s.scheduled_shift);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="text-xl">
            {format(date, "d 'de' MMMM", { locale: pt })}
          </SheetTitle>
          <p className="text-sm text-muted-foreground">
            {services.length} serviço{services.length !== 1 ? 's' : ''}
          </p>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-4">
          {services.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">Sem serviços neste dia</p>
            </div>
          ) : (
            <div className="space-y-6 pr-4">
              {SHIFT_ORDER.map(shift => {
                const shiftServices = groupedByShift[shift];
                if (!shiftServices || shiftServices.length === 0) return null;
                
                return (
                  <div key={shift}>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                      {SHIFT_LABELS[shift]}
                    </h4>
                    <div className="space-y-2">
                      {shiftServices.map(service => (
                        <ServiceDrawerCard
                          key={service.id}
                          service={service}
                          onClick={() => {
                            onOpenChange(false);
                            onServiceClick(service);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
              
              {groupedByShift['sem_turno']?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Sem turno definido
                  </h4>
                  <div className="space-y-2">
                    {groupedByShift['sem_turno'].map(service => (
                      <ServiceDrawerCard
                        key={service.id}
                        service={service}
                        onClick={() => {
                          onOpenChange(false);
                          onServiceClick(service);
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

interface ServiceDrawerCardProps {
  service: Service;
  onClick: () => void;
}

function ServiceDrawerCard({ service, onClick }: ServiceDrawerCardProps) {
  const isVisit = service.service_location === 'cliente';
  const techColor = service.technician?.color || '#3B82F6';

  return (
    <div
      onClick={onClick}
      className={cn(
        "p-3 rounded-lg cursor-pointer transition-all hover:shadow-md border-l-4",
        isVisit ? "bg-blue-50 hover:bg-blue-100" : "bg-purple-50 hover:bg-purple-100"
      )}
      style={{ borderLeftColor: techColor }}
    >
      <div className="flex items-center gap-2 mb-1">
        {isVisit ? (
          <MapPin className="h-4 w-4 text-blue-500" />
        ) : (
          <Package className="h-4 w-4 text-purple-500" />
        )}
        <span className="font-mono font-semibold text-sm">{service.code}</span>
        {service.is_urgent && (
          <Badge variant="destructive" className="text-xs animate-pulse">
            Urgente
          </Badge>
        )}
      </div>
      <p className="font-medium text-sm">{service.customer?.name || 'Sem cliente'}</p>
      <p className="text-xs text-muted-foreground truncate">
        {[service.appliance_type, service.brand].filter(Boolean).join(' - ') || 'Equipamento não definido'}
      </p>
      {service.technician?.profile && (
        <div className="flex items-center gap-2 mt-2">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-medium"
            style={{ backgroundColor: techColor }}
          >
            {service.technician.profile.full_name?.charAt(0) || 'T'}
          </div>
          <span className="text-xs text-muted-foreground">
            {service.technician.profile.full_name}
          </span>
        </div>
      )}
    </div>
  );
}
