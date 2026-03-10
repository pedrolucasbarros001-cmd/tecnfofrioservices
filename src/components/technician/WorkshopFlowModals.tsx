import { useState, useEffect, useRef } from "react";
import { Camera, Package, CheckCircle2, ArrowLeft, ArrowRight, FileText, Wrench, Plus, X, Trash2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useUpdateService } from "@/hooks/useServices";
import { useAuth } from "@/contexts/AuthContext";
import { logServiceStart, logPartRequest, logServiceCompletion } from "@/utils/activityLogUtils";
import { supabase, ensureValidSession } from "@/integrations/supabase/client";
import { humanizeError } from "@/utils/errorMessages";
import { toast } from "sonner";
import { technicianUpdateService } from "@/utils/technicianRpc";
import { useQueryClient } from "@tanstack/react-query";
import { CameraCapture } from "@/components/shared/CameraCapture";

import { ServicePreviousSummary } from "@/components/technician/ServicePreviousSummary";
import { DiagnosisPhotosGallery } from "@/components/technician/DiagnosisPhotosGallery";
import { AdminPricingReadOnly } from "@/components/technician/AdminPricingReadOnly";
import { useFlowPersistence, deriveStepFromDb, isValidStepForFlow } from "@/hooks/useFlowPersistence";
import { parseAdminPricing, calculateAdminPricingTotals, type AdminPricingData } from "@/utils/adminPricingUtils";
import type { Service } from "@/types/database";

type ModalStep =
  | "resumo"
  | "resumo_continuacao"
  | "iniciar"
  | "foto_aparelho"
  | "foto_etiqueta"
  | "foto_estado"
  | "produto"
  | "diagnostico"
  | "registo_artigos"
  | "resumo_reparacao"
  | "confirmacao_peca"
  | "pedir_peca"
  | "conclusao";

export interface ArticleEntry {
  reference: string;
  description: string;
  quantity: number;
  unit_price: number;
  isExisting?: boolean;
}

interface WorkshopFlowModalsProps {
  service: Service;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  mode?: "normal" | "continuacao_peca";
}

interface WorkshopFormData {
  detectedFault: string;
  workPerformed: string;
  articles: ArticleEntry[];
  discountValue: string;
  discountType: "euro" | "percent";
  taxRate: number;
  articlesLocked: boolean;
  needsPartOrder: boolean;
  partsToOrder: {
    name: string;
    reference: string;
    cost: string;
    quantity: string;
  }[];
  photoAparelho: string | null;
  photoEtiqueta: string | null;
  photosEstado: string[];
  productBrand: string;
  productModel: string;
  productSerial: string;
  productPNC: string;
  productType: string;
  partInstalled: boolean;
  [key: string]: unknown;
}

