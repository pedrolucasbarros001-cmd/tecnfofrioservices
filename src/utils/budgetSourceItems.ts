export interface BudgetSourceItem {
  name: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  type: 'part' | 'labor';
}

interface ServicePartSource {
  part_name: string;
  part_code: string | null;
  quantity: number | null;
  cost: number | null;
  iva_rate: number | null;
}

// Administrative pricing is authoritative; service parts are a legacy fallback.
export function getBudgetSourceItems(pricing: string | null | undefined, parts: ServicePartSource[]): BudgetSourceItem[] {
  if (pricing) {
    try {
      const parsed = JSON.parse(pricing);
      if (Array.isArray(parsed.items) && parsed.items.length > 0) {
        return parsed.items.map((item: Record<string, any>) => ({
          name: item.desc ?? item.description ?? '',
          description: item.ref ?? item.article ?? item.details ?? '',
          quantity: item.qty ?? 1,
          unit_price: item.price ?? 0,
          tax_rate: item.tax_rate ?? item.tax ?? 0,
          type: item.type === 'labor' ? 'labor' : 'part',
        }));
      }
    } catch {
      // Older services may not have structured pricing.
    }
  }
  if (parts.length > 0) {
    return parts.map(part => ({
      name: part.part_name,
      description: part.part_code ?? '',
      quantity: part.quantity ?? 1,
      unit_price: part.cost ?? 0,
      tax_rate: part.iva_rate ?? 0,
      type: 'part',
    }));
  }
  return [{ name: 'Diagnóstico / Mão de Obra', description: '', quantity: 1, unit_price: 0, tax_rate: 0, type: 'labor' }];
}