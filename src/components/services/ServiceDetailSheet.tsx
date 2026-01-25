import { useState } from 'react';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Calendar, 
  Wrench,
  AlertCircle,
  Shield,
  Printer,
  Tag,
  Clock,
  User,
} from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ServiceTagModal } from '@/components/modals/ServiceTagModal';
import { ServicePrintModal } from '@/components/modals/ServicePrintModal';
import { SERVICE_STATUS_CONFIG, type Service, type ServiceStatus } from '@/types/database';
import { cn } from '@/lib/utils';

interface ServiceDetailSheetProps {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_TIMELINE: ServiceStatus[] = [
  'por_fazer',
  'em_execucao', 
  'na_oficina',
  'para_pedir_peca',
  'em_espera_de_peca',
  'a_precificar',
  'concluidos',
  'em_debito',
  'finalizado',
];

export function ServiceDetailSheet({ service, open, onOpenChange }: ServiceDetailSheetProps) {
  const [showTagModal, setShowTagModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  if (!service) return null;

  const statusConfig = SERVICE_STATUS_CONFIG[service.status];
  const currentStatusIndex = STATUS_TIMELINE.indexOf(service.status as ServiceStatus);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-[600px] p-0">
          <ScrollArea className="h-full">
            {/* Header */}
            <SheetHeader className="sticky top-0 z-10 bg-card p-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ficha do Serviço</p>
                  <SheetTitle className="font-mono text-xl">{service.code}</SheetTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowPrintModal(true)}>
                    <Printer className="h-4 w-4 mr-1" />
                    Imprimir Ficha
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowTagModal(true)}>
                    <Tag className="h-4 w-4 mr-1" />
                    Imprimir Tag
                  </Button>
                </div>
              </div>
            </SheetHeader>

