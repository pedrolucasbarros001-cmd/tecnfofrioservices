import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { CalendarIcon, Search, UserPlus, Check } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useCustomerSearch, useCreateCustomer } from '@/hooks/useCustomers';
import { useTechnicians } from '@/hooks/useTechnicians';
import { useCreateService } from '@/hooks/useServices';
import type { Customer } from '@/types/database';

const formSchema = z.object({
  // Customer
  customer_name: z.string().min(1, 'Nome do cliente é obrigatório'),
  customer_nif: z.string().optional(),
  customer_phone: z.string().min(1, 'Telefone é obrigatório'),
  customer_email: z.string().email().optional().or(z.literal('')),
  customer_address: z.string().optional(),
  customer_postal_code: z.string().optional(),
  customer_city: z.string().optional(),
  
  // Equipment
  appliance_type: z.string().min(1, 'Tipo de aparelho é obrigatório'),
  brand: z.string().optional(),
  model: z.string().optional(),
  serial_number: z.string().optional(),
  fault_description: z.string().min(1, 'Descrição da avaria é obrigatória'),
  
  // Options
  is_warranty: z.boolean().default(false),
  warranty_brand: z.string().optional(),
  warranty_process_number: z.string().optional(),
  is_urgent: z.boolean().default(false),
  
  // Location
  service_location: z.enum(['cliente', 'oficina']),
  
  // Schedule
  technician_id: z.string().optional(),
  scheduled_date: z.date().optional(),
  scheduled_shift: z.enum(['manha', 'tarde', 'noite']).optional(),
  
  // Notes
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateServiceModal({ open, onOpenChange }: CreateServiceModalProps) {
  const [step, setStep] = useState<'location' | 'form'>('location');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  
  const { data: technicians = [] } = useTechnicians();
  const customerSearch = useCustomerSearch();
  const createCustomer = useCreateCustomer();
  const createService = useCreateService();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      appliance_type: '',
      fault_description: '',
      is_warranty: false,
      is_urgent: false,
      service_location: 'cliente',
    },
  });

  const isWarranty = form.watch('is_warranty');
  const serviceLocation = form.watch('service_location');

  // Search customers when typing
  useEffect(() => {
    if (customerSearchTerm.length >= 2) {
      customerSearch.mutate(customerSearchTerm);
      setShowCustomerSuggestions(true);
    } else {
      setShowCustomerSuggestions(false);
    }
  }, [customerSearchTerm]);

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    form.setValue('customer_name', customer.name);
    form.setValue('customer_nif', customer.nif || '');
    form.setValue('customer_phone', customer.phone || '');
    form.setValue('customer_email', customer.email || '');
    form.setValue('customer_address', customer.address || '');
    form.setValue('customer_postal_code', customer.postal_code || '');
    form.setValue('customer_city', customer.city || '');
    setShowCustomerSuggestions(false);
    setCustomerSearchTerm('');
  };

  const handleSubmit = async (values: FormValues) => {
    try {
      let customerId = selectedCustomer?.id;
      
      // Create customer if new
      if (!customerId) {
        const newCustomer = await createCustomer.mutateAsync({
          name: values.customer_name,
          nif: values.customer_nif,
          phone: values.customer_phone,
          email: values.customer_email || null,
          address: values.customer_address,
          postal_code: values.customer_postal_code,
          city: values.customer_city,
        });
        customerId = newCustomer.id;
      }

      // Create service
      await createService.mutateAsync({
        customer_id: customerId,
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
        service_type: 'reparacao',
        status: 'por_fazer',
        service_address: values.customer_address,
        service_postal_code: values.customer_postal_code,
        service_city: values.customer_city,
      });

      onOpenChange(false);
      form.reset();
      setStep('location');
      setSelectedCustomer(null);
    } catch (error) {
      console.error('Error creating service:', error);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    form.reset();
    setStep('location');
    setSelectedCustomer(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle className="text-xl">
            {step === 'location' ? 'Tipo de Serviço' : 'Nova Reparação'}
          </DialogTitle>
        </DialogHeader>

        {step === 'location' ? (
          <div className="grid grid-cols-2 gap-4 py-6 px-6">
            <button
              onClick={() => {
                form.setValue('service_location', 'cliente');
                setStep('form');
              }}
              className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 hover:border-primary hover:bg-primary/5 transition-all"
            >
              <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center">
                <span className="text-3xl">🏠</span>
              </div>
              <div className="text-center">
                <h3 className="font-semibold">Visita ao Cliente</h3>
                <p className="text-sm text-muted-foreground">Serviço no local do cliente</p>
              </div>
            </button>
            
            <button
              onClick={() => {
                form.setValue('service_location', 'oficina');
                setStep('form');
              }}
              className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 hover:border-primary hover:bg-primary/5 transition-all"
            >
              <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center">
                <span className="text-3xl">🔧</span>
              </div>
              <div className="text-center">
                <h3 className="font-semibold">Deixou na Oficina</h3>
                <p className="text-sm text-muted-foreground">Cliente trouxe equipamento</p>
              </div>
            </button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
              <ScrollArea className="flex-1 px-6">
                <div className="space-y-6 py-4 pr-4">
                  {/* Customer Section */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center">1</span>
                      Dados do Cliente
                    </h3>
                    
                    {selectedCustomer ? (
                      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Check className="h-5 w-5 text-green-600" />
                          <span className="font-medium text-green-800">
                            Cliente selecionado: {selectedCustomer.name}
                          </span>
                        </div>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSelectedCustomer(null);
                            form.reset({
                              ...form.getValues(),
                              customer_name: '',
                              customer_nif: '',
                              customer_phone: '',
                              customer_email: '',
                              customer_address: '',
                              customer_postal_code: '',
                              customer_city: '',
                            });
                          }}
                        >
                          Alterar
                        </Button>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Pesquisar cliente por nome, telefone ou NIF..."
                            value={customerSearchTerm}
                            onChange={(e) => setCustomerSearchTerm(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        
                        {showCustomerSuggestions && customerSearch.data && customerSearch.data.length > 0 && (
                          <div className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg">
                            <div className="p-2 text-xs text-muted-foreground border-b">
                              Clientes encontrados
                            </div>
                            {customerSearch.data.map((customer) => (
                              <button
                                key={customer.id}
                                type="button"
                                onClick={() => handleSelectCustomer(customer)}
                                className="w-full text-left p-3 hover:bg-accent transition-colors"
                              >
                                <p className="font-medium">{customer.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {[customer.phone, customer.nif].filter(Boolean).join(' • ')}
                                </p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="customer_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome *</FormLabel>
                            <FormControl>
                              <Input placeholder="Nome do cliente" {...field} disabled={!!selectedCustomer} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="customer_nif"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contribuinte</FormLabel>
                            <FormControl>
                              <Input placeholder="NIF" {...field} disabled={!!selectedCustomer} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="customer_phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefone *</FormLabel>
                            <FormControl>
                              <Input placeholder="Telefone" {...field} disabled={!!selectedCustomer} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="customer_email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input placeholder="Email" type="email" {...field} disabled={!!selectedCustomer} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {serviceLocation === 'cliente' && (
                      <>
                        <FormField
                          control={form.control}
                          name="customer_address"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Morada</FormLabel>
                              <FormControl>
                                <Input placeholder="Morada completa" {...field} disabled={!!selectedCustomer} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="customer_postal_code"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Código Postal</FormLabel>
                                <FormControl>
                                  <Input placeholder="0000-000" {...field} disabled={!!selectedCustomer} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="customer_city"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Cidade</FormLabel>
                                <FormControl>
                                  <Input placeholder="Cidade" {...field} disabled={!!selectedCustomer} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <Separator />

                  {/* Equipment Section */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center">2</span>
                      Equipamento
                    </h3>
                    
                    <div className="grid grid-cols-3 gap-4">
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
                      <FormField
                        control={form.control}
                        name="model"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Modelo</FormLabel>
                            <FormControl>
                              <Input placeholder="Modelo" {...field} />
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
                          <FormLabel>Descrição da Avaria *</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Descreva o problema reportado pelo cliente..."
                              rows={3}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  {/* Options Section */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center">3</span>
                      Opções
                    </h3>
                    
                    <div className="flex gap-6">
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
                            <FormLabel className="!mt-0 cursor-pointer">
                              Serviço em Garantia
                            </FormLabel>
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
                            <FormLabel className="!mt-0 cursor-pointer">
                              Urgente
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>

                    {isWarranty && (
                      <div className="grid grid-cols-2 gap-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <FormField
                          control={form.control}
                          name="warranty_brand"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Marca da Garantia</FormLabel>
                              <FormControl>
                                <Input placeholder="Ex: Samsung" {...field} />
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
                                <Input placeholder="Número do processo" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Schedule Section */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center">4</span>
                      Agendamento
                    </h3>
                    
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
                                      <span>Selecionar data</span>
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
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                value={field.value}
                                className="flex gap-4"
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="manha" id="manha" />
                                  <Label htmlFor="manha">Manhã</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="tarde" id="tarde" />
                                  <Label htmlFor="tarde">Tarde</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="noite" id="noite" />
                                  <Label htmlFor="noite">Noite</Label>
                                </div>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Notas adicionais..."
                            rows={2}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </ScrollArea>

              <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
                <Button type="button" variant="outline" onClick={() => setStep('location')}>
                  Voltar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createService.isPending || createCustomer.isPending}
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                >
                  {createService.isPending ? 'A criar...' : 'Criar Serviço'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
