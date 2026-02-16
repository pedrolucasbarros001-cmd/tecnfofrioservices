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
        orientation: "landscape",
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
          }
        }
        .tag-preview-wrapper {
          padding: 40px 0;
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
          border: 1px solid #cbd5e1;
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
          {/* Linha Azul no Topo - Largura total 62mm */}
          <div className="w-full h-[1.5mm] bg-[#0047AB] shrink-0" />

          {/* Área Principal de Conteúdo - Flex Row para ser Horizontal */}
          <div className="flex flex-row flex-1 p-[1.5mm] gap-[2mm] items-center overflow-hidden">
            {/* Coluna Esquerda: QR Code e Código TF */}
            <div className="flex flex-col items-center shrink-0 border-r border-slate-100 pr-[1.5mm] justify-center">
              <QRCodeSVG value={qrUrl} size={55} level="M" includeMargin={false} />
              <p className="text-[10px] font-bold font-mono text-[#0047AB] mt-0.5 text-center">{service.code}</p>
            </div>

            {/* Coluna Direita: Logo e Detalhes Harmonizados */}
            <div className="flex flex-col justify-between flex-1 h-full min-w-0 py-[0.5mm]">
              <div className="flex justify-start">
                <img src={tecnofrioLogoFull} alt="TECNOFRIO" className="h-[5.5mm] object-contain" />
              </div>

              {/* Lista de Detalhes - Ocupando o espaço restante */}
              <div className="text-[9px] leading-tight text-black flex flex-col gap-0.5">
                <div className="flex truncate">
                  <span className="font-bold mr-1 shrink-0">Cl:</span>
                  <span className="truncate">{service.customer?.name || "---"}</span>
                </div>
                <div className="flex truncate">
                  <span className="font-bold mr-1 shrink-0">Eq:</span>
                  <span className="truncate">{service.appliance_type || "---"}</span>
                </div>
                <div className="flex truncate">
                  <span className="font-bold mr-1 shrink-0">Tel:</span>
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
