import { useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { Download, Loader2, Printer, ArrowLeft, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Service, Customer } from "@/types/database";
import tecnofrioLogoFull from "@/assets/tecnofrio-logo-full.png";
import { useAuth } from "@/contexts/AuthContext";
import { usePrintSessionBridge } from "@/hooks/usePrintSessionBridge";
import html2pdf from "html2pdf.js";

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
      const opt = {
        margin: 0,
        filename: `Etiqueta-${service.code}.pdf`,
        image: { type: "jpeg", quality: 1.0 },
        html2canvas: {
          scale: 4,
          useCORS: true,
          letterRendering: true,
          scrollX: 0,
          scrollY: 0,
        },
        jsPDF: {
          unit: "mm",
          format: [29, 62],
          orientation: "portrait",
        },
      };

      // @ts-ignore
      await html2pdf().from(tagRef.current).set(opt).save();
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
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
            size: 29mm 62mm;
            margin: 0;
          }
          .no-print {
            display: none !important;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
        }
        .tag-preview-wrapper {
          padding: 40px 0;
          display: flex;
          justify-content: center;
          background: #f8fafc;
          min-height: calc(100vh - 73px);
        }
        .print-tag-container {
          width: 29mm;
          height: 62mm;
          padding: 1.5mm 1mm;
          background: white;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          overflow: hidden;
          position: relative;
          color: black;
          margin: 0;
        }
        .preview-border {
          border: 1px dotted #ccc;
        }
        @media print {
          .tag-preview-wrapper {
            padding: 0;
            background: white;
            display: block;
          }
          .print-tag-container {
            margin: 0;
            position: fixed;
            top: 0;
            left: 0;
            border: none;
            width: 29mm;
            height: 62mm;
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
        <Button size="sm" onClick={handleDownloadPDF} disabled={isGenerating}>
          {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
          {isGenerating ? "A gerar..." : "Baixar PDF"}
        </Button>
      </div>

      <div className="tag-preview-wrapper">
        <div ref={tagRef} className="print-tag-container" style={{ margin: 0, border: "none" }}>
          {/* Blue Top Bar */}
          <div className="w-full h-[1.5mm] bg-[#0047AB] mb-1 shrink-0" />

          {/* Logo */}
          <div className="w-full flex justify-center mb-1 px-1 shrink-0">
            <img src={tecnofrioLogoFull} alt="TECNOFRIO" className="h-3 object-contain" />
          </div>

          {/* QR Code */}
          <div className="mb-1 shrink-0">
            <QRCodeSVG value={qrUrl} size={52} level="M" includeMargin={false} />
          </div>

          {/* Service Code */}
          <div className="text-center mb-1 shrink-0">
            <p className="text-[12px] font-bold font-mono text-[#0047AB] leading-none">{service.code}</p>
          </div>

          {/* Details - Stacked for better visibility and PDF compatibility (Avoids flex-wrap issues) */}
          <div className="w-full text-[7.5px] leading-[1.1] text-black px-1 pb-1 mt-auto">
            <div className="mb-0.5">
              <span className="font-bold">Cl:</span> {service.customer?.name || "---"}
            </div>
            <div className="mb-0.5">
              <span className="font-bold">Eq:</span> {service.appliance_type || "---"}
            </div>
            <div>
              <span className="font-bold">Tel:</span> {service.customer?.phone || "---"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
