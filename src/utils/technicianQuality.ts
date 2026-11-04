// Pure derivation of per-technician quality indicators from real service data.
export interface QualityServiceRow {
  id: string;
  customer_id: string | null;
  appliance_type: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  scheduled_date: string | null;
  detected_fault: string | null;
  work_performed: string | null;
  last_status_before_part_request: string | null;
}

export interface QualityBudgetRow {
  source_service_id: string | null;
  status: string | null;
  estimated_total: number | null;
}

export interface TechnicianQualityResult {
  closed: number;
  firstTimeFixPct: number | null;
  sameFaultReturns: number;
  documentationPct: number | null;
  punctualityPct: number | null;
  punctualityMeasured: number;
  avgExecutionDays: number | null;
  budgetsCreated: number;
  budgetsAccepted: number;
  budgetsAcceptedValue: number;
}

export const CLOSED_STATUSES = ['concluidos', 'finalizado'];
export const RETURN_WINDOW_DAYS = 30;
const DAY = 86_400_000;

const dayKey = (iso: string) => iso.slice(0, 10);
const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : null);

/**
 * @param own services of the technician inside the period
 * @param later all services of the same customers (any technician) used to detect returns
 */
export function computeTechnicianQuality(
  own: QualityServiceRow[],
  later: QualityServiceRow[],
  docs: { photos: Set<string>; signatures: Set<string> },
  budgets: QualityBudgetRow[],
): TechnicianQualityResult {
  const closed = own.filter((s) => CLOSED_STATUSES.includes(s.status));

  const isReturn = (s: QualityServiceRow) =>
    !!s.customer_id &&
    later.some((o) => {
      if (o.id === s.id || o.customer_id !== s.customer_id) return false;
      if ((o.appliance_type ?? '').trim().toLowerCase() !== (s.appliance_type ?? '').trim().toLowerCase()) return false;
      const diff = Date.parse(o.created_at) - Date.parse(s.updated_at);
      return diff > 0 && diff <= RETURN_WINDOW_DAYS * DAY;
    });

  const returns = closed.filter(isReturn);
  const firstFix = closed.filter((s) => !s.last_status_before_part_request && !isReturn(s));
  const documented = closed.filter(
    (s) => docs.photos.has(s.id) && docs.signatures.has(s.id) && !!(s.detected_fault?.trim() || s.work_performed?.trim()),
  );
  const scheduled = closed.filter((s) => s.scheduled_date);
  const onTime = scheduled.filter((s) => dayKey(s.updated_at) <= s.scheduled_date!);
  const execDays = closed.map((s) => Math.max(0, (Date.parse(s.updated_at) - Date.parse(s.created_at)) / DAY));
  const ownIds = new Set(own.map((s) => s.id));
  const techBudgets = budgets.filter((b) => b.source_service_id && ownIds.has(b.source_service_id));
  const accepted = techBudgets.filter((b) => b.status === 'aprovado' || b.status === 'convertido');

  return {
    closed: closed.length,
    firstTimeFixPct: pct(firstFix.length, closed.length),
    sameFaultReturns: returns.length,
    documentationPct: pct(documented.length, closed.length),
    punctualityPct: pct(onTime.length, scheduled.length),
    punctualityMeasured: scheduled.length,
    avgExecutionDays: execDays.length ? Math.round((execDays.reduce((a, b) => a + b, 0) / execDays.length) * 10) / 10 : null,
    budgetsCreated: techBudgets.length,
    budgetsAccepted: accepted.length,
    budgetsAcceptedValue: accepted.reduce((a, b) => a + (Number(b.estimated_total) || 0), 0),
  };
}
