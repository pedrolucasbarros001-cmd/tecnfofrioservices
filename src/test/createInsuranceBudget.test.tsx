import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateBudgetModal } from '@/components/modals/CreateBudgetModal';
import type { Service } from '@/types/database';

const storage = vi.hoisted(() => ({ insert: vi.fn(), update: vi.fn() }));
vi.mock('@/hooks/useCustomers', () => ({
  useCreateCustomer: () => ({ mutateAsync: vi.fn() }),
  useUpdateCustomer: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({ eq: async () => ({ data: [], error: null }) }),
      insert: (payload: unknown) => {
        storage.insert(payload);
        return { select: () => ({ single: async () => ({ data: { id: 'budget-1', code: 'ORC-TEST', ...(payload as object) }, error: null }) }) };
      },
      update: (payload: unknown) => {
        storage.update(table, payload);
        return { eq: async () => ({ error: null }) };
      },
    }),
  },
}));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('Orçamento para seguro depois da assistência', () => {
  it('guarda a opção de seguro e 659 euros sem IVA, abre o resultado e mantém a assistência finalizada', async () => {
    const client = new QueryClient();
    const onCreated = vi.fn();
    const service = {
      id: 'service-1', code: 'TF-01372', status: 'finalizado',
      pricing_description: JSON.stringify({ items: [{ ref: '869991602720', desc: 'MLL NOVA HOTPOINT', qty: 1, price: 659, tax_rate: 0 }] }),
      customer: { id: 'customer-1', name: 'Cliente', phone: '123456789', email: null, nif: null },
    } as Service;
    render(<QueryClientProvider client={client}>
      <CreateBudgetModal open onOpenChange={() => {}} sourceService={service} onCreated={onCreated} />
    </QueryClientProvider>);
    await waitFor(() => expect(screen.getByDisplayValue('MLL NOVA HOTPOINT')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar Orçamento' }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ is_insurance_budget: true, estimated_total: 659 })));
    expect(storage.insert).toHaveBeenCalledWith(expect.objectContaining({ is_insurance_budget: true, estimated_total: 659, source_service_id: 'service-1' }));
    expect(storage.update).not.toHaveBeenCalled();
    client.clear();
  });
});