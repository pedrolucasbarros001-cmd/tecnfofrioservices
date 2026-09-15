/**
 * Configuração do lembrete de manutenção e suporte apresentado ao dono.
 * Alterar apenas aqui.
 */
export const SERVICE_BILLING = {
  /** Liga/desliga o lembrete por completo. */
  enabled: true,
  /** Dia fixo do mês em que a renovação vence (1-28). */
  dueDay: 18,
  /** Dias de antecedência com que a faixa no topo aparece. */
  noticeDays: 7,
  /** Dias de antecedência a partir dos quais o aviso ao abrir aparece (1x por dia). */
  modalDays: 3,
} as const;
