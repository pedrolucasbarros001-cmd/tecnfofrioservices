/**
 * Print utilities - Improved system with dynamic @page injection
 * Supports: A4 Sheet & 80mm x 170mm Tag
 */

type PrintType = 'sheet' | 'tag';

// Page configurations for each print type
const PAGE_CONFIGS: Record<PrintType, string> = {
  sheet: '@page { size: A4 portrait; margin: 0; }',
  tag: '@page { size: 102mm 152mm; margin: 0; }', // 4x6 inches
};

let injectedStyleElement: HTMLStyleElement | null = null;

/**
 * Injects a dynamic <style> element with the correct @page rules
 */
function injectPageStyle(type: PrintType): void {
  // Remove any existing injected style
  removeInjectedStyle();

  // Create new style element
  const styleEl = document.createElement('style');
  styleEl.id = 'dynamic-print-page-style';
  styleEl.setAttribute('media', 'print');
  styleEl.textContent = PAGE_CONFIGS[type];
  document.head.appendChild(styleEl);
  injectedStyleElement = styleEl;
}

/**
 * Removes the dynamically injected style element
 */
function removeInjectedStyle(): void {
  if (injectedStyleElement) {
    injectedStyleElement.remove();
    injectedStyleElement = null;
  }
  // Also try to find by ID (fallback for inconsistent state)
  const existing = document.getElementById('dynamic-print-page-style');
  if (existing) {
    existing.remove();
  }
}

/**
 * Triggers print dialog with correct page size and manages cleanup
 */
export function triggerPrint(type: PrintType): void {
  // Set body class for CSS rules
  document.body.classList.remove('print-type-sheet', 'print-type-tag');
  document.body.classList.add(`print-type-${type}`);

  // Inject dynamic @page style
  injectPageStyle(type);

  // Trigger print
  window.print();

  // Cleanup after print dialog closes
  const cleanup = () => {
    document.body.classList.remove('print-type-sheet', 'print-type-tag');
    removeInjectedStyle();
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);

  // Fallback cleanup for Safari (afterprint can be inconsistent)
  setTimeout(() => {
    // Only cleanup if still present after 5 seconds
    if (injectedStyleElement || document.body.classList.contains(`print-type-${type}`)) {
      cleanup();
    }
  }, 5000);
}

/**
 * Print a service sheet (A4 format)
 */
export function printServiceSheet(): void {
  triggerPrint('sheet');
}

/**
 * Print a service tag (80mm x 170mm format)
 */
export function printServiceTag(): void {
  triggerPrint('tag');
}
