import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { CalendarIcon, Search, Check } from 'lucide-react';
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
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
  customer_address: z.string().min(1, 'Morada é obrigatória'),
  customer_postal_code: z.string().optional(),
  customer_city: z.string().optional(),
  
  // Equipment
  appliance_type: z.string().min(1, 'Tipo de aparelho é obrigatório'),
  brand: z.string().optional(),
  model: z.string().optional(),
  
  // Schedule
  technician_id: z.string().optional(),
  scheduled_date: z.date().optional(),
  scheduled_shift: z.enum(['manha', 'tarde', 'noite']).optional(),
  
  // Pricing
  final_price: z.number().optional(),
  
  // Notes
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateInstallationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateInstallationModal({ open, onOpenChange }: CreateInstallationModalProps) {
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
      customer_address: '',
      appliance_type: '',
    },
  });

  const finalPrice = form.watch('final_price');

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

      // If price is defined, status is em_debito
      const status = values.final_price && values.final_price > 0 ? 'em_debito' : 'por_fazer';

      await createService.mutateAsync({
        customer_id: customerId,
        appliance_type: values.appliance_type,
        brand: values.brand,
        model: values.model,
        service_location: 'cliente',
        technician_id: values.technician_id || null,
        scheduled_date: values.scheduled_date?.toISOString().split('T')[0],
        scheduled_shift: values.scheduled_shift,
        notes: values.notes,
        service_type: 'instalacao',
        is_installation: true,
        status,
        final_price: values.final_price || null,
        service_address: values.customer_address,
        service_postal_code: values.customer_postal_code,
        service_city: values.customer_city,
      });

      onOpenChange(false);
      form.reset();
      setSelectedCustomer(null);
    } catch (error) {
      console.error('Error creating installation:', error);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    form.reset();
    setSelectedCustomer(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl">Nova Instalação</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-6 py-4">
                {/* Customer Section */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Dados do Cliente</h3>
                  
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
                          form.reset();
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
                          placeholder="Pesquisar cliente..."
                          value={customerSearchTerm}
                          onChange={(e) => setCustomerSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      
                      {showCustomerSuggestions && customerSearch.data && customerSearch.data.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg">
                          {customerSearch.data.map((customer) => (
                            <button
                              key={customer.id}
                              type="button"
                              onClick={() => handleSelectCustomer(customer)}
                              className="w-full text-left p-3 hover:bg-accent transition-colors"
                            >
                              <p className="font-medium">{customer.name}</p>
                              <p className="text-sm text-muted-foreground">{customer.phone}</p>
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
                            <Input {...field} disabled={!!selectedCustomer} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="customer_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone *</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={!!selectedCustomer} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="customer_address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Morada da Instalação *</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={!!selectedCustomer} />
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
                            <Input {...field} disabled={!!selectedCustomer} />
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
                            <Input {...field} disabled={!!selectedCustomer} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                {/* Equipment Section */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Equipamento a Instalar</h3>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="appliance_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo *</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Ar Condicionado" {...field} />
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
                            <Input {...field} />
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
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                {/* Schedule Section */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Agendamento</h3>
                  
                  <FormField
                    control={form.control}
                    name="technician_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Técnico</FormLabel>
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
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="flex gap-4 pt-2"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="manha" id="inst-manha" />
                                <Label htmlFor="inst-manha">Manhã</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="tarde" id="inst-tarde" />
                                <Label htmlFor="inst-tarde">Tarde</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="noite" id="inst-noite" />
                                <Label htmlFor="inst-noite">Noite</Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notas</FormLabel>
                        <FormControl>
                          <Textarea rows={2} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* Pricing Section */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Precificação (Opcional)</h3>
                  
                  <FormField
                    control={form.control}
                    name="final_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preço Definido</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormDescription>
                          Se definir o preço agora, o serviço aparecerá automaticamente em "Em Débito" após a criação.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createService.isPending || createCustomer.isPending}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                {createService.isPending ? 'A agendar...' : 'Agendar Instalação'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
