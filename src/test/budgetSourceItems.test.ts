import { describe, expect, it } from 'vitest';
import { getBudgetSourceItems } from '@/utils/budgetSourceItems';

describe('IVA ao criar orçamento de uma assistência', () => {
  it('mantém os 659 euros e IVA 0% do TF-01372 sem acrescentar 23%', () => {
    const items = getBudgetSourceItems(JSON.stringify({ items: [{ ref: '869991602720', desc: 'MLL NOVA HOTPOINT', qty: 1, price: 659, tax_rate: 0 }] }), []);
    expect(items[0].tax_rate).toBe(0);
    expect(items.reduce((sum, item) => sum + item.quantity * item.unit_price * (1 + item.tax_rate / 100), 0)).toBe(659);
  });

  it('preserva IVA 0% das peças antigas', () => {
    expect(getBudgetSourceItems(null, [{ part_name: 'Peça', part_code: null, quantity: 1, cost: 659, iva_rate: 0 }])[0].tax_rate).toBe(0);
  });

  it('não aplica 23% automaticamente a uma linha nova', () => {
    expect(getBudgetSourceItems(null, [])[0].tax_rate).toBe(0);
  });

  it('preserva IVA explicitamente definido, sem isentar orçamentos automaticamente', () => {
    expect(getBudgetSourceItems(JSON.stringify({ items: [{ description: 'Peça', qty: 1, price: 100, tax: 23 }] }), [])[0].tax_rate).toBe(23);
  });
});