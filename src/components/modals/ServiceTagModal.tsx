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
import { generatePDF } from '@/utils/pdfUtils';

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
      await generatePDF({ 
        element: tagRef.current, 
        filename: `Etiqueta-${service.code}`,
        format: [29, 90],
        margin: 0
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate a full URL for QR code that works for any authenticated collaborator
  const qrData = `${window.location.origin}/service/${service.id}`;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Etiqueta de Serviço - {service.code}</DialogTitle>
          </DialogHeader>

         {/* Tag content - preview (29mm x 90mm scale) */}
         <div ref={tagRef} className="print-tag border rounded-lg p-2 bg-white mx-auto" style={{ width: '29mm', minHeight: '90mm' }}>
           {/* Top accent bar */}
           <div className="h-1 bg-primary -mx-2 -mt-2 rounded-t-lg" />
           
           {/* Logo */}
           <div className="flex justify-center mt-1 mb-1">
             <img 
               src={tecnofrioLogoFull} 
               alt="TECNOFRIO" 
               className="h-4 object-contain"
             />
           </div>
           
           {/* QR Code */}
           <div className="flex justify-center mb-1">
             <QRCodeSVG
               value={qrData}
               size={55}
               level="M"
               includeMargin={false}
             />
           </div>
           
           {/* Service Code */}
           <div className="text-center mb-1">
             <p className="text-[10px] font-mono font-bold tracking-wide text-foreground">
               {service.code}
             </p>
           </div>
           
           {/* Customer Info - compact */}
           <div className="space-y-0 text-[7px] leading-tight">
             <p className="truncate">
               <span className="text-muted-foreground">Cl:</span>{' '}
               <span className="font-medium text-foreground">{service.customer?.name || 'N/A'}</span>
             </p>
             <p className="truncate">
               <span className="text-muted-foreground">Eq:</span>{' '}
               <span className="font-medium text-foreground">{service.appliance_type || 'N/A'}</span>
             </p>
             <p>
               <span className="text-muted-foreground">Tel:</span>{' '}
               <span className="font-medium text-foreground">{service.customer?.phone || 'N/A'}</span>
             </p>
           </div>
         </div>

          <DialogFooter className="gap-2 no-print">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button variant="outline" onClick={() => printServiceTag()}>
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
