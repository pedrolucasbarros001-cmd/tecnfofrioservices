import html2pdf from 'html2pdf.js';

type PDFFormat = 'a4' | [number, number]; // [width, height] in mm

interface GeneratePDFOptions {
  element: HTMLElement;
  filename: string;
  format?: PDFFormat;
  orientation?: 'portrait' | 'landscape';
  margin?: number;
}

/**
 * Generates a PDF from an HTML element by cloning it to avoid scroll/overflow issues
 */
export async function generatePDF({ 
  element, 
  filename, 
  format = 'a4',
  orientation = 'portrait',
  margin = 10
}: GeneratePDFOptions): Promise<void> {
  // Create a temporary container offscreen
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0;
    width: ${format === 'a4' ? '210mm' : `${format[0]}mm`};
    min-height: ${format === 'a4' ? '297mm' : `${format[1]}mm`};
    background: white;
    overflow: visible;
    z-index: -1;
  `;
  
  // Clone the element
  const clone = element.cloneNode(true) as HTMLElement;
  
  // Reset styles that might cause clipping
  clone.style.cssText = `
    width: 100%;
    height: auto;
    max-height: none;
    overflow: visible;
    position: static;
    transform: none;
  `;
  
  // Also reset overflow on all children
  const allChildren = clone.querySelectorAll('*');
  allChildren.forEach((child) => {
    if (child instanceof HTMLElement) {
      const computed = window.getComputedStyle(child);
      if (computed.overflow === 'auto' || computed.overflow === 'scroll' || computed.overflowY === 'auto' || computed.overflowY === 'scroll') {
        child.style.overflow = 'visible';
        child.style.maxHeight = 'none';
        child.style.height = 'auto';
      }
    }
  });
  
  container.appendChild(clone);
  document.body.appendChild(container);

  try {
    // Configure html2pdf options
    // Note: jsPDF format expects string or array, we use 'any' to bypass strict typing
    const jsPDFFormat: unknown = format === 'a4' ? 'a4' : format;
    
    const options = {
      margin: margin,
      filename: `${filename}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        scrollY: 0,
        scrollX: 0,
        windowWidth: format === 'a4' ? 794 : (format[0] / 25.4) * 96, // Convert mm to px (96 DPI)
      },
      jsPDF: { 
        unit: 'mm', 
        format: jsPDFFormat, 
        orientation: orientation 
      },
      pagebreak: { mode: 'avoid-all' }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await html2pdf().set(options as any).from(clone).save();
  } finally {
    // Clean up
    document.body.removeChild(container);
  }
}

/**
 * Generate A4 PDF for service sheets
 */
export async function generateSheetPDF(element: HTMLElement, filename: string): Promise<void> {
  return generatePDF({
    element,
    filename,
    format: 'a4',
    orientation: 'portrait',
    margin: 10
  });
}

/**
 * Generate 4x6 inch (102x152mm) PDF for service tags
 */
export async function generateTagPDF(element: HTMLElement, filename: string): Promise<void> {
  return generatePDF({
    element,
    filename,
    format: [102, 152],
    orientation: 'portrait',
    margin: 0
  });
}
