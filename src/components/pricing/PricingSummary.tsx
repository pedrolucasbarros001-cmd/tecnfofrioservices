import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from './PriceLineItems';
import { cn } from '@/lib/utils';

interface PricingSummaryProps {
  subtotal: number;
  totalTax: number;
  discountValue: string;
  discountType: 'euro' | 'percent';
  adjustment: string;
  onDiscountValueChange: (value: string) => void;
  onDiscountTypeChange: (type: 'euro' | 'percent') => void;
  onAdjustmentChange: (value: string) => void;
  disabled?: boolean;
  warrantyCoversAll?: boolean;
}

export function calculateDiscount(
  subtotal: number,
  discountValue: string,
  discountType: 'euro' | 'percent'
): number {
  const value = parseFloat(discountValue.replace(',', '.')) || 0;
  if (discountType === 'percent') {
    return subtotal * (value / 100);
  }
  return value;
}

export function PricingSummary({
  subtotal,
  totalTax,
  discountValue,
  discountType,
  adjustment,
  onDiscountValueChange,
  onDiscountTypeChange,
  onAdjustmentChange,
  disabled = false,
  warrantyCoversAll = false,
}: PricingSummaryProps) {
  const discountAmount = calculateDiscount(subtotal, discountValue, discountType);
  const adjustmentAmount = parseFloat(adjustment.replace(',', '.')) || 0;
  const finalTotal = subtotal + totalTax - discountAmount + adjustmentAmount;

  return (
    <div className={cn(
      "w-full sm:w-[320px] p-4 rounded-lg space-y-3",
      warrantyCoversAll
        ? "bg-green-50 border border-green-200"
        : "bg-slate-50 border border-border"
    )}>
      {/* Subtotal */}
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Subtotal (s/ IVA):</span>
        <span className={cn("font-semibold", warrantyCoversAll && "line-through text-muted-foreground")}>
          {formatCurrency(subtotal)}
        </span>
      </div>

      {/* IVA Total */}
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">IVA Total:</span>
        <span className={cn("font-semibold", warrantyCoversAll && "line-through text-muted-foreground")}>
          {formatCurrency(totalTax)}
        </span>
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
            onChange={(e) => onDiscountValueChange(e.target.value)}
            disabled={disabled || warrantyCoversAll}
            className="h-8 text-sm"
          />
          <div className="flex border rounded-md overflow-hidden">
            <Button
              type="button"
              variant={discountType === 'euro' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 px-2 rounded-none text-xs"
              onClick={() => onDiscountTypeChange('euro')}
              disabled={disabled || warrantyCoversAll}
            >
              €
            </Button>
            <Button
              type="button"
              variant={discountType === 'percent' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 px-2 rounded-none text-xs"
              onClick={() => onDiscountTypeChange('percent')}
              disabled={disabled || warrantyCoversAll}
            >
              %
            </Button>
          </div>
        </div>
        <span className="text-sm font-medium text-destructive w-20 text-right">
          -{formatCurrency(discountAmount)}
        </span>
      </div>

      {/* Ajuste */}
      <div className="flex items-center gap-2">
        <Label className="text-sm text-muted-foreground whitespace-nowrap w-20">
          Ajuste:
        </Label>
        <Input
          type="text"
          inputMode="decimal"
          placeholder="0"
          value={adjustment}
          onChange={(e) => onAdjustmentChange(e.target.value)}
          disabled={disabled || warrantyCoversAll}
          className="h-8 text-sm flex-1"
        />
        <span className="text-sm font-medium w-20 text-right">
          {adjustmentAmount >= 0 ? '+' : ''}{formatCurrency(adjustmentAmount)}
        </span>
      </div>

      <Separator className={warrantyCoversAll ? "bg-green-200" : ""} />

      {/* Total */}
      <div className="flex justify-between items-center">
        <span className="font-semibold text-base">Total a Cobrar:</span>
        <span className={cn(
          "font-bold text-xl",
          warrantyCoversAll ? "text-green-600" : "text-primary"
        )}>
          {warrantyCoversAll ? 'Sem cobrança' : formatCurrency(Math.max(0, finalTotal))}
        </span>
      </div>
    </div>
  );
}
