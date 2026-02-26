import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Shield, AlertTriangle, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const schema = z.object({
  customer_name: z.string().trim().min(1, 'Nome obrigatório').max(200),
  customer_phone: z.string().trim().min(1, 'Telefone obrigatório').max(30),
  appliance_type: z.string().trim().min(1, 'Tipo de aparelho obrigatório').max(200),
  fault_description: z.string().trim().min(1, 'Descrição da avaria obrigatória').max(1000),
  is_urgent: z.boolean().default(false),
  is_warranty: z.boolean().default(false),
  warranty_brand: z.string().trim().max(200).optional().or(z.literal('')),
  warranty_process_number: z.string().trim().max(100).optional().or(z.literal('')),
  customer_address: z.string().trim().max(500).optional().or(z.literal('')),
  customer_postal_code: z.string().trim().max(20).optional().or(z.literal('')),
  customer_city: z.string().trim().max(200).optional().or(z.literal('')),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

interface TechQuickServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TechQuickServiceModal({ open, onOpenChange }: TechQuickServiceModalProps) {
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [showAddress, setShowAddress] = useState(false);
  const [existingCustomer, setExistingCustomer] = useState<{ id: string; name: string } | null>(null);
  const [lookingUpPhone, setLookingUpPhone] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      customer_name: '',
      customer_phone: '',
      appliance_type: '',
      fault_description: '',
      is_urgent: false,
      is_warranty: false,
      warranty_brand: '',
      warranty_process_number: '',
      customer_address: '',
      customer_postal_code: '',
      customer_city: '',
      notes: '',
    },
  });

  const isWarranty = form.watch('is_warranty');
  const phone = form.watch('customer_phone');

  // Debounced phone lookup
  useEffect(() => {
    if (!phone || phone.length < 6) {
      setExistingCustomer(null);
      return;
    }

    const timeout = setTimeout(async () => {
      setLookingUpPhone(true);
      try {
        const { data } = await supabase
          .from('customers')
          .select('id, name')
          .eq('phone', phone.trim())
          .limit(1)
          .maybeSingle();

        if (data) {
          setExistingCustomer(data);
          form.setValue('customer_name', data.name);
        } else {
          setExistingCustomer(null);
        }
      } catch {
        // ignore
      } finally {
        setLookingUpPhone(false);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [phone, form]);

  const onSubmit = useCallback(async (values: FormData) => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('technician_create_service', {
        _customer_name: values.customer_name,
        _customer_phone: values.customer_phone,
        _appliance_type: values.appliance_type,
        _fault_description: values.fault_description,
        _is_urgent: values.is_urgent,
        _is_warranty: values.is_warranty,
        _warranty_brand: values.warranty_brand || null,
        _warranty_process_number: values.warranty_process_number || null,
        _customer_address: values.customer_address || null,
        _customer_postal_code: values.customer_postal_code || null,
        _customer_city: values.customer_city || null,
        _notes: values.notes || null,
      });

      if (error) throw error;

      const result = Array.isArray(data) ? data[0] : data;
      toast.success(`Serviço ${result?.service_code || ''} criado!`);

      queryClient.invalidateQueries({ queryKey: ['technician-services'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['services-paginated'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });

      form.reset();
      setExistingCustomer(null);
      setShowAddress(false);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao criar serviço');
    } finally {
      setSubmitting(false);
    }
  }, [form, onOpenChange, queryClient]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-lg">Criar Serviço Rápido</DialogTitle>
        </DialogHeader>

        <ScrollArea className="px-6 pb-6 max-h-[75vh]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Phone */}
              <FormField control={form.control} name="customer_phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone do cliente *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input placeholder="912 345 678" {...field} />
                      {lookingUpPhone && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
                    </div>
                  </FormControl>
                  {existingCustomer && (
                    <Badge variant="secondary" className="text-xs mt-1">
                      Cliente existente: {existingCustomer.name}
                    </Badge>
                  )}
                  <FormMessage />
                </FormItem>
              )} />

              {/* Name */}
              <FormField control={form.control} name="customer_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do cliente *</FormLabel>
                  <FormControl><Input placeholder="Nome completo" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Address toggle */}
              <button type="button" onClick={() => setShowAddress(!showAddress)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <MapPin className="h-3.5 w-3.5" />
                Morada
                {showAddress ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>

              {showAddress && (
                <div className="space-y-3 pl-2 border-l-2 border-muted">
                  <FormField control={form.control} name="customer_address" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rua</FormLabel>
                      <FormControl><Input placeholder="Rua e número" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-2">
                    <FormField control={form.control} name="customer_postal_code" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código Postal</FormLabel>
                        <FormControl><Input placeholder="1234-567" {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="customer_city" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidade</FormLabel>
                        <FormControl><Input placeholder="Cidade" {...field} /></FormControl>
                      </FormItem>
                    )} />
                  </div>
                </div>
              )}

              {/* Appliance */}
              <FormField control={form.control} name="appliance_type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de aparelho *</FormLabel>
                  <FormControl><Input placeholder="Ex: Ar condicionado, Frigorifico..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Fault */}
              <FormField control={form.control} name="fault_description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição da avaria *</FormLabel>
                  <FormControl><Textarea placeholder="Descreva o problema..." rows={2} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Warranty toggle */}
              <FormField control={form.control} name="is_warranty" render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-2 rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-green-600" />
                    <FormLabel className="!mt-0 cursor-pointer">Garantia</FormLabel>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )} />

              {isWarranty && (
                <div className="space-y-3 pl-2 border-l-2 border-green-200">
                  <FormField control={form.control} name="warranty_brand" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marca da garantia</FormLabel>
                      <FormControl><Input placeholder="Ex: Samsung, Bosch..." {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="warranty_process_number" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nº de processo</FormLabel>
                      <FormControl><Input placeholder="Número do processo" {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>
              )}

              {/* Urgent toggle */}
              <FormField control={form.control} name="is_urgent" render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-2 rounded-lg border p-3 border-destructive/30">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <FormLabel className="!mt-0 cursor-pointer">Urgente</FormLabel>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )} />

              {/* Notes */}
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl><Textarea placeholder="Observações..." rows={2} {...field} /></FormControl>
                </FormItem>
              )} />

              {/* Submit */}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Criar Serviço
              </Button>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
