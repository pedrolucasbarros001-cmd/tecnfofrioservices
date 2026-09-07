/**
 * Configuração do lembrete de manutenção e suporte apresentado ao dono.
 * Alterar apenas aqui.
 */
export const SERVICE_BILLING = {
  /** Liga/desliga o lembrete por completo. */
  enabled: true,
  /** Dia fixo do mês em que a renovação vence (1-28). */
  dueDay: 18,
  /** Dias de antecedência com que o lembrete aparece. */
  noticeDays: 7,
} as const;
