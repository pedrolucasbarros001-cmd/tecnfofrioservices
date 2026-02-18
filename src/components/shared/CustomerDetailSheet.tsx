import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Building2,
  Plus,
  FileText,
  Clock,
  AlertCircle,
  Shield,
  Package,
  Wrench,
  Settings,
  Truck,
  ChevronRight,
  CalendarIcon,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useTechnicians } from '@/hooks/useTechnicians';
import { useCreateService } from '@/hooks/useServices';
import type { Customer, Service, ServiceStatus } from '@/types/database';
import { SERVICE_STATUS_CONFIG } from '@/types/database';
import { ServiceDetailSheet } from '@/components/services/ServiceDetailSheet';

interface CustomerDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  onUpdate?: () => void;
}

export function CustomerDetailSheet({
  open,
  onOpenChange,
  customer,
  onUpdate,
}: CustomerDetailSheetProps) {
  const [showCreateServiceModal, setShowCreateServiceModal] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showServiceDetail, setShowServiceDetail] = useState(false);

  // Fetch customer services
  const { data: services = [], isLoading: loadingServices, refetch: refetchServices } = useQuery({
    queryKey: ['customer-services', customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          customer:customers(*),
          technician:technicians!services_technician_id_fkey(*, profile:profiles(*))
        `)
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as unknown as Service[]) || [];
    },
    enabled: !!customer?.id && open,
  });

  // Fetch customer budgets
  const { data: budgets = [] } = useQuery({
    queryKey: ['customer-budgets', customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!customer?.id && open,
  });

  if (!customer) return null;

  const getServiceTypeIcon = (service: Service) => {
    if (service.service_type === 'entrega') return <Truck className="h-4 w-4" />;
    if (service.service_type === 'instalacao') return <Package className="h-4 w-4" />;
    if (service.service_location === 'oficina') return <Wrench className="h-4 w-4" />;
    return <MapPin className="h-4 w-4" />;
  };

  const handleViewService = (service: Service) => {
    setSelectedService(service);
    setShowServiceDetail(true);
  };

  const handleServiceUpdated = () => {
    refetchServices();
    onUpdate?.();
  };

  const activeServices = services.filter(s => !['finalizado', 'concluidos'].includes(s.status));
  const completedServices = services.filter(s => ['finalizado', 'concluidos'].includes(s.status));

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl flex flex-col p-0">
          {/* Header */}
          <SheetHeader className="flex-shrink-0 p-6 pb-4 border-b">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1">
                <SheetTitle className="text-xl">{customer.name}</SheetTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={customer.customer_type === 'empresa' ? 'outline' : 'secondary'}>
                    {customer.customer_type === 'empresa' ? (
                      <>
                        <Building2 className="h-3 w-3 mr-1" />
                        Empresa
                      </>
                    ) : (
                      'Particular'
                    )}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {services.length} serviço{services.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              {/* Contact Info */}
              <div className="rounded-lg border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950/20 p-4">
                <h3 className="font-semibold text-sm text-blue-700 dark:text-blue-400 mb-3">
                  Informações de Contacto
                </h3>
                <div className="space-y-2 text-sm">
                  {customer.phone && (
                    <p className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${customer.phone}`} className="hover:underline">
                        {customer.phone}
                      </a>
                    </p>
                  )}
                  {customer.email && (
                    <p className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${customer.email}`} className="hover:underline">
                        {customer.email}
                      </a>
                    </p>
                  )}
                  {customer.nif && (
                    <p className="text-muted-foreground">NIF: {customer.nif}</p>
                  )}
                  {customer.address && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {[customer.address, customer.postal_code, customer.city]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  onClick={() => setShowCreateServiceModal(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Serviço
                </Button>
              </div>

              <Separator />

              {/* Active Services */}
              <div>
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  Serviços Ativos ({activeServices.length})
                </h3>
                {loadingServices ? (
                  <p className="text-sm text-muted-foreground">A carregar...</p>
                ) : activeServices.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    Nenhum serviço ativo
                  </p>
                ) : (
                  <div className="space-y-2">
                    {activeServices.map((service) => {
                      const statusConfig = SERVICE_STATUS_CONFIG[service.status as ServiceStatus];
                      return (
                        <button
                          key={service.id}
                          onClick={() => handleViewService(service)}
                          className="w-full p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-left"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-semibold text-primary">
                                  {service.code}
                                </span>
                                <Badge className={cn("text-xs", statusConfig?.color)}>
                                  {statusConfig?.label}
                                </Badge>
                                {service.is_urgent && (
                                  <AlertCircle className="h-4 w-4 text-red-500" />
                                )}
                                {service.is_warranty && (
                                  <Shield className="h-4 w-4 text-purple-500" />
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                {getServiceTypeIcon(service)}
                                <span>
                                  {[service.appliance_type, service.brand]
                                    .filter(Boolean)
                                    .join(' ') || 'Equipamento não especificado'}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(service.created_at), "d 'de' MMMM", { locale: pt })}
                              </p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Completed Services */}
              {completedServices.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-green-500" />
                    Histórico ({completedServices.length})
                  </h3>
                  <div className="space-y-2">
                    {completedServices.slice(0, 5).map((service) => {
                      const statusConfig = SERVICE_STATUS_CONFIG[service.status as ServiceStatus];
                      return (
                        <button
                          key={service.id}
                          onClick={() => handleViewService(service)}
                          className="w-full p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-semibold text-muted-foreground">
                                  {service.code}
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                  {statusConfig?.label}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {[service.appliance_type, service.brand]
                                  .filter(Boolean)
                                  .join(' ') || 'Equipamento não especificado'}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(service.created_at), "d 'de' MMMM 'de' yyyy", { locale: pt })}
                              </p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </button>
                      );
                    })}
                    {completedServices.length > 5 && (
                      <p className="text-xs text-muted-foreground text-center pt-2">
                        +{completedServices.length - 5} serviços anteriores
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Budgets */}
              {budgets.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-500" />
                    Orçamentos ({budgets.length})
                  </h3>
                  <div className="space-y-2">
                    {budgets.slice(0, 3).map((budget: any) => (
                      <div
                        key={budget.id}
                        className="p-3 rounded-lg border bg-card"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-mono font-semibold">{budget.code}</span>
                            <p className="text-sm text-muted-foreground">
                              {budget.appliance_type || 'Sem tipo'}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge
                              className={cn(
                                budget.status === 'pendente' && 'bg-yellow-500 text-black',
                                budget.status === 'aprovado' && 'bg-green-500',
                                budget.status === 'recusado' && 'bg-red-500',
                                budget.status === 'convertido' && 'bg-blue-500'
                              )}
                            >
                              {budget.status === 'pendente' ? 'Pendente' :
                                budget.status === 'aprovado' ? 'Aprovado' :
                                  budget.status === 'recusado' ? 'Recusado' : 'Convertido'}
                            </Badge>
                            {budget.estimated_total && (
                              <p className="text-sm font-semibold text-orange-600 mt-1">
                                {budget.estimated_total.toFixed(2)} €
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Create Service Modal - Pre-filled with customer */}
      <CreateServiceFromCustomerModal
        open={showCreateServiceModal}
        onOpenChange={setShowCreateServiceModal}
        customer={customer}
        onSuccess={handleServiceUpdated}
      />

      {/* Service Detail Sheet */}
      <ServiceDetailSheet
        service={selectedService}
        open={showServiceDetail}
        onOpenChange={setShowServiceDetail}
        onServiceUpdated={handleServiceUpdated}
      />
    </>
  );
}

// Separate modal for creating service from customer (pre-filled)
interface CreateServiceFromCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer;
  onSuccess?: () => void;
}

const serviceFormSchema = z.object({
  service_type: z.enum(['reparacao', 'instalacao', 'entrega', 'manutencao']).default('reparacao'),
  appliance_type: z.string().min(1, 'Tipo de aparelho é obrigatório'),
  brand: z.string().optional(),
  model: z.string().optional(),
  serial_number: z.string().optional(),
  fault_description: z.string().min(1, 'Descrição é obrigatória'),
  is_warranty: z.boolean().default(false),
  warranty_brand: z.string().optional(),
  warranty_process_number: z.string().optional(),
  is_urgent: z.boolean().default(false),
  service_location: z.enum(['cliente', 'oficina']).default('cliente'),
  technician_id: z.string().optional(),
  scheduled_date: z.date().optional(),
  scheduled_shift: z.string().optional(),
  service_address: z.string().optional(),
  service_postal_code: z.string().optional(),
  service_city: z.string().optional(),
  notes: z.string().optional(),
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

function CreateServiceFromCustomerModal({
  open,
  onOpenChange,
  customer,
  onSuccess,
}: CreateServiceFromCustomerModalProps) {
  const [step, setStep] = useState<'type' | 'location' | 'form'>('type');
  const { data: technicians = [] } = useTechnicians();
  const createService = useCreateService();

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      service_type: 'reparacao',
      appliance_type: '',
      fault_description: '',
      is_warranty: false,
      is_urgent: false,
      service_location: 'cliente',
      service_address: customer.address || '',
      service_postal_code: customer.postal_code || '',
      service_city: customer.city || '',
    },
  });

  const isWarranty = form.watch('is_warranty');
  const serviceType = form.watch('service_type');

  const handleSubmit = async (values: ServiceFormValues) => {
    try {
      // Regra de status para oficina:
      // - Com técnico: 'na_oficina' (aguarda início)
      // - Sem técnico: 'por_fazer' (para assumir)
      // Para cliente: sempre 'por_fazer'
      const initialStatus = values.service_location === 'oficina'
        ? (values.technician_id ? 'na_oficina' : 'por_fazer')
        : 'por_fazer';

      await createService.mutateAsync({
        customer_id: customer.id,
        appliance_type: values.appliance_type,
        brand: values.brand,
        model: values.model,
        serial_number: values.serial_number,
        fault_description: values.fault_description,
        is_warranty: values.is_warranty,
        warranty_brand: values.warranty_brand,
        warranty_process_number: values.warranty_process_number,
        is_urgent: values.is_urgent,
        service_location: values.service_location,
        technician_id: values.technician_id || null,
        scheduled_date: values.scheduled_date?.toISOString().split('T')[0],
        scheduled_shift: values.scheduled_shift,
        notes: values.notes,
        service_type: values.service_type,
        status: initialStatus,
        service_address: values.service_address || customer.address,
        service_postal_code: values.service_postal_code || customer.postal_code,
        service_city: values.service_city || customer.city,
        // Using a simpler logic for pricing
        pending_pricing: values.is_warranty ? false : undefined,
        final_price: values.is_warranty ? 0 : undefined,
      });

      toast.success('Serviço criado com sucesso!');
      handleClose();
      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating service:', error);
      toast.error(error.message || 'Erro ao criar serviço');
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    form.reset();
    setStep('type');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle className="text-xl">
            {step === 'type'
              ? 'Qual o tipo de serviço?'
              : step === 'location'
                ? 'Local do Serviço'
                : `Novo Serviço para ${customer.name}`}
          </DialogTitle>
        </DialogHeader>

        {step === 'type' ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-8 px-6">
            <button
              onClick={() => {
                form.setValue('service_type', 'reparacao');
                setStep('location');
              }}
              className="flex flex-col items-center gap-4 p-6 rounded-xl border-2 border-primary/10 bg-primary/5 hover:border-primary/40 hover:bg-primary/10 transition-all group"
            >
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Wrench className="h-7 w-7 text-primary" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-base">Reparação</h3>
                <p className="text-xs text-muted-foreground mt-1 text-balance">Conserto de avarias</p>
              </div>
            </button>
            <button
              onClick={() => {
                form.setValue('service_type', 'instalacao');
                form.setValue('service_location', 'cliente');
                setStep('form');
              }}
              className="flex flex-col items-center gap-4 p-6 rounded-xl border-2 border-primary/10 bg-primary/5 hover:border-primary/40 hover:bg-primary/10 transition-all group"
            >
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Settings className="h-7 w-7 text-primary" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-base">Instalação</h3>
                <p className="text-xs text-muted-foreground mt-1 text-balance">Novos equipamentos</p>
              </div>
            </button>
            <button
              onClick={() => {
                form.setValue('service_type', 'entrega');
                form.setValue('service_location', 'cliente');
                setStep('form');
              }}
              className="flex flex-col items-center gap-4 p-6 rounded-xl border-2 border-primary/10 bg-primary/5 hover:border-primary/40 hover:bg-primary/10 transition-all group"
            >
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Truck className="h-7 w-7 text-primary" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-base">Entrega</h3>
                <p className="text-xs text-muted-foreground mt-1 text-balance">Entrega e recolha</p>
              </div>
            </button>
          </div>
        ) : step === 'location' ? (
          <div className="grid grid-cols-2 gap-6 py-8 px-6">
            <button
              onClick={() => {
                form.setValue('service_location', 'cliente');
                setStep('form');
              }}
              className="flex flex-col items-center gap-4 p-8 rounded-xl border-2 border-blue-200 bg-blue-50 hover:border-blue-400 hover:bg-blue-100 transition-all"
            >
              <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center">
                <MapPin className="h-8 w-8 text-blue-600" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-lg text-blue-900">Visita</h3>
                <p className="text-sm text-blue-700/70 mt-1">Serviço no local do cliente</p>
              </div>
            </button>

            <button
              onClick={() => {
                form.setValue('service_location', 'oficina');
                setStep('form');
              }}
              className="flex flex-col items-center gap-4 p-8 rounded-xl border-2 border-orange-200 bg-orange-50 hover:border-orange-400 hover:bg-orange-100 transition-all"
            >
              <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center">
                <Package className="h-8 w-8 text-orange-600" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-lg text-orange-900">Na Oficina</h3>
                <p className="text-sm text-orange-700/70 mt-1">Equipamento está connosco</p>
              </div>
            </button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
              <ScrollArea className="flex-1 px-6">
                <div className="space-y-4 py-4 pr-4">
                  {/* Customer info */}
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm font-medium text-green-800">
                      Cliente: {customer.name}
                    </p>
                    {customer.phone && (
                      <p className="text-xs text-green-700">{customer.phone}</p>
                    )}
                  </div>

                  {/* Equipment fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="appliance_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Aparelho *</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Frigorífico" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="brand"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Marca</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Samsung" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="fault_description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {serviceType === 'entrega' ? 'Instruções de Entrega *' :
                            serviceType === 'instalacao' ? 'Descrição da Instalação *' :
                              'Avaria / Problema *'}
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={serviceType === 'entrega' ? "O que entregar/recolher?" : "Descreva os detalhes..."}
                            className="min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Address fields for visits/installations/deliveries */}
                  {(serviceType !== 'reparacao' || form.watch('service_location') === 'cliente') && (
                    <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-100 space-y-4">
                      <h4 className="font-medium text-blue-800 flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4" />
                        Morada do Serviço
                      </h4>
                      <FormField
                        control={form.control}
                        name="service_address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Rua / Morada</FormLabel>
                            <FormControl>
                              <Input {...field} className="h-8 text-sm" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="service_postal_code"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Código Postal</FormLabel>
                              <FormControl>
                                <Input {...field} className="h-8 text-sm" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="service_city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Cidade</FormLabel>
                              <FormControl>
                                <Input {...field} className="h-8 text-sm" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}

                  {/* Checkboxes */}
                  <div className="flex flex-wrap gap-6">
                    <FormField
                      control={form.control}
                      name="is_warranty"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <Label className="cursor-pointer">Garantia?</Label>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="is_urgent"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <Label className="cursor-pointer">Urgente?</Label>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Warranty Fields */}
                  {isWarranty && (
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 space-y-4">
                      <h4 className="font-medium text-purple-800 flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Detalhes da Garantia
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="warranty_brand"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Marca da Garantia</FormLabel>
                              <FormControl>
                                <Input placeholder="Marca" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="warranty_process_number"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nº do Processo</FormLabel>
                              <FormControl>
                                <Input placeholder="Número" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <p className="text-xs text-purple-600">
                        O fluxo de precificação manual não será ativado se a garantia cobrir tudo.
                      </p>
                    </div>
                  )}

                  {/* Technician */}
                  <FormField
                    control={form.control}
                    name="technician_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Técnico Responsável</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecionar técnico" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {technicians.map((tech) => (
                              <SelectItem key={tech.id} value={tech.id}>
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: tech.color || '#3B82F6' }}
                                  />
                                  {tech.profile?.full_name || 'Técnico'}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Schedule */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="scheduled_date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Data</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "d 'de' MMMM", { locale: pt })
                                  ) : (
                                    <span>Selecionar</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                initialFocus
                                className="pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="scheduled_shift"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Turno / Hora</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ex: 14:00 ou Manhã"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </ScrollArea>

              <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (step === 'form') {
                      setStep(serviceType === 'reparacao' ? 'location' : 'type');
                    } else if (step === 'location') {
                      setStep('type');
                    }
                  }}
                >
                  Voltar
                </Button>
                <Button
                  type="submit"
                  disabled={createService.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {createService.isPending ? 'A criar...' : (
                    <>
                      Criar Serviço
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
