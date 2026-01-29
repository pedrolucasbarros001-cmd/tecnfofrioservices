/**
 * In-place printing utilities
 * Prints content without opening new windows - works reliably on mobile/desktop
 */

type PrintType = 'sheet' | 'tag';

interface PrintOptions {
  type: PrintType;
  onBeforePrint?: () => void;
  onAfterPrint?: () => void;
}

/**
 * Creates a hidden print container, clones content, and prints in-place
 */
export function printInPlace(element: HTMLElement, options: PrintOptions): void {
  const { type, onBeforePrint, onAfterPrint } = options;

  // Remove any existing print root
  const existingRoot = document.getElementById('print-root-container');
  if (existingRoot) existingRoot.remove();
  
  const existingStyle = document.getElementById('print-page-style');
  if (existingStyle) existingStyle.remove();

  // Create print root container
  const printRoot = document.createElement('div');
  printRoot.className = 'print-root';
  printRoot.id = 'print-root-container';

  // Clone the content
  const clone = element.cloneNode(true) as HTMLElement;
  
  // Add appropriate class based on type
  clone.classList.add(type === 'tag' ? 'print-tag' : 'print-content');
  
  // Remove any interactive elements from clone
  clone.querySelectorAll('button, [role="button"]').forEach(el => el.remove());
  
  printRoot.appendChild(clone);

  // Create dynamic style for page size
  const styleTag = document.createElement('style');
  styleTag.id = 'print-page-style';
  
  if (type === 'tag') {
    styleTag.textContent = `
      @media print {
        @page {
          size: 80mm auto;
          margin: 2mm;
        }
      }
    `;
  } else {
    styleTag.textContent = `
      @media print {
        @page {
          size: A4 portrait;
          margin: 10mm;
        }
      }
    `;
  }

  // Hide on screen (only visible during print)
  printRoot.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: white;
    z-index: 999999;
    overflow: auto;
    display: none;
  `;

  // Add to DOM
  document.head.appendChild(styleTag);
  document.body.appendChild(printRoot);

  // Show for printing
  printRoot.style.display = 'block';

  // Trigger callbacks
  onBeforePrint?.();

  // Small delay to ensure DOM is ready
  requestAnimationFrame(() => {
    window.print();
    
    // Cleanup after print dialog closes
    const cleanup = () => {
      const rootEl = document.getElementById('print-root-container');
      const styleEl = document.getElementById('print-page-style');
      if (rootEl) rootEl.remove();
      if (styleEl) styleEl.remove();
      onAfterPrint?.();
      window.removeEventListener('afterprint', cleanup);
    };

    // Listen for afterprint event
    window.addEventListener('afterprint', cleanup);

    // Fallback cleanup for browsers that don't fire afterprint
    setTimeout(() => {
      if (document.getElementById('print-root-container')) {
        cleanup();
      }
    }, 1000);
  });
}

/**
 * Print a service sheet (A4 format)
 */
export function printServiceSheet(elementId: string = 'print-service-sheet'): void {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id "${elementId}" not found`);
    return;
  }
  
  printInPlace(element, { type: 'sheet' });
}

/**
 * Print a service tag (80mm format)
 */
export function printServiceTag(elementId: string = 'print-service-tag'): void {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id "${elementId}" not found`);
    return;
  }
  
  printInPlace(element, { type: 'tag' });
}
