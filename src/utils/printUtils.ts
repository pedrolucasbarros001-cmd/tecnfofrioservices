/**
 * Print utilities - Simple approach using CSS @media print
 * The visibility logic is controlled entirely by CSS classes
 */

type PrintType = 'sheet' | 'tag';

/**
 * Triggers print dialog and manages body class for @page rules
 */
export function triggerPrint(type: PrintType): void {
  // Set body class for @page size
  document.body.classList.remove('print-type-sheet', 'print-type-tag');
  document.body.classList.add(`print-type-${type}`);

  // Trigger print
  window.print();

  // Cleanup after print dialog closes
  const cleanup = () => {
    document.body.classList.remove('print-type-sheet', 'print-type-tag');
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);
}

/**
 * Print a service sheet (A4 format)
 */
export function printServiceSheet(): void {
  triggerPrint('sheet');
}

/**
 * Print a service tag (80mm format)
 */
export function printServiceTag(): void {
  triggerPrint('tag');
}
