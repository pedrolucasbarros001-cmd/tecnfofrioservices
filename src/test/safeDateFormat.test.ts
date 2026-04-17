import { describe, it, expect } from 'vitest';
import { safeFormat } from '@/utils/safeDateFormat';

describe('safeFormat', () => {
  it('retorna fallback para null', () => {
    expect(safeFormat(null, 'dd/MM/yyyy')).toBe('—');
  });
  it('retorna fallback para undefined', () => {
    expect(safeFormat(undefined, 'dd/MM/yyyy')).toBe('—');
  });
  it('retorna fallback para data inválida', () => {
    expect(safeFormat('not-a-date', 'dd/MM/yyyy')).toBe('—');
  });
  it('formata data válida ISO', () => {
    expect(safeFormat('2026-04-17', 'dd/MM/yyyy')).toBe('17/04/2026');
  });
  it('formata Date object', () => {
    expect(safeFormat(new Date('2026-04-17'), 'dd/MM/yyyy')).toBe('17/04/2026');
  });
  it('aceita fallback custom', () => {
    expect(safeFormat(null, 'dd/MM/yyyy', 'sem data')).toBe('sem data');
  });
});
