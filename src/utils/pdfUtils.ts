import html2pdf from 'html2pdf.js';

interface GeneratePDFOptions {
  element: HTMLElement;
  filename: string;
}

export async function generatePDF({ element, filename }: GeneratePDFOptions): Promise<void> {
  const options = {
    margin: 10,
    filename: `${filename}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  await html2pdf().set(options).from(element).save();
}
