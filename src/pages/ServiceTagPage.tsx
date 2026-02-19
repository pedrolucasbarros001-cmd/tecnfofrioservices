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
        .select(`*, customer:customers(*)`)
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
        onclone: (clonedDoc) => {
          const el = clonedDoc.querySelector(".print-tag-container") as HTMLElement;
          if (el) {
            el.style.margin = "0";
            el.style.position = "static";
            el.style.border = "none";
            el.style.boxShadow = "none";
          }
        },
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [62, 90],
      });
      const canvasHeight = (canvas.height / canvas.width) * 62;
      pdf.addImage(imgData, "PNG", 0, 0, 62, canvasHeight);
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

  const details = [
    { label: "Cliente", value: service.customer?.name },
    { label: "Telefone", value: service.customer?.phone },
    { label: "Equipamento", value: service.appliance_type },
    { label: "Descrição", value: service.detected_fault || service.fault_description },
  ].filter(d => !!d.value);

  return (
    <div className="print-tag-page min-h-screen bg-slate-50 print:bg-white text-black">
      <style>{`
        @media print {
          @page {
            size: 62mm 90mm;
            margin: 0;
          }
          .no-print {
            display: none !important;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
        .tag-preview-wrapper {
          padding: 40px 0;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          background: #f1f5f9;
          min-height: calc(100vh - 73px);
        }
        .print-tag-container {
          width: 62mm;
          height: 90mm;
          background: white;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: center;
          overflow: hidden;
          position: relative;
          margin: 0;
          padding: 0;
          font-family: Arial, Helvetica, sans-serif;
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
          {/* Top blue bar */}
          <div style={{ width: '100%', height: '4mm', backgroundColor: '#2B4F84', flexShrink: 0 }} />

          {/* Logo */}
          <div style={{ padding: '2mm 4mm 1mm', display: 'flex', justifyContent: 'center', width: '100%' }}>
            <img
              src={tecnofrioLogoFull}
              alt="TECNOFRIO"
              style={{ height: '7mm', maxWidth: '100%', objectFit: 'contain' }}
            />
          </div>

          {/* QR Code */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '1mm 0' }}>
            <QRCodeSVG value={qrUrl} size={110} level="M" includeMargin={false} />
          </div>

          {/* Service Code */}
          <div style={{ textAlign: 'center', padding: '1mm 4mm' }}>
            <p style={{
              fontSize: '13px',
              fontFamily: 'monospace',
              fontWeight: 'bold',
              color: '#2B4F84',
              letterSpacing: '1px',
              margin: 0,
            }}>
              {service.code}
            </p>
          </div>

          {/* Divider */}
          <div style={{ width: 'calc(100% - 6mm)', height: '0.2mm', backgroundColor: '#e5e7eb', margin: '1mm 3mm' }} />

          {/* Details */}
          <div style={{ padding: '1mm 4mm', width: '100%', boxSizing: 'border-box', flex: 1, overflow: 'hidden' }}>
            {details.map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', gap: '3px', marginBottom: '0.5mm', lineHeight: '1.2' }}>
                <span style={{ fontSize: '7.5px', fontWeight: 'bold', color: '#4b5563', flexShrink: 0, minWidth: '50px' }}>{label}:</span>
                <span style={{
                  fontSize: '7.5px',
                  color: '#000000',
                  wordBreak: 'break-all',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }} title={value || ''}>
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* Bottom blue bar */}
          <div style={{ width: '100%', height: '4mm', backgroundColor: '#2B4F84', flexShrink: 0 }} />
        </div>
      </div>
    </div>
  );
}
