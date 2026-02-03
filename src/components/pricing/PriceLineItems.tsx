import { Plus, Trash2 } from 'lucide-react';
import { UseFormReturn, useFieldArray } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  FormControl,
  FormField,
  FormItem,
} from '@/components/ui/form';
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

export const TAX_RATES = [
  { value: 0, label: '0%' },
  { value: 6, label: '6%' },
  { value: 13, label: '13%' },
  { value: 23, label: '23%' },
];

export interface LineItem {
  reference?: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
}

export const DEFAULT_LINE_ITEM: LineItem = {
  reference: '',
  description: '',
  quantity: 1,
  unit_price: 0,
  tax_rate: 23,
};

interface PriceLineItemsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  fieldName: string;
  disabled?: boolean;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

export function calculateItemSubtotal(item: LineItem) {
  return (item.quantity || 0) * (item.unit_price || 0);
}

export function calculateItemTax(item: LineItem) {
  const subtotal = calculateItemSubtotal(item);
  return subtotal * ((item.tax_rate || 0) / 100);
}

export function calculateTotals(items: LineItem[]) {
  const subtotal = items.reduce((sum, item) => sum + calculateItemSubtotal(item), 0);
  const totalTax = items.reduce((sum, item) => sum + calculateItemTax(item), 0);
  const total = subtotal + totalTax;
  return { subtotal, totalTax, total };
}

export function PriceLineItems({ form, fieldName, disabled = false }: PriceLineItemsProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: fieldName,
  });

  const watchItems = form.watch(fieldName) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-base">Artigos</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ ...DEFAULT_LINE_ITEM })}
          disabled={disabled}
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
              <TableHead className="min-w-[180px]">Descrição</TableHead>
              <TableHead className="w-[70px]">Qtd</TableHead>
              <TableHead className="w-[100px]">Valor (€)</TableHead>
              <TableHead className="w-[90px]">IVA</TableHead>
              <TableHead className="w-[100px] text-right">Total</TableHead>
              <TableHead className="w-[40px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field, index) => {
              const item = watchItems[index] as LineItem | undefined;
              const itemSubtotal = item ? calculateItemSubtotal(item) : 0;
              const itemTax = item ? calculateItemTax(item) : 0;
              const itemTotal = itemSubtotal + itemTax;

              return (
                <TableRow key={field.id}>
                  <TableCell className="p-1">
                    <FormField
                      control={form.control}
                      name={`${fieldName}.${index}.reference`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input 
                              placeholder="Ref" 
                              className="h-8 text-sm"
                              disabled={disabled}
                              {...field} 
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </TableCell>
                  <TableCell className="p-1">
                    <FormField
                      control={form.control}
                      name={`${fieldName}.${index}.description`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input 
                              placeholder="Descrição do artigo" 
                              className="h-8 text-sm"
                              disabled={disabled}
                              {...field} 
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </TableCell>
                  <TableCell className="p-1">
                    <FormField
                      control={form.control}
                      name={`${fieldName}.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              className="h-8 text-sm"
                              disabled={disabled}
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </TableCell>
                  <TableCell className="p-1">
                    <FormField
                      control={form.control}
                      name={`${fieldName}.${index}.unit_price`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              className="h-8 text-sm"
                              disabled={disabled}
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </TableCell>
                  <TableCell className="p-1">
                    <FormField
                      control={form.control}
                      name={`${fieldName}.${index}.tax_rate`}
                      render={({ field }) => (
                        <FormItem>
                          <Select
                            value={field.value?.toString()}
                            onValueChange={(v) => field.onChange(parseInt(v))}
                            disabled={disabled}
                          >
                            <FormControl>
                              <SelectTrigger className="h-8 text-sm">
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
                  <TableCell className="text-right font-medium text-sm p-1">
                    {formatCurrency(itemTotal)}
                  </TableCell>
                  <TableCell className="p-1">
                    {fields.length > 1 && !disabled && (
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
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
