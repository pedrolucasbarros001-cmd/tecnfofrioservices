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
        format: [80, 170],
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

         {/* Tag content - preview on screen - matching reference image */}
         <div ref={tagRef} className="print-tag border rounded-lg p-4 bg-white">
           {/* Top accent bar - THICKER */}
           <div className="h-3 bg-primary -mx-4 -mt-4 rounded-t-lg" />
           
           {/* Logo */}
           <div className="flex justify-center mt-6 mb-6">
             <img 
               src={tecnofrioLogoFull} 
               alt="TECNOFRIO" 
               className="h-12 object-contain"
             />
           </div>
           
           {/* QR Code - LARGER */}
           {/* QR Code - LARGER */}
           <div className="flex justify-center mb-6">
             <div className="p-3 bg-background border rounded-lg">
               <QRCodeSVG
                 value={qrData}
                 size={140}
                 level="H"
                 includeMargin={false}
               />
             </div>
           </div>
           
           {/* Service Code - Large */}
           <div className="text-center mb-6">
             <p className="text-3xl font-mono font-bold tracking-wide text-foreground">
               {service.code}
             </p>
           </div>
           
           {/* Customer Info - INLINE format */}
           <div className="space-y-2 text-base px-2">
             <p>
               <span className="text-muted-foreground italic">Cliente:</span>{' '}
               <span className="font-medium text-foreground">{service.customer?.name || 'N/A'}</span>
             </p>
             <p>
               <span className="text-muted-foreground italic">Equipamento:</span>{' '}
               <span className="font-medium text-foreground">{service.appliance_type || 'N/A'}</span>
             </p>
             <p>
               <span className="text-muted-foreground italic">Telefone:</span>{' '}
               <span className="font-medium text-foreground">{service.customer?.phone || 'N/A'}</span>
             </p>
           </div>
           
           {/* Footer text - SIMPLE */}
           <div className="mt-6 text-center">
             <p className="text-sm text-muted-foreground">
               Leia o QR Code para ver detalhes e histórico online
             </p>
           </div>
           
           {/* Bottom line */}
           {/* Bottom line */}
           <div className="mt-4 border-t border-border" />
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
