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

  const { isSettling: sessionSettling } = usePrintSessionBridge();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const { data: service, isLoading, error } = useQuery({
    queryKey: ['service-tag-print', serviceId],
    queryFn: async () => {
      if (!serviceId) throw new Error('ID não fornecido');
      const { data, error } = await supabase
        .from('services')
        .select(\`
          *,
          customer:customers(*)
        \`)
        .eq('id', serviceId)
        .single();
      if (error) throw error;
      return data as Service & { customer: Customer };
    },
    enabled: !!serviceId && isAuthenticated && !authLoading,
  });

  const qrUrl = \`\${window.location.origin}/service-detail/\${serviceId}\`;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!tagRef.current || !service) return;
    setIsGenerating(true);
    try {
      await generatePDF({ 
        element: tagRef.current, 
        filename: \`Etiqueta-\${service.code}\`,
        format: [29, 62], // Formato atualizado para 62x29
        margin: 0,
        autoHeight: false
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (!sessionSettling && !authLoading && !isAuthenticated) {
    return (
      <div className="print-tag-page">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <LogIn className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground text-center">Sessão não encontrada nesta aba.</p>
          <Link to={\`/login?redirect=/print/tag/\${serviceId}\`}>
            <Button><LogIn className="h-4 w-4 mr-2" />Fazer Login</Button>
          </Link>
        </div>
      </div>
    );
  }
  
  if (authLoading || sessionSettling || isLoading) {
    return (
      <div className="print-tag-page">
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">A carregar...</span>
        </div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="print-tag-page">
        <div className="flex items-center justify-center min-h-[50vh]">
          <p className="text-muted-foreground">Serviço não encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="print-tag-page pb-10">
      <style>{\`
        @media print {
          @page {
            size: 62mm 29mm;
            margin: 0;
          }
          .no-print {
            display: none !important;
          }
          body {
            margin: 0;
            padding: 0;
            background: white;
          }
          .print-tag-page {
            padding: 0;
            margin: 0;
          }
        }

        .print-tag-container {
          width: 62mm;
          height: 29mm;
          padding: 1.5mm 3mm;
          background: white;
          margin: 20px auto;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
          position: relative;
          border: 1px dashed #ccc;
          color: black;
        }

        @media print {
          .print-tag-container {
            border: none;
            margin: 0;
            position: absolute;
            top: 0;
            left: 0;
          }
        }
      \`}</style>

      <div className="print-controls no-print p-4 bg-muted/30 border-b mb-6">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" /> Imprimir
            </Button>
            <Button size="sm" onClick={handleDownloadPDF} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              PDF
            </Button>
          </div>
        </div>
      </div>

      <div ref={tagRef} className="print-tag-container text-black">
        <div className="h-0.5 bg-blue-600 -mx-[3mm] -mt-[1.5mm] mb-1" />
        
        <div className="flex items-start justify-between h-full py-0.5">
          <div className="flex-1 flex flex-col h-full min-w-0 pr-2">
            <div className="mb-1">
              <img src={tecnofrioLogoFull} alt="TECNOFRIO" className="h-3 object-contain mb-0.5" />
              <p className="text-[10px] font-bold font-mono tracking-tighter">{service.code}</p>
            </div>
            
            <div className="space-y-0.5 text-[7px] leading-[1.1] text-black">
              <p className="truncate"><strong>Cl:</strong> {service.customer?.name || 'N/A'}</p>
              <p className="truncate"><strong>Eq:</strong> {service.appliance_type || 'N/A'}</p>
              <p className="truncate"><strong>Hora:</strong> {service.scheduled_shift || 'A confirmar'}</p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center pt-1">
            <QRCodeSVG value={qrUrl} size={48} level="M" includeMargin={false} />
            <p className="text-[5px] mt-1 text-gray-500 uppercase font-bold">Tecnofrio</p>
          </div>
        </div>
      </div>
    </div>
  );
}