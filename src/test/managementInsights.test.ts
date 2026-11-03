import { describe, expect, it } from 'vitest';
import { getActionCases, getTeamQuality } from '@/utils/managementInsights';
import type { DashboardAlerts, TechnicianQuality } from '@/hooks/useDashboardMetrics';

const item = { id: 's1', code: 'TF-00301', customer_name: 'Cliente', appliance_type: null, dias: 15 };
const alerts: DashboardAlerts = {
  por_faturar: [item], pagamento_pendente: null, orcamentos_sem_resposta: null,
  servicos_parados: null, sem_tecnico: null,
  counts: { por_faturar: 1, pagamento_pendente: 0, orcamento_sem_resp: 0, servicos_parados: 0, sem_tecnico: 0 },
};
describe('Separação entre operação e gestão', () => {
  it('não repete a fila Orçamentar no Centro de Ação', () => {
    expect(getActionCases(alerts)).toEqual([]);
  });
  it('mostra uma única decisão por serviço, não repete o caso em cada alerta', () => {
    const result = getActionCases({ ...alerts,
      pagamento_pendente: [{ ...item, final_price: 100, em_falta: 75 }],
      servicos_parados: [{ ...item, status: 'em_execucao', dias_parado: 15 }], sem_tecnico: [item] });
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(75);
  });
  it('separa orçamento e serviço mesmo quando têm o mesmo identificador', () => {
    expect(getActionCases({ ...alerts, orcamentos_sem_resposta: [item], sem_tecnico: [item] })).toHaveLength(2);
  });
  it('não sugere retomar serviços de oficina já concluídos', () => {
    expect(getActionCases({ ...alerts, servicos_parados: [{ ...item, status: 'concluidos' }],
      sem_tecnico: [{ ...item, status: 'concluidos' }] })).toEqual([]);
  });
  it('aplica o limite existente de mais de 7 dias aos casos sem resposta', () => {
    expect(getActionCases({ ...alerts, orcamentos_sem_resposta: [{ ...item, dias: 7 }] })).toEqual([]);
    expect(getActionCases({ ...alerts, orcamentos_sem_resposta: [{ ...item, dias: 8 }] })).toHaveLength(1);
  });
  it('pondera qualidade coletiva pelos serviços medidos, não pela média dos técnicos', () => {
    const rows = [
      { completed_services: 2, quick_resolutions: 1, reports_complete_pct: 50, avg_resolution_days: 6 },
      { completed_services: 8, quick_resolutions: 8, reports_complete_pct: 100, avg_resolution_days: 1 },
    ] as TechnicianQuality[];
    expect(getTeamQuality(rows)).toEqual({ quickResolutionPct: 90, descriptionPct: 90, resolutionDays: 2 });
  });
  it('não apresenta ausência de dados como qualidade zero', () => {
    expect(getTeamQuality([])).toEqual({ quickResolutionPct: null, descriptionPct: null, resolutionDays: null });
  });
});