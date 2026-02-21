import { useState } from 'react';
import { Wrench, Settings, Package, MapPin, Building2, CalendarIcon, UserCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { supabase, ensureValidSession } from '@/integrations/supabase/client';
import { humanizeError } from '@/utils/errorMessages';
import { useTechnicians } from '@/hooks/useTechnicians';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ConvertBudgetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: any | null;
  onSuccess?: () => void;
}

type ServiceType = 'instalacao' | 'reparacao' | 'entrega';
type ServiceLocation = 'cliente' | 'oficina';

const SERVICE_TYPES = [
  {
    value: 'instalacao' as const,
    label: 'Instalação',
    description: 'Montagem de equipamento novo',
    icon: Settings,
  },
  {
    value: 'reparacao' as const,
    label: 'Reparação',
    description: 'Diagnóstico e reparação de avaria',
    icon: Wrench,
  },
  {
    value: 'entrega' as const,
    label: 'Entrega',
    description: 'Entrega de equipamento ao cliente',
    icon: Package,
  },
];

const SERVICE_LOCATIONS = [
  {
    value: 'cliente' as const,
    label: 'Cliente (Visita)',
    icon: MapPin,
  },
  {
    value: 'oficina' as const,
    label: 'Oficina',
    icon: Building2,
  },
];

