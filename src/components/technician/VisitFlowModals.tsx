import { useState, useEffect, useRef } from "react";
import {
  Navigation,
  MapPin,
  Camera,
  FileText,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Wrench,
  Package,
  Truck,
  X,
  Plus,
  Trash2,
  Tag,
  ClipboardList,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { useUpdateService } from "@/hooks/useServices";
import { useAuth } from "@/contexts/AuthContext";
import { logWorkshopPickup, logPartRequest, logServiceCompletion } from "@/utils/activityLogUtils";
import { supabase, ensureValidSession } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { humanizeError } from "@/utils/errorMessages";
import { buildFullAddress } from "@/utils/addressUtils";
import { technicianUpdateService } from "@/utils/technicianRpc";
import { useQueryClient } from "@tanstack/react-query";
import { CameraCapture } from "@/components/shared/CameraCapture";
import { SignatureCanvas } from "@/components/shared/SignatureCanvas";
import { FieldPaymentStep } from "@/components/technician/FieldPaymentStep";
import { useFlowPersistence, deriveStepFromDb, isValidStepForFlow } from "@/hooks/useFlowPersistence";
import type { Service, PhotoType } from "@/types/database";
import type { ArticleEntry } from "@/components/technician/WorkshopFlowModals";

// Steps for repair services (reparacao)
type RepairModalStep =
  | "resumo"
  | "resumo_continuacao"
  | "deslocacao"
  | "foto_aparelho"
  | "foto_etiqueta"
  | "foto_estado"
  | "produto"
  | "diagnostico"
  | "decisao"
  | "registo_artigos"
  | "pedir_peca"
  | "resumo_reparacao"
  | "confirmacao_peca";

// Steps for other services (original flow)
type OtherModalStep = "resumo" | "resumo_continuacao" | "deslocacao" | "foto" | "produto" | "diagnostico" | "decisao" | "registo_artigos" | "pedir_peca" | "resumo_reparacao" | "confirmacao_peca";

type ModalStep = RepairModalStep | OtherModalStep;
type DecisionType = "reparar_local" | "levantar_oficina";
type SignatureType = "conclusao" | "recolha" | "pedido_peca";

interface VisitFlowModalsProps {
  service: Service;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  mode?: "normal" | "continuacao_peca";
}

interface VisitFormData {
  detectedFault: string;
  // Legacy single photo
  photoFile: string | null;
  // Structured photos for reparacao
  photoAparelho: string | null;
  photoEtiqueta: string | null;
  photosEstado: string[];
  decision: DecisionType;
  // Articles (replaces usedParts)
  articles: ArticleEntry[];
  discountValue: string;
  discountType: 'euro' | 'percent';
  taxRate: number;
  articlesLocked: boolean;
  needsPartOrder: boolean;
  partToOrder: {
    name: string;
    reference: string;
  };
  // Product info
  productBrand: string;
  productModel: string;
  productSerial: string;
  productPNC: string;
  productType: string;
  partInstalled: boolean;
  [key: string]: unknown;
}

const INITIAL_FORM_DATA: VisitFormData = {
  detectedFault: "",
  photoFile: null,
  photoAparelho: null,
  photoEtiqueta: null,
  photosEstado: [],
  decision: "reparar_local",
  articles: [],
  discountValue: "",
  discountType: "euro",
  taxRate: 23,
  articlesLocked: false,
  needsPartOrder: false,
  partToOrder: { name: "", reference: "" },
  productBrand: "",
  productModel: "",
  productSerial: "",
  productPNC: "",
  productType: "",
  partInstalled: false,
};

export function VisitFlowModals({ service, isOpen, onClose, onComplete, mode = "normal" }: VisitFlowModalsProps) {
  const updateService = useUpdateService();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const [currentStep, setCurrentStep] = useState<ModalStep>("resumo");
  const [formData, setFormData] = useState<VisitFormData>({ ...INITIAL_FORM_DATA });
  const [derivedResumeStep, setDerivedResumeStep] = useState<ModalStep | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [currentPhotoType, setCurrentPhotoType] = useState<PhotoType>("visita");
  const [showSignature, setShowSignature] = useState(false);
  const [signatureType, setSignatureType] = useState<SignatureType>("conclusao");
  const [showPayment, setShowPayment] = useState(false);
  const [isResuming, setIsResuming] = useState(false);

  // Transition guard: prevents Dialog onOpenChange from firing handleClose during step changes
  const isTransitioning = useRef(false);

  const persistenceFlowTypeRef = mode === "continuacao_peca" ? "visita_continuacao" : "visita";

  const safeSetStep = (step: ModalStep) => {
    // Validate step belongs to this flow — fallback to resumo if invalid
    if (!isValidStepForFlow(step, persistenceFlowTypeRef as any)) {
      console.warn(`[VisitFlow] Invalid step "${step}" for flow "${persistenceFlowTypeRef}", falling back to resumo`);
      step = (mode === "continuacao_peca" ? "resumo_continuacao" : "resumo") as ModalStep;
    }
    isTransitioning.current = true;
    setCurrentStep(step);
    // Use 350ms to safely cover Dialog unmount/mount animation cycles
    setTimeout(() => { isTransitioning.current = false; }, 350);
  };

  const handleStepDialogOpenChange = (open: boolean) => {
    if (open) return;
    if (isTransitioning.current) return;
    handleClose();
  };

  // Check if this is a repair service
  const isReparacao = service.service_type === "reparacao";

  // Flow persistence with mode support - separate key for continuation
  const persistenceKey = mode === "continuacao_peca" ? "visita_continuacao" : "visita";
  const { loadState, saveState, saveStateToDb, flushStateToDb, clearState } = useFlowPersistence<VisitFormData>(service.id, persistenceKey);

  // Stable initialization ref
  const hasInitialized = useRef(false);

  // Load saved state or reset when opened
  useEffect(() => {
    if (!isOpen) {
      hasInitialized.current = false;
      setIsResuming(false);
      return;
    }

    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const savedState = loadState();
    if (savedState) {
      const savedStep = savedState.currentStep as ModalStep;
      // Validate saved step belongs to this flow
      if (isValidStepForFlow(savedStep, persistenceFlowTypeRef as any)) {
        setCurrentStep(savedStep);
      } else {
        console.warn(`[VisitFlow] Saved step "${savedStep}" invalid for flow, using resumo`);
        setCurrentStep(mode === "continuacao_peca" ? "resumo_continuacao" : "resumo");
      }
      setFormData({ ...INITIAL_FORM_DATA, ...savedState.formData });
      return;
    }

    setIsResuming(true);
    const persistenceFlowType = mode === "continuacao_peca" ? "visita_continuacao" : "visita";
    deriveStepFromDb(service.id, persistenceFlowType, service as unknown as Record<string, unknown>).then(({ step, formDataOverrides }) => {
      let resumeStep = step === 'resumo' ? (mode === "continuacao_peca" ? "resumo_continuacao" : "resumo") : step;
      // Validate derived step
      if (!isValidStepForFlow(resumeStep, persistenceFlowTypeRef as any)) {
        console.warn(`[VisitFlow] Derived step "${resumeStep}" invalid, using resumo`);
        resumeStep = mode === "continuacao_peca" ? "resumo_continuacao" : "resumo";
      }
      setDerivedResumeStep(resumeStep as ModalStep);

      setCurrentStep(mode === "continuacao_peca" ? "resumo_continuacao" : "resumo");

      setFormData((prev) => ({
        ...INITIAL_FORM_DATA,
        ...prev,
        detectedFault: service.detected_fault || "",
        productBrand: service.brand || "",
        productModel: service.model || "",
        productSerial: service.serial_number || "",
        productPNC: (service as any).pnc || "",
        productType: service.appliance_type || "",
        ...formDataOverrides,
      }));
      setIsResuming(false);
    }).catch(() => setIsResuming(false));
  }, [isOpen, service.id]);

  // Auto-save state on step/data changes
  useEffect(() => {
    if (isOpen && currentStep !== "resumo" && currentStep !== "resumo_continuacao") {
      saveState(currentStep, formData);
      saveStateToDb(currentStep, formData);
    }
  }, [isOpen, currentStep, formData, saveState, saveStateToDb]);

  const handleStartVisit = async () => {
    try {
      await ensureValidSession();
      // Mark service as em_execucao on server
      const { error } = await technicianUpdateService({
        serviceId: service.id,
        status: 'em_execucao',
      });
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['technician-services'] });

      if (derivedResumeStep && derivedResumeStep !== "resumo" && derivedResumeStep !== "resumo_continuacao") {
        safeSetStep(derivedResumeStep);
      } else {
        safeSetStep("deslocacao");
      }
    } catch (error) {
      console.error("Error starting visit:", error);
      toast.error(humanizeError(error));
    }
  };

  const handleNavigateToClient = () => {
    const fullAddress = buildFullAddress({
      address: service.service_address || service.customer?.address,
      postalCode: service.service_postal_code || service.customer?.postal_code,
      city: service.service_city || service.customer?.city,
    });
    if (fullAddress) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`, "_blank");
    } else {
      toast.error("Morada não disponível");
    }
  };

  const handlePhotoCapture = async (imageData: string) => {
    try {
      await ensureValidSession();
      const { uploadServicePhoto } = await import('@/utils/photoUpload');
      const publicUrl = await uploadServicePhoto(service.id, imageData, currentPhotoType, getPhotoDescription(currentPhotoType));
      queryClient.invalidateQueries({ queryKey: ["service-photos", service.id] });

      // Update form data based on photo type
      if (currentPhotoType === "aparelho") {
        setFormData((prev) => ({ ...prev, photoAparelho: publicUrl }));
      } else if (currentPhotoType === "etiqueta") {
        setFormData((prev) => ({ ...prev, photoEtiqueta: publicUrl }));
      } else if (currentPhotoType === "estado") {
        setFormData((prev) => ({ ...prev, photosEstado: [...prev.photosEstado, publicUrl] }));
      } else {
        setFormData((prev) => ({ ...prev, photoFile: publicUrl }));
      }

      setShowCamera(false);
      toast.success("Foto guardada!");
    } catch (error) {
      console.error("Error saving photo:", error);
      toast.error(humanizeError(error));
    }
  };

  const getPhotoDescription = (type: PhotoType): string => {
    switch (type) {
      case "aparelho":
        return "Fotografia do aparelho";
      case "etiqueta":
        return "Fotografia da etiqueta do aparelho";
      case "estado":
        return "Estado do aparelho";
      default:
        return "Foto da visita";
    }
  };

  const openCamera = (type: PhotoType) => {
    setCurrentPhotoType(type);
    setShowCamera(true);
  };

  // --- Articles helpers (same pattern as Workshop) ---
  const addArticle = () => {
    setFormData(prev => ({
      ...prev,
      articles: [...(prev.articles as ArticleEntry[]), { reference: "", description: "", quantity: 1, unit_price: 0 }],
    }));
  };

  const updateArticle = (index: number, field: keyof ArticleEntry, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      articles: (prev.articles as ArticleEntry[]).map((a, i) => i === index ? { ...a, [field]: value } : a),
    }));
  };

  const removeArticle = (index: number) => {
    setFormData(prev => ({
      ...prev,
      articles: (prev.articles as ArticleEntry[]).filter((_, i) => i !== index),
    }));
  };

  const articlesSubtotal = (formData.articles as ArticleEntry[]).reduce((sum, a) => sum + (a.quantity * a.unit_price), 0);

  const discountAmount = (() => {
    const val = parseFloat(formData.discountValue as string) || 0;
    if (formData.discountType === "percent") return articlesSubtotal * (val / 100);
    return val;
  })();

  const taxAmount = (articlesSubtotal - discountAmount) * ((formData.taxRate as number) / 100);
  const totalFinal = articlesSubtotal - discountAmount + taxAmount;

  // Save articles to service_parts (idempotent delete+insert)
  const handleConfirmArticles = async () => {
    setIsSubmitting(true);
    try {
      await ensureValidSession();

      // Delete existing non-requested parts for this service, then re-insert
      await supabase
        .from("service_parts")
        .delete()
        .eq("service_id", service.id)
        .eq("is_requested", false);

      for (const article of (formData.articles as ArticleEntry[])) {
        if (!article.description.trim()) continue;
        await supabase.from("service_parts").insert({
          service_id: service.id,
          part_name: article.description,
          part_code: article.reference || null,
          quantity: article.quantity,
          cost: article.unit_price,
          is_requested: false,
          arrived: true,
          iva_rate: formData.taxRate as number,
        });
      }

      setFormData(prev => ({ ...prev, articlesLocked: true }));
      queryClient.invalidateQueries({ queryKey: ["service-parts", service.id] });
      toast.success("Artigos registados e confirmados!");
    } catch (error) {
      console.error("Error saving articles:", error);
      toast.error(humanizeError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignatureComplete = async (signatureData: string, signerName: string) => {
    setIsSubmitting(true);
    try {
      await ensureValidSession();

      if (signatureType === "pedido_peca") {
        // Idempotent: only insert signature if it doesn't exist yet
        const { data: existingSig } = await supabase
          .from("service_signatures")
          .select("id")
          .eq("service_id", service.id)
          .eq("signature_type", "pedido_peca")
          .maybeSingle();

        if (!existingSig) {
          await supabase.from("service_signatures").insert({
            service_id: service.id,
            signature_type: "pedido_peca",
            file_url: signatureData,
            signer_name: signerName || service.customer?.name,
          });
        }

        // Idempotent: only insert part order if it doesn't exist yet
        const { data: existingPartOrder } = await supabase
          .from("service_parts")
          .select("id")
          .eq("service_id", service.id)
          .eq("is_requested", true)
          .eq("part_name", formData.partToOrder.name.trim())
          .maybeSingle();

        if (!existingPartOrder) {
          await supabase.from("service_parts").insert({
            service_id: service.id,
            part_name: formData.partToOrder.name.trim(),
            part_code: formData.partToOrder.reference.trim() || null,
            quantity: 1,
            is_requested: true,
            arrived: false,
            cost: 0,
          });
        }

        // Update service status
        await ensureValidSession();
        await updateService.mutateAsync({
          id: service.id,
          status: "para_pedir_peca",
          last_status_before_part_request: service.status,
          detected_fault: formData.detectedFault,
          skipToast: true,
        });

        // Log activity - pedido de peça (only if signature was new)
        if (!existingSig) {
          await logPartRequest(
            service.code || "N/A",
            service.id,
            formData.partToOrder.name.trim(),
            profile?.full_name || "Técnico",
            user?.id,
          );
        }

        queryClient.invalidateQueries({ queryKey: ["service-signatures", service.id] });
        queryClient.invalidateQueries({ queryKey: ["service-parts", service.id] });
        toast.success("Pedido de peça registado com assinatura!");
      } else if (signatureType === "recolha") {
        // Idempotent: only insert signature if it doesn't exist yet
        const { data: existingSig } = await supabase
          .from("service_signatures")
          .select("id")
          .eq("service_id", service.id)
          .eq("signature_type", "recolha")
          .maybeSingle();

        if (!existingSig) {
          await supabase.from("service_signatures").insert({
            service_id: service.id,
            signature_type: "recolha",
            file_url: signatureData,
            signer_name: signerName || service.customer?.name,
          });
        }

        const { error: rpcError } = await (supabase.rpc as any)('lift_service_to_workshop', {
          _service_id: service.id,
          _detected_fault: formData.detectedFault || null,
        });

        if (rpcError) throw rpcError;

        if (!existingSig) {
          await logWorkshopPickup(service.code || "N/A", service.id, profile?.full_name || "Técnico", user?.id);
        }

        queryClient.invalidateQueries({ queryKey: ["service-signatures", service.id] });
        queryClient.invalidateQueries({ queryKey: ["services"] });
        queryClient.invalidateQueries({ queryKey: ["technician-services"] });
        queryClient.invalidateQueries({ queryKey: ["technician-office-services"] });
        queryClient.invalidateQueries({ queryKey: ["available-workshop-services"] });
        toast.success("Aparelho recolhido para oficina!");
      } else {
        // Idempotent: only insert signature if it doesn't exist yet
        const { data: existingSig } = await supabase
          .from("service_signatures")
          .select("id")
          .eq("service_id", service.id)
          .eq("signature_type", "visita")
          .maybeSingle();

        if (!existingSig) {
          await supabase.from("service_signatures").insert({
            service_id: service.id,
            signature_type: "visita",
            file_url: signatureData,
            signer_name: signerName || service.customer?.name,
          });
        }

        await ensureValidSession();
        await updateService.mutateAsync({
          id: service.id,
          status: "concluidos",
          pending_pricing: true,
          detected_fault: formData.detectedFault,
          work_performed: mode === "continuacao_peca" ? "Peça instalada e serviço concluído" : "Reparado no local do cliente",
          last_status_before_part_request: null,
          skipToast: true,
        });

        if (!existingSig) {
          await logServiceCompletion(service.code || "N/A", service.id, profile?.full_name || "Técnico", user?.id);
        }

        queryClient.invalidateQueries({ queryKey: ["service-signatures", service.id] });
        toast.success("Visita concluída com sucesso!");
      }

      clearState();
      saveStateToDb(null as any);
      setShowSignature(false);
      onComplete();
    } catch (error) {
      console.error("Error completing visit:", error);
      toast.error(humanizeError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecisionConfirm = () => {
    if (formData.decision === "levantar_oficina") {
      setSignatureType("recolha");
      setShowPayment(true);
    } else {
      // Go to registo_artigos step (replaces old pecas_usadas)
      safeSetStep("registo_artigos");
    }
  };

  // Payment step handlers
  const handlePaymentComplete = () => {
    setShowPayment(false);
    setShowSignature(true);
  };

  const handlePaymentSkip = () => {
    setShowPayment(false);
    setShowSignature(true);
  };

  const handlePedirPecaConfirm = () => {
    if (formData.needsPartOrder) {
      if (!formData.partToOrder.name.trim()) {
        toast.error("Informe o nome da peça a pedir.");
        return;
      }
      // Go to resumo_reparacao before signature
      safeSetStep("resumo_reparacao");
    } else {
      // Go to resumo_reparacao before payment
      safeSetStep("resumo_reparacao");
    }
  };

  const handleResumoReparacaoConfirm = () => {
    if (formData.needsPartOrder) {
      setSignatureType("pedido_peca");
      setShowSignature(true);
    } else {
      setSignatureType("conclusao");
      setShowPayment(true);
    }
  };

  const handleClose = () => {
    if (currentStep !== "resumo" && currentStep !== "resumo_continuacao") {
      flushStateToDb(currentStep, formData);
    }
    setCurrentStep(mode === "continuacao_peca" ? "resumo_continuacao" : "resumo");
    setFormData({ ...INITIAL_FORM_DATA });
    onClose();
  };

  const removeEstadoPhoto = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      photosEstado: prev.photosEstado.filter((_, i) => i !== index),
    }));
  };

  // Validation - for reparacao need aparelho and etiqueta photos
  const canProceedFromFotoAparelho = formData.photoAparelho !== null;
  const canProceedFromFotoEtiqueta = formData.photoEtiqueta !== null;
  const canProceedFromFotoEstado = formData.photosEstado.length > 0;
  const canProceedFromFoto = formData.photoFile !== null;
  const canProceedFromDiagnostico = formData.detectedFault.trim().length > 0;

  // Helper to check if a photo is a real displayable URL (not a marker)
  const isRealPhoto = (p: string | null) => p !== null && p !== '__photo_exists__';

  // Continuation Flow: Check if part installed confirmed
  const canProceedFromConfirmarPeca = formData.partInstalled === true;

  // Check if product info step is needed (for repairs or if info missing)
  const needsProductStep = !service.brand || !service.model;

  // Get step list based on service type and mode
  const getSteps = (): string[] => {
    if (mode === "continuacao_peca") {
      return ["resumo_continuacao", "deslocacao", "confirmacao_peca", "conclusao"]; // Payment/Sig handled separately
    }

    const productStep = needsProductStep ? ["produto"] : [];
    if (isReparacao) {
      return [
        "resumo",
        "deslocacao",
        "foto_aparelho",
        "foto_etiqueta",
        "foto_estado",
        ...productStep,
        "diagnostico",
        "decisao",
        "registo_artigos",
        "pedir_peca",
        "resumo_reparacao",
      ];
    }
    return ["resumo", "deslocacao", "foto", ...productStep, "diagnostico", "decisao", "registo_artigos", "pedir_peca", "resumo_reparacao"];
  };

  // Progress calculation
  const steps = getSteps();
  const stepIndex = steps.indexOf(currentStep);
  const showProgress = currentStep !== "resumo" && currentStep !== "resumo_continuacao";

  // Calculate total steps for progress bar
  let totalSteps = 0;
  if (mode === "continuacao_peca") {
    totalSteps = 5; // resumo, deslocacao, confirmar_peca, pagamento, assinatura
  } else {
    totalSteps = formData.decision === "reparar_local" ? steps.length : isReparacao ? 7 : 5;
  }

  const ProgressBar = () => (
    <div className="flex gap-1.5 mb-4">
      {Array.from({ length: totalSteps - 1 }).map((_, idx) => (
        <div
          key={idx}
          className={cn("h-1.5 flex-1 rounded-full transition-colors", idx < stepIndex ? "bg-blue-500" : "bg-muted")}
        />
      ))}
    </div>
  );

  const ModalHeader = ({ title, step }: { title: string; step: string }) => (
    <DialogHeader className="p-0 mb-3">
      <div className="bg-blue-500 text-white px-4 py-2 rounded-lg -mx-6 -mt-6 mb-3">
        <DialogTitle className="text-base font-bold text-white">Visit</DialogTitle>
        <DialogDescription className="text-blue-100 text-xs mt-0.5">
          {service.code} - {service.customer?.name || "Cliente"}
        </DialogDescription>
      </div>
      {showProgress && <ProgressBar />}
      <div className="flex items-center gap-2">
        <Badge className="bg-blue-100 text-blue-700 text-[10px]">{step}</Badge>
        <span className="font-semibold text-sm">{title}</span>
      </div>
    </DialogHeader>
  );

  // Navigate to next/previous step
  const goToPreviousPhotoStep = () => {
    if (currentStep === "foto_etiqueta") safeSetStep("foto_aparelho");
    else if (currentStep === "foto_estado") safeSetStep("foto_etiqueta");
    else if (currentStep === "produto" && isReparacao) safeSetStep("foto_estado");
    else if (currentStep === "produto") safeSetStep("foto");
    else if (currentStep === "diagnostico" && needsProductStep) safeSetStep("produto");
    else if (currentStep === "diagnostico" && isReparacao) safeSetStep("foto_estado");
    else if (currentStep === "diagnostico") safeSetStep("foto");
    else safeSetStep("deslocacao");
  };

  const goToNextPhotoStep = () => {
    if (currentStep === "foto_aparelho") {
      safeSetStep("foto_etiqueta");
      return;
    }

    if (currentStep === "foto_etiqueta") {
      safeSetStep("foto_estado");
      return;
    }

    if (currentStep === "foto_estado" || currentStep === "foto") {
      safeSetStep(needsProductStep ? "produto" : "diagnostico");
      return;
    }

    if (currentStep === "produto") {
      safeSetStep("diagnostico");
    }
  };

  // Save product info to service
  const handleProductoConfirm = async () => {
    try {
      await ensureValidSession();
      await updateService.mutateAsync({
        id: service.id,
        brand: formData.productBrand || undefined,
        model: formData.productModel || undefined,
        serial_number: formData.productSerial || undefined,
        appliance_type: formData.productType || undefined,
      } as any);
    } catch {
      // Non-critical - don't block flow
    }
    safeSetStep("diagnostico");
  };

  const handleConfirmacaoPeca = () => {
    setShowPayment(true);
    setSignatureType("conclusao");
  };



  if (!isOpen) return null;

  return (
    <>
      {/* Modal 1: Resumo (Normal or Continuation) */}
      <Dialog open={(currentStep === "resumo" || currentStep === "resumo_continuacao") && !showCamera && !showSignature && !showPayment} onOpenChange={handleStepDialogOpenChange}>
        <DialogContent className="max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto p-6" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
          <ModalHeader
            title={mode === "continuacao_peca" ? "Resumo Cont. Peça" : "Resumo do Serviço"}
            step="Passo 1"
          />

          <div className="space-y-3 bg-muted/50 rounded-lg p-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-muted-foreground text-xs">Cliente</p>
                <p className="font-medium">{service.customer?.name || "N/A"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Telefone</p>
                {(service.contact_phone || service.customer?.phone) ? (
                  <a href={`tel:${service.contact_phone || service.customer?.phone}`} className="font-medium text-primary hover:underline">
                    {service.contact_phone || service.customer?.phone}
                  </a>
                ) : (
                  <p className="font-medium">N/A</p>
                )}
              </div>
            </div>
            <div>
              <p className="text-muted-foreground text-xs flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Morada
              </p>
              <p className="font-medium">{service.service_address || service.customer?.address || "N/A"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Aparelho</p>
              <p className="font-medium">{service.appliance_type || "N/A"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Avaria Reportada</p>
              <p className="font-medium">{service.fault_description || "Sem descrição"}</p>
            </div>

            {/* Show previous diagnosis in continuation mode */}
            {mode === "continuacao_peca" && service.detected_fault && (
              <div className="pt-2 border-t mt-2">
                <p className="text-muted-foreground text-xs">Diagnóstico Anterior</p>
                <p className="font-medium text-amber-600">{service.detected_fault}</p>
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-blue-500 hover:bg-blue-600 font-bold"
              onClick={handleStartVisit}
              disabled={isResuming}
            >
              {isResuming ? "A carregar..." : (mode === "continuacao_peca" ? "Continuar Visita" : "Iniciar Visita")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Deslocação */}
      <Dialog open={currentStep === "deslocacao" && !showCamera && !showSignature && !showPayment} onOpenChange={handleStepDialogOpenChange}>
        <DialogContent className="max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto p-6" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
          <ModalHeader title="Deslocação" step="Passo 2" />

          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4 text-sm">
              <p className="text-muted-foreground text-xs flex items-center gap-1 mb-1">
                <MapPin className="h-3 w-3" /> Morada do Cliente
              </p>
              <p className="font-medium">{service.service_address || service.customer?.address || "N/A"}</p>
              {(service.service_postal_code || service.customer?.postal_code || service.service_city || service.customer?.city) && (
                <p className="text-muted-foreground text-xs mt-1">
                  {[service.service_postal_code || service.customer?.postal_code, service.service_city || service.customer?.city].filter(Boolean).join(', ')}
                </p>
              )}
              <p className="text-muted-foreground mt-2">{service.customer?.phone || ""}</p>
            </div>

            <Button variant="outline" className="w-full h-14 text-base" onClick={handleNavigateToClient}>
              <Navigation className="h-5 w-5 mr-2" />
              Caminho para o Cliente
            </Button>
          </div>

          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => safeSetStep("resumo")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <Button
              className="flex-1 bg-blue-500 hover:bg-blue-600"
              onClick={() => safeSetStep(isReparacao ? "foto_aparelho" : "foto")}
            >
              Cheguei ao Local <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 3a: Foto do Aparelho (only for reparacao) */}
      {isReparacao && (
        <Dialog
          open={currentStep === "foto_aparelho" && !showCamera && !showSignature && !showPayment}
          onOpenChange={handleStepDialogOpenChange}
        >
          <DialogContent className="max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto p-6" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
            <ModalHeader title="Foto do Aparelho" step="Passo 3" />

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <Camera className="h-4 w-4 text-blue-500" />
                <span>Tire uma foto geral do aparelho</span>
                <span className="text-destructive">*</span>
              </div>

              {isRealPhoto(formData.photoAparelho) ? (
                <div className="relative">
                  <img
                    src={formData.photoAparelho!}
                    alt="Foto do aparelho"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute bottom-2 right-2"
                    onClick={() => openCamera("aparelho")}
                  >
                    Nova Foto
                  </Button>
                </div>
              ) : formData.photoAparelho === '__photo_exists__' ? (
                <div className="w-full h-32 flex flex-col items-center justify-center gap-2 rounded-lg border bg-muted/50 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                  <span>Foto já registada</span>
                  <Button variant="outline" size="sm" onClick={() => openCamera("aparelho")}>Tirar Nova</Button>
                </div>
              ) : (
                <Button variant="outline" className="w-full h-32 flex-col gap-2" onClick={() => openCamera("aparelho")}>
                  <Camera className="h-8 w-8 text-muted-foreground" />
                  <span>Tirar Foto do Aparelho</span>
                </Button>
              )}
            </div>

            <DialogFooter className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => safeSetStep("deslocacao")}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
              <Button
                className="flex-1 bg-blue-500 hover:bg-blue-600"
                onClick={goToNextPhotoStep}
                disabled={!canProceedFromFotoAparelho}
              >
                Continuar <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal 3b: Foto da Etiqueta (only for reparacao) */}
      {isReparacao && (
        <Dialog
          open={currentStep === "foto_etiqueta" && !showCamera && !showSignature && !showPayment}
          onOpenChange={handleStepDialogOpenChange}
        >
          <DialogContent className="max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto p-6" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
            <ModalHeader title="Foto da Etiqueta" step="Passo 4" />

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <Tag className="h-4 w-4 text-blue-500" />
                <span>Tire uma foto da etiqueta do aparelho</span>
                <span className="text-destructive">*</span>
              </div>
              <p className="text-xs text-muted-foreground">Capture a etiqueta com número de série, modelo, etc.</p>

              {isRealPhoto(formData.photoEtiqueta) ? (
                <div className="relative">
                  <img
                    src={formData.photoEtiqueta!}
                    alt="Foto da etiqueta"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute bottom-2 right-2"
                    onClick={() => openCamera("etiqueta")}
                  >
                    Nova Foto
                  </Button>
                </div>
              ) : formData.photoEtiqueta === '__photo_exists__' ? (
                <div className="w-full h-32 flex flex-col items-center justify-center gap-2 rounded-lg border bg-muted/50 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                  <span>Foto já registada</span>
                  <Button variant="outline" size="sm" onClick={() => openCamera("etiqueta")}>Tirar Nova</Button>
                </div>
              ) : (
                <Button variant="outline" className="w-full h-32 flex-col gap-2" onClick={() => openCamera("etiqueta")}>
                  <Tag className="h-8 w-8 text-muted-foreground" />
                  <span>Tirar Foto da Etiqueta</span>
                </Button>
              )}
            </div>

            <DialogFooter className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1" onClick={goToPreviousPhotoStep}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
              <Button
                className="flex-1 bg-blue-500 hover:bg-blue-600"
                onClick={goToNextPhotoStep}
                disabled={!canProceedFromFotoEtiqueta}
              >
                Continuar <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal 3c: Foto do Estado (only for reparacao) */}
      {isReparacao && (
        <Dialog
          open={currentStep === "foto_estado" && !showCamera && !showSignature && !showPayment}
          onOpenChange={handleStepDialogOpenChange}
        >
          <DialogContent className="max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto p-6" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
            <ModalHeader title="Estado do Aparelho" step="Passo 5" />

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <ClipboardList className="h-4 w-4 text-blue-500" />
                <span>Registe o estado físico do aparelho</span>
                <span className="text-destructive">*</span>
              </div>
              <p className="text-xs text-muted-foreground">Fotografe amassados, riscos, ou danos visíveis</p>

              {formData.photosEstado.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {formData.photosEstado.filter(p => p !== '__photo_exists__').map((photo, idx) => (
                    <div key={idx} className="relative group">
                      <img src={photo} alt={`Estado ${idx + 1}`} className="w-full h-20 object-cover rounded-lg" />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeEstadoPhoto(idx)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  {formData.photosEstado.some(p => p === '__photo_exists__') && (
                    <div className="flex items-center justify-center h-20 rounded-lg border bg-muted/50">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </div>
                  )}
                  <button
                    onClick={() => openCamera("estado")}
                    className="flex flex-col items-center justify-center h-20 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30 transition-colors"
                  >
                    <Plus className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Mais</span>
                  </button>
                </div>
              )}

              {formData.photosEstado.length === 0 && (
                <Button variant="outline" className="w-full h-32 flex-col gap-2" onClick={() => openCamera("estado")}>
                  <ClipboardList className="h-8 w-8 text-muted-foreground" />
                  <span>Tirar Foto do Estado</span>
                </Button>
              )}
            </div>

            <DialogFooter className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1" onClick={goToPreviousPhotoStep}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
              <Button
                className="flex-1 bg-blue-500 hover:bg-blue-600"
                onClick={goToNextPhotoStep}
                disabled={!canProceedFromFotoEstado}
              >
                Continuar <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal 3 (legacy): Foto (for non-reparacao services) */}
      {!isReparacao && (
        <Dialog open={currentStep === "foto" && !showCamera && !showSignature && !showPayment} onOpenChange={handleStepDialogOpenChange}>
          <DialogContent className="max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto p-6" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
            <ModalHeader title="Tirar Foto" step="Passo 3" />

            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Tire uma foto do aparelho antes de iniciar o diagnóstico.</p>

              {isRealPhoto(formData.photoFile) ? (
                <div className="relative">
                  <img
                    src={formData.photoFile!}
                    alt="Foto do aparelho"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute bottom-2 right-2"
                    onClick={() => openCamera("visita")}
                  >
                    Nova Foto
                  </Button>
                </div>
              ) : formData.photoFile === '__photo_exists__' ? (
                <div className="w-full h-32 flex flex-col items-center justify-center gap-2 rounded-lg border bg-muted/50 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                  <span>Foto já registada</span>
                  <Button variant="outline" size="sm" onClick={() => openCamera("visita")}>Tirar Nova</Button>
                </div>
              ) : (
                <Button variant="outline" className="w-full h-32 flex-col gap-2" onClick={() => openCamera("visita")}>
                  <Camera className="h-8 w-8 text-muted-foreground" />
                  <span>Tirar Foto</span>
                </Button>
              )}
            </div>

            <DialogFooter className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => safeSetStep("deslocacao")}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
              <Button
                className="flex-1 bg-blue-500 hover:bg-blue-600"
                onClick={() => safeSetStep("diagnostico")}
                disabled={!canProceedFromFoto}
              >
                Continuar <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal: Informação do Produto (aparece só quando falta marca/modelo) */}
      <Dialog open={currentStep === "produto" && !showCamera && !showSignature && !showPayment} onOpenChange={handleStepDialogOpenChange}>
        <DialogContent className="max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto p-6" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
          <ModalHeader title="Informação do Produto" step={isReparacao ? "Passo 6" : "Passo 4"} />

          <div className="space-y-4">
            <div>
              <Label htmlFor="prod_type" className="text-sm">Tipo de Aparelho</Label>
              <Input
                id="prod_type"
                placeholder="Ex: Máquina de Lavar, Frigorífico..."
                value={formData.productType as string}
                onChange={(e) => setFormData((prev) => ({ ...prev, productType: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="prod_brand" className="text-sm">Marca</Label>
                <Input
                  id="prod_brand"
                  placeholder="Ex: Bosch, LG..."
                  value={formData.productBrand as string}
                  onChange={(e) => setFormData((prev) => ({ ...prev, productBrand: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="prod_model" className="text-sm">Modelo</Label>
                <Input
                  id="prod_model"
                  placeholder="Ex: WAT24469ES"
                  value={formData.productModel as string}
                  onChange={(e) => setFormData((prev) => ({ ...prev, productModel: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="prod_serial" className="text-sm">Nº de Série</Label>
                <Input
                  id="prod_serial"
                  placeholder="Número de série"
                  value={formData.productSerial as string}
                  onChange={(e) => setFormData((prev) => ({ ...prev, productSerial: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="prod_pnc" className="text-sm">PNC</Label>
                <Input
                  id="prod_pnc"
                  placeholder="Product Number Code"
                  value={formData.productPNC as string}
                  onChange={(e) => setFormData((prev) => ({ ...prev, productPNC: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Preencha o que estiver visível na placa do aparelho. Campos opcionais.
            </p>
          </div>

          <DialogFooter className="flex gap-2 mt-6">
            <Button variant="outline" onClick={goToPreviousPhotoStep} className="flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
            <Button onClick={handleProductoConfirm} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white">
              Continuar <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 4/6: Diagnóstico */}
      <Dialog open={currentStep === "diagnostico" && !showCamera && !showSignature && !showPayment} onOpenChange={handleStepDialogOpenChange}>

        <DialogContent className="max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto p-6" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
          <ModalHeader title="Diagnóstico" step={isReparacao ? "Passo 6" : "Passo 4"} />

          <div className="space-y-4">
            <div>
              <Label htmlFor="detected_fault" className="text-sm">
                Avaria Detectada <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="detected_fault"
                placeholder="Descreva a avaria que detectou no local..."
                value={formData.detectedFault}
                onChange={(e) => setFormData((prev) => ({ ...prev, detectedFault: e.target.value }))}
                rows={4}
                className="mt-1.5 text-sm"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={goToPreviousPhotoStep}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <Button
              className="flex-1 bg-blue-500 hover:bg-blue-600"
              onClick={() => safeSetStep("decisao")}
              disabled={!canProceedFromDiagnostico}
            >
              Continuar <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 5/7: Decisão */}
      <Dialog open={currentStep === "decisao" && !showCamera && !showSignature && !showPayment} onOpenChange={handleStepDialogOpenChange}>
        <DialogContent className="max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto p-6" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
          <ModalHeader title="Decisão" step={isReparacao ? "Passo 7" : "Passo 5"} />

          <p className="text-sm text-muted-foreground mb-4">Qual será o próximo passo?</p>

          <RadioGroup
            value={formData.decision}
            onValueChange={(val) => setFormData((prev) => ({ ...prev, decision: val as DecisionType }))}
            className="space-y-3"
          >
            <label
              htmlFor="reparar_local"
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors",
                formData.decision === "reparar_local"
                  ? "border-blue-500 bg-blue-50"
                  : "border-muted hover:border-muted-foreground/30",
              )}
            >
              <RadioGroupItem value="reparar_local" id="reparar_local" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-blue-500 shrink-0" />
                  <span className="font-medium text-sm">Reparar no Local</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Serviço concluído no local do cliente</p>
              </div>
            </label>

            <label
              htmlFor="levantar_oficina"
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors",
                formData.decision === "levantar_oficina"
                  ? "border-orange-500 bg-orange-50"
                  : "border-muted hover:border-muted-foreground/30",
              )}
            >
              <RadioGroupItem value="levantar_oficina" id="levantar_oficina" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-orange-500 shrink-0" />
                  <span className="font-medium text-sm">Levantar para Oficina</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Recolher aparelho para reparação na oficina</p>
              </div>
            </label>
          </RadioGroup>

          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => safeSetStep("diagnostico")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <Button
              className={cn(
                "flex-1",
                formData.decision === "reparar_local"
                  ? "bg-blue-500 hover:bg-blue-600"
                  : "bg-orange-500 hover:bg-orange-600",
              )}
              onClick={handleDecisionConfirm}
              disabled={isSubmitting}
            >
              Continuar <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Registo de Artigos (replaces old pecas_usadas) */}
      <Dialog open={currentStep === "registo_artigos" && !showCamera && !showSignature && !showPayment} onOpenChange={handleStepDialogOpenChange}>
        <DialogContent className="max-w-md max-w-[95vw] max-h-[90vh] flex flex-col overflow-hidden p-0" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
          <div className="p-6 pb-0">
            <ModalHeader title="Registo de Artigos" step={isReparacao ? "Passo 8" : "Passo 6"} />
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 px-6">
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">Registe os artigos/materiais utilizados nesta reparação.</p>

              {/* Table header */}
              <div className="rounded-lg border overflow-hidden">
                <div className="grid grid-cols-[1fr_1.5fr_70px_90px_36px] gap-1 bg-muted/50 px-3 py-2">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase">Artigo</span>
                  <span className="text-[10px] font-medium text-muted-foreground uppercase">Descrição</span>
                  <span className="text-[10px] font-medium text-muted-foreground uppercase">Qtd</span>
                  <span className="text-[10px] font-medium text-muted-foreground uppercase">Valor €</span>
                  <span></span>
                </div>

                {(formData.articles as ArticleEntry[]).map((article, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_1.5fr_70px_90px_36px] gap-1 px-3 py-2 border-t items-start">
                    <Textarea
                      placeholder="Referência"
                      value={article.reference}
                      onChange={(e) => updateArticle(idx, "reference", e.target.value)}
                      className="min-h-0 h-auto text-xs resize-y p-1.5 border-muted"
                      rows={2}
                      disabled={formData.articlesLocked as boolean}
                    />
                    <Textarea
                      placeholder="Descrição *"
                      value={article.description}
                      onChange={(e) => updateArticle(idx, "description", e.target.value)}
                      className="min-h-0 h-auto text-xs resize-y p-1.5 border-muted"
                      rows={2}
                      disabled={formData.articlesLocked as boolean}
                    />
                    <div>
                      <Input
                        type="number" step="any" min="0"
                        value={article.quantity}
                        onChange={(e) => updateArticle(idx, "quantity", parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs"
                        disabled={formData.articlesLocked as boolean}
                      />
                      <span className="text-[10px] text-muted-foreground mt-0.5 block">Unid.</span>
                    </div>
                    <Input
                      type="number" step="any" min="0"
                      value={article.unit_price}
                      onChange={(e) => updateArticle(idx, "unit_price", parseFloat(e.target.value) || 0)}
                      className="h-8 text-xs"
                      disabled={formData.articlesLocked as boolean}
                    />
                    <div className="flex items-start pt-1">
                      {!formData.articlesLocked && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => removeArticle(idx)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                {(formData.articles as ArticleEntry[]).length === 0 && (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground italic border-t">
                    Nenhum artigo adicionado.
                  </div>
                )}
              </div>

              {!formData.articlesLocked && (
                <Button variant="outline" className="w-full" onClick={addArticle}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar Artigo
                </Button>
              )}
            </div>
          </div>

          <div className="px-6 py-4 border-t flex-shrink-0">
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => safeSetStep("decisao")}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
              <Button className="flex-1 bg-blue-500 hover:bg-blue-600" onClick={() => safeSetStep("pedir_peca")}>
                Continuar <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Pedir Peça? */}
      <Dialog open={currentStep === "pedir_peca" && !showCamera && !showSignature && !showPayment} onOpenChange={handleStepDialogOpenChange}>
        <DialogContent className="max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto p-6" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
          <ModalHeader title="Precisa Pedir Peça?" step={isReparacao ? "Passo 9" : "Passo 7"} />

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Precisa pedir alguma peça?</p>

            <RadioGroup
              value={formData.needsPartOrder ? "sim" : "nao"}
              onValueChange={(val) => setFormData((prev) => ({ ...prev, needsPartOrder: val === "sim" }))}
              className="flex gap-4"
            >
              <label
                htmlFor="needsPart_nao"
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors",
                  !formData.needsPartOrder
                    ? "border-green-500 bg-green-50"
                    : "border-muted hover:border-muted-foreground/30",
                )}
              >
                <RadioGroupItem value="nao" id="needsPart_nao" />
                <span className="font-medium text-sm">Não</span>
              </label>

              <label
                htmlFor="needsPart_sim"
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors",
                  formData.needsPartOrder
                    ? "border-yellow-500 bg-yellow-50"
                    : "border-muted hover:border-muted-foreground/30",
                )}
              >
                <RadioGroupItem value="sim" id="needsPart_sim" />
                <span className="font-medium text-sm">Sim</span>
              </label>
            </RadioGroup>

            {formData.needsPartOrder && (
              <div className="space-y-3 pt-2">
                <Label className="text-sm">Peça a pedir:</Label>
                <div className="space-y-2">
                  <Input
                    placeholder="Nome da peça *"
                    value={formData.partToOrder.name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        partToOrder: { ...(prev.partToOrder as { name: string; reference: string }), name: e.target.value },
                      }))
                    }
                  />
                  <Input
                    placeholder="Referência (opcional)"
                    value={formData.partToOrder.reference}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        partToOrder: { ...(prev.partToOrder as { name: string; reference: string }), reference: e.target.value },
                      }))
                    }
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Será necessária a assinatura do cliente para confirmar o pedido de peça.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => safeSetStep("registo_artigos")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <Button
              className={cn(
                "flex-1",
                formData.needsPartOrder
                  ? "bg-yellow-500 hover:bg-yellow-600 text-black"
                  : "bg-green-500 hover:bg-green-600",
              )}
              onClick={handlePedirPecaConfirm}
              disabled={isSubmitting}
            >
              Continuar <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Resumo da Reparação */}
      <Dialog open={currentStep === "resumo_reparacao" && !showCamera && !showSignature && !showPayment} onOpenChange={handleStepDialogOpenChange}>
        <DialogContent className="max-w-md max-w-[95vw] max-h-[90vh] flex flex-col overflow-hidden p-0" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
          <div className="p-6 pb-0">
            <ModalHeader title="Resumo da Reparação" step={isReparacao ? "Passo 10" : "Passo 8"} />
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 px-6">
            <div className="space-y-4 py-4">
              {(formData.articles as ArticleEntry[]).length === 0 ? (
                <p className="text-sm text-center text-muted-foreground py-4 italic">Nenhum artigo registado.</p>
              ) : (
                <div className="space-y-1">
                  <div className="grid grid-cols-12 gap-1 text-[10px] font-medium text-muted-foreground uppercase px-2">
                    <span className="col-span-2">Ref.</span>
                    <span className="col-span-4">Descrição</span>
                    <span className="col-span-2 text-center">Qtd</span>
                    <span className="col-span-2 text-right">Unit.</span>
                    <span className="col-span-2 text-right">Total</span>
                  </div>
                  {(formData.articles as ArticleEntry[]).map((article, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-1 text-xs px-2 py-1.5 bg-muted/30 rounded">
                      <span className="col-span-2 truncate">{article.reference || "-"}</span>
                      <span className="col-span-4 truncate">{article.description}</span>
                      <span className="col-span-2 text-center">{article.quantity}</span>
                      <span className="col-span-2 text-right">{article.unit_price.toFixed(2)}</span>
                      <span className="col-span-2 text-right font-medium">{(article.quantity * article.unit_price).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t pt-3 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{articlesSubtotal.toFixed(2)} €</span>
                </div>

                {!formData.articlesLocked && (
                  <>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs whitespace-nowrap">Desconto</Label>
                      <Input type="number" step="any" min="0" value={formData.discountValue as string} onChange={(e) => setFormData(prev => ({ ...prev, discountValue: e.target.value }))} className="h-8 text-xs flex-1" placeholder="0" />
                      <Select value={formData.discountType as string} onValueChange={(v) => setFormData(prev => ({ ...prev, discountType: v as "euro" | "percent" }))}>
                        <SelectTrigger className="h-8 w-16 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="euro">€</SelectItem>
                          <SelectItem value="percent">%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <Label className="text-xs whitespace-nowrap">IVA</Label>
                      <Select value={String(formData.taxRate)} onValueChange={(v) => setFormData(prev => ({ ...prev, taxRate: parseInt(v) }))}>
                        <SelectTrigger className="h-8 text-xs flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0%</SelectItem>
                          <SelectItem value="6">6%</SelectItem>
                          <SelectItem value="13">13%</SelectItem>
                          <SelectItem value="23">23%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Desconto</span>
                    <span>-{discountAmount.toFixed(2)} €</span>
                  </div>
                )}
                {taxAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">IVA ({formData.taxRate}%)</span>
                    <span>{taxAmount.toFixed(2)} €</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold border-t pt-2">
                  <span>Total Final</span>
                  <span>{totalFinal.toFixed(2)} €</span>
                </div>
              </div>

              {formData.articlesLocked && (
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-green-700 font-medium">Artigos confirmados e guardados</span>
                </div>
              )}
            </div>
          </div>

          <div className="px-6 py-4 border-t flex-shrink-0">
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => safeSetStep("pedir_peca")} disabled={formData.articlesLocked as boolean}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
              {!formData.articlesLocked ? (
                <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleConfirmArticles} disabled={isSubmitting}>
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Confirmar e Guardar
                </Button>
              ) : (
                <Button className="flex-1 bg-blue-500 hover:bg-blue-600" onClick={handleResumoReparacaoConfirm}>
                  Continuar <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Confirmação Peça */}
      <Dialog open={currentStep === "confirmacao_peca" && !showCamera && !showSignature} onOpenChange={handleStepDialogOpenChange}>
        <DialogContent className="max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto p-6" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
          <ModalHeader title="Confirmação da Peça" step="Instalação" />

          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center text-center gap-3">
              <Package className="h-12 w-12 text-blue-500 bg-blue-100 p-2 rounded-full" />
              <h3 className="font-semibold text-lg">A peça encomendada foi instalada?</h3>
              <p className="text-sm text-muted-foreground">
                Confirme se a peça que chegou foi instalada com sucesso e o aparelho está a funcionar.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <Button variant="outline" className="h-20 flex flex-col gap-1 border-red-200 hover:bg-red-50 hover:text-red-700" onClick={handleClose}>
                <X className="h-6 w-6 text-red-500" />
                <span>Ainda não</span>
              </Button>
              <Button className="h-20 flex flex-col gap-1 bg-green-600 hover:bg-green-700" onClick={() => {
                setFormData(prev => ({ ...prev, partInstalled: true }));
                handleConfirmacaoPeca();
              }}>
                <CheckCircle2 className="h-6 w-6" />
                <span>Sim, instalada</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <CameraCapture
        open={showCamera}
        onOpenChange={setShowCamera}
        onCapture={handlePhotoCapture}
        title={getPhotoDescription(currentPhotoType)}
      />

      {/* Payment Step - Before Signature */}
      <FieldPaymentStep
        service={service}
        open={showPayment}
        onSkip={handlePaymentSkip}
        onComplete={handlePaymentComplete}
        headerBg="bg-blue-500"
        headerText="text-white"
        badgeBg="bg-blue-100"
        badgeText="text-blue-700"
        flowTitle="Visita"
      />

      {/* Signature Modal */}
      <SignatureCanvas
        open={showSignature}
        onOpenChange={setShowSignature}
        onConfirm={handleSignatureComplete}
        title={
          signatureType === "recolha"
            ? "Assinatura de Recolha do Aparelho"
            : signatureType === "pedido_peca"
              ? "Assinatura para Pedido de Peça"
              : "Assinatura de Conclusão da Visita"
        }
      />
    </>
  );
}
