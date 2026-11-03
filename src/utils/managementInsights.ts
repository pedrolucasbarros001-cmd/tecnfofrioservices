import type { DashboardAlerts, TechnicianQuality } from '@/hooks/useDashboardMetrics';

export interface ActionCase {
  key: string;
  id: string;
  code: string;
  customer: string | null;
  kind: 'budget' | 'service';
  reason: string;
  days: number | null;
  amount: number | null;
}

const terminalStatuses = new Set(['finalizado', 'concluidos', 'concluido', 'concluído', 'cancelado']);

/** One decision per record; pricing queues stay exclusively in the operational cards. */
export function getActionCases(alerts: DashboardAlerts | undefined): ActionCase[] {
  if (!alerts) return [];
  const result: ActionCase[] = [];
  const seen = new Set<string>();
  const add = (item: ActionCase) => {
    if (seen.has(item.key)) return;
    seen.add(item.key);
    result.push(item);
  };
  for (const item of alerts.orcamentos_sem_resposta ?? []) {
    if (item.dias <= 7) continue;
    add({ key: `budget:${item.id}`, id: item.id, code: item.code, customer: item.customer_name,
      kind: 'budget', reason: 'Acompanhar resposta ao orçamento', days: item.dias, amount: null });
  }
  for (const item of alerts.pagamento_pendente ?? []) {
    if (item.dias <= 7 || item.em_falta <= 0) continue;
    add({ key: `service:${item.id}`, id: item.id, code: item.code, customer: item.customer_name,
      kind: 'service', reason: 'Rever cobrança sem atualização há mais de 7 dias', days: item.dias, amount: item.em_falta });
  }
  for (const item of alerts.servicos_parados ?? []) {
    const days = typeof item.dias_parado === 'number' ? item.dias_parado : item.dias;
    if (terminalStatuses.has(item.status) || !(days > 5)) continue;
    add({ key: `service:${item.id}`, id: item.id, code: item.code, customer: item.customer_name,
      kind: 'service', reason: 'Retomar acompanhamento do serviço', days, amount: null });
  }
  for (const item of alerts.sem_tecnico ?? []) {
    if (typeof item.status === 'string' && terminalStatuses.has(item.status)) continue;
    add({ key: `service:${item.id}`, id: item.id, code: item.code, customer: item.customer_name,
      kind: 'service', reason: 'Decidir atribuição de técnico', days: item.dias, amount: null });
  }
  return result;
}

/** Weight only the completed records that the legacy quality RPC actually measures. */
export function getTeamQuality(rows: TechnicianQuality[]) {
  const completed = rows.reduce((sum, row) => sum + Number(row.completed_services), 0);
  const withDuration = rows.filter(row => row.completed_services > 0 && row.avg_resolution_days != null);
  const durationWeight = withDuration.reduce((sum, row) => sum + Number(row.completed_services), 0);
  const withDescription = rows.filter(row => row.completed_services > 0 && row.reports_complete_pct != null);
  const descriptionWeight = withDescription.reduce((sum, row) => sum + Number(row.completed_services), 0);
  return {
    quickResolutionPct: completed > 0
      ? rows.reduce((sum, row) => sum + Number(row.quick_resolutions), 0) / completed * 100 : null,
    descriptionPct: descriptionWeight > 0
      ? withDescription.reduce((sum, row) => sum + Number(row.reports_complete_pct) * Number(row.completed_services), 0) / descriptionWeight : null,
    resolutionDays: durationWeight > 0
      ? withDuration.reduce((sum, row) => sum + Number(row.avg_resolution_days) * Number(row.completed_services), 0) / durationWeight : null,
  };
}