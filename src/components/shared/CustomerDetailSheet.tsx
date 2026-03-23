import { useState, useEffect } from 'react';
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
  Globe,
  Wallet,
  Tags,
  Map,
  ClipboardList,
  Paperclip,
  Users,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { useUpdateCustomer } from '@/hooks/useCustomers';
import type { Customer, Service, ServiceStatus } from '@/types/database';
import { SERVICE_STATUS_CONFIG } from '@/types/database';
import { StateActionButtons } from '@/components/services/StateActionButtons';
import { UploadDocumentModal } from '@/components/services/UploadDocumentModal';
import { ServiceDetailSheet } from '@/components/services/ServiceDetailSheet';
import { PriceLineItems, calculateTotals, DEFAULT_LINE_ITEM, LineItem } from '@/components/pricing/PriceLineItems';
import { PricingSummary, calculateDiscount } from '@/components/pricing/PricingSummary';
import { useAuth } from '@/contexts/AuthContext';

interface CustomerDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  onUpdate?: () => void;
}

const customerFormSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  nif: z.string().optional().nullable(),
  phone: z.string().min(1, 'Telefone é obrigatório'),
  email: z.string().email('Email inválido').optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable(),
  postal_code: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  customer_type: z.enum(['particular', 'empresa']).default('particular'),
  notes: z.string().optional().nullable(),
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

