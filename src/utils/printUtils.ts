/**
 * Print utilities for generating clean print output
 * Opens a new window with only the print content for proper formatting
 */

interface PrintOptions {
  title: string;
  pageSize?: 'A4' | 'label';  // A4 for service sheet, label for tag
}

/**
 * Opens a new window with the content to print, then triggers print dialog
 */
export function printContent(elementId: string, options: PrintOptions) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error('Print element not found:', elementId);
    return;
  }

  // Clone the content to avoid modifying the original
  const content = element.cloneNode(true) as HTMLElement;
  
  // Get computed styles from the main document
  const styles = Array.from(document.styleSheets)
    .map(styleSheet => {
      try {
        return Array.from(styleSheet.cssRules)
          .map(rule => rule.cssText)
          .join('\n');
      } catch (e) {
        // Cross-origin stylesheets will throw
        return '';
      }
    })
    .join('\n');

  // Page size styles
  const pageStyles = options.pageSize === 'label' 
    ? `
      @page {
        size: 80mm auto;
        margin: 2mm;
      }
      body {
        width: 80mm;
        margin: 0 auto;
      }
      .print-container {
        width: 76mm;
        padding: 2mm;
        border: 1px solid #000;
        margin: 0 auto;
      }
    `
    : `
      @page {
        size: A4 portrait;
        margin: 10mm;
      }
      body {
        width: 100%;
        max-width: 190mm;
        margin: 0 auto;
      }
      .print-container {
        width: 100%;
        padding: 5mm;
      }
    `;

  // Build the print document
  const printDocument = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${options.title}</title>
        <style>
          ${styles}
          
          /* Print-specific overrides */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          html, body {
            background: white !important;
            color: black !important;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 11px;
            line-height: 1.4;
            margin: 0;
            padding: 0;
          }
          
          ${pageStyles}
          
          /* Ensure images and SVGs print */
          img, svg {
            max-width: 100%;
            height: auto;
          }
          
          /* Remove interactive elements styling */
          button, .no-print {
            display: none !important;
          }
          
          /* Color adjustments for print */
          .text-muted-foreground {
            color: #666 !important;
          }
          
          .bg-amber-50 {
            background-color: #fffbeb !important;
          }
          
          .bg-purple-50 {
            background-color: #faf5ff !important;
          }
          
          .border {
            border-color: #e5e7eb !important;
          }
          
          [role="separator"] {
            background-color: #e5e7eb !important;
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          ${content.innerHTML}
        </div>
        <script>
          // Auto-print when loaded
          window.onload = function() {
            setTimeout(function() {
              window.print();
              // Close after print dialog (with small delay for Safari)
              setTimeout(function() {
                window.close();
              }, 100);
            }, 250);
          };
        </script>
      </body>
    </html>
  `;

  // Open print window
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (printWindow) {
    printWindow.document.write(printDocument);
    printWindow.document.close();
  } else {
    // Fallback if popup blocked
    console.error('Could not open print window. Please allow popups for this site.');
    alert('Não foi possível abrir a janela de impressão. Por favor, permita popups para este site.');
  }
}

/**
 * Print service sheet (A4 format)
 */
export function printServiceSheet(elementId: string = 'print-service-sheet') {
  printContent(elementId, {
    title: 'Ficha de Serviço - TECNOFRIO',
    pageSize: 'A4',
  });
}

/**
 * Print service tag (80mm label format)
 */
export function printServiceTag(elementId: string = 'print-service-tag') {
  printContent(elementId, {
    title: 'Etiqueta de Serviço - TECNOFRIO',
    pageSize: 'label',
  });
}
