import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import type { GroupedParts } from '@/hooks/useServiceFinancialData';

interface ServicePartsHistoryProps {
  groupedParts: GroupedParts[];
  historySubtotal: number;
}

export function ServicePartsHistory({ groupedParts, historySubtotal }: ServicePartsHistoryProps) {
  if (groupedParts.length === 0) return null;

  return (
    <div className="space-y-3 opacity-70">
      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Histórico de Intervenções
      </h4>
      {groupedParts.map((group, idx) => (
        <div key={idx} className="border rounded-lg p-3 bg-muted/30 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">
              {group.location} • {group.technicianName}
            </span>
            <span>
              {format(new Date(group.date), "dd/MM/yyyy", { locale: pt })}
            </span>
          </div>
          <div className="space-y-1">
            {group.parts.map((part) => {
              const lineTotal = (part.cost || 0) * (part.quantity || 1);
              return (
                <div key={part.id} className="flex items-center justify-between text-sm gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{part.part_name}</span>
                    {part.part_code && (
                      <span className="text-muted-foreground ml-1">({part.part_code})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                    <span>{part.quantity}x</span>
                    <span>€{(part.cost || 0).toFixed(2)}</span>
                    <span className="font-medium text-foreground w-20 text-right">
                      €{lineTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-end text-xs pt-1 border-t border-border/50">
            <span className="text-muted-foreground mr-2">Subtotal:</span>
            <span className="font-semibold">€{group.subtotal.toFixed(2)}</span>
          </div>
        </div>
      ))}
      <div className="flex justify-end text-sm font-semibold pt-1">
        <span className="text-muted-foreground mr-2">Total Histórico:</span>
        <span>€{historySubtotal.toFixed(2)}</span>
      </div>
    </div>
  );
}
