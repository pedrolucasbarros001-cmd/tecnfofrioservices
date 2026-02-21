import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { CalendarIcon, Check, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { humanizeError } from '@/utils/errorMessages';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useCreateCustomer } from '@/hooks/useCustomers';
import { useTechnicians } from '@/hooks/useTechnicians';
import { useCreateService } from '@/hooks/useServices';
import { supabase } from '@/integrations/supabase/client';
import { parseCurrencyInput } from '@/utils/currencyUtils';
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
  serial_number: z.string().optional(),
  pnc: z.string().optional(),

  // Schedule
  technician_id: z.string().optional(),
  scheduled_date: z.date().optional(),
  scheduled_shift: z.string().optional(),

  // Notes
  notes: z.string().optional(),

  // Pricing
  final_price: z.number().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateInstallationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateInstallationModal({ open, onOpenChange }: CreateInstallationModalProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
  const [showFoundCustomerBox, setShowFoundCustomerBox] = useState(false);
  const [showCreateCustomerDialog, setShowCreateCustomerDialog] = useState(false);
  const [pendingFormValues, setPendingFormValues] = useState<FormValues | null>(null);

  const { data: technicians = [] } = useTechnicians();
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
      pnc: '',
    },
  });

  const customerPhone = form.watch('customer_phone');
  const customerNif = form.watch('customer_nif');

  // Auto-detect customer
  useEffect(() => {
    const searchCustomer = async () => {
      if (selectedCustomer) return;

      const searchPhone = customerPhone?.replace(/\s/g, '');
      const searchNif = customerNif?.replace(/\s/g, '');

      if ((!searchPhone || searchPhone.length < 6) && (!searchNif || searchNif.length < 6)) {
        setFoundCustomer(null);
        setShowFoundCustomerBox(false);
        return;
      }

      try {
        let query = supabase.from('customers').select('*');

        if (searchPhone && searchPhone.length >= 6) {
          query = query.ilike('phone', `%${searchPhone}%`);
        } else if (searchNif && searchNif.length >= 6) {
          query = query.ilike('nif', `%${searchNif}%`);
        }

        const { data, error } = await query.limit(1).maybeSingle();

        if (!error && data) {
          setFoundCustomer(data);
          setShowFoundCustomerBox(true);
        } else {
          setFoundCustomer(null);
          setShowFoundCustomerBox(false);
        }
      } catch (e) {
        console.error('Error searching customer:', e);
      }
    };

    const debounce = setTimeout(searchCustomer, 500);
    return () => clearTimeout(debounce);
  }, [customerPhone, customerNif, selectedCustomer]);

  const handleSelectFoundCustomer = () => {
    if (!foundCustomer) return;

    setSelectedCustomer(foundCustomer);
    form.setValue('customer_name', foundCustomer.name);
    form.setValue('customer_nif', foundCustomer.nif || '');
    form.setValue('customer_phone', foundCustomer.phone || '');
    form.setValue('customer_email', foundCustomer.email || '');
    form.setValue('customer_address', foundCustomer.address || '');
    form.setValue('customer_postal_code', foundCustomer.postal_code || '');
    form.setValue('customer_city', foundCustomer.city || '');
    setShowFoundCustomerBox(false);
    setFoundCustomer(null);
  };

  const handleIgnoreFoundCustomer = () => {
    setShowFoundCustomerBox(false);
    setFoundCustomer(null);
  };

  const handleSubmit = async (values: FormValues) => {
    if (!selectedCustomer && !foundCustomer) {
      setPendingFormValues(values);
      setShowCreateCustomerDialog(true);
      return;
    }

    await processSubmit(values, selectedCustomer?.id);
  };

  const processSubmit = async (values: FormValues, customerId?: string) => {
    try {
      let finalCustomerId = customerId;

      if (!finalCustomerId) {
        const newCustomer = await createCustomer.mutateAsync({
          name: values.customer_name,
          nif: values.customer_nif,
          phone: values.customer_phone,
          email: values.customer_email || null,
          address: values.customer_address,
          postal_code: values.customer_postal_code,
          city: values.customer_city,
        });
        finalCustomerId = newCustomer.id;
      }

      // Status operacional - sempre por_fazer na criacao
      // O debito e calculado dinamicamente via final_price > amount_paid
      // pending_pricing só é marcado na CONCLUSÃO pelo técnico, nunca na criação

      await createService.mutateAsync({
        customer_id: finalCustomerId,
        appliance_type: values.appliance_type,
        brand: values.brand,
        model: values.model,
        serial_number: values.serial_number,
        service_location: 'cliente',
        technician_id: values.technician_id || null,
        scheduled_date: values.scheduled_date?.toISOString().split('T')[0],
        scheduled_shift: values.scheduled_shift,
        pnc: values.pnc,
        notes: values.notes,
        service_type: 'instalacao',
        is_installation: true,
        status: 'por_fazer',
        final_price: values.final_price || null,
        pending_pricing: !values.final_price,
        service_address: values.customer_address,
        service_postal_code: values.customer_postal_code,
        service_city: values.customer_city,
        contact_name: values.customer_name,
        contact_phone: values.customer_phone,
        contact_email: values.customer_email || null,
      });

      handleClose();
    } catch (error: any) {
      console.error('Error creating installation:', error);
      toast.error(humanizeError(error));
    }
  };

  const handleConfirmCreateCustomer = async () => {
    if (!pendingFormValues) return;
    setShowCreateCustomerDialog(false);
    await processSubmit(pendingFormValues);
    setPendingFormValues(null);
  };

  const handleClose = () => {
    onOpenChange(false);
    form.reset();
    setSelectedCustomer(null);
    setFoundCustomer(null);
    setShowFoundCustomerBox(false);
    setPendingFormValues(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[700px] max-w-[95vw] max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
            <DialogTitle className="text-xl">Nova Instalação</DialogTitle>
            <p className="text-sm text-muted-foreground">O técnico receberá os detalhes para realizar a instalação no local indicado.</p>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-6">
                <div className="space-y-6 py-4 pr-4">
                  {/* Customer Section */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg text-foreground">Informações do Cliente</h3>

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
                      <>
                        {showFoundCustomerBox && foundCustomer && (
                          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                            <p className="font-medium text-blue-900">
                              Cliente existente encontrado!
                            </p>
                            <p className="text-sm text-blue-800">
                              Encontrámos um perfil de cliente com estes dados:
                            </p>
                            <div className="text-sm text-blue-700 bg-white/50 p-3 rounded">
                              <p><strong>Nome:</strong> {foundCustomer.name}</p>
                              <p><strong>Telefone:</strong> {foundCustomer.phone}</p>
                              {foundCustomer.nif && <p><strong>NIF:</strong> {foundCustomer.nif}</p>}
                              {foundCustomer.address && <p><strong>Morada:</strong> {foundCustomer.address}</p>}
                            </div>
                            <div className="flex gap-2">
                              <Button type="button" onClick={handleSelectFoundCustomer}>
                                Associar e Preencher Dados
                              </Button>
                              <Button type="button" variant="outline" onClick={handleIgnoreFoundCustomer}>
                                Criar Novo Cliente
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="customer_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome do Cliente *</FormLabel>
                            <FormControl>
                              <Input {...field} disabled={!!selectedCustomer} />
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
                              <Input {...field} disabled={!!selectedCustomer} />
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
                              <Input type="email" {...field} disabled={!!selectedCustomer} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="customer_address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Morada *</FormLabel>
                            <FormControl>
                              <Input {...field} disabled={!!selectedCustomer} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
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
                    </div>
                  </div>

                  <Separator />

                  {/* Equipment Section */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg text-foreground">Equipamento a Instalar</h3>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="appliance_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Aparelho *</FormLabel>
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
                    </div>

                    <div className="grid grid-cols-3 gap-4">
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
                      <FormField
                        control={form.control}
                        name="serial_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nº Série</FormLabel>
                            <FormControl>
                              <Input placeholder="S/N" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="pnc"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>PNC</FormLabel>
                            <FormControl>
                              <Input placeholder="Code" {...field} />
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
                    <h3 className="font-semibold text-lg text-foreground">Agendamento</h3>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="technician_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Técnico *</FormLabel>
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
                      <FormField
                        control={form.control}
                        name="scheduled_date"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Data *</FormLabel>
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
                    </div>

                    <FormField
                      control={form.control}
                      name="scheduled_shift"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Horário *</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notas</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Notas sobre a instalação..."
                              className="min-h-[60px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  {/* Price Section */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg text-foreground">Precificação (Opcional)</h3>

                    <FormField
                      control={form.control}
                      name="final_price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preço Definido</FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="Ex: 2.000,00"
                              value={field.value?.toString() || ''}
                              onChange={(e) => {
                                const parsed = parseCurrencyInput(e.target.value);
                                field.onChange(parsed > 0 ? parsed : undefined);
                              }}
                            />
                          </FormControl>
                          <FormDescription className="text-muted-foreground">
                            Se definir o preço agora, o serviço aparecerá automaticamente em 'Em Débito' após a criação.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createService.isPending || createCustomer.isPending}
                  className="bg-pink-600 hover:bg-pink-700 text-white"
                >
                  {createService.isPending ? 'A agendar...' : 'Agendar Instalação'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showCreateCustomerDialog} onOpenChange={setShowCreateCustomerDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Criar Novo Cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Cliente não encontrado na base de dados. Deseja criar um novo perfil de cliente com os dados fornecidos?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingFormValues(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCreateCustomer}>
              <UserPlus className="h-4 w-4 mr-2" />
              Sim, Criar Cliente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
