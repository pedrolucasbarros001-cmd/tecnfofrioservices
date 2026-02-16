import { useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { Download, Loader2, Printer, ArrowLeft, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Service, Customer } from "@/types/database";
import tecnofrioLogoFull from "@/assets/tecnofrio-logo-full.png";
import { generatePDF } from "@/utils/pdfUtils";
import { useAuth } from "@/contexts/AuthContext";
import { usePrintSessionBridge } from "@/hooks/usePrintSessionBridge";

export default function ServiceTagPage() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const tagRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Session bridge for new tab authentication
  const { isSettling: sessionSettling } = usePrintSessionBridge();

  // Auth state from context
  const { isAuthenticated, loading: authLoading } = useAuth();

  // Fetch service data with customer
  const {
    data: service,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["service-tag-print", serviceId],
    queryFn: async () => {
      if (!serviceId) throw new Error("ID não fornecido");
      const { data, error } = await supabase
        .from("services")
        .select(
          `
          *,
          customer:customers(*)
        `,
        )
        .eq("id", serviceId)
        .single();
      if (error) throw error;
      return data as Service & { customer: Customer };
    },
    enabled: !!serviceId && isAuthenticated && !authLoading,
  });

  const qrUrl = typeof window !== "undefined" ? `${window.location.origin}/service-detail/${serviceId}` : "";

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
        format: [29, 62], // 62mm wide x 29mm high (customised for Brother DK-11209 or similar)
        margin: 0,
        autoHeight: false,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (authLoading || sessionSettling || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">A carregar etiqueta...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4 text-center">
        <LogIn className="h-12 w-12 text-muted-foreground" />
        <p>Sessão não encontrada. Por favor, faça login.</p>
        <Link to={`/login?redirect=/print/tag/${serviceId}`}>
          <Button>
            <LogIn className="h-4 w-4 mr-2" /> Fazer Login
          </Button>
        </Link>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Button onClick={() => navigate(-1)}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="print-tag-page min-h-screen bg-slate-50 print:bg-white">
      <style>{`
        @media print {
          @page {
            size: 62mm 29mm;
            margin: 0;
          }
          .no-print {
            display: none !important;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            overflow: hidden;
          }
        }
        .print-tag-container {
          width: 62mm;
          height: 29mm;
          padding: 1.5mm 3mm;
          background: white;
          margin: 40px auto; /* Centered in browser preview */
          box-sizing: border-box;
          display: flex;
          flex-direction: row;
          justify-content: space-between;
          align-items: center;
          overflow: hidden;
          position: relative;
          color: black;
          border: 1px dotted #ccc;
        }
        @media print {
          .print-tag-container {
            margin: 0;
            position: fixed;
            top: 0;
            left: 0;
            border: none;
          }
        }
      `}</style>

      {/* Controls */}
      <div className="print-controls no-print p-4 bg-white border-b flex justify-center gap-2 sticky top-0 z-10 shadow-sm">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <Button size="sm" variant="outline" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" /> Imprimir
        </Button>
      </div>

      {/* Tag Content - Optimized for 62x29mm */}
      <div ref={tagRef} className="print-tag-container">
        {/* Left Side: Logo and Details */}
        <div className="flex flex-col justify-center h-full min-w-0 pr-1 flex-1">
          <img src={tecnofrioLogoFull} alt="TECNOFRIO" className="h-3.5 object-contain mb-1 self-start" />
          <p className="text-[12px] font-bold font-mono text-blue-700 leading-none mb-1">{service.code}</p>
          <div className="text-[7px] leading-tight text-black space-y-0.5 truncate">
            <p className="truncate">
              <strong>Cl:</strong> {service.customer?.name || "---"}
            </p>
            <p className="truncate">
              <strong>Eq:</strong> {service.appliance_type || "---"}
            </p>
            <p className="truncate">
              <strong>Tel:</strong> {service.customer?.phone || "---"}
            </p>
          </div>
        </div>

        {/* Right Side: QR Code */}
        <div className="flex items-center justify-center pl-1">
          <div className="p-0.5 bg-white">
            <QRCodeSVG value={qrUrl} size={65} level="M" includeMargin={false} />
          </div>
        </div>
      </div>
    </div>
  );
}
