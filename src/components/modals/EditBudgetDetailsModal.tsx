import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BudgetItem {
  description: string;
  details: string;
  qty: number;
  price: number;
  tax: number;
  type: 'part' | 'labor';
}

const TAX_RATES = [
  { value: 0, label: '0%' },
  { value: 6, label: '6%' },
  { value: 13, label: '13%' },
  { value: 23, label: '23%' },
];

interface EditBudgetDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: any;
  onSuccess: () => void;
}

export function EditBudgetDetailsModal({ open, onOpenChange, budget, onSuccess }: EditBudgetDetailsModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState<'euro' | 'percent'>('euro');
  const [notes, setNotes] = useState('');
  const [isInsuranceBudget, setIsInsuranceBudget] = useState(false);

  // Customer states
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerNif, setCustomerNif] = useState('');
  const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([]);

  useEffect(() => {
    if (open && budget) {
      setNotes(budget.notes || '');
      try {
        const parsed = budget.pricing_description ? JSON.parse(budget.pricing_description) : {};
        const parsedItems = Array.isArray(parsed) ? parsed : (parsed.items || []);
        if (parsedItems.length > 0) {
          setItems(parsedItems.map((it: any) => ({
            description: it.description || '',
            details: it.details || '',
            qty: it.qty || 1,
            price: it.price || 0,
            tax: it.tax ?? 0,
            type: it.type || 'part',
          })));
        } else {
          setItems([{ description: '', details: '', qty: 1, price: 0, tax: 0, type: 'part' }]);
        }
        setDiscountValue(parsed.discountValue || parsed.discount || 0);
        setDiscountType(parsed.discountType === 'percent' ? 'percent' : 'euro');
        setIsInsuranceBudget(budget.is_insurance_budget || false);
        
        if (budget.customer) {
          setSelectedCustomer(budget.customer);
          setCustomerName(budget.customer.name || '');
          setCustomerPhone(budget.customer.phone || '');
          setCustomerNif(budget.customer.nif || '');
        } else {
          setCustomerName('');
          setCustomerPhone('');
          setCustomerNif('');
        }
      } catch {
        setItems([{ description: '', details: '', qty: 1, price: 0, tax: 0, type: 'part' }]);
        setDiscountValue(0);
        setDiscountType('euro');
      }
    }
  }, [open, budget]);

  const addItem = () => setItems(prev => [...prev, { description: '', details: '', qty: 1, price: 0, tax: 0, type: 'part' }]);
  const removeItem = (index: number) => setItems(prev => prev.filter((_, i) => i !== index));
  const updateItem = (index: number, field: keyof BudgetItem, value: any) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, it) => sum + it.qty * it.price, 0);
    const discount = discountType === 'percent' ? subtotal * (discountValue / 100) : discountValue;
    const iva = items.reduce((sum, it) => sum + (it.qty * it.price) * (it.tax / 100), 0);
    return { subtotal, discount, iva, total: subtotal - discount + iva };
  }, [items, discountValue, discountType]);

  // Customer search logic
  useEffect(() => {
    const searchCustomers = async () => {
      if (selectedCustomer || customerName.length < 3) {
        setCustomerSuggestions([]);
        return;
      }
      const { data } = await supabase.from('customers')
        .select('*')
        .ilike('name', `%${customerName}%`)
        .limit(5);
      setCustomerSuggestions(data || []);
    };
    const debounce = setTimeout(searchCustomers, 300);
    return () => clearTimeout(debounce);
  }, [customerName, selectedCustomer]);

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v);

  const handleSave = async () => {
    const validItems = items.filter(it => it.description.trim());
    if (validItems.length === 0) {
      toast.error('Adicione pelo menos um artigo');
      return;
    }
    setIsLoading(true);
    try {
      const pricingData = {
        items: validItems,
        discount: totals.discount,
        discountType,
        discountValue,
      };

      const partsTotal = validItems
        .filter(it => it.type === 'part')
        .reduce((sum, it) => sum + it.qty * it.price, 0);

      const laborTotal = validItems
        .filter(it => it.type === 'labor')
        .reduce((sum, it) => sum + it.qty * it.price, 0);

      const { error } = await supabase
        .from('budgets')
        .update({
          pricing_description: JSON.stringify(pricingData),
          estimated_labor: laborTotal,
          estimated_parts: partsTotal,
          estimated_total: totals.total,
          is_insurance_budget: isInsuranceBudget,
          customer_id: selectedCustomer?.id || budget.customer_id,
          notes: notes || null,
        })
        .eq('id', budget.id);

      if (error) throw error;
      toast.success('Orçamento atualizado');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating budget:', error);
      toast.error('Erro ao atualizar orçamento');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-w-[95vw] max-h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle>Editar Artigos do Orçamento</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 px-6">
          <div className="space-y-6 pt-4">
            {/* Customer Data Section */}
            <div className="space-y-3 p-4 bg-muted/30 border rounded-lg">
              <div className="text-sm font-semibold flex items-center justify-between">
                <span>Dados do Cliente</span>
                {selectedCustomer && (
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setSelectedCustomer(null)}>
                    Alterar
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="relative">
                  <Label className="text-[10px] uppercase text-muted-foreground">Nome</Label>
                  <Input 
                    value={customerName} 
                    onChange={e => setCustomerName(e.target.value)} 
                    placeholder="Nome" 
                    className="h-8 text-sm"
                    disabled={!!selectedCustomer}
                  />
                  {!selectedCustomer && customerSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-background border rounded shadow-md max-h-40 overflow-auto text-sm">
                      {customerSuggestions.map(c => (
                        <button 
                          key={c.id} 
                          className="w-full text-left p-2 hover:bg-accent border-b last:border-0"
                          onClick={() => {
                            setSelectedCustomer(c);
                            setCustomerName(c.name);
                            setCustomerPhone(c.phone || '');
                            setCustomerNif(c.nif || '');
                            setCustomerSuggestions([]);
                          }}
                        >
                          <p className="font-bold">{c.name}</p>
                          <p className="text-[10px] text-muted-foreground">{c.phone}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground">Telefone</Label>
                  <Input 
                    value={customerPhone} 
                    onChange={e => setCustomerPhone(e.target.value)} 
                    placeholder="Telefone" 
                    className="h-8 text-sm"
                    disabled={!!selectedCustomer}
                  />
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground">NIF</Label>
                  <Input 
                    value={customerNif} 
                    onChange={e => setCustomerNif(e.target.value)} 
                    placeholder="NIF" 
                    className="h-8 text-sm"
                    disabled={!!selectedCustomer}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1 border-t mt-3">
                <input
                  type="checkbox"
                  id="edit-is-insurance"
                  checked={isInsuranceBudget}
                  onChange={(e) => setIsInsuranceBudget(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary"
                />
                <Label htmlFor="edit-is-insurance" className="text-sm font-semibold cursor-pointer">
                  Orçamento para Seguro (Insurance)
                </Label>
              </div>
            </div>

            <Separator />

            {/* Items table */}
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_1fr_60px_80px_70px_32px] gap-2 text-xs font-medium text-muted-foreground px-1">
                <span>Artigo</span>
                <span>Descrição</span>
                <span>Qtd</span>
                <span>Tipo</span>
                <span>Valor</span>
                <span>IVA</span>
                <span></span>
              </div>
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-[1fr_1fr_60px_80px_70px_32px] gap-2 items-center">
                  <Textarea
                    value={item.description}
                    onChange={e => updateItem(index, 'description', e.target.value)}
                    placeholder="Artigo"
                    className="min-h-[32px] h-8 text-sm resize-y py-1 px-2"
                    rows={1}
                  />
                  <Textarea
                    value={item.details}
                    onChange={e => updateItem(index, 'details', e.target.value)}
                    placeholder="Detalhes"
                    className="min-h-[32px] h-8 text-sm resize-y py-1 px-2"
                    rows={1}
                  />
                  <Input
                    type="number"
                    value={item.qty}
                    onChange={e => updateItem(index, 'qty', Number(e.target.value))}
                    min={1}
                    className="h-8 text-sm"
                  />
                  <Select value={item.type} onValueChange={v => updateItem(index, 'type', v as 'part' | 'labor')}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="part">Peça</SelectItem>
                      <SelectItem value="labor">Mão de Obra</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    value={item.price}
                    onChange={e => updateItem(index, 'price', Number(e.target.value))}
                    min={0}
                    step={0.01}
                    className="h-8 text-sm"
                  />
                  <Select value={String(item.tax)} onValueChange={v => updateItem(index, 'tax', Number(v))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TAX_RATES.map(r => <SelectItem key={r.value} value={String(r.value)}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => removeItem(index)}
                    disabled={items.length <= 1}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addItem} className="w-full">
                <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Artigo
              </Button>
            </div>

            <Separator />

            {/* Discount */}
            <div className="flex items-center gap-3">
              <Label className="whitespace-nowrap">Desconto</Label>
              <Input
                type="number"
                value={discountValue}
                onChange={e => setDiscountValue(Number(e.target.value))}
                min={0}
                className="h-8 w-24 text-sm"
              />
              <Select value={discountType} onValueChange={v => setDiscountType(v as 'euro' | 'percent')}>
                <SelectTrigger className="h-8 w-20 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="euro">€</SelectItem>
                  <SelectItem value="percent">%</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Summary */}
            <div className="rounded-lg border p-3 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(totals.subtotal)}</span></div>
              {totals.discount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Desconto</span><span className="text-destructive">-{formatCurrency(totals.discount)}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">IVA</span><span>{formatCurrency(totals.iva)}</span></div>
              <Separator className="my-1" />
              <div className="flex justify-between font-bold"><span>Total</span><span className="text-primary">{formatCurrency(totals.total)}</span></div>
            </div>

            {/* Notes */}
            <div>
              <Label>Notas</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas..." rows={2} />
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'A guardar...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
