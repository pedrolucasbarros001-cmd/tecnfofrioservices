/**
 * Currency utilities for parsing Portuguese/European number formats
 * 
 * Portuguese format: 2.000,50 = two thousand and fifty cents
 * - Dot (.) is the thousands separator
 * - Comma (,) is the decimal separator
 * 
 * HTML number input format: 2000.50 = two thousand and fifty cents
 * - Dot (.) is the decimal separator
 */

/**
 * Parse a currency input string accepting both PT/EU and standard formats
 * 
 * @param value - The input string to parse
 * @returns The parsed number value, or 0 if invalid
 * 
 * @example
 * parseCurrencyInput("2000")      // → 2000
 * parseCurrencyInput("2.000")     // → 2000 (PT thousands)
 * parseCurrencyInput("2.000,00")  // → 2000 (PT format)
 * parseCurrencyInput("2,50")      // → 2.5  (PT decimals)
 * parseCurrencyInput("1.234,56")  // → 1234.56
 * parseCurrencyInput("50.00")     // → 50   (standard decimals)
 * parseCurrencyInput("50,00")     // → 50   (PT decimals)
 */
export function parseCurrencyInput(value: string | number | undefined | null): number {
  // Handle non-string inputs
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  if (typeof value !== 'string') return 0;
  
  // Remove spaces and euro symbol
  let cleaned = value.trim().replace(/€/g, '').replace(/\s/g, '');
  
  if (!cleaned) return 0;
  
  // Detect format based on separators
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');
  
  if (hasComma) {
    // Contains comma - treat as PT/EU format
    // Remove dots (thousands separator) and replace comma with dot (decimal)
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (hasDot) {
    // Only dots - need to detect if it's thousands or decimal
    const parts = cleaned.split('.');
    const lastPart = parts[parts.length - 1];
    
    // If last segment has exactly 3 digits and there are multiple parts,
    // it's likely a thousands separator (e.g., "2.000" = 2000)
    // But "2.50" = 2.5 (decimal)
    if (parts.length > 1 && lastPart.length === 3 && /^\d+$/.test(lastPart)) {
      // Check if all parts except possibly the last could be thousands
      const allThousands = parts.every((p, i) => 
        i === 0 ? /^\d+$/.test(p) : p.length === 3 && /^\d+$/.test(p)
      );
      
      if (allThousands) {
        // This is thousands format: 2.000 → 2000, 1.234.567 → 1234567
        cleaned = cleaned.replace(/\./g, '');
      }
      // Otherwise keep as decimal (e.g., edge cases)
    }
    // If last part has 1-2 digits, treat dot as decimal: 2.50 → 2.50
  }
  
  const result = parseFloat(cleaned);
  return isNaN(result) ? 0 : result;
}

/**
 * Format a number as currency for display (PT format)
 * 
 * @param value - The number to format
 * @returns Formatted string in Portuguese format
 * 
 * @example
 * formatCurrencyDisplay(2000)    // → "2.000,00"
 * formatCurrencyDisplay(1234.56) // → "1.234,56"
 */
export function formatCurrencyDisplay(value: number): string {
  if (isNaN(value)) return '0,00';
  
  return value.toLocaleString('pt-PT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
