import { describe, it, expect } from 'vitest';

/**
 * Smoke test — garante que componentes críticos importam sem erro.
 * Falha se houver ReferenceError tipo "X is not defined" em runtime.
 */
describe('imports críticos', () => {
  it('CustomerDetailSheet importa CreateBudgetModal', async () => {
    const mod = await import('@/components/shared/CustomerDetailSheet');
    expect(mod.CustomerDetailSheet).toBeDefined();
  });

  it('CreateBudgetModal exporta named export', async () => {
    const mod = await import('@/components/modals/CreateBudgetModal');
    expect(mod.CreateBudgetModal).toBeDefined();
  });

  it('ErrorBoundary exporta', async () => {
    const mod = await import('@/components/ErrorBoundary');
    expect(mod.ErrorBoundary).toBeDefined();
  });

  it('App exporta', async () => {
    const mod = await import('@/App');
    expect(mod.default).toBeDefined();
  });
});
