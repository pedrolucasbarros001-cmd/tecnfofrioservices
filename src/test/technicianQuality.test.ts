import { describe, it, expect } from 'vitest';
import { computeTechnicianQuality, type QualityServiceRow } from '@/utils/technicianQuality';

const s = (p: Partial<QualityServiceRow>): QualityServiceRow => ({
  id: 'a', customer_id: 'c1', appliance_type: 'Frigorífico', status: 'concluidos',
  created_at: '2026-01-01T09:00:00Z', updated_at: '2026-01-03T09:00:00Z', scheduled_date: '2026-01-03',
  detected_fault: 'x', work_performed: null, last_status_before_part_request: null, ...p,
});
const none = { photos: new Set<string>(), signatures: new Set<string>() };

describe('computeTechnicianQuality', () => {
  it('counts a return within 30 days for same customer and appliance', () => {
    const own = [s({ id: 'a' })];
    const later = [...own, s({ id: 'b', created_at: '2026-01-20T09:00:00Z' })];
    const r = computeTechnicianQuality(own, later, none, []);
    expect(r.sameFaultReturns).toBe(1);
    expect(r.firstTimeFixPct).toBe(0);
  });
  it('ignores returns after 30 days or different appliance', () => {
    const own = [s({ id: 'a' })];
    const later = [...own, s({ id: 'b', created_at: '2026-03-01T09:00:00Z' }), s({ id: 'c', appliance_type: 'Forno', created_at: '2026-01-10T09:00:00Z' })];
    expect(computeTechnicianQuality(own, later, none, []).firstTimeFixPct).toBe(100);
  });
  it('part request breaks first-time fix', () => {
    const own = [s({ last_status_before_part_request: 'em_execucao' })];
    expect(computeTechnicianQuality(own, own, none, []).firstTimeFixPct).toBe(0);
  });
  it('documentation needs photo, signature and description', () => {
    const own = [s({ id: 'a' }), s({ id: 'b' })];
    const docs = { photos: new Set(['a', 'b']), signatures: new Set(['a']) };
    expect(computeTechnicianQuality(own, own, docs, []).documentationPct).toBe(50);
  });
  it('punctuality compares closing day with scheduled day', () => {
    const own = [s({ id: 'a' }), s({ id: 'b', scheduled_date: '2026-01-02' }), s({ id: 'c', scheduled_date: null })];
    const r = computeTechnicianQuality(own, own, none, []);
    expect(r.punctualityPct).toBe(50);
    expect(r.punctualityMeasured).toBe(2);
  });
  it('sums accepted budget value from own services only', () => {
    const own = [s({ id: 'a' })];
    const r = computeTechnicianQuality(own, own, none, [
      { source_service_id: 'a', status: 'aprovado', estimated_total: 120 },
      { source_service_id: 'a', status: 'pendente', estimated_total: 50 },
      { source_service_id: 'z', status: 'aprovado', estimated_total: 999 },
    ]);
    expect(r).toMatchObject({ budgetsCreated: 2, budgetsAccepted: 1, budgetsAcceptedValue: 120, avgExecutionDays: 2 });
  });
});
