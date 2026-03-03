export interface AdminPricingItem {
  ref: string;
  desc: string;
  qty: number;
  price: number;
  tax: number;
}

export interface AdminPricingData {
  items: AdminPricingItem[];
  discount?: { type: 'euro' | 'percent'; value: number };
  adjustment?: number;
  historySubtotal?: number;
}

export function parseAdminPricing(pricingDescription: string | null | undefined): AdminPricingData | null {
  if (!pricingDescription) return null;
  try {
    const parsed = JSON.parse(pricingDescription);
    if (parsed.items && Array.isArray(parsed.items) && parsed.items.length > 0) {
      return parsed as AdminPricingData;
    }
    return null;
  } catch {
    return null;
  }
}

export function calculateAdminPricingTotals(data: AdminPricingData) {
  const subtotal = data.items.reduce((sum, item) => sum + item.qty * item.price, 0);
  const taxTotal = data.items.reduce((sum, item) => sum + item.qty * item.price * (item.tax / 100), 0);

  let discountAmount = 0;
  if (data.discount) {
    if (data.discount.type === 'percent') {
      discountAmount = subtotal * (data.discount.value / 100);
    } else {
      discountAmount = data.discount.value;
    }
  }

  const adjustmentAmount = data.adjustment || 0;
  const total = subtotal + taxTotal - discountAmount + adjustmentAmount;

  return { subtotal, taxTotal, discountAmount, adjustmentAmount, total };
}
