import { Shield } from 'lucide-react';
import type { AdminPricingData } from '@/utils/adminPricingUtils';
import { calculateAdminPricingTotals } from '@/utils/adminPricingUtils';

interface AdminPricingReadOnlyProps {
  data: AdminPricingData;
  /** Show full summary with discount/tax/total (for resumo step) */
  showSummary?: boolean;
}

export function AdminPricingReadOnly({ data, showSummary = false }: AdminPricingReadOnlyProps) {
  const { subtotal, taxTotal, discountAmount, adjustmentAmount, total } = calculateAdminPricingTotals(data);

  return (
    <div className="rounded-lg border border-dashed border-muted-foreground/30 overflow-hidden opacity-60">
      <div className="flex items-center justify-between bg-muted/30 px-3 py-1.5">
        <span className="text-[10px] font-medium text-muted-foreground uppercase flex items-center gap-1">
          <Shield className="h-3 w-3" />
          Definido pela Administração
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-12 gap-1 bg-muted/20 px-3 py-1">
        <span className="col-span-2 text-[10px] font-medium text-muted-foreground uppercase">Ref.</span>
        <span className="col-span-4 text-[10px] font-medium text-muted-foreground uppercase">Descrição</span>
        <span className="col-span-2 text-[10px] font-medium text-muted-foreground uppercase text-center">Qtd</span>
        <span className="col-span-2 text-[10px] font-medium text-muted-foreground uppercase text-right">Unit.</span>
        {showSummary && (
          <span className="col-span-2 text-[10px] font-medium text-muted-foreground uppercase text-right">Total</span>
        )}
      </div>

      {/* Items */}
      {data.items.map((item, idx) => (
        <div key={idx} className="grid grid-cols-12 gap-1 px-3 py-1.5 border-t text-xs text-muted-foreground">
          <span className="col-span-2 truncate">{item.ref || '-'}</span>
          <span className="col-span-4 truncate">{item.desc}</span>
          <span className="col-span-2 text-center">{item.qty}</span>
          <span className="col-span-2 text-right">{item.price.toFixed(2)}</span>
          {showSummary && (
            <span className="col-span-2 text-right font-medium">{(item.qty * item.price).toFixed(2)}</span>
          )}
        </div>
      ))}

      {/* Summary */}
      {showSummary && (
        <div className="border-t px-3 py-2 space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Subtotal Adm.</span>
            <span>{subtotal.toFixed(2)} €</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-xs text-green-600">
              <span>Desconto Adm.</span>
              <span>-{discountAmount.toFixed(2)} €</span>
            </div>
          )}
          {taxTotal > 0 && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>IVA Adm.</span>
              <span>{taxTotal.toFixed(2)} €</span>
            </div>
          )}
          {adjustmentAmount !== 0 && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Ajuste Adm.</span>
              <span>{adjustmentAmount >= 0 ? '+' : ''}{adjustmentAmount.toFixed(2)} €</span>
            </div>
          )}
          <div className="flex justify-between text-xs font-medium pt-1 border-t">
            <span>Total Adm.</span>
            <span>{total.toFixed(2)} €</span>
          </div>
        </div>
      )}

      {!showSummary && (
        <div className="flex justify-end px-3 py-1.5 border-t text-xs font-medium text-muted-foreground">
          Subtotal: {subtotal.toFixed(2)} €
        </div>
      )}
    </div>
  );
}