export function WorkshopFlowModals({ service, isOpen, onClose, onComplete, mode = "normal" }: WorkshopFlowModalsProps) {
  const updateService = useUpdateService();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const [currentStep, setCurrentStep] = useState<ModalStep>("resumo");
  const [formData, setFormData] = useState<WorkshopFormData>({
    detectedFault: "",
    workPerformed: "",
    articles: [],
    discountValue: "",
    discountType: "euro",
    taxRate: 23,
    articlesLocked: false,
    needsPartOrder: false,
    partsToOrder: [],
    photoAparelho: null,
    photoEtiqueta: null,
    photosEstado: [],
    productBrand: "",
    productModel: "",
    productSerial: "",
    productPNC: "",
    productType: "",
    partInstalled: false,
  });
  const [derivedResumeStep, setDerivedResumeStep] = useState<ModalStep | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [previousArticles, setPreviousArticles] = useState<{ reference: string; description: string; quantity: number; unit_price: number; registeredByName: string; registeredLocation: string; created_at: string }[]>([]);
  const [adminPricing, setAdminPricing] = useState<AdminPricingData | null>(null);

  // Transition guard
  const isTransitioning = useRef(false);

  const safeSetStep = (step: ModalStep) => {
    if (!isValidStepForFlow(step, persistenceKey as any)) {
      console.warn(`[WorkshopFlow] Invalid step "${step}" for flow "${persistenceKey}", falling back to resumo`);
      step = (mode === "continuacao_peca" ? "resumo_continuacao" : "resumo") as ModalStep;
    }
    isTransitioning.current = true;
    setCurrentStep(step);
    setTimeout(() => { isTransitioning.current = false; }, 350);
  };

  const handleStepDialogOpenChange = (open: boolean) => {
    if (open) return;
    if (isTransitioning.current) return;
    handleClose();
  };

  const persistenceKey = mode === "continuacao_peca" ? "oficina_continuacao" : "oficina";
  const { loadState, saveState, saveStateToDb, flushStateToDb, clearState } = useFlowPersistence<WorkshopFormData>(service.id, persistenceKey);

  const hasPreviousHistory = !!(
    service.detected_fault ||
    service.work_performed ||
    service.last_status_before_part_request
  );

  const hasInitialized = useRef(false);

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
      if (isValidStepForFlow(savedStep, persistenceKey as any)) {
        setCurrentStep(savedStep);
      } else {
        setCurrentStep(mode === "continuacao_peca" ? "resumo_continuacao" : "resumo");
      }
      setFormData(prev => ({ ...prev, articles: [], discountValue: "", discountType: "euro" as const, taxRate: 23, articlesLocked: false, ...savedState.formData }));
      return;
    }

    setIsResuming(true);
    const persistenceFlowType = mode === "continuacao_peca" ? "oficina_continuacao" : "oficina";
    deriveStepFromDb(service.id, persistenceFlowType, service as unknown as Record<string, unknown>).then(({ step, formDataOverrides }) => {
      let resumeStep = step === 'resumo' ? (mode === "continuacao_peca" ? "resumo_continuacao" : "resumo") : step;
      if (!isValidStepForFlow(resumeStep, persistenceKey as any)) {
        resumeStep = mode === "continuacao_peca" ? "resumo_continuacao" : "resumo";
      }
      setDerivedResumeStep(resumeStep as ModalStep);
      setCurrentStep(mode === "continuacao_peca" ? "resumo_continuacao" : "resumo");

      setFormData((prev) => ({
        ...prev,
        detectedFault: service.detected_fault || "",
        workPerformed: service.work_performed || "",
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

  // Load previous visit articles as read-only
  useEffect(() => {
    if (!isOpen) return;
    const loadServiceArticles = async () => {
      try {
        const { data: parts } = await supabase
          .from("service_parts")
          .select("*")
          .eq("service_id", service.id);

        if (parts && parts.length > 0) {
          // Resolve technician names for history display
          const uniqueUserIds = [...new Set(parts.map(p => (p as any).registered_by).filter(Boolean))];
          let nameMap: Record<string, string> = {};
          if (uniqueUserIds.length > 0) {
            const { data: profiles } = await supabase
              .from("profiles")
              .select("user_id, full_name")
              .in("user_id", uniqueUserIds);
            if (profiles) {
              profiles.forEach(p => { nameMap[p.user_id] = p.full_name || "Técnico"; });
            }
          }

          // Articles that are already installed or available (not pending)
          const availableParts = parts.filter(p => p.arrived || !p.is_requested);

          setFormData(prev => ({
            ...prev,
            articles: availableParts.map(p => ({
              reference: p.part_code || "",
              description: p.part_name,
              quantity: p.quantity || 1,
              unit_price: p.cost || 0,
              isExisting: true,
            })),
            taxRate: parts[0]?.iva_rate ?? prev.taxRate,
          }));

          setPreviousArticles(parts.map(p => ({
            reference: p.part_code || "",
            description: p.part_name,
            quantity: p.quantity || 1,
            unit_price: p.cost || 0,
            registeredByName: nameMap[(p as any).registered_by] || "Técnico",
            registeredLocation: (p as any).registered_location || "externo",
            created_at: p.created_at,
          })));
        }
      } catch (err) {
        console.warn("Error loading articles:", err);
      }
    };
    loadServiceArticles();
  }, [isOpen, service.id]);

  // Parse admin pricing from pricing_description
  useEffect(() => {
    if (!isOpen) return;
    setAdminPricing(parseAdminPricing(service.pricing_description));
  }, [isOpen, service.pricing_description]);

  useEffect(() => {
    if (isOpen && currentStep !== "resumo" && currentStep !== "resumo_continuacao") {
      saveState(currentStep, formData);
      saveStateToDb(currentStep, formData);
    }
  }, [isOpen, currentStep, formData, saveState, saveStateToDb]);

  const handleStartRepair = async () => {
    setIsSubmitting(true);
    try {
      await ensureValidSession();

      if (mode === "continuacao_peca") {
        safeSetStep("confirmacao_peca");
        return;
      }

      const { error: rpcError } = await (supabase.rpc as any)('start_workshop_service', {
        _service_id: service.id,
      });
      if (rpcError) throw rpcError;

      logServiceStart(service.code || "N/A", service.id, profile?.full_name || "Técnico", user?.id).catch(() => { });

      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["technician-services"] });
      queryClient.invalidateQueries({ queryKey: ["technician-office-services"] });
      toast.success(`Em execução! ${service.code} está a ser reparado.`);

      if (derivedResumeStep && derivedResumeStep !== 'resumo' && derivedResumeStep !== 'resumo_continuacao') {
        safeSetStep(derivedResumeStep);
      } else if (!hasPreviousHistory) {
        safeSetStep("foto_aparelho");
      } else {
        safeSetStep("diagnostico");
      }
    } catch (error) {
      console.error("Error starting repair:", error);
      toast.error(humanizeError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Articles helpers ---
  const addArticle = () => {
    setFormData(prev => ({
      ...prev,
      articles: [...prev.articles, { reference: "", description: "", quantity: 1, unit_price: 0 }],
    }));
  };

  const updateArticle = (index: number, field: keyof ArticleEntry | 'cost', value: string | number) => {
    if (field === 'cost') {
      setFormData(prev => ({
        ...prev,
        partsToOrder: prev.partsToOrder.map((p, i) => i === index ? { ...p, cost: value as string } : p),
      }));
      return;
    }
    setFormData(prev => ({
      ...prev,
      articles: prev.articles.map((a, i) => i === index ? { ...a, [field as keyof ArticleEntry]: value } : a),
    }));
  };

  const removeArticle = (index: number) => {
    setFormData(prev => ({
      ...prev,
      articles: prev.articles.filter((_, i) => i !== index),
    }));
  };

  const articlesSubtotal = formData.articles.reduce((sum, a) => sum + (a.quantity * a.unit_price), 0);
  const previousArticlesSubtotal = previousArticles.reduce((sum, a) => sum + (a.quantity * a.unit_price), 0);
  const adminPricingTotals = adminPricing ? calculateAdminPricingTotals(adminPricing) : null;
  const adminPricingTotal = adminPricingTotals?.total || 0;
  const combinedSubtotal = articlesSubtotal + previousArticlesSubtotal;

  const discountAmount = (() => {
    const val = parseFloat(formData.discountValue) || 0;
    if (formData.discountType === "percent") return combinedSubtotal * (val / 100);
    return val;
  })();

  const taxAmount = (combinedSubtotal - discountAmount) * (formData.taxRate / 100);
  const totalFinal = combinedSubtotal - discountAmount + taxAmount + adminPricingTotal;

  const handleConfirmArticles = async () => {
    setIsSubmitting(true);
    try {
      await ensureValidSession();

      const newArticles = (formData.articles as ArticleEntry[]).filter(a => !a.isExisting && a.description.trim());

      for (const article of newArticles) {
        await supabase.from("service_parts").insert({
          service_id: service.id,
          part_name: article.description,
          part_code: article.reference || null,
          quantity: article.quantity,
          cost: article.unit_price,
          is_requested: false,
          arrived: true,
          iva_rate: formData.taxRate,
          registered_by: user?.id || null,
          registered_location: "oficina",
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

  const handleRequestPart = async () => {
    if (formData.partsToOrder.every(p => !p.name.trim())) {
      toast.error("Por favor, adicione pelo menos uma peça");
      return;
    }

    setIsSubmitting(true);
    try {
      await ensureValidSession();

      for (const part of formData.partsToOrder) {
        if (!part.name.trim()) continue;

        await supabase.from("service_parts").insert({
          service_id: service.id,
          part_name: part.name.trim(),
          part_code: part.reference.trim() || null,
          quantity: 1,
          is_requested: true,
          arrived: false,
          cost: part.cost ? parseFloat(part.cost.replace(',', '.')) : 0,
        });

        await logPartRequest(service.code || "N/A", service.id, part.name.trim(), profile?.full_name || "Técnico", user?.id);
      }

      const { error: rpcError } = await technicianUpdateService({
        serviceId: service.id,
        status: 'para_pedir_peca',
        lastStatusBeforePartRequest: service.status,
        detectedFault: formData.detectedFault || null,
        workPerformed: formData.workPerformed || null,
      });
      if (rpcError) throw rpcError;

      queryClient.invalidateQueries({ queryKey: ["service-parts", service.id] });
      toast.success("Pedidos de peças registados com sucesso");
      clearState();
      saveStateToDb(null as any);
      onComplete();
    } catch (error) {
      console.error("Error requesting part:", error);
      toast.error(humanizeError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = async () => {
    const finalWorkPerformed = mode === "continuacao_peca"
      ? (formData.workPerformed || "Artigo instalada e reparação concluída")
      : formData.workPerformed;

    if (!finalWorkPerformed.trim()) {
      toast.error("Descreva o trabalho realizado.");
      return;
    }

    setIsSubmitting(true);
    try {
      await ensureValidSession();

      const newArticles = (formData.articles as ArticleEntry[]).filter((a: ArticleEntry) => !a.isExisting && a.description?.trim());
      if (newArticles.length > 0 && !formData.articlesLocked) {
        for (const article of newArticles) {
          await supabase.from("service_parts").insert({
            service_id: service.id,
            part_name: article.description,
            part_code: article.reference || null,
            quantity: article.quantity,
            cost: article.unit_price,
            is_requested: false,
            arrived: true,
            iva_rate: formData.taxRate ?? 23,
            registered_by: user?.id || null,
            registered_location: "oficina",
          });
        }
      }

      // If price was already set by central (admin/secretary) before execution,
      // skip the pricing step and go directly to em_debito.
      const hasPricingPreDefined = !!(service.pricing_description && service.pending_pricing === false);

      const { error: rpcError } = await technicianUpdateService({
        serviceId: service.id,
        status: hasPricingPreDefined ? 'em_debito' : 'concluidos',
        pendingPricing: hasPricingPreDefined ? false : true,
        detectedFault: formData.detectedFault || null,
        workPerformed: finalWorkPerformed,
      });
      if (rpcError) throw rpcError;

      if (mode === "continuacao_peca") {
        await supabase.from("services").update({ last_status_before_part_request: null }).eq("id", service.id);
      }

      await logServiceCompletion(service.code || "N/A", service.id, profile?.full_name || "Técnico", user?.id);

      queryClient.invalidateQueries({ queryKey: ["service-full", service.id] });
      queryClient.invalidateQueries({ queryKey: ["service-parts", service.id] });
      clearState();
      saveStateToDb(null as any);
      toast.success(hasPricingPreDefined ? `${service.code} concluído! Serviço em débito.` : `${service.code} concluído! Aguarda precificação.`);
      onComplete();
    } catch (error) {
      console.error("Error completing repair:", error);
      toast.error(humanizeError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isOpen && currentStep !== "resumo" && currentStep !== "resumo_continuacao") {
      flushStateToDb(currentStep, formData);
    }
    setCurrentStep(mode === "continuacao_peca" ? "resumo_continuacao" : "resumo");
    setFormData({
      detectedFault: "",
      workPerformed: "",
      articles: [],
      discountValue: "",
      discountType: "euro",
      taxRate: 23,
      articlesLocked: false,
      needsPartOrder: false,
      partsToOrder: [],
      photoAparelho: null,
      photoEtiqueta: null,
      photosEstado: [],
      productBrand: "",
      productModel: "",
      productSerial: "",
      productPNC: "",
      productType: "",
      partInstalled: false,
    });
    onClose();
  };

  const needsProductStep = !service.brand || !service.model;

  const handleProductoConfirm = async () => {
    try {
      await updateService.mutateAsync({
        id: service.id,
        brand: formData.productBrand || undefined,
        model: formData.productModel || undefined,
        serial_number: formData.productSerial || undefined,
        appliance_type: formData.productType || undefined,
      } as any);
    } catch {
      // Non-critical
    }
    safeSetStep("diagnostico");
  };

  // Progress calculation
  let steps: ModalStep[] = [];
  if (mode === "continuacao_peca") {
    steps = ["resumo_continuacao", "confirmacao_peca", "conclusao"];
  } else {
    steps = hasPreviousHistory
      ? ["resumo", "produto", "diagnostico", "registo_artigos", "resumo_reparacao", "pedir_peca", "conclusao"].filter(Boolean) as ModalStep[]
      : [
        "resumo",
        "foto_aparelho",
        "foto_etiqueta",
        "foto_estado",
        "produto",
        "diagnostico",
        "registo_artigos",
        "resumo_reparacao",
        "pedir_peca",
        "conclusao",
      ].filter(Boolean) as ModalStep[];
  }

  const stepIndex = steps.indexOf(currentStep);
  const showProgress = currentStep !== "resumo" && currentStep !== "resumo_continuacao";

  const ProgressBar = () => (
    <div className="flex gap-1.5 mb-4">
      {Array.from({ length: steps.length }).map((_, idx) => (
        <div
          key={idx}
          className={cn("h-1.5 flex-1 rounded-full transition-colors", idx <= stepIndex ? "bg-orange-500" : "bg-muted")}
        />
      ))}
    </div>
  );

  const ModalHeader = ({ title, step }: { title: string; step: string }) => (
    <DialogHeader className="p-0 mb-3">
      <div className="bg-orange-500 text-white px-4 py-2 rounded-lg -mx-6 -mt-6 mb-3">
        <DialogTitle className="text-base font-bold text-white">Oficina</DialogTitle>
        <DialogDescription className="text-orange-100 text-xs mt-0.5">
          {service.code} - {service.customer?.name || "Cliente"}
        </DialogDescription>
      </div>
      {showProgress && <ProgressBar />}
      <div className="flex items-center gap-2">
        <Badge className="bg-orange-100 text-orange-700 text-[10px]">{step}</Badge>
        <span className="font-semibold text-sm">{title}</span>
      </div>
    </DialogHeader>
  );

  const handleConfirmPart = () => {
    setFormData(prev => ({ ...prev, partInstalled: true }));
    safeSetStep("conclusao");
  };

  if (!isOpen) return null;

  return (
    <>
      <Dialog
        open={isOpen && !showCamera}
        onOpenChange={(open) => !open && handleClose()}
      >
        <DialogContent
          className="max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto p-6 bg-card"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          {/* Step: Resumo */}
          {(currentStep === "resumo" || currentStep === "resumo_continuacao") && (
            <>
              <ModalHeader
                title={mode === "continuacao_peca" ? "Resumo Cont. Artigo" : "Resumo do Serviço"}
                step="Passo 1"
              />

              {hasPreviousHistory && mode !== "continuacao_peca" && (
                <ServicePreviousSummary service={service} className="mb-4" />
              )}

              {!hasPreviousHistory && <DiagnosisPhotosGallery serviceId={service.id} className="mb-4" />}

              <div className="space-y-3 bg-muted/50 rounded-lg p-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-muted-foreground text-xs">Cliente</p>
                    <p className="font-medium">{service.customer?.name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Código</p>
                    <p className="font-mono font-medium">{service.code}</p>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Aparelho</p>
                  <p className="font-medium">
                    {[service.appliance_type, service.brand, service.model].filter(Boolean).join(" ") || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Avaria Reportada</p>
                  <p className="font-medium">{service.fault_description || "Sem descrição"}</p>
                </div>
              </div>

              <DialogFooter className="flex gap-2 mt-4">
                <Button variant="outline" className="flex-1" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button className="flex-1 bg-orange-500 hover:bg-orange-600" onClick={handleStartRepair} disabled={isResuming}>
                  <Wrench className="h-4 w-4 mr-1" />
                  {isResuming ? "A carregar..." : (hasPreviousHistory || mode === "continuacao_peca" ? "Continuar Reparação" : "Iniciar Reparação")}
                </Button>
              </DialogFooter>
            </>
          )}

          {/* Step: Confirmação Artigo */}
          {currentStep === "confirmacao_peca" && (
            <>
              <ModalHeader title="Confirmação do Artigo" step="Instalação" />
              <div className="space-y-4 py-4">
                <div className="flex flex-col items-center text-center gap-3">
                  <Package className="h-12 w-12 text-blue-500 bg-blue-100 p-2 rounded-full" />
                  <h3 className="font-semibold text-lg">O artigo encomendado foi instalado?</h3>
                  <p className="text-sm text-muted-foreground">
                    Confirme se o artigo que chegou foi instalado com sucesso.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <Button variant="outline" className="h-20 flex flex-col gap-1 border-red-200 hover:bg-red-50 hover:text-red-700" onClick={handleClose}>
                    <X className="h-6 w-6 text-red-500" />
                    <span>Ainda não</span>
                  </Button>
                  <Button className="h-20 flex flex-col gap-1 bg-green-600 hover:bg-green-700" onClick={handleConfirmPart}>
                    <CheckCircle2 className="h-6 w-6" />
                    <span>Sim, instalada</span>
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Step: Foto do Aparelho */}
          {currentStep === "foto_aparelho" && (
            <>
              <ModalHeader title="Foto do Aparelho" step="Fotos Obrigatórias" />
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <Camera className="h-4 w-4 text-orange-500" />
                  <span>Tire uma foto geral do aparelho</span>
                  <span className="text-destructive">*</span>
                </div>
                {formData.photoAparelho && formData.photoAparelho !== '__photo_exists__' ? (
                  <div className="relative">
                    <img src={formData.photoAparelho} alt="Foto do aparelho" className="w-full h-48 object-cover rounded-lg" />
                    <Button variant="secondary" size="sm" className="absolute bottom-2 right-2" onClick={() => setShowCamera(true)}>Nova Foto</Button>
                  </div>
                ) : formData.photoAparelho === '__photo_exists__' ? (
                  <div className="w-full h-32 flex flex-col items-center justify-center gap-2 rounded-lg border bg-muted/50 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                    <span>Foto já registada</span>
                    <Button variant="outline" size="sm" onClick={() => setShowCamera(true)}>Tirar Nova</Button>
                  </div>
                ) : (
                  <Button variant="outline" className="w-full h-32 flex-col gap-2" onClick={() => setShowCamera(true)}>
                    <Camera className="h-8 w-8 text-muted-foreground" />
                    <span>Tirar Foto do Aparelho</span>
                  </Button>
                )}
              </div>
              <DialogFooter className="flex gap-2 mt-4">
                <Button variant="outline" className="flex-1" onClick={() => setCurrentStep("resumo")}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
                </Button>
                <Button className="flex-1 bg-orange-500 hover:bg-orange-600" onClick={() => safeSetStep("foto_etiqueta")} disabled={!formData.photoAparelho}>
                  Continuar <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </DialogFooter>
            </>
          )}

          {/* Step: Foto da Etiqueta */}
          {currentStep === "foto_etiqueta" && (
            <>
              <ModalHeader title="Foto da Etiqueta" step="Fotos Obrigatórias" />
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <Camera className="h-4 w-4 text-orange-500" />
                  <span>Tire uma foto da etiqueta serial</span>
                  <span className="text-destructive">*</span>
                </div>
                {formData.photoEtiqueta && formData.photoEtiqueta !== '__photo_exists__' ? (
                  <div className="relative">
                    <img src={formData.photoEtiqueta} alt="Foto da etiqueta" className="w-full h-48 object-cover rounded-lg" />
                    <Button variant="secondary" size="sm" className="absolute bottom-2 right-2" onClick={() => setShowCamera(true)}>Nova Foto</Button>
                  </div>
                ) : formData.photoEtiqueta === '__photo_exists__' ? (
                  <div className="w-full h-32 flex flex-col items-center justify-center gap-2 rounded-lg border bg-muted/50 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                    <span>Foto já registada</span>
                    <Button variant="outline" size="sm" onClick={() => setShowCamera(true)}>Tirar Nova</Button>
                  </div>
                ) : (
                  <Button variant="outline" className="w-full h-32 flex-col gap-2" onClick={() => setShowCamera(true)}>
                    <Camera className="h-8 w-8 text-muted-foreground" />
                    <span>Tirar Foto da Etiqueta</span>
                  </Button>
                )}
              </div>
              <DialogFooter className="flex gap-2 mt-4">
                <Button variant="outline" className="flex-1" onClick={() => safeSetStep("foto_aparelho")}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
                </Button>
                <Button className="flex-1 bg-orange-500 hover:bg-orange-600" onClick={() => safeSetStep("foto_estado")} disabled={!formData.photoEtiqueta}>
                  Continuar <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </DialogFooter>
            </>
          )}

          {/* Step: Foto do Estado */}
          {currentStep === "foto_estado" && (
            <>
              <ModalHeader title="Estado do Aparelho" step="Fotos Obrigatórias" />
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <Camera className="h-4 w-4 text-orange-500" />
                  <span>Registe o estado físico (mín. 1 foto)</span>
                  <span className="text-destructive">*</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(formData.photosEstado || []).filter(p => p !== '__photo_exists__').map((p, idx) => (
                    <div key={idx} className="relative aspect-square">
                      <img src={p} alt={`Estado ${idx}`} className="w-full h-full object-cover rounded-lg" />
                    </div>
                  ))}
                  {formData.photosEstado.some(p => p === '__photo_exists__') && (
                    <div className="flex items-center justify-center aspect-square rounded-lg border bg-muted/50">
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                    </div>
                  )}
                  {formData.photosEstado.filter(p => p !== '__photo_exists__').length < 3 && (
                    <Button variant="outline" className="aspect-square flex-col gap-2 p-0" onClick={() => setShowCamera(true)}>
                      <Plus className="h-6 w-6 text-muted-foreground" />
                      <span className="text-[10px]">Adicionar</span>
                    </Button>
                  )}
                </div>
              </div>
              <DialogFooter className="flex gap-2 mt-4">
                <Button variant="outline" className="flex-1" onClick={() => safeSetStep("foto_etiqueta")}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
                </Button>
                <Button className="flex-1 bg-orange-500 hover:bg-orange-600" onClick={() => safeSetStep(needsProductStep ? "produto" : "diagnostico")} disabled={formData.photosEstado.length === 0}>
                  Continuar <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </DialogFooter>
            </>
          )}

          {/* Step: Produto */}
          {currentStep === "produto" && (
            <>
              <ModalHeader title="Informação do Produto" step="Passo 2" />
              <div className="space-y-4">
                <div>
                  <Label htmlFor="ws_prod_type" className="text-sm">Tipo de Aparelho</Label>
                  <Input id="ws_prod_type" placeholder="Ex: Máquina de Lavar, Frigorífico..." value={formData.productType as string} onChange={(e) => setFormData((prev) => ({ ...prev, productType: e.target.value }))} className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="ws_prod_brand" className="text-sm">Marca</Label>
                    <Input id="ws_prod_brand" placeholder="Ex: Bosch, LG..." value={formData.productBrand as string} onChange={(e) => setFormData((prev) => ({ ...prev, productBrand: e.target.value }))} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="ws_prod_model" className="text-sm">Modelo</Label>
                    <Input id="ws_prod_model" placeholder="Ex: WAT24469ES" value={formData.productModel as string} onChange={(e) => setFormData((prev) => ({ ...prev, productModel: e.target.value }))} className="mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="ws_prod_serial" className="text-sm">Nº de Série</Label>
                    <Input id="ws_prod_serial" placeholder="Número de série" value={formData.productSerial as string} onChange={(e) => setFormData((prev) => ({ ...prev, productSerial: e.target.value }))} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="ws_prod_pnc" className="text-sm">PNC</Label>
                    <Input id="ws_prod_pnc" placeholder="Product Number Code" value={formData.productPNC as string} onChange={(e) => setFormData((prev) => ({ ...prev, productPNC: e.target.value }))} className="mt-1" />
                  </div>
                </div>
              </div>
              <DialogFooter className="flex gap-2 mt-6">
                <Button variant="outline" onClick={() => {
                  if (hasPreviousHistory) safeSetStep("resumo");
                  else safeSetStep("foto_estado");
                }} className="flex items-center gap-1">
                  <ArrowLeft className="h-4 w-4" /> Voltar
                </Button>
                <Button onClick={handleProductoConfirm} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white">
                  Continuar <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </DialogFooter>
            </>
          )}

          {/* Step: Diagnóstico */}
          {currentStep === "diagnostico" && (
            <>
              <ModalHeader title="Diagnóstico" step="Passo 2" />
              <div className="space-y-4">
                <div>
                  <Label htmlFor="detected_fault" className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Diagnóstico complementar <span className="text-muted-foreground text-xs">(opcional)</span>
                  </Label>
                  <Textarea id="detected_fault" placeholder="Adicione detalhes ao diagnóstico..." value={formData.detectedFault} onChange={(e) => setFormData((prev) => ({ ...prev, detectedFault: e.target.value }))} rows={3} className="mt-1.5 text-sm" />
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowCamera(true)}>
                  <Camera className="h-4 w-4 mr-1" />
                  Tirar Foto (Opcional)
                </Button>
              </div>
              <DialogFooter className="flex gap-2 mt-4">
                <Button variant="outline" className="flex-1" onClick={() => {
                  if (!hasPreviousHistory) safeSetStep("foto_estado");
                  else safeSetStep("resumo");
                }}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
                </Button>
                <Button className="flex-1 bg-orange-500 hover:bg-orange-600" onClick={() => safeSetStep("registo_artigos")}>
                  Continuar <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </DialogFooter>
            </>
          )}

          {/* Step: Registo de Artigos */}
          {currentStep === "registo_artigos" && (
            <>
              <ModalHeader title="Registo de Artigos do Serviço" step="Passo 3" />
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Registe os artigos utilizados nesta reparação.</p>

                {/* Admin-defined pricing - read-only */}
                {adminPricing && (
                  <AdminPricingReadOnly data={adminPricing} />
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Artigos Utilizados</Label>
                    {!formData.articlesLocked && (
                      <Button type="button" variant="outline" size="sm" className="h-7 text-xs border-dashed" onClick={addArticle}>
                        <Plus className="h-3 w-3 mr-1" /> Adicionar Artigo
                      </Button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {(formData.articles as ArticleEntry[]).map((article, idx) => (
                      <div key={idx} className="p-3 border rounded-lg bg-muted/20 relative group">
                        {!formData.articlesLocked && !article.isExisting && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 absolute -right-2 -top-2 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeArticle(idx)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                        <div className="grid grid-cols-12 gap-2">
                          <div className="col-span-2 space-y-1">
                            <Label className="text-[10px] uppercase text-muted-foreground">Ref.</Label>
                            <Input
                              placeholder="Ref"
                              value={article.reference}
                              onChange={(e) => updateArticle(idx, "reference", e.target.value)}
                              className="h-8 text-sm px-2"
                              disabled={(formData.articlesLocked as boolean) || article.isExisting}
                            />
                          </div>
                          <div className="col-span-4 space-y-1">
                            <Label className="text-[10px] uppercase text-muted-foreground">Nome do artigo *</Label>
                            <Input
                              placeholder="Descrição"
                              value={article.description}
                              onChange={(e) => updateArticle(idx, "description", e.target.value)}
                              className="h-8 text-sm"
                              disabled={(formData.articlesLocked as boolean) || article.isExisting}
                            />
                          </div>
                          <div className="col-span-2 space-y-1">
                            <Label className="text-[10px] uppercase text-muted-foreground text-center block">Qtd</Label>
                            <Input
                              type="number"
                              min="1"
                              value={article.quantity}
                              onChange={(e) => updateArticle(idx, "quantity", parseFloat(e.target.value) || 1)}
                              className="h-8 text-sm text-center px-1"
                              disabled={(formData.articlesLocked as boolean) || article.isExisting}
                            />
                          </div>
                          <div className="col-span-2 space-y-1">
                            <Label className="text-[10px] uppercase text-muted-foreground text-right block">Valor Unit.</Label>
                            <Input
                              type="number"
                              placeholder="0,00"
                              value={article.unit_price}
                              onChange={(e) => updateArticle(idx, "unit_price", parseFloat(e.target.value) || 0)}
                              className="h-8 text-sm px-2 text-right"
                              disabled={(formData.articlesLocked as boolean) || article.isExisting}
                            />
                          </div>
                          <div className="col-span-2 space-y-1">
                            <Label className="text-[10px] uppercase text-muted-foreground text-right block">Total</Label>
                            <div className={cn(
                              "h-8 flex items-center justify-end px-2 bg-muted/50 rounded text-xs font-medium",
                              (formData.articlesLocked || article.isExisting) && "opacity-50"
                            )}>
                              {(article.quantity * article.unit_price).toFixed(2)} €
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {(formData.articles as ArticleEntry[]).length === 0 && (
                      <div className="px-3 py-6 text-center text-sm text-muted-foreground italic border-2 border-dashed rounded-lg">
                        Nenhum artigo adicionado.
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter className="flex gap-2 mt-4">
                <Button variant="outline" className="flex-1" onClick={() => safeSetStep("diagnostico")}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
                </Button>
                <Button className="flex-1 bg-orange-500 hover:bg-orange-600" onClick={() => safeSetStep("resumo_reparacao")}>
                  Continuar <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </DialogFooter>
            </>
          )}

          {/* Step: Resumo da Reparação */}
          {currentStep === "resumo_reparacao" && (
            <>
              <ModalHeader title="Resumo da Reparação" step="Passo 4" />
              <div className="space-y-4">
                {/* Admin-defined pricing - read-only */}
                {adminPricing && (
                  <AdminPricingReadOnly data={adminPricing} showSummary />
                )}

                {/* Previous visit articles - read-only */}
                {previousArticles.length > 0 && (
                  <div className="opacity-60">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-medium text-muted-foreground uppercase">Artigos da Visita</span>
                      <span className="text-[10px] text-muted-foreground">{previousArticles[0]?.registeredByName}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="grid grid-cols-12 gap-1 text-[10px] font-medium text-muted-foreground uppercase px-2">
                        <span className="col-span-2">Ref.</span>
                        <span className="col-span-4">Descrição</span>
                        <span className="col-span-2 text-center">Qtd</span>
                        <span className="col-span-2 text-right">Unit.</span>
                        <span className="col-span-2 text-right">Total</span>
                      </div>
                      {previousArticles.map((article, idx) => (
                        <div key={`prev-${idx}`} className="grid grid-cols-12 gap-1 text-xs px-2 py-1.5 bg-muted/20 rounded">
                          <span className="col-span-2 truncate">{article.reference || "-"}</span>
                          <span className="col-span-4 truncate">{article.description}</span>
                          <span className="col-span-2 text-center">{article.quantity}</span>
                          <span className="col-span-2 text-right">{article.unit_price.toFixed(2)}</span>
                          <span className="col-span-2 text-right font-medium">{(article.quantity * article.unit_price).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end text-xs text-muted-foreground mt-1">
                      Subtotal visita: {previousArticlesSubtotal.toFixed(2)} €
                    </div>
                  </div>
                )}

                {/* Current workshop articles */}
                {previousArticles.length > 0 && formData.articles.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase">Artigos da Oficina</span>
                  </div>
                )}

                {formData.articles.length === 0 && previousArticles.length === 0 ? (
                  <p className="text-sm text-center text-muted-foreground py-4 italic">Nenhum artigo registado.</p>
                ) : formData.articles.length > 0 ? (
                  <div className="space-y-1">
                    <div className="grid grid-cols-12 gap-1 text-[10px] font-medium text-muted-foreground uppercase px-2">
                      <span className="col-span-2">Ref.</span>
                      <span className="col-span-4">Descrição</span>
                      <span className="col-span-2 text-center">Qtd</span>
                      <span className="col-span-2 text-right">Unit.</span>
                      <span className="col-span-2 text-right">Total</span>
                    </div>
                    {(formData.articles || []).map((article, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-1 text-xs px-2 py-1.5 bg-muted/30 rounded">
                        <span className="col-span-2 truncate">{article.reference || "-"}</span>
                        <span className="col-span-4 truncate">{article.description}</span>
                        <span className="col-span-2 text-center">{article.quantity}</span>
                        <span className="col-span-2 text-right">{article.unit_price.toFixed(2)}</span>
                        <span className="col-span-2 text-right font-medium">{(article.quantity * article.unit_price).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="border-t pt-3 space-y-3">
                  {previousArticles.length > 0 && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Subtotal Visita</span>
                      <span>{previousArticlesSubtotal.toFixed(2)} €</span>
                    </div>
                  )}
                  {formData.articles.length > 0 && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Subtotal Oficina</span>
                      <span>{articlesSubtotal.toFixed(2)} €</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground font-medium">Subtotal Geral</span>
                    <span className="font-medium">{combinedSubtotal.toFixed(2)} €</span>
                  </div>

                  {!formData.articlesLocked && (
                    <>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs whitespace-nowrap">Desconto</Label>
                        <Input type="number" step="any" min="0" value={formData.discountValue} onChange={(e) => setFormData(prev => ({ ...prev, discountValue: e.target.value }))} className="h-8 text-xs flex-1" placeholder="0" />
                        <Select value={formData.discountType} onValueChange={(v) => setFormData(prev => ({ ...prev, discountType: v as "euro" | "percent" }))}>
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

                  {adminPricingTotal > 0 && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Total Adm.</span>
                      <span>{adminPricingTotal.toFixed(2)} €</span>
                    </div>
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

              <DialogFooter className="flex gap-2 mt-4">
                <Button variant="outline" className="flex-1" onClick={() => safeSetStep("registo_artigos")} disabled={formData.articlesLocked}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
                </Button>
                {!formData.articlesLocked ? (
                  <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleConfirmArticles} disabled={isSubmitting}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Confirmar e Guardar
                  </Button>
                ) : (
                  <Button className="flex-1 bg-orange-500 hover:bg-orange-600" onClick={() => safeSetStep("pedir_peca")}>
                    Continuar <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </DialogFooter>
            </>
          )}

          {/* Step: Pedir Artigo */}
          {currentStep === "pedir_peca" && (
            <>
              <ModalHeader title="Pedir Artigo?" step="Passo 5" />
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">É necessário pedir algum artigo?</p>
                <RadioGroup value={formData.needsPartOrder ? "sim" : "nao"} onValueChange={(val) => setFormData((prev) => ({ ...prev, needsPartOrder: val === "sim" }))} className="flex gap-4">
                  <label htmlFor="needsPart_nao" className={cn("flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer", !formData.needsPartOrder ? "border-green-500 bg-green-50" : "border-muted")}>
                    <RadioGroupItem value="nao" id="needsPart_nao" />
                    <span>Não</span>
                  </label>
                  <label htmlFor="needsPart_sim" className={cn("flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer", formData.needsPartOrder ? "border-yellow-500 bg-yellow-50" : "border-muted")}>
                    <RadioGroupItem value="sim" id="needsPart_sim" />
                    <span>Sim</span>
                  </label>
                </RadioGroup>

                {formData.needsPartOrder && (
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Artigos a pedir:</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          partsToOrder: [...(prev.partsToOrder || []), { name: "", reference: "", cost: "", quantity: "1" }]
                        }))}
                      >
                        <Plus className="h-3 w-3 mr-1" /> Adicionar Artigo
                      </Button>
                    </div>

                    <div className="space-y-3 max-h-[35vh] overflow-y-auto pr-1">
                      {formData.partsToOrder.length === 0 && (
                        <p className="text-xs text-center py-4 text-muted-foreground border-2 border-dashed rounded-lg">
                          Nenhum artigo adicionado.
                        </p>
                      )}
                      {(formData.partsToOrder || []).map((part, index) => (
                        <div key={index} className="p-3 border rounded-lg bg-muted/20 relative group">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 absolute -right-2 -top-2 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setFormData(prev => {
                              const newList = [...prev.partsToOrder];
                              newList.splice(index, 1);
                              return { ...prev, partsToOrder: newList };
                            })}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                          <div className="grid grid-cols-12 gap-2 mt-1">
                            <div className="col-span-2 space-y-1">
                              <Label className="text-[10px] uppercase text-muted-foreground">Ref.</Label>
                              <Input
                                placeholder="Ref"
                                value={part.reference}
                                className="h-8 text-sm px-2"
                                onChange={(e) => {
                                  const newList = [...formData.partsToOrder];
                                  newList[index].reference = e.target.value;
                                  setFormData(prev => ({ ...prev, partsToOrder: newList }));
                                }}
                              />
                            </div>
                            <div className="col-span-6 space-y-1">
                              <Label className="text-[10px] uppercase text-muted-foreground">Descrição *</Label>
                              <Input
                                placeholder="Nome do artigo"
                                value={part.name}
                                className="h-8 text-sm"
                                onChange={(e) => {
                                  const newList = [...formData.partsToOrder];
                                  newList[index].name = e.target.value;
                                  setFormData(prev => ({ ...prev, partsToOrder: newList }));
                                }}
                              />
                            </div>
                            <div className="col-span-2 space-y-1">
                              <Label className="text-[10px] uppercase text-muted-foreground text-center block">Qtd</Label>
                              <Input
                                type="number"
                                min="1"
                                placeholder="1"
                                value={part.quantity || "1"}
                                className="h-8 text-sm text-center px-1"
                                onChange={(e) => {
                                  const newList = [...formData.partsToOrder];
                                  newList[index].quantity = e.target.value;
                                  setFormData(prev => ({ ...prev, partsToOrder: newList }));
                                }}
                              />
                            </div>
                            <div className="col-span-2 space-y-1">
                              <Label className="text-[10px] uppercase text-muted-foreground text-right block">Valor (€)</Label>
                              <Input
                                placeholder="0,00"
                                value={part.cost}
                                className="h-8 text-sm px-2 text-right"
                                onChange={(e) => {
                                  const newList = [...formData.partsToOrder];
                                  newList[index].cost = e.target.value;
                                  setFormData(prev => ({ ...prev, partsToOrder: newList }));
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter className="flex gap-2 mt-4">
                <Button variant="outline" className="flex-1" onClick={() => safeSetStep("resumo_reparacao")}><ArrowLeft className="h-4 w-4 mr-1" /> Anterior</Button>
                {formData.needsPartOrder ? (
                  <Button className="flex-1 bg-yellow-500 text-black" onClick={handleRequestPart} disabled={isSubmitting || formData.partsToOrder.length === 0 || formData.partsToOrder.every(p => !p.name.trim())}>Solicitar Artigos</Button>
                ) : (
                  <Button className="flex-1 bg-green-500 hover:bg-green-600" onClick={() => safeSetStep("conclusao")}>Continuar <ArrowRight className="h-4 w-4 ml-1" /></Button>
                )}
              </DialogFooter>
            </>
          )}

          {/* Step: Conclusão */}
          {currentStep === "conclusao" && (
            <>
              <ModalHeader title="Conclusão" step="Passo 6" />
              <div className="space-y-4">
                <Label htmlFor="work_performed" className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Resumo da reparação *
                </Label>
                <Textarea
                  id="work_performed"
                  placeholder="Descreva o trabalho realizado..."
                  value={formData.workPerformed}
                  onChange={(e) => setFormData((prev) => ({ ...prev, workPerformed: e.target.value }))}
                  rows={4}
                  className="mt-1.5 text-sm"
                />
              </div>
              <DialogFooter className="flex gap-2 mt-4">
                <Button variant="outline" className="flex-1" onClick={() => safeSetStep(mode === "continuacao_peca" ? "confirmacao_peca" : "pedir_peca")}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
                </Button>
                <Button
                  className="flex-1 bg-green-500 hover:bg-green-700"
                  onClick={handleComplete}
                  disabled={isSubmitting || !formData.workPerformed.trim()}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Concluir
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <CameraCapture
        open={showCamera}
        onOpenChange={setShowCamera}
        onCapture={async (data) => {
          try {
            const images = Array.isArray(data) ? data : [data];
            let photoType = "oficina";
            if (currentStep === "foto_aparelho") photoType = "aparelho";
            else if (currentStep === "foto_etiqueta") photoType = "etiqueta";
            else if (currentStep === "foto_estado") photoType = "estado";

            await ensureValidSession();
            const { uploadServicePhoto } = await import('@/utils/photoUpload');

            for (const img of images) {
              const publicUrl = await uploadServicePhoto(service.id, img, photoType, `Foto de ${photoType} na oficina`);

              if (currentStep === "foto_aparelho") {
                setFormData((prev) => ({ ...prev, photoAparelho: publicUrl }));
              } else if (currentStep === "foto_etiqueta") {
                setFormData((prev) => ({ ...prev, photoEtiqueta: publicUrl }));
              } else if (currentStep === "foto_estado") {
                setFormData((prev) => ({
                  ...prev,
                  photosEstado: Array.isArray(prev.photosEstado) ? [...prev.photosEstado, publicUrl] : [publicUrl]
                }));
              }
            }

            queryClient.invalidateQueries({ queryKey: ["service-photos", service.id] });
            setShowCamera(false);
            toast.success(images.length > 1 ? `${images.length} fotos guardadas!` : "Foto guardada!");
          } catch (error) {
            console.error("Error saving photo:", error);
            toast.error(humanizeError(error));
          }
        }}
        title="Capturar Foto"
      />
    </>
  );
}
