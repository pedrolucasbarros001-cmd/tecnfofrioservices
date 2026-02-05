import { useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Loader2, Printer, ArrowLeft, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import type { Service, Customer } from '@/types/database';
import tecnofrioLogoFull from '@/assets/tecnofrio-logo-full.png';
import { generatePDF } from '@/utils/pdfUtils';
import { useAuth } from '@/contexts/AuthContext';
import { usePrintSessionBridge } from '@/hooks/usePrintSessionBridge';

export default function ServiceTagPage() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const tagRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Session bridge for new tab authentication
  const { isSettling: sessionSettling, sessionRestored } = usePrintSessionBridge();

  // Auth state from context
  const { isAuthenticated, loading: authLoading } = useAuth();

  // Fetch service data with customer - ONLY after auth is confirmed
  const { data: service, isLoading, error } = useQuery({
    queryKey: ['service-tag-print', serviceId],
    queryFn: async () => {
      if (!serviceId) throw new Error('ID não fornecido');
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          customer:customers(*)
        `)
        .eq('id', serviceId)
        .single();
      if (error) throw error;
      return data as Service & { customer: Customer };
    },
    enabled: !!serviceId && isAuthenticated && !authLoading,
  });

  // QR points to internal history page (requires login) - for technician use
  const qrUrl = `${window.location.origin}/service-detail/${serviceId}`;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!tagRef.current || !service) return;
    
    setIsGenerating(true);
    try {
      await generatePDF({ 
        element: tagRef.current, 
        filename: `Etiqueta-${service.code}`,
        format: [102, 152], // 4x6 inches (102mm x 152mm)
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Combined loading state: auth settling + session bridge + query loading
  const isLoadingState = authLoading || sessionSettling || isLoading;
  
  // If session bridge is done and we're still not authenticated, show login prompt
  const showLoginPrompt = !sessionSettling && !authLoading && !isAuthenticated;
  
  if (showLoginPrompt) {
    return (
      <div className="print-tag-page">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <LogIn className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground text-center">
            Sessão não encontrada nesta aba.
          </p>
          <Link to={`/login?redirect=/print/tag/${serviceId}`}>
            <Button>
              <LogIn className="h-4 w-4 mr-2" />
              Fazer Login
            </Button>
          </Link>
        </div>
      </div>
    );
  }
  
  if (isLoadingState) {
    return (
      <div className="print-tag-page">
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">
            {sessionSettling ? 'A verificar sessão...' : authLoading ? 'A autenticar...' : 'A carregar etiqueta...'}
          </span>
        </div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="print-tag-page">
        <div className="print-controls no-print">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
        <div className="flex items-center justify-center min-h-[50vh]">
          <p className="text-muted-foreground">Serviço não encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="print-tag-page">
      {/* Controls - hidden in print */}
      <div className="print-controls no-print">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
            <Button onClick={handleDownloadPDF} disabled={isGenerating}>
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {isGenerating ? 'A gerar...' : 'Baixar PDF'}
            </Button>
          </div>
        </div>
      </div>

      {/* Tag Content - 4x6 inches (102mm x 152mm) */}
      <div ref={tagRef} className="print-tag-container">
       {/* Top accent bar - THICKER */}
       <div className="h-3 bg-primary -mx-[4mm] -mt-[4mm]" />
       
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
             value={qrUrl} 
             size={140} 
             level="H"
             includeMargin={false}
           />
         </div>
       </div>
 
       {/* Service Code - Large */}
       <div className="text-center mb-6">
         <p className="text-3xl font-bold font-mono tracking-wide">
           {service.code}
         </p>
       </div>
 
       {/* Customer Info - INLINE format */}
       <div className="space-y-2 text-base px-2">
         <p>
           <span className="text-muted-foreground italic">Cliente:</span>{' '}
           <span className="font-medium">{service.customer?.name || 'N/A'}</span>
         </p>
         <p>
           <span className="text-muted-foreground italic">Equipamento:</span>{' '}
           <span className="font-medium">{service.appliance_type || 'N/A'}</span>
         </p>
         <p>
           <span className="text-muted-foreground italic">Telefone:</span>{' '}
           <span className="font-medium">{service.customer?.phone || 'N/A'}</span>
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
    </div>
  );
}
