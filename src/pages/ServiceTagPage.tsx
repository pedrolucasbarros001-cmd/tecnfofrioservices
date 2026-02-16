import { useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { Download, Loader2, Printer, ArrowLeft, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { supabase } from "@/integrations/supabase/client";
import type { Service, Customer } from "@/types/database";
import tecnofrioLogoFull from "@/assets/tecnofrio-logo-full.png";
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
      const canvas = await html2canvas(tagRef.current, {
        scale: 4,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: 1200, // Normalize across all computers
        onclone: (clonedDoc) => {
          const el = clonedDoc.querySelector(".print-tag-container") as HTMLElement;
          if (el) {
            el.style.margin = "0";
            el.style.position = "static";
            el.style.border = "none";
          }
        },
      });

      const imgData = canvas.toDataURL("image/jpeg", 1.0);

      const pdf = new jsPDF({
        orientation: "landscape", // Landscape is correct for 62mm wide x 29mm high
        unit: "mm",
        format: [62, 29],
      });

      pdf.addImage(imgData, "JPEG", 0, 0, 62, 29, undefined, "FAST");
      pdf.save(`Etiqueta-${service.code}.pdf`);
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
    <div className="print-tag-page min-h-screen bg-slate-50 print:bg-white text-black">
      <style>{`
        @media print {
          @page {
            size: 62mm 29mm; /* More robust for Brother drivers than adding 'landscape' */
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
          padding: 60px 0;
          display: flex;
          justify-content: center;
          align-items: center;
          background: #f1f5f9;
          min-height: calc(100vh - 73px);
        }
        .print-tag-container {
          width: 62mm;
          height: 29mm;
          background: white;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
          margin: 0;
          padding: 0;
        }
        .preview-border {
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          border: 1px solid #e2e8f0;
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
            width: 62mm;
            height: 29mm;
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
        <div ref={tagRef} className="print-tag-container preview-border">
          {/* Blue Top Bar */}
          <div className="w-full h-[2mm] bg-[#0047AB] shrink-0" />

          {/* Main Content Area: Horizontal Layout */}
          <div className="flex-1 flex w-full p-[1.5mm] overflow-hidden">
            {/* Left Column: QR and Code */}
            <div className="flex flex-col items-center justify-center w-[20mm] shrink-0 border-r border-slate-100 pr-[1.5mm]">
              <QRCodeSVG value={qrUrl} size={54} level="M" includeMargin={false} />
              <p className="text-[9px] font-bold font-mono text-[#0047AB] mt-1 text-center truncate w-full">
                {service.code}
              </p>
            </div>

            {/* Right Column: Logo and Details */}
            <div className="flex-1 flex flex-col justify-between pl-[2mm] min-w-0">
              <div className="flex justify-between items-start mb-1">
                <img src={tecnofrioLogoFull} alt="TECNOFRIO" className="h-[4.5mm] object-contain" />
              </div>

              {/* Details List */}
              <div className="text-[8.5px] leading-[1.2] text-black">
                <div className="flex gap-1 overflow-hidden">
                  <span className="font-bold shrink-0">Cl:</span>
                  <span className="truncate">{service.customer?.name || "---"}</span>
                </div>
                <div className="flex gap-1 overflow-hidden">
                  <span className="font-bold shrink-0">Eq:</span>
                  <span className="truncate">{service.appliance_type || "---"}</span>
                </div>
                <div className="flex gap-1 overflow-hidden">
                  <span className="font-bold shrink-0">Tel:</span>
                  <span className="truncate">{service.customer?.phone || "---"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
