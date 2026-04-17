import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

/**
 * Formata uma data de forma segura. Retorna fallback se o valor for inválido.
 * Substitui chamadas a format(new Date(value), ...) que rebentam com 
 * RangeError: Invalid time value quando o valor é null/undefined/inválido.
 */
export function safeFormat(
  value: string | Date | null | undefined,
  formatStr: string,
  fallback: string = '—'
): string {
  if (!value) return fallback;
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return fallback;
  try {
    return format(date, formatStr, { locale: pt });
  } catch {
    return fallback;
  }
}
