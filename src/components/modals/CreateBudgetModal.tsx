import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Check, UserPlus } from 'lucide-react';
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
import { useTechnicians } from '@/hooks/useTechnicians';
import { useCreateCustomer } from '@/hooks/useCustomers';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Customer } from '@/types/database';

const itemSchema = z.object({
  reference: z.string().optional(),
  name: z.string().min(1, 'Nome do artigo é obrigatório'),
  description: z.string().optional(),
  quantity: z.number().min(1, 'Quantidade mínima é 1'),
  unit_price: z.number().min(0, 'Valor deve ser positivo'),
  tax_rate: z.number(),
});

const formSchema = z.object({
  customer_name: z.string().min(1, 'Cliente é obrigatório'),
  customer_phone: z.string().optional(),
  customer_nif: z.string().optional(),
  technician_id: z.string().optional(),
  appliance_type: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  fault_description: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Adicione pelo menos um artigo'),
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
}

export function CreateBudgetModal({ open, onOpenChange, onSuccess }: CreateBudgetModalProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
  const [showFoundCustomerBox, setShowFoundCustomerBox] = useState(false);
  const [showCreateCustomerDialog, setShowCreateCustomerDialog] = useState(false);
  const [pendingFormValues, setPendingFormValues] = useState<FormValues | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { data: technicians = [] } = useTechnicians();
  const createCustomer = useCreateCustomer();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customer_name: '',
      customer_phone: '',
      customer_nif: '',
      items: [
        { reference: '', name: '', description: '', quantity: 1, unit_price: 0, tax_rate: 23 },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchItems = form.watch('items');
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
    form.setValue('customer_phone', foundCustomer.phone || '');
    form.setValue('customer_nif', foundCustomer.nif || '');
    setShowFoundCustomerBox(false);
    setFoundCustomer(null);
  };

  const handleIgnoreFoundCustomer = () => {
    setShowFoundCustomerBox(false);
    setFoundCustomer(null);
  };

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
  const total = subtotal + totalTax;

  const handleSubmit = async (values: FormValues) => {
    if (!selectedCustomer && !foundCustomer) {
      setPendingFormValues(values);
      setShowCreateCustomerDialog(true);
      return;
    }

    await processSubmit(values, selectedCustomer?.id);
  };

  const processSubmit = async (values: FormValues, customerId?: string) => {
    setIsLoading(true);
    try {
      let finalCustomerId = customerId;

      // Create customer if needed
      if (!finalCustomerId && values.customer_name) {
        const newCustomer = await createCustomer.mutateAsync({
          name: values.customer_name,
          phone: values.customer_phone,
          nif: values.customer_nif,
        });
        finalCustomerId = newCustomer.id;
      }

      const { error } = await supabase.from('budgets').insert({
        customer_id: finalCustomerId || null,
        appliance_type: values.appliance_type,
        brand: values.brand,
        model: values.model,
        fault_description: values.fault_description,
        notes: values.notes,
        estimated_labor: subtotal,
        estimated_parts: 0,
        estimated_total: total,
        status: 'pendente',
      });

      if (error) throw error;

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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
            <DialogTitle className="text-xl">Criar Orçamento</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
              <ScrollArea className="flex-1 max-h-[calc(90vh-180px)] px-6">
                <div className="space-y-6 py-4 pr-4">
                  {/* Customer Section */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Cliente</h3>

                    {selectedCustomer ? (
                      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Check className="h-5 w-5 text-green-600" />
                          <span className="font-medium text-green-800">
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

                    <div className="grid grid-cols-3 gap-4">
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
                            <FormLabel>Telefone</FormLabel>
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
                            <FormLabel>NIF</FormLabel>
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
                      name="technician_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Técnico Sugerido</FormLabel>
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
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Observação</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Observações gerais sobre o orçamento..."
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

                  {/* Items Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg">Artigos do Orçamento</h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          append({ reference: '', name: '', description: '', quantity: 1, unit_price: 0, tax_rate: 23 })
                        }
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar Linha
                      </Button>
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[100px]">Ref.</TableHead>
                            <TableHead className="w-[180px]">Artigo</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead className="w-[80px]">Qtd</TableHead>
                            <TableHead className="w-[120px]">Valor (€)</TableHead>
                            <TableHead className="w-[100px]">Imposto</TableHead>
                            <TableHead className="w-[120px] text-right">Subtotal (€)</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fields.map((field, index) => {
                            const item = watchItems[index];
                            const itemSubtotal = item ? calculateItemSubtotal(item) : 0;

                            return (
                              <TableRow key={field.id}>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.reference`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormControl>
                                          <Input placeholder="Ref" {...field} />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.name`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormControl>
                                          <Input placeholder="Ex: Compressor" {...field} />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.description`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormControl>
                                          <Input placeholder="Detalhes do artigo" {...field} />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.quantity`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormControl>
                                          <Input
                                            type="number"
                                            min={1}
                                            {...field}
                                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
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
                                            {...field}
                                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
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
                                            <SelectTrigger>
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
                                <TableCell className="text-right font-medium">
                                  {formatCurrency(itemSubtotal)}
                                </TableCell>
                                <TableCell>
                                  {fields.length > 1 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => remove(index)}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="flex justify-end">
                    <div className="w-[300px] space-y-2 p-4 bg-muted/50 rounded-lg">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal:</span>
                        <span className="font-semibold">{formatCurrency(subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">IVA Total:</span>
                        <span className="font-semibold">{formatCurrency(totalTax)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total:</span>
                        <span className="text-purple-600">{formatCurrency(total)}</span>
                      </div>
                    </div>
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
