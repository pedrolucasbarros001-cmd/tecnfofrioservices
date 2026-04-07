import { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Loader2, Printer } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Service } from '@/types/database';
import tecnofrioLogoFull from '@/assets/tecnofrio-logo-full.png';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface ServiceTagModalProps {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ServiceTagModal({ service, open, onOpenChange }: ServiceTagModalProps) {
  const tagRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!service) return null;

  const handleDownloadPDF = async () => {
    if (!tagRef.current || !service) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(tagRef.current, {
        scale: 4,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (_doc, el) => {
          const element = el as HTMLElement;
          element.style.overflow = 'visible';
          element.style.position = 'relative';
        },
      });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [29, 90] });
      const canvasHeight = (canvas.height / canvas.width) * 29;
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 29, canvasHeight);
      pdf.save(`Etiqueta-${service.code}.pdf`);
    } catch (err) {
      console.error('Erro ao gerar PDF da etiqueta:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const qrData = `${window.location.origin}/service/${service.id}`;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Etiqueta de Serviço - {service.code}</DialogTitle>
          </DialogHeader>

          {/* Tag content - portrait 29mm x 90mm layout */}
          <div className="flex justify-center py-2">
            <div
              ref={tagRef}
              className="print-tag"
              style={{
                width: '29mm',
                height: '90mm',
                background: '#ffffff',
                fontFamily: 'Arial, Helvetica, sans-serif',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              {/* Top accent bar */}
              <div style={{ width: '100%', height: '3mm', backgroundColor: '#2B4F84', flexShrink: 0 }} />

              {/* Logo */}
              <div style={{ padding: '1mm 1mm 0.5mm', display: 'flex', justifyContent: 'center' }}>
                <img
                  src={tecnofrioLogoFull}
                  alt="TECNOFRIO"
                  style={{ height: '4mm', objectFit: 'contain' }}
                />
              </div>

              {/* QR Code */}
              <div style={{ display: 'flex', justifyContent: 'center', padding: '0.5mm 1mm' }}>
                <QRCodeSVG
                  value={qrData}
                  size={50}
                  level="L"
                  includeMargin={false}
                />
              </div>

              {/* Service Code */}
              <div style={{ textAlign: 'center', padding: '0.5mm 1mm 0.5mm' }}>
                <p style={{
                  fontSize: '7px',
                  fontFamily: 'monospace',
                  fontWeight: 'bold',
                  color: '#2B4F84',
                  letterSpacing: '0.3px',
                  margin: 0,
                }}>
                  {service.code}
                </p>
              </div>

              {/* Divider */}
              <div style={{ width: 'calc(100% - 2mm)', height: '0.3px', backgroundColor: '#cccccc', margin: '0.3mm 1mm' }} />

              {/* Service Details */}
              <div style={{ padding: '0.5mm 1mm 0.5mm', width: '100%', boxSizing: 'border-box', flex: 1, overflow: 'hidden' }}>
                {[
                  { label: 'Cliente', value: service.customer?.name },
                  { label: 'Tel', value: service.customer?.phone },
                  { label: 'Equip', value: service.appliance_type },
                  { label: 'Desc', value: service.detected_fault || service.fault_description },
                ].map(({ label, value }) => value ? (
                  <div key={label} style={{ marginBottom: '0.3mm', lineHeight: '1.15' }}>
                    <span style={{ fontSize: '5px', fontWeight: 'bold', color: '#4b5563' }}>{label}: </span>
                    <span style={{ fontSize: '5px', color: '#000000', overflowWrap: 'break-word', wordBreak: 'break-word' }}>{value}</span>
                  </div>
                ) : null)}
              </div>

              {/* Bottom accent bar */}
              <div style={{ width: '100%', height: '2.5mm', backgroundColor: '#2B4F84', marginTop: 'auto', flexShrink: 0 }} />
            </div>
          </div>

          <DialogFooter className="gap-2 no-print">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button variant="outline" onClick={() => window.open(`/print/tag/${service.id}`, '_blank')}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
            <Button onClick={handleDownloadPDF} disabled={isGenerating}>
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {isGenerating ? 'A gerar...' : 'Baixar Etiqueta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
