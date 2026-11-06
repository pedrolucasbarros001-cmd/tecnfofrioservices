import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ServicePrintModal } from '@/components/modals/ServicePrintModal';
import type { Service } from '@/types/database';

const contact = vi.hoisted(() => ({ email: 'atual@example.com' as string | null }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { email: contact.email }, error: null }),
          order: async () => ({ data: [], error: null }),
        }),
      }),
    }),
  },
}));

afterEach(cleanup);

describe('Email na ficha impressa', () => {
  it('usa o email guardado em vez da cópia antiga do serviço e respeita a remoção do email', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const service = {
      id: 's1', code: 'TF-00301', customer_id: 'c1', status: 'por_fazer',
      created_at: '2026-11-06T12:00:00Z',
      customer: { id: 'c1', name: 'Cliente', email: 'antigo@example.com' },
      contact_email: 'antigo@example.com',
    } as Service;
    const content = (open: boolean) => (
      <QueryClientProvider client={client}>
        <ServicePrintModal service={service} open={open} onOpenChange={() => {}} />
      </QueryClientProvider>
    );
    const view = render(content(true));
    await waitFor(() => expect(screen.getAllByText('atual@example.com')).toHaveLength(2));
    expect(screen.queryByText('antigo@example.com')).not.toBeInTheDocument();
    view.rerender(content(false));
    contact.email = null;
    view.rerender(content(true));
    await waitFor(() => expect(screen.queryByText('atual@example.com')).not.toBeInTheDocument());
    expect(screen.queryByText('antigo@example.com')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Imprimir' })).toBeEnabled());
    client.clear();
  });
});