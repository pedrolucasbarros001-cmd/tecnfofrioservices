/**
 * Date utilities for business day calculations and shift formatting
 */

/**
 * Formats a shift value for display (capitalizes properly)
 * Handles legacy time-string data gracefully
 */
export function formatShiftLabel(shift: string | null | undefined): string {
  if (!shift) return 'Sem turno';
  if (shift === 'manha') return 'Manhã';
  if (shift === 'tarde') return 'Tarde';
  return shift; // fallback for legacy time data
}

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
