import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Check, UserPlus, User, MessageSquare, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useCreateCustomer, useUpdateCustomer } from '@/hooks/useCustomers';
import { toast } from 'sonner';
import type { Customer, Service } from '@/types/database';

const itemSchema = z.object({
  name: z.string().min(1, 'Nome do artigo é obrigatório'),
  description: z.string().optional(),
  quantity: z.number().min(1, 'Quantidade mínima é 1'),
  unit_price: z.number().min(0, 'Valor deve ser positivo'),
  tax_rate: z.number(),
  type: z.enum(['part', 'labor']).default('part'),
});

const formSchema = z.object({
  // Cliente (opcional)
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  customer_nif: z.string().optional(),
  customer_email: z.string().email('Email inválido').optional().or(z.literal('')),
  // Artigos
  items: z.array(itemSchema).min(1, 'Adicione pelo menos um artigo'),
  discount_value: z.number().optional().default(0),
  discount_type: z.enum(['fixed', 'percentage']).optional().default('fixed'),
  is_insurance_budget: z.boolean().optional().default(false),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const TAX_RATES = [
  { value: 0, label: '0%' },
  { value: 6, label: '6%' },
  { value: 13, label: '13%' },
  { value: 23, label: '23%' },
];

interface CreateBudgetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  sourceService?: Service & { fault_description?: string; customer?: Customer | null; };
  initialCustomer?: Customer;
  budgetToReuse?: any;
}

export function CreateBudgetModal({ open, onOpenChange, onSuccess, sourceService, initialCustomer, budgetToReuse }: CreateBudgetModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [discountType, setDiscountType] = useState<'euro' | 'percent'>('euro');
  const [discountValue, setDiscountValue] = useState('');

  // Customer states
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
  const [showFoundCustomerBox, setShowFoundCustomerBox] = useState(false);
  const [showCreateCustomerDialog, setShowCreateCustomerDialog] = useState(false);
  const [pendingFormValues, setPendingFormValues] = useState<FormValues | null>(null);
  const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customer_name: '',
      customer_phone: '',
      customer_nif: '',
      customer_email: '',
      items: [
        { name: '', description: '', quantity: 1, unit_price: 0, tax_rate: 0, type: 'part' },
      ],
      discount_value: 0,
      discount_type: 'fixed' as const,
      is_insurance_budget: false,
      notes: '',
    },
  });

  const values = form.watch();
  const hasMissingInfo = selectedCustomer && (
    !values.customer_nif || 
    !values.customer_phone || 
    !values.customer_email
  );

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchItems = form.watch('items');
  const customerPhone = form.watch('customer_phone');
  const customerNif = form.watch('customer_nif');
  const customerName = form.watch('customer_name');

  // Prepopulate from sourceService if provided
  useEffect(() => {
    if (open && sourceService) {
      if (sourceService.customer) {
        setSelectedCustomer(sourceService.customer);
        form.setValue('customer_name', sourceService.customer.name);
        form.setValue('customer_phone', sourceService.customer.phone || '');
        form.setValue('customer_nif', sourceService.customer.nif || '');
        form.setValue('customer_email', sourceService.customer.email || '');
      }
      form.setValue('notes', `Orçamento (Ref: ${sourceService.code})`);

      const fetchParts = async () => {
        const { data } = await supabase.from('service_parts').select('*').eq('service_id', sourceService.id);
        if (data && data.length > 0) {
          form.setValue('items', data.map(p => ({
            name: p.part_name,
            description: p.part_code || '',
            quantity: p.quantity || 1,
            unit_price: p.cost || 0,
            tax_rate: p.iva_rate || 23,
            type: 'part'
          })));
        } else {
          form.setValue('items', [{ name: 'Diagnóstico / Mão de Obra', description: '', quantity: 1, unit_price: 0, tax_rate: 23, type: 'labor' }]);
        }
      };
      
      fetchParts();
    } else if (open && budgetToReuse) {
      if (budgetToReuse.customer) {
        setSelectedCustomer(budgetToReuse.customer);
        form.setValue('customer_name', budgetToReuse.customer.name);
        form.setValue('customer_phone', budgetToReuse.customer.phone || '');
        form.setValue('customer_nif', budgetToReuse.customer.nif || '');
        form.setValue('customer_email', budgetToReuse.customer.email || '');
      }
      form.setValue('notes', `Cópia do orçamento ${budgetToReuse.code}`);
      
      try {
        const parsed = budgetToReuse.pricing_description ? JSON.parse(budgetToReuse.pricing_description) : {};
        const items = parsed.items || [];
        if (items.length > 0) {
          form.setValue('items', items.map((item: any) => ({
             name: item.description || '',
             description: item.details || '',
             quantity: item.qty || 1,
             unit_price: item.price || 0,
             tax_rate: item.tax || 23,
             type: item.type || 'part'
          })));
        }
        if (parsed.discountValue) {
           setDiscountValue(parsed.discountValue.toString());
           setDiscountType(parsed.discountType || 'euro');
        }
      } catch (e) {
        console.error('Error parsing reuse pricing:', e);
      }
    } else if (open && initialCustomer) {
      setSelectedCustomer(initialCustomer);
      form.setValue('customer_name', initialCustomer.name);
      form.setValue('customer_phone', initialCustomer.phone || '');
      form.setValue('customer_nif', initialCustomer.nif || '');
      form.setValue('customer_email', initialCustomer.email || '');
      form.setValue('items', [{ name: 'Diagnóstico / Mão de Obra', description: '', quantity: 1, unit_price: 0, tax_rate: 23, type: 'labor' }]);
    }
  }, [open, sourceService, initialCustomer, form]);

  // Auto-detect customer suggestions by name, phone or NIF
  useEffect(() => {
    const searchCustomers = async () => {
      if (selectedCustomer) {
        setCustomerSuggestions([]);
        return;
      }

      const name = customerName?.trim() || '';
      const phone = customerPhone?.replace(/\s/g, '') || '';
      const nif = customerNif?.replace(/\s/g, '') || '';

      if (name.length < 3 && phone.length < 3 && nif.length < 3) {
        setCustomerSuggestions([]);
        return;
      }

      setIsSearching(true);
      try {
        const query = supabase.from('customers').select('*');
        
        const filters = [];
        if (name.length >= 3) filters.push(`name.ilike.%${name}%`);
        if (phone.length >= 3) filters.push(`phone.ilike.%${phone}%`);
        if (nif.length >= 3) filters.push(`nif.ilike.%${nif}%`);

        if (filters.length > 0) {
          const { data, error } = await query.or(filters.join(',')).limit(10);
          if (!error && data) {
            setCustomerSuggestions(data as Customer[]);
          } else {
            setCustomerSuggestions([]);
          }
        }
      } catch (e) {
        console.error('Error searching customers:', e);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchCustomers, 300);
    return () => clearTimeout(debounce);
  }, [customerName, customerPhone, customerNif, selectedCustomer]);

  // Calculate totals
  const calculateItemSubtotal = (item: typeof watchItems[0]) => {
    return item.quantity * item.unit_price;
  };

  const calculateItemTax = (item: typeof watchItems[0]) => {
    const subtotal = calculateItemSubtotal(item);
    return subtotal * (item.tax_rate / 100);
  };

  const subtotal = watchItems.reduce((sum, item) => sum + calculateItemSubtotal(item), 0);
  const totalTax = watchItems.reduce((sum, item) => sum + calculateItemTax(item), 0);

  const parsedDiscountValue = parseFloat(discountValue.replace(',', '.')) || 0;
  const discountAmount = discountType === 'percent'
    ? subtotal * (parsedDiscountValue / 100)
    : parsedDiscountValue;

  const total = subtotal - discountAmount + totalTax;

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    form.setValue('customer_name', customer.name);
    form.setValue('customer_phone', customer.phone || '');
    form.setValue('customer_nif', customer.nif || '');
    form.setValue('customer_email', customer.email || '');
    setCustomerSuggestions([]);
  };

  const handleIgnoreFoundCustomer = () => {
    setCustomerSuggestions([]);
  };

  const processSubmit = async (values: FormValues, customerId?: string) => {
    setIsLoading(true);
    try {
      const pricingData = {
        items: values.items.map(item => ({
          description: item.name,
          details: item.description || '',
          qty: item.quantity,
          price: item.unit_price,
          tax: item.tax_rate,
          type: item.type,
        })),
        discount: discountAmount,
        discountType: discountType,
        discountValue: parsedDiscountValue,
      };

      const partsTotal = values.items
        .filter(item => item.type === 'part')
        .reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

      const laborTotal = values.items
        .filter(item => item.type === 'labor')
        .reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

      const { error } = await supabase.from('budgets').insert({
        code: sourceService?.code?.replace(/^TF-/, 'ORC-'),
        customer_id: customerId || null,
        estimated_labor: laborTotal,
        estimated_parts: partsTotal,
        estimated_total: total,
        status: 'pendente',
        pricing_description: JSON.stringify(pricingData),
        is_insurance_budget: values.is_insurance_budget,
        notes: values.notes || null,
        source_service_id: sourceService?.id || null,
        appliance_type: sourceService?.appliance_type || null,
        brand: sourceService?.brand || null,
        model: sourceService?.model || null,
        fault_description: sourceService?.fault_description || (sourceService as any)?.detected_fault || null,
      });

      if (error) throw error;

      if (sourceService?.id) {
         // Lock the service
         await supabase.from('services').update({ awaiting_budget_approval: true }).eq('id', sourceService.id);
      }

      toast.success('Orçamento criado com sucesso!');
      handleClose();
      onSuccess?.();
    } catch (error) {
      console.error('Error creating budget:', error);
      toast.error('Erro ao criar orçamento');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (values: FormValues) => {
    // Se tem dados de cliente mas não está associado, perguntar se quer criar
    const hasCustomerData = values.customer_name || values.customer_phone;
    if (hasCustomerData && !selectedCustomer) {
      setPendingFormValues(values);
      setShowCreateCustomerDialog(true);
      return;
    }

    if (selectedCustomer) {
      const hasChanges = 
        values.customer_name !== selectedCustomer.name ||
        values.customer_nif !== (selectedCustomer.nif || '') ||
        values.customer_phone !== (selectedCustomer.phone || '') ||
        values.customer_email !== (selectedCustomer.email || '');

      if (hasChanges) {
        await updateCustomer.mutateAsync({
          id: selectedCustomer.id,
          name: values.customer_name || selectedCustomer.name,
          nif: values.customer_nif || null,
          phone: values.customer_phone || selectedCustomer.phone,
          email: values.customer_email || null,
        });
      }
    }

    await processSubmit(values, selectedCustomer?.id);
  };

  const handleConfirmCreateCustomer = async () => {
    if (!pendingFormValues) return;
    setShowCreateCustomerDialog(false);

    try {
      const newCustomer = await createCustomer.mutateAsync({
        name: pendingFormValues.customer_name || '',
        phone: pendingFormValues.customer_phone,
        nif: pendingFormValues.customer_nif,
        email: pendingFormValues.customer_email,
      });

      await processSubmit(pendingFormValues, newCustomer.id);
    } catch (error) {
      console.error('Error creating customer:', error);
      toast.error('Erro ao criar cliente');
    }

    setPendingFormValues(null);
  };

  const handleSkipCustomerCreation = async () => {
    if (!pendingFormValues) return;
    setShowCreateCustomerDialog(false);
    await processSubmit(pendingFormValues);
    setPendingFormValues(null);
  };

  const handleClose = () => {
    onOpenChange(false);
    form.reset();
    setDiscountValue('');
    setDiscountType('euro');
    setSelectedCustomer(null);
    setFoundCustomer(null);
    setShowFoundCustomerBox(false);
    setPendingFormValues(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[900px] max-w-[95vw] max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
            <DialogTitle className="text-xl">Criar Orçamento</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
              <ScrollArea className="flex-1 max-h-[calc(90vh-180px)] px-6">
                {hasMissingInfo && (
                  <Alert className="mt-4 bg-amber-50 border-amber-200 text-amber-900">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-800 font-bold">Informação em falta</AlertTitle>
                    <AlertDescription className="text-amber-700 font-medium">
                      O perfil deste cliente está incompleto. Por favor, aproveite para preencher o NIF, Telefone ou Email.
                    </AlertDescription>
                  </Alert>
                )}
                <div className="space-y-6 py-4 pr-4">

                  {/* Dados do Cliente (Opcional) */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>Dados do Cliente (Opcional)</span>
                    </div>

                    {/* Cliente já selecionado */}
                    {selectedCustomer && (
                      <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Check className="h-5 w-5 text-primary" />
                          <span className="font-medium">
                            Cliente: {selectedCustomer.name}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedCustomer(null);
                            form.setValue('customer_name', '');
                            form.setValue('customer_phone', '');
                            form.setValue('customer_nif', '');
                          }}
                        >
                          Alterar
                        </Button>
                      </div>
                    )}

                    {/* Customer suggestions dropdown */}
                    {!selectedCustomer && customerSuggestions.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                        <div className="p-2 text-xs font-semibold text-muted-foreground bg-muted/50 border-b">
                          Clientes Registados
                        </div>
                        {customerSuggestions.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className="w-full text-left px-4 py-2 text-sm hover:bg-accent flex flex-col transition-colors border-b last:border-0"
                            onClick={() => handleSelectCustomer(c)}
                          >
                            <span className="font-bold text-primary">{c.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {c.phone && `📞 ${c.phone}`} {c.nif && `| NIF: ${c.nif}`}
                            </span>
                            {c.address && <span className="text-[10px] text-muted-foreground/80 truncate">{c.address}</span>}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Campos de input (se não houver cliente selecionado) */}
                    {!selectedCustomer && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <FormField
                          control={form.control}
                          name="customer_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input placeholder="Nome" className="h-9" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="customer_phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input placeholder="Telefone" className="h-9" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="customer_nif"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input placeholder="NIF" className="h-9" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="customer_email"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input placeholder="Email" type="email" className="h-9" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {/* Insurance Checkbox */}
                    <FormField
                      control={form.control}
                      name="is_insurance_budget"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 bg-blue-50/30">
                          <FormControl>
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary mt-1"
                              checked={field.value}
                              onChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm font-semibold text-primary">
                              Orçamento para Seguro (Insurance)
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Ative esta opção se este orçamento for destinado a uma seguradora.
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  {/* Items Table */}
                  <div className="space-y-4">
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="min-w-[200px]">Artigo</TableHead>
                            <TableHead className="min-w-[150px]">Descrição</TableHead>
                            <TableHead className="w-[80px]">Qtd</TableHead>
                            <TableHead className="w-[110px]">Tipo</TableHead>
                            <TableHead className="w-[120px]">Valor (€)</TableHead>
                            <TableHead className="w-[100px]">Imposto</TableHead>
                            <TableHead className="w-[140px] text-right">Subtotal (€)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fields.map((field, index) => {
                            const item = watchItems[index];
                            const itemSubtotal = item ? calculateItemSubtotal(item) : 0;

                            return (
                              <TableRow key={field.id}>
                                {/* Artigo */}
                                <TableCell className="p-2">
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.name`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormControl>
                                          <Textarea
                                            placeholder="Ex: Compressor"
                                            className="min-h-[36px] h-9 resize-y py-2"
                                            rows={1}
                                            {...field}
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>

                                {/* Descrição */}
                                <TableCell className="p-2">
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.description`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormControl>
                                          <Textarea
                                            placeholder="Detalhe"
                                            className="min-h-[36px] h-9 resize-y py-2"
                                            rows={1}
                                            {...field}
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>

                                {/* Qtd */}
                                <TableCell className="p-2">
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.quantity`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormControl>
                                          <Input
                                            type="number"
                                            min={1}
                                            className="h-9"
                                            {...field}
                                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>

                                {/* Tipo */}
                                <TableCell className="p-2">
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.type`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <Select
                                          value={field.value}
                                          onValueChange={field.onChange}
                                        >
                                          <FormControl>
                                            <SelectTrigger className="h-9">
                                              <SelectValue />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            <SelectItem value="part">Peça</SelectItem>
                                            <SelectItem value="labor">Mão de Obra</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>

                                {/* Valor (€) */}
                                <TableCell className="p-2">
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.unit_price`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormControl>
                                          <Input
                                            type="number"
                                            min={0}
                                            step={0.01}
                                            className="h-9"
                                            {...field}
                                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>

                                {/* Imposto */}
                                <TableCell className="p-2">
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.tax_rate`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <Select
                                          value={field.value.toString()}
                                          onValueChange={(v) => field.onChange(parseInt(v))}
                                        >
                                          <FormControl>
                                            <SelectTrigger className="h-9">
                                              <SelectValue />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            {TAX_RATES.map((rate) => (
                                              <SelectItem key={rate.value} value={rate.value.toString()}>
                                                {rate.label}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>

                                {/* Subtotal (€) com botão delete integrado */}
                                <TableCell className="p-2 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <span className="font-medium">{formatCurrency(itemSubtotal)}</span>
                                    {fields.length > 1 && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => remove(index)}
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Add Line Button */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => append({ name: '', description: '', quantity: 1, unit_price: 0, tax_rate: 0, type: 'part' })}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Linha
                    </Button>
                  </div>

                  {/* Totals Summary - Right Aligned */}
                  <div className="flex justify-end">
                    <div className="w-full sm:w-[320px] p-4 rounded-lg space-y-3 bg-muted/50 border border-border">
                      {/* Subtotal */}
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal (s/ IVA):</span>
                        <span className="font-semibold">{formatCurrency(subtotal)}</span>
                      </div>

                      {/* IVA Total */}
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">IVA Total:</span>
                        <span className="font-semibold">{formatCurrency(totalTax)}</span>
                      </div>

                      {/* Desconto */}
                      <div className="flex items-center gap-2">
                        <Label className="text-sm text-muted-foreground whitespace-nowrap w-20">
                          Desconto:
                        </Label>
                        <div className="flex-1 flex gap-1">
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="0"
                            value={discountValue}
                            onChange={(e) => setDiscountValue(e.target.value)}
                            className="h-8 text-sm"
                          />
                          <div className="flex border rounded-md overflow-hidden">
                            <Button
                              type="button"
                              variant={discountType === 'euro' ? 'default' : 'ghost'}
                              size="sm"
                              className="h-8 px-2 rounded-none text-xs"
                              onClick={() => setDiscountType('euro')}
                            >
                              €
                            </Button>
                            <Button
                              type="button"
                              variant={discountType === 'percent' ? 'default' : 'ghost'}
                              size="sm"
                              className="h-8 px-2 rounded-none text-xs"
                              onClick={() => setDiscountType('percent')}
                            >
                              %
                            </Button>
                          </div>
                        </div>
                        <span className="text-sm font-medium text-destructive w-20 text-right">
                          -{formatCurrency(discountAmount)}
                        </span>
                      </div>

                      <Separator />

                      {/* Total */}
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-base">Total:</span>
                        <span className="font-bold text-xl text-primary">
                          {formatCurrency(Math.max(0, total))}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Observações */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      Observações
                    </Label>
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Notas adicionais sobre o orçamento..."
                              className="resize-none min-h-[80px]"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </ScrollArea>

              <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'A guardar...' : 'Guardar Orçamento'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* AlertDialog para confirmar criação de cliente */}
      <AlertDialog open={showCreateCustomerDialog} onOpenChange={setShowCreateCustomerDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Criar perfil de cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Preencheu dados de cliente. Deseja criar um perfil para este cliente?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleSkipCustomerCreation}>
              Não, guardar sem cliente
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCreateCustomer}>
              <UserPlus className="h-4 w-4 mr-2" />
              Sim, criar cliente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
