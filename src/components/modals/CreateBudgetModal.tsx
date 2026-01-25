import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Search } from 'lucide-react';
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
import { useCustomerSearch } from '@/hooks/useCustomers';
import { useTechnicians } from '@/hooks/useTechnicians';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Customer } from '@/types/database';

const itemSchema = z.object({
  name: z.string().min(1, 'Nome do artigo é obrigatório'),
  description: z.string().optional(),
  quantity: z.number().min(1, 'Quantidade mínima é 1'),
  unit_price: z.number().min(0, 'Valor deve ser positivo'),
  tax_rate: z.number(),
});

const formSchema = z.object({
  customer_id: z.string().optional(),
  customer_name: z.string().min(1, 'Cliente é obrigatório'),
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
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { data: technicians = [] } = useTechnicians();
  const customerSearch = useCustomerSearch();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customer_name: '',
      items: [
        { name: '', description: '', quantity: 1, unit_price: 0, tax_rate: 23 },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchItems = form.watch('items');

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
    form.setValue('customer_id', customer.id);
    form.setValue('customer_name', customer.name);
    setShowCustomerSuggestions(false);
    setCustomerSearchTerm('');
  };

  const handleSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from('budgets').insert({
        customer_id: selectedCustomer?.id || null,
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
      onOpenChange(false);
      form.reset();
      setSelectedCustomer(null);
      onSuccess?.();
    } catch (error) {
      console.error('Error creating budget:', error);
      toast.error('Erro ao criar orçamento');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    form.reset();
    setSelectedCustomer(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle className="text-xl">Criar Orçamento</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
            <ScrollArea className="flex-1 px-6">
              <div className="space-y-6 py-4 pr-4">
                {/* Customer Section */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Cliente</h3>

                  {selectedCustomer ? (
                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                      <span className="font-medium text-green-800">
                        Cliente: {selectedCustomer.name}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedCustomer(null);
                          form.setValue('customer_id', '');
                          form.setValue('customer_name', '');
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

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observação</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Observações gerais sobre o orçamento..."
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
                        append({ name: '', description: '', quantity: 1, unit_price: 0, tax_rate: 23 })
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
                          <TableHead className="w-[200px]">Artigo</TableHead>
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
                  <div className="w-[300px] space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">IVA Total:</span>
                      <span>{formatCurrency(totalTax)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span className="text-orange-600">{formatCurrency(total)}</span>
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
  );
}
