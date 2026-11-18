import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CustomerDetailSheet } from '@/components/shared/CustomerDetailSheet';
import type { Customer } from '@/types/database';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ role: 'dono' }) }));
vi.mock('@/hooks/useCustomers', () => ({ useUpdateCustomer: () => ({ mutateAsync: vi.fn() }) }));
vi.mock('@/hooks/useTechnicians', () => ({ useTechnicians: () => ({ data: [] }) }));
vi.mock('@/hooks/useServices', () => ({ useCreateService: () => ({ mutateAsync: vi.fn() }) }));
vi.mock('@/components/services/ServiceDetailSheet', () => ({ ServiceDetailSheet: () => null }));
vi.mock('@/components/services/UploadDocumentModal', () => ({ UploadDocumentModal: () => null }));
vi.mock('@/components/modals/CreateBudgetModal', () => ({ CreateBudgetModal: () => null }));
vi.mock('@/components/shared/BudgetDetailPanel', () => ({ BudgetDetailPanel: () => null }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        eq: (_field: string, customerId: string) => ({
          order: async () => ({
            data: table === 'customer_appliances' ? [{
              id: `ap-${customerId}`, customer_id: customerId,
              appliance_type: customerId === 'cliente-a' ? 'Frigorífico' : 'Forno',
              brand: customerId === 'cliente-a' ? 'Bosch' : 'Balay',
            }] : [], error: null,
          }),
        }),
      }),
    }),
  },
}));

afterEach(cleanup);

const customerA = { id: 'cliente-a', name: 'Cliente A', phone: '123456789' } as Customer;
const customerB = { id: 'cliente-b', name: 'Cliente B', phone: '987654321' } as Customer;

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const content = (open: boolean, customer: Customer | null) => (
    <QueryClientProvider client={client}>
      <CustomerDetailSheet open={open} customer={customer} onOpenChange={() => {}} />
    </QueryClientProvider>
  );
  const view = render(content(true, customerA));
  return { ...view, content, client };
}

async function editFirstAppliance() {
  fireEvent.mouseDown(screen.getByRole('tab', { name: /Aparelhos/ }));
  fireEvent.click(screen.getByRole('tab', { name: /Aparelhos/ }));
  fireEvent.click(await screen.findByRole('button', { name: 'Editar aparelho Frigorífico' }));
  expect(screen.getByDisplayValue('Bosch')).toBeInTheDocument();
}

describe('Edição de aparelhos por cliente', () => {
  it('descarta a edição ao fechar e voltar à ficha do mesmo cliente', async () => {
    const { rerender, content, client } = setup();
    await editFirstAppliance();
    fireEvent.change(screen.getByDisplayValue('Bosch'), { target: { value: 'Rascunho antigo' } });
    rerender(content(false, customerA));
    rerender(content(true, customerA));
    fireEvent.mouseDown(screen.getByRole('tab', { name: /Aparelhos/ }));
    fireEvent.click(screen.getByRole('tab', { name: /Aparelhos/ }));
    expect(screen.queryByDisplayValue('Rascunho antigo')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Guardar alterações' })).not.toBeInTheDocument();
    client.clear();
  });

  it('descarta o aparelho anterior ao mudar de cliente sem desmontar a ficha', async () => {
    const { rerender, content, client } = setup();
    await editFirstAppliance();
    rerender(content(true, customerB));
    await waitFor(() => expect(screen.queryByDisplayValue('Bosch')).not.toBeInTheDocument());
    fireEvent.click(await screen.findByRole('button', { name: 'Editar aparelho Forno' }));
    expect(screen.getByDisplayValue('Balay')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Bosch')).not.toBeInTheDocument();
    client.clear();
  });

  it('limpa os campos ao cancelar e permite adicionar um aparelho sem dados antigos', async () => {
    const { client } = setup();
    await editFirstAppliance();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar', exact: true }));
    expect(screen.getByPlaceholderText('Daikin, Mitsubishi…')).toHaveValue('');
    expect(screen.getByPlaceholderText('FTXM35R…')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Adicionar aparelho' })).toBeDisabled();
    client.clear();
  });
});