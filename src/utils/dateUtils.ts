/**
 * Date utilities for business day calculations and shift formatting
 */

/**
 * Adds business days to a date (excludes Saturdays and Sundays)
 */
export function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let addedDays = 0;

  while (addedDays < days) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      addedDays++;
    }
  }

  return result;
}

/**
 * Calculates business days remaining until a target date
 * Returns negative number if target date has passed
 */
export function getBusinessDaysRemaining(targetDate: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);

  if (target <= today) {
    // Calculate overdue business days (negative)
    let days = 0;
    const current = new Date(target);
    while (current < today) {
      current.setDate(current.getDate() + 1);
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        days--;
      }
    }
    return days;
  }

  // Calculate remaining business days (positive)
  let days = 0;
  const current = new Date(today);
  while (current < target) {
    current.setDate(current.getDate() + 1);
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      days++;
    }
  }
  return days;
}

/**
 * Formats the scheduled_shift value for display.
 * Maps 'manha' to 'Manhã' and 'tarde' to 'Tarde'.
 * Regular time strings (e.g. "14:30") are returned as-is.
 * Returns 'Sem turno' for null/undefined/empty values.
 */
/**
 * Formats a Date to 'YYYY-MM-DD' using LOCAL timezone (avoids UTC day-shift).
 */
export function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parses a 'YYYY-MM-DD' string as a LOCAL date (not UTC).
 * Fixes the bug where `new Date("2026-04-01")` is interpreted as UTC midnight,
 * which shows as the previous day in timezones like Portugal (UTC+0/+1).
 */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Compares a YYYY-MM-DD string with a Date object using LOCAL day only.
 * Replaces isSameDay(parseISO(dateStr), date) which is vulnerable to UTC shift.
 */
export function isSameLocalDateString(dateStr: string, date: Date): boolean {
  const [y, m, d] = dateStr.split('-').map(Number);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/**
 * Formats a YYYY-MM-DD string using date-fns format, treating it as local date.
 * Use this instead of format(new Date(dateStr), ...) for pure-date fields like
 * scheduled_date, delivery_date, estimated_arrival.
 */
export function formatLocalDate(dateStr: string, formatStr: string, options?: any): string {
  const { format } = require('date-fns');
  const [y, m, d] = dateStr.split('-').map(Number);
  return format(new Date(y, m - 1, d), formatStr, options);
}

export function formatShiftLabel(shift: string | null | undefined): string {
  if (!shift) return 'Sem turno';
  const s = shift.toLowerCase();
  if (s === 'manha') return 'Manhã';
  if (s === 'tarde') return 'Tarde';
  return shift;
}
