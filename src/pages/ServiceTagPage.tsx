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
      // Create canvas with high scale for crisp text
      const canvas = await html2canvas(tagRef.current, {
        scale: 4,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        onclone: (clonedDoc) => {
          // Ensure the cloned element is visible for capture
          const el = clonedDoc.querySelector(".print-tag-container") as HTMLElement;
          if (el) {
            el.style.margin = "0";
            el.style.position = "static";
          }
        },
      });

      const imgData = canvas.toDataURL("image/png", 1.0);

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [29, 62], // 29mm wide, 62mm high
      });

      pdf.addImage(imgData, "PNG", 0, 0, 29, 62);
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
        .print-tag-container {
          width: 29mm;
          height: 62mm;
          padding: 1.5mm 1mm;
          background: white;
          margin: 40px auto;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
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

      <div ref={tagRef} className="print-tag-container">
        {/* Blue Top Bar */}
        <div className="w-full h-[1.5mm] bg-[#0047AB] mb-1" />

        {/* Logo */}
        <div className="w-full flex justify-center mb-1.5 px-0.5">
          <img src={tecnofrioLogoFull} alt="TECNOFRIO" className="h-3.5 object-contain" />
        </div>

        {/* QR Code */}
        <div className="mb-2">
          <QRCodeSVG value={qrUrl} size={58} level="M" includeMargin={false} />
        </div>

        {/* Service Code */}
        <div className="text-center mb-auto pt-0.5">
          <p className="text-[13px] font-bold font-mono text-[#0047AB] leading-tight">{service.code}</p>
        </div>

        {/* Details - Anchored to bottom like the image */}
        <div className="w-full text-[8px] leading-[1.1] text-black px-1 pb-1 flex flex-col gap-0.5">
          <p className="overflow-hidden">
            <strong>Cl:</strong> {service.customer?.name || "---"}
          </p>
          <p className="overflow-hidden">
            <strong>Eq:</strong> {service.appliance_type || "---"}
          </p>
          <p className="overflow-hidden">
            <strong>Tel:</strong> {service.customer?.phone || "---"}
          </p>
        </div>
      </div>
    </div>
  );
}