export function ConvertBudgetModal({
  open,
  onOpenChange,
  budget,
  onSuccess,
}: ConvertBudgetModalProps) {
  const [serviceType, setServiceType] = useState<ServiceType>('reparacao');
  const [serviceLocation, setServiceLocation] = useState<ServiceLocation>('oficina');
  const [technicianId, setTechnicianId] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [scheduledShift, setScheduledShift] = useState<string>('');
  const [serviceAddress, setServiceAddress] = useState<string>('');
  const [servicePostalCode, setServicePostalCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const { data: technicians = [] } = useTechnicians(true);

  const extractBudgetDetails = (budget: any) => {
    let applianceType = budget.appliance_type || null;
    let faultDescription = budget.fault_description || null;

    try {
      const parsed = budget.pricing_description
        ? JSON.parse(budget.pricing_description)
        : {};
      const items = Array.isArray(parsed) ? parsed : (parsed.items || []);

      if (items.length > 0) {
        applianceType = items[0]?.description || applianceType;
        faultDescription = items
          .map((item: any) => {
            const desc = item.description || '';
            const details = item.details || '';
            return details ? `${desc} - ${details}` : desc;
          })
          .filter(Boolean)
          .join('; ');
      }
    } catch {
      // pricing_description not valid JSON, keep fallback values
    }

    return { applianceType, faultDescription };
  };

  const handleConvert = async () => {
    if (!budget || isLoading) return;

    // Validation: if technician selected, date and shift are required
    if (technicianId && (!scheduledDate || !scheduledShift)) {
      toast.warning('Ao atribuir um técnico, a data e a hora são obrigatórias.');
      return;
    }

    setIsLoading(true);
    try {
      await ensureValidSession();
      const { applianceType, faultDescription } = extractBudgetDetails(budget);

      // For non-reparacao, location is always cliente
      const finalLocation = serviceType !== 'reparacao' ? 'cliente' : serviceLocation;

      // Determine status based on location and technician
      let status = 'por_fazer';
      if (finalLocation === 'oficina' && technicianId) {
        status = 'na_oficina';
      }

      const { data: service, error: serviceError } = await supabase
        .from('services')
        .insert({
          customer_id: budget.customer_id,
          appliance_type: applianceType,
          brand: budget.brand,
          model: budget.model,
          fault_description: faultDescription,
          notes: budget.notes,
          pricing_description: budget.pricing_description,
          service_type: serviceType,
          status,
          service_location: finalLocation,
          final_price: budget.estimated_total,
          is_installation: serviceType === 'instalacao',
          technician_id: technicianId || null,
          scheduled_date: scheduledDate ? format(scheduledDate, 'yyyy-MM-dd') : null,
          scheduled_shift: scheduledShift || null,
          service_address: serviceAddress || null,
          service_postal_code: servicePostalCode || null,
        })
        .select()
        .single();

      if (serviceError) throw serviceError;

      // Update budget as converted
      const { error: updateError } = await supabase
        .from('budgets')
        .update({
          status: 'convertido',
          converted_service_id: service.id,
        })
        .eq('id', budget.id);

      if (updateError) throw updateError;

      toast.success('Orçamento convertido! Serviço criado com sucesso.');
      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error('Error converting budget:', error);
      toast.error(humanizeError(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTechnicianId('');
    setScheduledDate(undefined);
    setScheduledShift('');
    setServiceAddress('');
    setServicePostalCode('');
    setServiceType('reparacao');
    setServiceLocation('oficina');
  };

  if (!budget) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg w-[95vw] max-h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle className="text-xl">Converter Orçamento em Serviço</DialogTitle>
          <p className="text-sm text-muted-foreground">Ao converter, será criado um serviço com os dados deste orçamento.</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 px-6">
         <div className="space-y-6 py-4">
          {/* Service Type Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Tipo de Serviço</Label>
            <RadioGroup
              value={serviceType}
              onValueChange={(value) => setServiceType(value as ServiceType)}
              className="grid gap-3"
            >
              {SERVICE_TYPES.map((type) => (
                <label
                  key={type.value}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all",
                    serviceType === type.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <RadioGroupItem value={type.value} id={type.value} />
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <type.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{type.label}</p>
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Service Location Selection - only for reparacao */}
          {serviceType === 'reparacao' && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Local do Serviço</Label>
              <RadioGroup
                value={serviceLocation}
                onValueChange={(value) => setServiceLocation(value as ServiceLocation)}
                className="grid grid-cols-2 gap-3"
              >
                {SERVICE_LOCATIONS.map((location) => (
                  <label
                    key={location.value}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                      serviceLocation === location.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <RadioGroupItem value={location.value} id={location.value} />
                    <location.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{location.label}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Address fields */}
          {(true) && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Morada</Label>
                <Input
                  placeholder="Morada do serviço"
                  value={serviceAddress}
                  onChange={(e) => setServiceAddress(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Código Postal</Label>
                <Input
                  placeholder="0000-000"
                  value={servicePostalCode}
                  onChange={(e) => setServicePostalCode(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Technician + Scheduling Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Atribuir Técnico (Opcional)</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Ao atribuir um técnico, o serviço será agendado na agenda dele.
            </p>

            <Select value={technicianId} onValueChange={(val) => {
              setTechnicianId(val === '__none__' ? '' : val);
              if (val === '__none__') {
                setScheduledDate(undefined);
                setScheduledShift('');
              }
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Sem técnico atribuído" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sem técnico</SelectItem>
                {technicians.map((tech) => (
                  <SelectItem key={tech.id} value={tech.id}>
                    {tech.profile?.full_name || tech.profile?.email || 'Técnico'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date + Shift (only if technician selected) */}
            {technicianId && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Data *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !scheduledDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {scheduledDate ? format(scheduledDate, 'dd/MM/yyyy') : 'Selecionar'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={scheduledDate}
                        onSelect={setScheduledDate}
                        locale={pt}
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Hora</Label>
                  <Input
                    type="time"
                    value={scheduledShift}
                    onChange={(e) => setScheduledShift(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Budget Info */}
          <div className="rounded-lg bg-muted/50 p-4 text-sm">
            <p className="text-muted-foreground">
              <strong>Orçamento:</strong> {budget.code}
            </p>
            <p className="text-muted-foreground">
              <strong>Cliente:</strong> {budget.customer?.name || 'Sem cliente'}
            </p>
            <p className="text-muted-foreground">
              <strong>Aparelho:</strong> {budget.appliance_type || '-'}
            </p>
          </div>
         </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleConvert} disabled={isLoading}>
            {isLoading ? 'A criar...' : 'Criar Serviço'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
