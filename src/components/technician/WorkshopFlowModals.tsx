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
import { useFlowPersistence, deriveStepFromDb, isValidStepForFlow } from "@/hooks/useFlowPersistence";
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
  partToOrder: string;
  partNotes: string;
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
    partToOrder: "",
    partNotes: "",
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

  const updateArticle = (index: number, field: keyof ArticleEntry, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      articles: prev.articles.map((a, i) => i === index ? { ...a, [field]: value } : a),
    }));
  };

  const removeArticle = (index: number) => {
    setFormData(prev => ({
      ...prev,
      articles: prev.articles.filter((_, i) => i !== index),
    }));
  };

  const articlesSubtotal = formData.articles.reduce((sum, a) => sum + (a.quantity * a.unit_price), 0);

  const discountAmount = (() => {
    const val = parseFloat(formData.discountValue) || 0;
    if (formData.discountType === "percent") return articlesSubtotal * (val / 100);
    return val;
  })();

  const taxAmount = (articlesSubtotal - discountAmount) * (formData.taxRate / 100);
  const totalFinal = articlesSubtotal - discountAmount + taxAmount;

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

      for (const article of formData.articles) {
        if (!article.description.trim()) continue;
        await supabase.from("service_parts").insert({
          service_id: service.id,
          part_name: article.description,
          part_code: article.reference || null,
          quantity: article.quantity,
          cost: article.unit_price,
          is_requested: false,
          arrived: true,
          iva_rate: formData.taxRate,
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
    if (!formData.partToOrder.trim()) {
      toast.error("Informe o nome da peça a pedir.");
      return;
    }

    setIsSubmitting(true);
    try {
      await ensureValidSession();

      await supabase.from("service_parts").insert({
        service_id: service.id,
        part_name: formData.partToOrder.trim(),
        notes: formData.partNotes || null,
        quantity: 1,
        is_requested: true,
        arrived: false,
        cost: 0,
      });

      const { error: rpcError } = await technicianUpdateService({
        serviceId: service.id,
        status: 'para_pedir_peca',
        lastStatusBeforePartRequest: service.status,
        detectedFault: formData.detectedFault || null,
        workPerformed: formData.workPerformed || null,
      });
      if (rpcError) throw rpcError;

      await logPartRequest(
        service.code || "N/A",
        service.id,
        formData.partToOrder.trim(),
        profile?.full_name || "Técnico",
        user?.id,
      );

      clearState();
      saveStateToDb(null as any);
      queryClient.invalidateQueries({ queryKey: ["service-parts", service.id] });
      toast.success(`Peça solicitada! ${service.code} aguarda aprovação.`);
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
      ? (formData.workPerformed || "Peça instalada e reparação concluída")
      : formData.workPerformed;

    if (!finalWorkPerformed.trim()) {
      toast.error("Descreva o trabalho realizado.");
      return;
    }

    setIsSubmitting(true);
    try {
      await ensureValidSession();

      const { error: rpcError } = await technicianUpdateService({
        serviceId: service.id,
        status: 'concluidos',
        pendingPricing: true,
        detectedFault: formData.detectedFault || null,
        workPerformed: finalWorkPerformed,
      });
      if (rpcError) throw rpcError;

      if (mode === "continuacao_peca") {
        await supabase.from("services").update({ last_status_before_part_request: null }).eq("id", service.id);
      }

      await logServiceCompletion(service.code || "N/A", service.id, profile?.full_name || "Técnico", user?.id);

      clearState();
      saveStateToDb(null as any);
      toast.success(`${service.code} concluído! Aguarda precificação.`);
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
      partToOrder: "",
      partNotes: "",
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
      ? ["resumo", needsProductStep ? "produto" : null, "diagnostico", "registo_artigos", "resumo_reparacao", "pedir_peca", "conclusao"].filter(Boolean) as ModalStep[]
      : [
        "resumo",
        "foto_aparelho",
        "foto_etiqueta",
        "foto_estado",
        needsProductStep ? "produto" : null,
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
          className="max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto p-6"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          {/* Step: Resumo */}
          {(currentStep === "resumo" || currentStep === "resumo_continuacao") && (
            <>
              <ModalHeader
                title={mode === "continuacao_peca" ? "Resumo Cont. Peça" : "Resumo do Serviço"}
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

          {/* Step: Confirmação Peça */}
          {currentStep === "confirmacao_peca" && (
            <>
              <ModalHeader title="Confirmação da Peça" step="Instalação" />
              <div className="space-y-4 py-4">
                <div className="flex flex-col items-center text-center gap-3">
                  <Package className="h-12 w-12 text-blue-500 bg-blue-100 p-2 rounded-full" />
                  <h3 className="font-semibold text-lg">A peça encomendada foi instalada?</h3>
                  <p className="text-sm text-muted-foreground">
                    Confirme se a peça que chegou foi instalada com sucesso.
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
                  {formData.photosEstado.filter(p => p !== '__photo_exists__').map((p, idx) => (
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
                <Button variant="outline" onClick={() => safeSetStep("foto_estado")} className="flex items-center gap-1">
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

                {/* Table header */}
                <div className="rounded-lg border overflow-hidden">
                  <div className="grid grid-cols-[1fr_1.5fr_70px_90px_36px] gap-1 bg-muted/50 px-3 py-2">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase">Artigo</span>
                    <span className="text-[10px] font-medium text-muted-foreground uppercase">Descrição</span>
                    <span className="text-[10px] font-medium text-muted-foreground uppercase">Qtd</span>
                    <span className="text-[10px] font-medium text-muted-foreground uppercase">Valor €</span>
                    <span></span>
                  </div>

                  {formData.articles.map((article, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_1.5fr_70px_90px_36px] gap-1 px-3 py-2 border-t items-start">
                      <Textarea
                        placeholder="Referência"
                        value={article.reference}
                        onChange={(e) => updateArticle(idx, "reference", e.target.value)}
                        className="min-h-0 h-auto text-xs resize-y p-1.5 border-muted"
                        rows={2}
                      />
                      <Textarea
                        placeholder="Descrição *"
                        value={article.description}
                        onChange={(e) => updateArticle(idx, "description", e.target.value)}
                        className="min-h-0 h-auto text-xs resize-y p-1.5 border-muted"
                        rows={2}
                      />
                      <div>
                        <Input
                          type="number" step="any" min="0"
                          value={article.quantity}
                          onChange={(e) => updateArticle(idx, "quantity", parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs"
                        />
                        <span className="text-[10px] text-muted-foreground mt-0.5 block">Unid.</span>
                      </div>
                      <Input
                        type="number" step="any" min="0"
                        value={article.unit_price}
                        onChange={(e) => updateArticle(idx, "unit_price", parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs"
                      />
                      <div className="flex items-start pt-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => removeArticle(idx)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {formData.articles.length === 0 && (
                    <div className="px-3 py-6 text-center text-sm text-muted-foreground italic border-t">
                      Nenhum artigo adicionado.
                    </div>
                  )}
                </div>

                <Button variant="outline" className="w-full" onClick={addArticle}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar Artigo
                </Button>
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
                {formData.articles.length === 0 ? (
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
                    {formData.articles.map((article, idx) => (
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

          {/* Step: Pedir Peça */}
          {currentStep === "pedir_peca" && (
            <>
              <ModalHeader title="Pedir Peça?" step="Passo 5" />
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">É necessário pedir alguma peça?</p>
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
                  <div className="space-y-3 pt-2">
                    <Label htmlFor="partToOrder" className="text-sm">Nome da peça *</Label>
                    <Textarea id="partToOrder" value={formData.partToOrder} onChange={(e) => setFormData((prev) => ({ ...prev, partToOrder: e.target.value }))} rows={2} />
                  </div>
                )}
              </div>
              <DialogFooter className="flex gap-2 mt-4">
                <Button variant="outline" className="flex-1" onClick={() => safeSetStep("resumo_reparacao")}><ArrowLeft className="h-4 w-4 mr-1" /> Anterior</Button>
                {formData.needsPartOrder ? (
                  <Button className="flex-1 bg-yellow-500 text-black" onClick={handleRequestPart} disabled={isSubmitting || !formData.partToOrder.trim()}>Solicitar Peça</Button>
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
        onCapture={async (imageData) => {
          try {
            let photoType = "oficina";
            if (currentStep === "foto_aparelho") photoType = "aparelho";
            else if (currentStep === "foto_etiqueta") photoType = "etiqueta";
            else if (currentStep === "foto_estado") photoType = "estado";

            await ensureValidSession();

            const { uploadServicePhoto } = await import('@/utils/photoUpload');
            const publicUrl = await uploadServicePhoto(service.id, imageData, photoType, `Foto de ${photoType} na oficina`);

            if (currentStep === "foto_aparelho") setFormData((prev) => ({ ...prev, photoAparelho: publicUrl }));
            else if (currentStep === "foto_etiqueta") setFormData((prev) => ({ ...prev, photoEtiqueta: publicUrl }));
            else if (currentStep === "foto_estado") setFormData((prev) => ({ ...prev, photosEstado: [...prev.photosEstado, publicUrl] }));

            queryClient.invalidateQueries({ queryKey: ["service-photos", service.id] });
            setShowCamera(false);
            toast.success("Foto guardada!");
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
