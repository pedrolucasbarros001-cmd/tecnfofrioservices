import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { CalendarIcon, Check, MapPin, Package, UserPlus, ChevronRight } from 'lucide-react';
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
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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

import { cn } from '@/lib/utils';
import { useCreateCustomer } from '@/hooks/useCustomers';
import { useTechnicians } from '@/hooks/useTechnicians';
import { useCreateService } from '@/hooks/useServices';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logServiceCreation } from '@/utils/activityLogUtils';
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
  pnc: z.string().optional(),
  fault_description: z.string().min(1, 'Avaria é obrigatória'),

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
  scheduled_shift: z.string().optional(),

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
  const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
  const [showFoundCustomerBox, setShowFoundCustomerBox] = useState(false);
  const [showCreateCustomerDialog, setShowCreateCustomerDialog] = useState(false);
  const [pendingFormValues, setPendingFormValues] = useState<FormValues | null>(null);
  const [workshopPhotos, setWorkshopPhotos] = useState<File[]>([]);

  const { data: technicians = [] } = useTechnicians();
  const createCustomer = useCreateCustomer();
  const createService = useCreateService();
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<{ full_name: string | null } | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();
      if (data) setUserProfile(data);
    };
    fetchProfile();
  }, [user?.id]);

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
  const customerPhone = form.watch('customer_phone');
  const customerNif = form.watch('customer_nif');

  // Auto-detect customer when phone or NIF changes
  useEffect(() => {
    const searchCustomer = async () => {
      if (selectedCustomer) return; // Already associated

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
    // If no customer selected and no found customer, ask to create
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

      // Create customer if needed
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

      // Create service
      // Regra de status:
      // - Oficina + com técnico: 'na_oficina'
      // - Oficina + sem técnico: 'por_fazer' (qualquer técnico pode assumir)
      // - Cliente (visita): 'por_fazer'
      // Todos os serviços começam com pending_pricing: true pois não têm preço definido.
      // A flag coexiste com qualquer estado e não afeta o fluxo de execução.
      const initialStatus = values.service_location === 'oficina'
        ? (values.technician_id ? 'na_oficina' : 'por_fazer')
        : 'por_fazer';

      const newService = await createService.mutateAsync({
        customer_id: finalCustomerId,
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
        scheduled_shift: (values.scheduled_shift as any) || null,
        notes: values.notes,
        service_type: 'reparacao',
        status: initialStatus,
        pending_pricing: true,
        service_address: null,
        service_postal_code: null,
        service_city: null,
        contact_name: values.customer_name,
        contact_phone: values.customer_phone,
        contact_email: values.customer_email || null,
      });

      // Upload workshop photos if any
      if (workshopPhotos.length > 0 && values.service_location === 'oficina' && newService?.id) {
        for (const file of workshopPhotos) {
          try {
            const fileExt = file.name.split('.').pop();
            const filePath = `${newService.id}/${crypto.randomUUID()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
              .from('service-photos')
              .upload(filePath, file);

            if (!uploadError) {
              const { data: urlData } = supabase.storage
                .from('service-photos')
                .getPublicUrl(filePath);

              await supabase.from('service_photos').insert({
                service_id: newService.id,
                file_url: urlData.publicUrl,
                photo_type: 'aparelho',
              });
            }
          } catch (photoErr) {
            console.error('Error uploading photo:', photoErr);
          }
        }
      }

      if (newService && newService.id) {
        await logServiceCreation(
          newService.code,
          newService.id,
          user?.id,
          userProfile?.full_name || undefined
        );
      }

      handleClose();
    } catch (error: any) {
      console.error('Error creating service:', error);
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
    setStep('location');
    setSelectedCustomer(null);
    setFoundCustomer(null);
    setShowFoundCustomerBox(false);
    setPendingFormValues(null);
    setWorkshopPhotos([]);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
            <DialogTitle className="text-xl">
              {step === 'location' ? 'Tipo de Serviço' : 'Criar Novo Serviço'}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {step === 'location'
                ? "Se o aparelho já foi deixado na oficina, selecione 'Deixou na Oficina'. Caso contrário, o técnico fará uma visita ao cliente."
                : 'Preencha os dados do cliente e do equipamento. Campos com * são obrigatórios.'}
            </p>
          </DialogHeader>

          {step === 'location' ? (
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
                  <h3 className="font-semibold text-lg text-orange-900">Deixou na Oficina</h3>
                  <p className="text-sm text-orange-700/70 mt-1">Cliente trouxe equipamento</p>
                </div>
              </button>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 overflow-y-auto px-6">
                  <div className="space-y-4 py-4 pr-4">
                    {/* Customer Selected Box */}
                    {selectedCustomer && (
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
                    )}

                    {/* Found Customer Box */}
                    {!selectedCustomer && showFoundCustomerBox && foundCustomer && (
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
                          <Button
                            type="button"
                            onClick={handleSelectFoundCustomer}
                          >
                            Associar e Preencher Dados
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleIgnoreFoundCustomer}
                          >
                            Criar Novo Cliente
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Row 1: Nome + Contribuinte */}
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

                    {/* Row 2: Telefone + Email */}
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

                    {/* Row 3: Morada + Código Postal */}
                    {(true) && (
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="customer_address"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Morada</FormLabel>
                              <FormControl>
                                <Input placeholder="Morada completa" {...field} />
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
                                <Input placeholder="0000-000" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {/* Row 4: Tipo de Aparelho + Marca */}
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

                    {/* Row 4b: Modelo + Nº Série */}
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

                    {/* Row 4c: PNC */}
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

                    {/* Workshop Photo Upload */}
                    {serviceLocation === 'oficina' && (
                      <div className="p-4 bg-orange-50/50 rounded-lg border border-orange-100 space-y-3">
                        <h4 className="font-medium text-orange-800 flex items-center gap-2 text-sm">
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
                              <UserPlus className="h-6 w-6 text-orange-400" />
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

                    {/* Row 5: Avaria (full width) */}
                    <FormField
                      control={form.control}
                      name="fault_description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Avaria *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Descreva o problema reportado pelo cliente..."
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Row 6: Checkboxes - Garantia? + Urgente? */}
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

                    {/* Warranty Fields (conditional) */}
                    {isWarranty && (
                      <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
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
                    )}

                    {/* Row 7: Técnico Responsável */}
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

                    {/* Row 8: Data + Hora */}
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
                            <FormLabel>Hora</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
                  <Button type="button" variant="outline" onClick={() => setStep('location')}>
                    Voltar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createService.isPending || createCustomer.isPending}
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

      {/* Create Customer Confirmation Dialog */}
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