            <div className="p-4 space-y-6">
              {/* Status Timeline - Horizontal */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-4 text-sm">Progresso do Serviço</h4>
                <div className="flex items-center justify-between overflow-x-auto pb-2 gap-1">
                  {STATUS_TIMELINE.map((status, index) => {
                    const config = SERVICE_STATUS_CONFIG[status];
                    const isActive = index <= currentStatusIndex;
                    const isCurrent = status === service.status;
                    
                    return (
                      <div key={status} className="flex flex-col items-center min-w-[50px] relative">
                        {/* Connector line */}
                        {index > 0 && (
                          <div 
                            className={cn(
                              "absolute top-4 right-1/2 w-full h-0.5 -translate-y-1/2",
                              isActive ? "bg-primary" : "bg-muted-foreground/20"
                            )}
                            style={{ width: 'calc(100% + 8px)', right: '50%' }}
                          />
                        )}
                        
                        <div 
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all relative z-10",
                            isCurrent ? "bg-primary text-primary-foreground scale-110 ring-4 ring-primary/20" :
                            isActive ? "bg-primary/80 text-primary-foreground" :
                            "bg-muted-foreground/20 text-muted-foreground"
                          )}
                        >
                          {index + 1}
                        </div>
                        <span className={cn(
                          "text-[9px] mt-1 text-center leading-tight",
                          isCurrent ? "text-primary font-medium" : "text-muted-foreground"
                        )}>
                          {config.label.split(' ').slice(0, 2).join(' ')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tags */}
              <div className="flex gap-2 flex-wrap">
                <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                {service.is_urgent && (
                  <Badge variant="destructive" className="animate-pulse">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Urgente
                  </Badge>
                )}
                {service.is_warranty && (
                  <Badge className="bg-purple-500 text-white">
                    <Shield className="h-3 w-3 mr-1" />
                    Garantia
                  </Badge>
                )}
                {service.service_location === 'oficina' && (
                  <Badge variant="secondary">
                    <Wrench className="h-3 w-3 mr-1" />
                    Oficina
                  </Badge>
                )}
                {service.service_location === 'cliente' && (
                  <Badge variant="secondary">
                    <MapPin className="h-3 w-3 mr-1" />
                    Visita
                  </Badge>
                )}
                {service.pending_pricing && (
                  <Badge className="bg-yellow-500 text-black">
                    A Precificar
                  </Badge>
                )}
              </div>

              {/* Customer Info */}
              <Section 
                title="Cliente" 
                bgColor="bg-blue-50"
                borderColor="border-l-blue-500"
              >
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {service.customer?.name || 'Sem cliente'}
                </h3>
                {service.customer && (
                  <div className="space-y-1 mt-2 text-sm">
                    {service.customer.nif && (
                      <p className="text-muted-foreground">NIF: {service.customer.nif}</p>
                    )}
                    {service.customer.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{service.customer.phone}</span>
                      </div>
                    )}
                    {service.customer.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{service.customer.email}</span>
                      </div>
                    )}
                    {service.customer.address && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>
                          {[service.customer.address, service.customer.postal_code, service.customer.city]
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </Section>

              {/* Equipment Info */}
              <Section 
                title="Detalhes do Serviço" 
                bgColor="bg-pink-50"
                borderColor="border-l-pink-500"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">
                    {service.service_location === 'cliente' ? 'VISITA' : 'OFICINA'}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <p className="font-medium">
                    {[service.appliance_type, service.brand, service.model]
                      .filter(Boolean)
                      .join(' • ') || 'Não especificado'}
                  </p>
                  {service.serial_number && (
                    <p className="text-sm text-muted-foreground">
                      S/N: {service.serial_number}
                    </p>
                  )}
                </div>
                
                {service.fault_description && (
                  <div className="mt-3 p-3 bg-white rounded-lg border">
                    <p className="text-xs text-muted-foreground uppercase mb-1">Avaria Reportada</p>
                    <p className="text-sm">{service.fault_description}</p>
                  </div>
                )}
                
                {service.detected_fault && (
                  <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-xs text-amber-600 uppercase mb-1">Avaria Detectada</p>
                    <p className="text-sm">{service.detected_fault}</p>
                  </div>
                )}
              </Section>

              {/* Schedule Info */}
              <Section 
                title="Agendamento" 
                bgColor="bg-green-50"
                borderColor="border-l-green-500"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {service.scheduled_date 
                        ? format(new Date(service.scheduled_date), "d 'de' MMMM", { locale: pt })
                        : 'Não agendado'}
                    </span>
                  </div>
                  {service.scheduled_shift && (
                    <Badge variant="secondary" className="capitalize">
                      {service.scheduled_shift === 'manha' ? 'Manhã' : 
                       service.scheduled_shift === 'tarde' ? 'Tarde' : 'Noite'}
                    </Badge>
                  )}
                </div>
                
                {service.technician?.profile && (
                  <div className="flex items-center gap-3 mt-3">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium"
                      style={{ backgroundColor: service.technician.color || '#3B82F6' }}
                    >
                      {service.technician.profile.full_name?.charAt(0) || 'T'}
                    </div>
                    <div>
                      <p className="font-medium">{service.technician.profile.full_name}</p>
                      <p className="text-xs text-muted-foreground">Técnico responsável</p>
                    </div>
                  </div>
                )}
              </Section>

              {/* Pricing */}
              {(service.labor_cost || service.parts_cost || service.final_price) && (
                <Section 
                  title="Preços" 
                  bgColor="bg-emerald-50"
                  borderColor="border-l-emerald-500"
                >
                  <div className="space-y-2">
                    {service.labor_cost && service.labor_cost > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Mão de Obra</span>
                        <span className="font-medium">{service.labor_cost.toFixed(2)} €</span>
                      </div>
                    )}
                    {service.parts_cost && service.parts_cost > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Peças</span>
                        <span className="font-medium">{service.parts_cost.toFixed(2)} €</span>
                      </div>
                    )}
                    {service.discount && service.discount > 0 && (
                      <div className="flex justify-between text-sm text-destructive">
                        <span>Desconto</span>
                        <span>-{service.discount.toFixed(2)} €</span>
                      </div>
                    )}
                    {service.final_price && (
                      <>
                        <Separator />
                        <div className="flex justify-between font-semibold text-lg">
                          <span>Total</span>
                          <span className="text-primary">{service.final_price.toFixed(2)} €</span>
                        </div>
                      </>
                    )}
                    {service.amount_paid && service.amount_paid > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Pago</span>
                        <span>{service.amount_paid.toFixed(2)} €</span>
                      </div>
                    )}
                  </div>
                </Section>
              )}

              {/* History */}
              <Section 
                title="Histórico" 
                bgColor="bg-gray-50"
                borderColor="border-l-gray-400"
              >
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Criado em:</span>
                    <span>{format(new Date(service.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: pt })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Última atualização:</span>
                    <span>{format(new Date(service.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: pt })}</span>
                  </div>
                </div>
              </Section>

              {/* Notes */}
              {service.notes && (
                <Section 
                  title="Observações" 
                  bgColor="bg-slate-50"
                  borderColor="border-l-slate-400"
                >
                  <p className="text-sm whitespace-pre-wrap">{service.notes}</p>
                </Section>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Print Modals */}
      <ServiceTagModal
        service={service}
        open={showTagModal}
        onOpenChange={setShowTagModal}
      />
      <ServicePrintModal
        service={service}
        open={showPrintModal}
        onOpenChange={setShowPrintModal}
      />
    </>
  );
}

interface SectionProps {
  title: string;
  bgColor: string;
  borderColor: string;
  children: React.ReactNode;
}

function Section({ title, bgColor, borderColor, children }: SectionProps) {
  return (
    <div className={cn(
      "rounded-lg p-4 border-l-4",
      bgColor,
      borderColor
    )}>
      <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-3">
        {title}
      </h4>
      {children}
    </div>
  );
}
