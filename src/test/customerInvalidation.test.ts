import { describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { invalidateCustomerQueries } from '@/lib/queryInvalidation';

describe('Atualização do email do cliente', () => {
  it('invalida o email antigo nas fichas, listas e impressões já carregadas', () => {
    const client = new QueryClient();
    const keys = [
      ['customer', 'c1', 'print-contact'], ['customer-services', 'c1'],
      ['service-full', 's1'], ['service-print', 's1'],
      ['services-paginated', 1], ['customers-paginated', 1],
      ['customer-budgets', 'c1'], ['budget-print', 'b1'],
    ];
    for (const key of keys) {
      client.setQueryData(key, { customer: { email: 'antigo@example.com' } });
      expect(client.getQueryState(key)?.isInvalidated).toBe(false);
    }
    invalidateCustomerQueries(client);
    for (const key of keys) expect(client.getQueryState(key)?.isInvalidated).toBe(true);
    client.clear();
  });
});