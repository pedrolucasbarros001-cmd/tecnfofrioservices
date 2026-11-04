import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { computeTechnicianQuality, RETURN_WINDOW_DAYS, type QualityServiceRow, type QualityBudgetRow } from '@/utils/technicianQuality';

const COLS = 'id, customer_id, appliance_type, status, created_at, updated_at, scheduled_date, detected_fault, work_performed, last_status_before_part_request';

function chunks<T>(arr: T[], size = 100): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function loadQuality(techId: string, days: number) {
  const from = new Date(Date.now() - days * 86_400_000).toISOString();
  const own: QualityServiceRow[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from('services').select(COLS)
      .eq('technician_id', techId).gte('created_at', from).order('id').range(offset, offset + 499);
    if (error) throw error;
    own.push(...((data ?? []) as QualityServiceRow[]));
    if (!data || data.length < 500) break;
  }
  const ids = own.map((s) => s.id);
  const customerIds = [...new Set(own.map((s) => s.customer_id).filter(Boolean))] as string[];
  const later: QualityServiceRow[] = [];
  const photos = new Set<string>();
  const signatures = new Set<string>();
  const budgets: QualityBudgetRow[] = [];

  for (const c of chunks(customerIds)) {
    const { data, error } = await supabase.from('services').select(COLS).in('customer_id', c).gte('created_at', from).limit(1000);
    if (error) throw error;
    later.push(...((data ?? []) as QualityServiceRow[]));
  }
  for (const c of chunks(ids)) {
    const [p, sg, b] = await Promise.all([
      supabase.from('service_photos').select('service_id').in('service_id', c).limit(1000),
      supabase.from('service_signatures').select('service_id').in('service_id', c).limit(1000),
      supabase.from('budgets').select('source_service_id, status, estimated_total').in('source_service_id', c).limit(1000),
    ]);
    if (p.error) throw p.error;
    if (sg.error) throw sg.error;
    if (b.error) throw b.error;
    p.data?.forEach((r) => photos.add(r.service_id));
    sg.data?.forEach((r) => signatures.add(r.service_id));
    budgets.push(...((b.data ?? []) as QualityBudgetRow[]));
  }
  return computeTechnicianQuality(own, later, { photos, signatures }, budgets);
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-lg bg-muted/50 p-3 min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      {detail && <p className="mt-0.5 text-xs text-muted-foreground break-words">{detail}</p>}
    </div>
  );
}

const fmt = (v: number | null, suffix = '%') => (v == null ? '—' : `${v}${suffix}`);

export function TechnicianQualityPanel({ techId, days }: { techId: string; days: number }) {
  const { data: q, isLoading, isError } = useQuery({
    queryKey: ['performance', 'tech-quality', techId, days],
    queryFn: () => loadQuality(techId, days),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (isError || !q) return <p className="text-sm text-muted-foreground">Não foi possível calcular a qualidade.</p>;
  if (q.closed === 0) return <p className="text-sm text-muted-foreground">Sem serviços concluídos nos últimos {days} dias.</p>;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
        <Metric label="Resolvido à primeira" value={fmt(q.firstTimeFixPct)} detail="Sem pedido de peça nem regresso" />
        <Metric label="Retornos pela mesma avaria" value={String(q.sameFaultReturns)} detail={`Mesmo cliente e aparelho, até ${RETURN_WINDOW_DAYS} dias`} />
        <Metric label="Documentação completa" value={fmt(q.documentationPct)} detail="Foto, assinatura e relatório" />
        <Metric label="Pontualidade" value={fmt(q.punctualityPct)} detail={`Fechado até ao dia agendado (${q.punctualityMeasured} agendados)`} />
        <Metric label="Tempo de execução" value={fmt(q.avgExecutionDays, ' d')} detail="Média da abertura ao fecho" />
        <Metric
          label="Oportunidades comerciais"
          value={`${q.budgetsAccepted}/${q.budgetsCreated}`}
          detail={`Orçamentos aceites · ${q.budgetsAcceptedValue.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}`}
        />
      </div>
      <p className="text-xs text-muted-foreground">Base: {q.closed} serviços concluídos nos últimos {days} dias.</p>
    </div>
  );
}
