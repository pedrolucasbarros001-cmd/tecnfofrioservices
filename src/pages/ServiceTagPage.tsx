import { useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Loader2, Printer, ArrowLeft, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import type { Service, Customer } from '@/types/database';
import tecnofrioLogoFull from '@/assets/tecnofrio-logo-full.png';
import { generatePDF } from '@/utils/pdfUtils';
import { COMPANY_INFO } from '@/utils/companyInfo';
import { useAuth } from '@/contexts/AuthContext';

export default function ServiceTagPage() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const tagRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // CRITICAL: Wait for auth before making any queries
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
        format: [80, 170], // 80mm x 170mm
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // CRITICAL: Show loading while auth is being restored (fixes blank page in new tab)
  if (authLoading || isLoading) {
    return (
      <div className="print-tag-page">
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">
            {authLoading ? 'A verificar sessão...' : 'A carregar etiqueta...'}
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

      {/* Tag Content - 80mm x 170mm */}
      <div ref={tagRef} className="print-tag-container">
        {/* Top accent bar */}
        <div className="h-2 bg-primary rounded-t-sm -mx-[4mm] -mt-[4mm]" />
        
        {/* Logo */}
        <div className="flex justify-center mt-4 mb-4">
          <img 
            src={tecnofrioLogoFull} 
            alt="TECNOFRIO" 
            className="h-8 object-contain"
          />
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-3">
          <div className="p-2 bg-white border border-gray-200 rounded">
            <QRCodeSVG 
              value={qrUrl} 
              size={100} 
              level="H"
              includeMargin={false}
            />
          </div>
        </div>

        {/* Service Code - Large */}
        <div className="text-center mb-4">
          <p className="text-2xl font-bold font-mono tracking-wide">
            {service.code}
          </p>
        </div>

        {/* Separator */}
        <div className="border-t border-gray-300 my-3" />

        {/* Customer & Equipment Info */}
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-gray-500">Cliente:</span>
            <p className="font-medium truncate">{service.customer?.name || 'N/A'}</p>
          </div>
          
          <div>
            <span className="text-gray-500">Equipamento:</span>
            <p className="font-medium truncate">
              {service.appliance_type || 'N/A'}
            </p>
          </div>
          
          <div>
            <span className="text-gray-500">Marca/Modelo:</span>
            <p className="font-medium truncate">
              {[service.brand, service.model].filter(Boolean).join(' ') || 'N/A'}
            </p>
          </div>
          
          <div>
            <span className="text-gray-500">Telefone:</span>
            <p className="font-medium">{service.customer?.phone || 'N/A'}</p>
          </div>
        </div>

        {/* Separator */}
        <div className="border-t border-gray-300 my-3" />

        {/* Link for manual access */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
            <LinkIcon className="h-3 w-3" />
            <span>Leia o QR ou aceda:</span>
          </div>
          <p className="text-xs font-mono text-primary break-all">
            {qrUrl}
          </p>
        </div>

        {/* Company Info */}
        <div className="mt-4 pt-3 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">{COMPANY_INFO.name}</p>
          <p className="text-xs text-gray-500">{COMPANY_INFO.phone}</p>
        </div>
      </div>
    </div>
  );
}
