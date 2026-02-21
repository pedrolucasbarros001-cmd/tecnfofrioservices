import { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Loader2, Printer } from 'lucide-react';
import { printServiceTag } from '@/utils/printUtils';
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
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [62, 90] });
      const canvasHeight = (canvas.height / canvas.width) * 62;
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 62, canvasHeight);
      pdf.save(`Etiqueta-${service.code}.pdf`);
    } catch (err) {
      console.error('Erro ao gerar PDF da etiqueta:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate a full URL for QR code that works for any authenticated collaborator
  const qrData = `${window.location.origin}/service/${service.id}`;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-w-[95vw]">
          <DialogHeader>
            <DialogTitle>Etiqueta de Serviço - {service.code}</DialogTitle>
          </DialogHeader>

          {/* Tag content - portrait 62mm layout */}
          <div className="flex justify-center py-2">
            <div
              ref={tagRef}
              className="print-tag"
              style={{
                width: '62mm',
                background: '#ffffff',
                fontFamily: 'Arial, Helvetica, sans-serif',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              {/* Top accent bar */}
              <div style={{ width: '100%', height: '5mm', backgroundColor: '#2B4F84', flexShrink: 0 }} />

              {/* Logo */}
              <div style={{ padding: '3mm 4mm 2mm', display: 'flex', justifyContent: 'center' }}>
                <img
                  src={tecnofrioLogoFull}
                  alt="TECNOFRIO"
                  style={{ height: '8mm', objectFit: 'contain' }}
                />
              </div>

              {/* QR Code */}
              <div style={{ display: 'flex', justifyContent: 'center', padding: '1mm 0 2mm' }}>
                <QRCodeSVG
                  value={qrData}
                  size={120}
                  level="M"
                  includeMargin={false}
                />
              </div>

              {/* Service Code */}
              <div style={{ textAlign: 'center', padding: '2mm 4mm 1mm' }}>
                <p style={{
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  fontWeight: 'bold',
                  color: '#2B4F84',
                  letterSpacing: '1px',
                  margin: 0,
                }}>
                  {service.code}
                </p>
              </div>

              {/* Divider */}
              <div style={{ width: 'calc(100% - 8mm)', height: '0.5px', backgroundColor: '#e5e7eb', margin: '1mm 4mm' }} />

              {/* Service Details */}
              <div style={{ padding: '1mm 4mm 2mm', width: '100%', boxSizing: 'border-box' }}>
                {[
                  { label: 'Cliente', value: service.customer?.name },
                  { label: 'Telefone', value: service.customer?.phone },
                  { label: 'Equipamento', value: service.appliance_type },
                  { label: 'Descrição', value: service.detected_fault || service.fault_description },
                ].map(({ label, value }) => value ? (
                  <div key={label} style={{ display: 'flex', gap: '4px', marginBottom: '1mm', lineHeight: '1.3' }}>
                    <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#4b5563', flexShrink: 0, width: '60px' }}>{label}:</span>
                    <span style={{ fontSize: '9px', color: '#000000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
                  </div>
                ) : null)}
              </div>

              {/* Bottom accent bar */}
              <div style={{ width: '100%', height: '4mm', backgroundColor: '#2B4F84', marginTop: 'auto', flexShrink: 0 }} />
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