export function CustomerDetailSheet({
  open,
  onOpenChange,
  customer,
  onUpdate,
}: CustomerDetailSheetProps) {
  const [showCreateServiceModal, setShowCreateServiceModal] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showServiceDetail, setShowServiceDetail] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [currentServiceId, setCurrentServiceId] = useState<string | null>(null);
  const updateCustomer = useUpdateCustomer();

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: '',
      nif: '',
      phone: '',
      email: '',
      address: '',
      postal_code: '',
      city: '',
      customer_type: 'particular',
      notes: '',
    },
  });

  // Reset form when customer changes
  useEffect(() => {
    if (customer) {
      form.reset({
        name: customer.name || '',
        nif: customer.nif || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        postal_code: customer.postal_code || '',
        city: customer.city || '',
        customer_type: (customer.customer_type as any) || 'particular',
        notes: customer.notes || '',
      });
    }
  }, [customer, form]);

  const handleUpdateProfile = async (values: CustomerFormValues) => {
    if (!customer) return;
    try {
      await updateCustomer.mutateAsync({
        id: customer.id,
        ...values,
      });
      toast.success('Perfil atualizado com sucesso');
      onUpdate?.();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Erro ao atualizar perfil');
    }
  };

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

  if (!customer) return null;

  const handleViewService = (service: Service) => {
    setSelectedService(service);
    setShowServiceDetail(true);
  };

  const handleServiceUpdated = () => {
    refetchServices();
    onUpdate?.();
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-[1000px] flex flex-col p-0 h-[90vh] my-auto rounded-l-xl border-l-0 shadow-2xl">
          {/* Header */}
          <SheetHeader className="flex-shrink-0 p-6 pb-4 border-b bg-muted/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">ID: {customer.id.slice(0, 8)}</span>
                  <SheetTitle className="text-xl">{customer.name}</SheetTitle>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={customer.customer_type === 'empresa' ? 'outline' : 'secondary'} className="rounded-md">
                    {customer.customer_type === 'empresa' ? 'Empresa' : 'Particular'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {services.length} serviço{services.length !== 1 ? 's' : ''} registados
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="default" className="bg-blue-600 hover:bg-blue-700" onClick={() => setShowCreateServiceModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Serviço
                </Button>
              </div>
            </div>
          </SheetHeader>

          <Tabs defaultValue="perfil" className="flex flex-1 overflow-hidden">
            {/* Sidebar Tabs */}
            <div className="w-[200px] border-r bg-muted/10 p-4">
              <TabsList className="flex flex-col h-auto bg-transparent gap-1 items-stretch p-0">
                <TabsTrigger
                  value="perfil"
                  className="justify-start gap-3 h-10 px-3 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm transition-all border border-transparent data-[state=active]:border-border"
                >
                  <User className="h-4 w-4" /> Perfil
                </TabsTrigger>
                <TabsTrigger
                  value="servicos"
                  className="justify-start gap-3 h-10 px-3 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm transition-all border border-transparent data-[state=active]:border-border"
                >
                  <Wrench className="h-4 w-4" />
                  Serviços
                  <Badge variant="secondary" className="ml-auto px-1.5 h-5 min-w-[20px] justify-center text-[10px]">
                    {services.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
              <ScrollArea className="flex-1">
                <div className="p-6">
                  {/* Perfil Content */}
                  <TabsContent value="perfil" className="mt-0 space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold border-b pb-2 mb-4">Dados Cadastrais</h3>
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleUpdateProfile)} className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                  <FormLabel>Nome Completo / Empresa *</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="customer_type"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Tipo de Cliente</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Selecione o tipo" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="particular">Particular</SelectItem>
                                      <SelectItem value="empresa">Empresa</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="nif"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>NIF</FormLabel>
                                  <FormControl>
                                    <Input {...field} value={field.value || ''} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="phone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Telefone *</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="email"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Email</FormLabel>
                                  <FormControl>
                                    <Input {...field} value={field.value || ''} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="md:col-span-2 pt-4">
                              <h4 className="font-medium text-sm text-muted-foreground border-b pb-2 mb-4">Localização</h4>
                              <div className="space-y-4">
                                <FormField
                                  control={form.control}
                                  name="address"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Morada</FormLabel>
                                      <FormControl>
                                        <Textarea {...field} value={field.value || ''} rows={2} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <FormField
                                    control={form.control}
                                    name="city"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Cidade</FormLabel>
                                        <FormControl>
                                          <Input {...field} value={field.value || ''} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name="postal_code"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Código Postal</FormLabel>
                                        <FormControl>
                                          <Input {...field} value={field.value || ''} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              </div>
                            </div>

                            <FormField
                              control={form.control}
                              name="notes"
                              render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                  <FormLabel>Notas Internas</FormLabel>
                                  <FormControl>
                                    <Textarea {...field} value={field.value || ''} rows={3} placeholder="Observações sobre este cliente..." />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={updateCustomer.isPending}>
                              {updateCustomer.isPending ? 'A guardar...' : 'Guardar Alterações'}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </div>
                  </TabsContent>

                  {/* Serviços Content */}
                  <TabsContent value="servicos" className="mt-0">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold">Histórico de Serviços</h3>
                      <Button variant="outline" size="sm" onClick={() => { refetchServices(); }}>
                        <Clock className="h-4 w-4 mr-2" /> Atualizar
                      </Button>
                    </div>
                    {loadingServices ? (
                      <p className="text-center py-8 text-muted-foreground">A carregar serviços...</p>
                    ) : services.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed rounded-xl">
                        <Wrench className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                        <p className="text-muted-foreground">Nenhum serviço registado para este cliente.</p>
                      </div>
                    ) : (
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead className="w-[120px]">Código</TableHead>
                              <TableHead>Aparelho</TableHead>
                              <TableHead>Avaria</TableHead>
                              <TableHead>Data</TableHead>
                              <TableHead>Valor</TableHead>
                              <TableHead className="text-right">Estado</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {services.map((service) => {
                              const statusConfig = SERVICE_STATUS_CONFIG[service.status as ServiceStatus];
                              const isPaid = (service.amount_paid || 0) >= (service.final_price || 0) && (service.final_price || 0) > 0;

                              return (
                                <TableRow
                                  key={service.id}
                                  className="cursor-pointer hover:bg-muted/30 transition-colors"
                                  onClick={() => handleViewService(service)}
                                >
                                  <TableCell className="font-mono font-medium text-primary">
                                    {service.code}
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    {[service.appliance_type, service.brand].filter(Boolean).join(' ')}
                                  </TableCell>
                                  <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                                    {service.fault_description}
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {service.scheduled_date ? format(new Date(service.scheduled_date), 'dd/MM/yyyy') : '-'}
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    {service.final_price?.toFixed(2) || '0,00'} €
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", statusConfig?.color)}>
                                        {statusConfig?.label}
                                      </Badge>
                                      <StateActionButtons
                                        service={service}
                                        onAssignTechnician={() => {
                                          setSelectedService(service);
                                          setShowServiceDetail(true);
                                        }}
                                        onViewDetails={() => handleViewService(service)}
                                        onAttachDocument={() => {
                                          setCurrentServiceId(service.id);
                                          setShowUploadModal(true);
                                        }}
                                        viewContext="all"
                                      />
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </TabsContent>
                </div>
              </ScrollArea>
            </div>
          </Tabs>
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

      <UploadDocumentModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        serviceId={currentServiceId || ''}
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
  pnc: z.string().optional(),
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
  // Pricing items for instalacao/entrega
  items: z.array(z.object({
    reference: z.string().optional(),
    description: z.string(),
    quantity: z.number().min(0),
    unit_price: z.number().min(0),
    tax_rate: z.number(),
  })).optional(),
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

function CreateServiceFromCustomerModal({
  open,
  onOpenChange,
  customer,
  onSuccess,
}: CreateServiceFromCustomerModalProps) {
  const [step, setStep] = useState<'type' | 'location' | 'form'>('type');
  const [workshopPhotos, setWorkshopPhotos] = useState<File[]>([]);
  const { data: technicians = [] } = useTechnicians();
  const createService = useCreateService();
  const { user } = useAuth();

  // Pricing state for instalacao/entrega
  const [discountType, setDiscountType] = useState<'euro' | 'percent'>('euro');
  const [discountValue, setDiscountValue] = useState<string>('');
  const [adjustment, setAdjustment] = useState<string>('');

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      service_type: 'reparacao',
      appliance_type: '',
      fault_description: '',
      is_warranty: false,
      is_urgent: false,
      service_location: 'cliente',
      service_address: '',
      service_postal_code: '',
      service_city: '',
      items: [{ ...DEFAULT_LINE_ITEM }],
    },
  });

  const isWarranty = form.watch('is_warranty');
  const serviceType = form.watch('service_type');
  const hasPricing = serviceType === 'instalacao' || serviceType === 'entrega';

  // Pricing calculations
  const watchItems = form.watch('items') || [];
  const validItems = (watchItems as LineItem[]).filter(item => item.description && item.description.trim() !== '');
  const { subtotal: pricingSubtotal, totalTax: pricingTax, total: pricingBaseTotal } = calculateTotals(validItems);
  const discountAmount = calculateDiscount(pricingSubtotal, discountValue, discountType);
  const adjustmentAmount = parseFloat((adjustment || '').replace(',', '.')) || 0;
  const finalPrice = Math.max(0, pricingBaseTotal - discountAmount + adjustmentAmount);

  const handleSubmit = async (values: ServiceFormValues) => {
    try {
      // Regra de status para oficina:
      // - Com técnico: 'na_oficina' (aguarda início)
      // - Sem técnico: 'por_fazer' (para assumir)
      // Para cliente: sempre 'por_fazer'
      const initialStatus = values.service_location === 'oficina'
        ? (values.technician_id ? 'na_oficina' : 'por_fazer')
        : 'por_fazer';

      const isPricingType = values.service_type === 'instalacao' || values.service_type === 'entrega';

      // Build pricing data for instalacao/entrega
      let pricingFields: Record<string, any> = {};
      if (isPricingType && validItems.length > 0) {
        const pricingData = {
          items: validItems.map(item => ({
            ref: item.reference,
            desc: item.description,
            qty: item.quantity,
            price: item.unit_price,
            tax_rate: item.tax_rate,
          })),
          discount: discountValue ? { type: discountType, value: parseFloat(discountValue.replace(',', '.')) || 0 } : undefined,
          adjustment: adjustmentAmount !== 0 ? adjustmentAmount : undefined,
        };
        pricingFields = {
          pricing_description: JSON.stringify(pricingData),
          parts_cost: pricingSubtotal,
          labor_cost: 0,
          discount: discountAmount,
          final_price: finalPrice,
          pending_pricing: finalPrice === 0,
          is_installation: values.service_type === 'instalacao',
          is_sale: values.service_type === 'entrega',
        };
      }

      const newService = await createService.mutateAsync({
        customer_id: customer.id,
        appliance_type: values.appliance_type,
        brand: values.brand,
        model: values.model,
        serial_number: values.serial_number,
        pnc: values.pnc,
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
        service_address: values.service_address || null,
        service_postal_code: values.service_postal_code || null,
        service_city: values.service_city || null,
        contact_name: customer.name,
        contact_phone: customer.phone || null,
        contact_email: customer.email || null,
        pending_pricing: values.is_warranty ? false : (isPricingType ? pricingFields.pending_pricing : undefined),
        final_price: values.is_warranty ? 0 : (isPricingType ? finalPrice : undefined),
        ...pricingFields,
      });

      // Insert items into service_parts for pricing types
      if (isPricingType && newService?.id && validItems.length > 0) {
        const partsToInsert = validItems.map(item => ({
          service_id: newService.id,
          part_name: item.description,
          part_code: item.reference || '',
          quantity: item.quantity,
          cost: item.unit_price,
          iva_rate: item.tax_rate,
          is_requested: false,
          arrived: true,
          registered_by: user?.id,
          registered_location: 'visita'
        }));

        await supabase.from('service_parts').insert(partsToInsert);
      }

      // Upload workshop photos if any
      if (workshopPhotos.length > 0 && values.service_location === 'oficina') {
        // Get the created service to find its ID
        const { data: createdServices } = await supabase
          .from('services')
          .select('id')
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: false })
          .limit(1);

        const serviceId = createdServices?.[0]?.id;
        if (serviceId) {
          for (const file of workshopPhotos) {
            try {
              const fileExt = file.name.split('.').pop();
              const filePath = `${serviceId}/${crypto.randomUUID()}.${fileExt}`;
              const { error: uploadError } = await supabase.storage
                .from('service-photos')
                .upload(filePath, file);

              if (!uploadError) {
                const { data: urlData } = supabase.storage
                  .from('service-photos')
                  .getPublicUrl(filePath);

                await supabase.from('service_photos').insert({
                  service_id: serviceId,
                  file_url: urlData.publicUrl,
                  photo_type: 'aparelho',
                });
              }
            } catch (photoErr) {
              console.error('Error uploading photo:', photoErr);
            }
          }
        }
      }

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
    setWorkshopPhotos([]);
    setDiscountValue('');
    setDiscountType('euro');
    setAdjustment('');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn(
        "max-w-[95vw] max-h-[90vh] flex flex-col p-0 overflow-hidden [&>form]:min-h-0 [&>form]:flex-1 [&>form]:flex [&>form]:flex-col",
        hasPricing && step === 'form' ? "sm:max-w-4xl" : "sm:max-w-[600px]"
      )}>
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
                // Clear address fields if needed or keep them empty for "not inherited"
                form.setValue('service_address', '');
                form.setValue('service_postal_code', '');
                form.setValue('service_city', '');
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
                // Clear address fields if needed or keep them empty for "not inherited"
                form.setValue('service_address', '');
                form.setValue('service_postal_code', '');
                form.setValue('service_city', '');
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
              <div className="flex-1 min-h-0 overflow-y-auto px-6">
                <div className="space-y-4 py-4">
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

                  {/* Model + Serial Number */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Modelo</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: WAT24469ES" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="serial_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nº de Série</FormLabel>
                          <FormControl>
                            <Input placeholder="Número de série" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* PNC */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="pnc"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PNC</FormLabel>
                          <FormControl>
                            <Input placeholder="Product Number Code" {...field} />
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

                  {/* Smart Address Toggle */}
                  {form.watch('service_location') === 'cliente' && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
                        <Checkbox
                          id="different_address_cust"
                          checked={!!(form.watch('service_address') || form.watch('service_postal_code') || form.watch('service_city'))}
                          onCheckedChange={(checked) => {
                            if (!checked) {
                              form.setValue('service_address', '');
                              form.setValue('service_postal_code', '');
                              form.setValue('service_city', '');
                            } else {
                              // Pre-fill with a space to trigger visibility
                              form.setValue('service_address', ' ');
                            }
                          }}
                        />
                        <Label htmlFor="different_address_cust" className="cursor-pointer text-sm">
                          Morada diferente do cliente?
                        </Label>
                        {customer.address && (
                          <span className="text-xs text-muted-foreground ml-auto truncate max-w-[200px]">
                            Perfil: {customer.address}
                          </span>
                        )}
                      </div>
                      {(form.watch('service_address') || form.watch('service_postal_code') || form.watch('service_city')) ? (
                        <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-100 space-y-4">
                          <h4 className="font-medium text-blue-800 flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4" />
                            Morada Alternativa
                          </h4>
                          <FormField
                            control={form.control}
                            name="service_address"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Rua / Morada</FormLabel>
                                <FormControl>
                                  <Input {...field} className="h-8 text-sm" placeholder="Morada do serviço" />
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
                                    <Input {...field} className="h-8 text-sm" placeholder="0000-000" />
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
                      ) : null}
                    </div>
                  )}

                  {/* Workshop Photo Upload */}
                  {form.watch('service_location') === 'oficina' && (
                    <div className="p-4 bg-orange-50/50 rounded-lg border border-orange-100 space-y-3">
                      <h4 className="font-medium text-orange-800 flex items-center gap-2 text-sm">
                        <Paperclip className="h-4 w-4" />
                        Fotos do Equipamento (máx. 5)
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {workshopPhotos.map((file, idx) => (
                          <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border">
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`Foto ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => setWorkshopPhotos(prev => prev.filter((_, i) => i !== idx))}
                              className="absolute top-0.5 right-0.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        {workshopPhotos.length < 5 && (
                          <label className="w-20 h-20 rounded-lg border-2 border-dashed border-orange-300 flex items-center justify-center cursor-pointer hover:bg-orange-100/50 transition-colors">
                            <Plus className="h-6 w-6 text-orange-400" />
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={(e) => {
                                const files = Array.from(e.target.files || []);
                                setWorkshopPhotos(prev => [...prev, ...files].slice(0, 5));
                                e.target.value = '';
                              }}
                            />
                          </label>
                        )}
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
                          <FormLabel>Turno</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecionar" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="manha">Manhã</SelectItem>
                              <SelectItem value="tarde">Tarde</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (step === 'form') {
                      if (serviceType === 'reparacao') {
                        setStep('location');
                      } else {
                        setStep('type');
                      }
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
