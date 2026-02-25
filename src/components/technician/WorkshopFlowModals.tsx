import { useState, useEffect, useRef } from "react";
import { Camera, Package, CheckCircle2, ArrowLeft, ArrowRight, FileText, Wrench, Plus, X } from "lucide-react";
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
import { UsedPartsModal, PartEntry } from "@/components/modals/UsedPartsModal";

import { ServicePreviousSummary } from "@/components/technician/ServicePreviousSummary";
import { DiagnosisPhotosGallery } from "@/components/technician/DiagnosisPhotosGallery";
import { useFlowPersistence, deriveStepFromDb } from "@/hooks/useFlowPersistence";
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
  | "pecas_usadas"
  | "confirmacao_peca"
  | "pedir_peca"
  | "conclusao";

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
  usedParts: boolean;
  usedPartsList: PartEntry[];
  needsPartOrder: boolean;
  partToOrder: string;
  partNotes: string;
  photoAparelho: string | null;
  photoEtiqueta: string | null;
  photosEstado: string[];
  // Product info
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
    usedParts: false,
    usedPartsList: [],
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
  const [showPartsModal, setShowPartsModal] = useState(false);

  // Transition guard: prevents Dialog onOpenChange from firing handleClose during step changes
  const isTransitioning = useRef(false);

  const safeSetStep = (step: ModalStep) => {
    isTransitioning.current = true;
    setCurrentStep(step);
    setTimeout(() => { isTransitioning.current = false; }, 0);
  };

  const handleStepDialogOpenChange = (open: boolean) => {
    if (open) return;
    if (isTransitioning.current) return;
    handleClose();
  };


  // Flow persistence with mode support
  const persistenceKey = mode === "continuacao_peca" ? "oficina_continuacao" : "oficina";
  const { loadState, saveState, saveStateToDb, flushStateToDb, clearState } = useFlowPersistence<WorkshopFormData>(service.id, persistenceKey);

  // Check if service has previous execution history (visit, forced state, etc.)
  const hasPreviousHistory = !!(
    service.detected_fault ||
    service.work_performed ||
    (service.service_location === 'oficina' && service.status !== 'por_fazer')
  );

  // Stable initialization ref — prevents re-running on service object reference changes
  const hasInitialized = useRef(false);

  // Load saved state or pre-fill from service
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
      setCurrentStep(savedState.currentStep as ModalStep);
      setFormData(savedState.formData);
      return;
    }

    setIsResuming(true);
    // No localStorage → derive step from DB (handles phone restart)
    const persistenceFlowType = mode === "continuacao_peca" ? "oficina_continuacao" : "oficina";
    deriveStepFromDb(service.id, persistenceFlowType, service as unknown as Record<string, unknown>).then(({ step, formDataOverrides }) => {
      // If the service has no in-progress data yet, start from resumo
      const resumeStep = step === 'resumo' ? (mode === "continuacao_peca" ? "resumo_continuacao" : "resumo") : step;
      setDerivedResumeStep(resumeStep as ModalStep);

      // We still want to show Resumo first, but we remember where to jump
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

  // Save state on changes
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

      // Usa RPC SECURITY DEFINER: atribui o técnico se necessário e
      // muda para em_execucao sem erro de RLS (funciona mesmo quando
      // technician_id era null antes do início).
      const { error: rpcError } = await (supabase.rpc as any)('start_workshop_service', {
        _service_id: service.id,
      });
      if (rpcError) throw rpcError;

      // Log activity (background)
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

  const handlePartsConfirm = async (parts: PartEntry[]) => {
    try {
      await ensureValidSession();
      // Save parts to database
      for (const part of parts) {
        await supabase.from("service_parts").insert({
          service_id: service.id,
          part_name: part.name,
          part_code: part.reference || null,
          quantity: part.quantity,
          is_requested: false,
          arrived: true,
          cost: 0,
        });
      }

      setFormData((prev) => ({ ...prev, usedPartsList: parts }));
      setShowPartsModal(false);
      queryClient.invalidateQueries({ queryKey: ["service-parts", service.id] });
      toast.success("Peças registadas!");
    } catch (error) {
      console.error("Error confirming parts:", error);
      toast.error(humanizeError(error));
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

      // Save the part request
      await supabase.from("service_parts").insert({
        service_id: service.id,
        part_name: formData.partToOrder.trim(),
        notes: formData.partNotes || null,
        quantity: 1,
        is_requested: true,
        arrived: false,
        cost: 0,
      });

      // Update service status via RPC (bypassa RLS)
      const { error: rpcError } = await technicianUpdateService({
        serviceId: service.id,
        status: 'para_pedir_peca',
        lastStatusBeforePartRequest: service.status,
        detectedFault: formData.detectedFault || null,
        workPerformed: formData.workPerformed || null,
      });
      if (rpcError) throw rpcError;

      // Log activity
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
    // In continuation mode, workPerformed might not be editable or needed, but let's allow it or set default
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

      // Update service to concluidos + pending_pricing via RPC (bypassa RLS)
      const { error: rpcError } = await technicianUpdateService({
        serviceId: service.id,
        status: 'concluidos',
        pendingPricing: true,
        detectedFault: formData.detectedFault || null,
        workPerformed: finalWorkPerformed,
      });
      if (rpcError) throw rpcError;

      // Clear continuation flag separately (RPC COALESCE won't set null)
      if (mode === "continuacao_peca") {
        await supabase.from("services").update({ last_status_before_part_request: null }).eq("id", service.id);
      }

      // Log activity
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
    // Flush current state to DB immediately before closing
    if (currentStep !== "resumo" && currentStep !== "resumo_continuacao") {
      flushStateToDb(currentStep, formData);
    }
    setCurrentStep(mode === "continuacao_peca" ? "resumo_continuacao" : "resumo");
    setFormData({
      detectedFault: "",
      workPerformed: "",
      usedParts: false,
      usedPartsList: [],
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

  // Check if product info step is needed
  // We check both the service prop (DB state) and formData (local state) to avoid repetition
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
      // Non-critical - don't block flow
    }
    safeSetStep("diagnostico");
  };

  // Progress calculation
  let steps: ModalStep[] = [];
  if (mode === "continuacao_peca") {
    steps = ["resumo_continuacao", "confirmacao_peca", "conclusao"];
  } else {
    steps = hasPreviousHistory
      ? ["resumo", needsProductStep ? "produto" : null, "diagnostico", "pecas_usadas", "pedir_peca", "conclusao"].filter(Boolean) as ModalStep[]
      : [
        "resumo",
        "foto_aparelho",
        "foto_etiqueta",
        "foto_estado",
        needsProductStep ? "produto" : null,
        "diagnostico",
        "pecas_usadas",
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
      {/* Modal 1: Resumo (Normal or Continuation) */}
      <Dialog open={(currentStep === "resumo" || currentStep === "resumo_continuacao") && !showCamera && !showPartsModal} onOpenChange={handleStepDialogOpenChange}>
        <DialogContent className="max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto p-6" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
          <ModalHeader
            title={mode === "continuacao_peca" ? "Resumo Cont. Peça" : "Resumo do Serviço"}
            step="Passo 1"
          />

          {/* Resumo do atendimento anterior (sem botão interno, o botão está no footer) */}
          {hasPreviousHistory && mode !== "continuacao_peca" && (
            <ServicePreviousSummary service={service} className="mb-4" />
          )}

          {/* Show diagnosis photos from visit — só quando não há resumo anterior
              (o ServicePreviousSummary já inclui as fotos internamente) */}
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
        </DialogContent>
      </Dialog>

      {/* Modal 1b: Confirmação Peça */}
      <Dialog open={currentStep === "confirmacao_peca" && !showCamera && !showPartsModal} onOpenChange={handleStepDialogOpenChange}>
        <DialogContent className="max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto p-6" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
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
        </DialogContent>
      </Dialog>


      {/* Modal 2a: Foto do Aparelho (if no history) */}
      <Dialog
        open={currentStep === "foto_aparelho" && !showCamera && !showPartsModal}
        onOpenChange={handleStepDialogOpenChange}
      >
        <DialogContent className="max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto p-6" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
          <ModalHeader title="Foto do Aparelho" step="Fotos Obrigatórias" />
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <Camera className="h-4 w-4 text-orange-500" />
              <span>Tire uma foto geral do aparelho</span>
              <span className="text-destructive">*</span>
            </div>
            {formData.photoAparelho && formData.photoAparelho !== '__photo_exists__' ? (
              <div className="relative">
                <img
                  src={formData.photoAparelho}
                  alt="Foto do aparelho"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute bottom-2 right-2"
                  onClick={() => setShowCamera(true)}
                >
                  Nova Foto
                </Button>
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
            <Button
              className="flex-1 bg-orange-500 hover:bg-orange-600"
              onClick={() => safeSetStep("foto_etiqueta")}
              disabled={!formData.photoAparelho}
            >
              Continuar <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 2b: Foto da Etiqueta (if no history) */}
      <Dialog
        open={currentStep === "foto_etiqueta" && !showCamera && !showPartsModal}
        onOpenChange={handleStepDialogOpenChange}
      >
        <DialogContent className="max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto p-6" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
          <ModalHeader title="Foto da Etiqueta" step="Fotos Obrigatórias" />
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <Camera className="h-4 w-4 text-orange-500" />
              <span>Tire uma foto da etiqueta serial</span>
              <span className="text-destructive">*</span>
            </div>
            {formData.photoEtiqueta && formData.photoEtiqueta !== '__photo_exists__' ? (
              <div className="relative">
                <img
                  src={formData.photoEtiqueta}
                  alt="Foto da etiqueta"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute bottom-2 right-2"
                  onClick={() => setShowCamera(true)}
                >
                  Nova Foto
                </Button>
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
            <Button
              className="flex-1 bg-orange-500 hover:bg-orange-600"
              onClick={() => safeSetStep("foto_estado")}
              disabled={!formData.photoEtiqueta}
            >
              Continuar <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 2c: Foto do Estado (if no history) */}
      <Dialog open={currentStep === "foto_estado" && !showCamera && !showPartsModal} onOpenChange={handleStepDialogOpenChange}>
        <DialogContent className="max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto p-6" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
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
                <Button
                  variant="outline"
                  className="aspect-square flex-col gap-2 p-0"
                  onClick={() => setShowCamera(true)}
                >
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
            <Button
              className="flex-1 bg-orange-500 hover:bg-orange-600"
              onClick={() => setCurrentStep(needsProductStep ? "produto" : "diagnostico")}
              disabled={formData.photosEstado.length === 0}
            >
              Continuar <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Informação do Produto (aparece só quando falta marca/modelo) */}
      <Dialog open={currentStep === "produto" && !showCamera && !showPartsModal} onOpenChange={handleStepDialogOpenChange}>
        <DialogContent className="max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto p-6" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
          <ModalHeader title="Informação do Produto" step="Passo 2" />

          <div className="space-y-4">
            <div>
              <Label htmlFor="ws_prod_type" className="text-sm">Tipo de Aparelho</Label>
              <Input
                id="ws_prod_type"
                placeholder="Ex: Máquina de Lavar, Frigorífico..."
                value={formData.productType as string}
                onChange={(e) => setFormData((prev) => ({ ...prev, productType: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ws_prod_brand" className="text-sm">Marca</Label>
                <Input
                  id="ws_prod_brand"
                  placeholder="Ex: Bosch, LG..."
                  value={formData.productBrand as string}
                  onChange={(e) => setFormData((prev) => ({ ...prev, productBrand: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="ws_prod_model" className="text-sm">Modelo</Label>
                <Input
                  id="ws_prod_model"
                  placeholder="Ex: WAT24469ES"
                  value={formData.productModel as string}
                  onChange={(e) => setFormData((prev) => ({ ...prev, productModel: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ws_prod_serial" className="text-sm">Nº de Série</Label>
                <Input
                  id="ws_prod_serial"
                  placeholder="Número de série"
                  value={formData.productSerial as string}
                  onChange={(e) => setFormData((prev) => ({ ...prev, productSerial: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="ws_prod_pnc" className="text-sm">PNC</Label>
                <Input
                  id="ws_prod_pnc"
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
            <Button variant="outline" onClick={() => safeSetStep("foto_estado")} className="flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
            <Button onClick={handleProductoConfirm} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white">
              Continuar <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Diagnóstico Complementar */}
      <Dialog open={currentStep === "diagnostico" && !showCamera && !showPartsModal} onOpenChange={handleStepDialogOpenChange}>
        <DialogContent className="max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto p-6" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
          <ModalHeader title="Diagnóstico" step="Passo 2" />

          <div className="space-y-4">
            <div>
              <Label htmlFor="detected_fault" className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Diagnóstico complementar <span className="text-muted-foreground text-xs">(opcional)</span>
              </Label>
              <Textarea
                id="detected_fault"
                placeholder="Adicione detalhes ao diagnóstico..."
                value={formData.detectedFault}
                onChange={(e) => setFormData((prev) => ({ ...prev, detectedFault: e.target.value }))}
                rows={3}
                className="mt-1.5 text-sm"
              />
            </div>

            {/* Optional photo */}
            <Button variant="outline" size="sm" onClick={() => setShowCamera(true)}>
              <Camera className="h-4 w-4 mr-1" />
              Tirar Foto (Opcional)
            </Button>
          </div>

          <DialogFooter className="flex gap-2 mt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                if (!hasPreviousHistory) {
                  safeSetStep("foto_estado");
                } else {
                  // If it came from a visit, we can go back to resumo
                  setCurrentStep("resumo");
                }
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <Button className="flex-1 bg-orange-500 hover:bg-orange-600" onClick={() => safeSetStep("pecas_usadas")}>
              Continuar <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Peças Usadas */}
      <Dialog
        open={currentStep === "pecas_usadas" && !showCamera && !showPartsModal
        }
        onOpenChange={handleStepDialogOpenChange}
      >
        <DialogContent className="max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto p-6" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
          <ModalHeader title="Peças Usadas" step="Passo 3" />

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Foi necessário usar peças nesta reparação?</p>

            <RadioGroup
              value={formData.usedParts ? "sim" : "nao"}
              onValueChange={(val) => setFormData((prev) => ({ ...prev, usedParts: val === "sim" }))}
              className="flex gap-4"
            >
              <label
                htmlFor="usedParts_nao"
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors",
                  !formData.usedParts
                    ? "border-orange-500 bg-orange-50"
                    : "border-muted hover:border-muted-foreground/30",
                )}
              >
                <RadioGroupItem value="nao" id="usedParts_nao" />
                <span className="font-medium text-sm">Não</span>
              </label>

              <label
                htmlFor="usedParts_sim"
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors",
                  formData.usedParts
                    ? "border-orange-500 bg-orange-50"
                    : "border-muted hover:border-muted-foreground/30",
                )}
              >
                <RadioGroupItem value="sim" id="usedParts_sim" />
                <span className="font-medium text-sm">Sim</span>
              </label>
            </RadioGroup>

            {formData.usedParts && (
              <div className="space-y-2">
                {formData.usedPartsList.length > 0 ? (
                  <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                    {formData.usedPartsList.map((p, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>{p.name}</span>
                        <span className="text-muted-foreground">x{p.quantity}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
                <Button variant="outline" className="w-full" onClick={() => setShowPartsModal(true)}>
                  <Package className="h-4 w-4 mr-1" />
                  {formData.usedPartsList.length > 0 ? "Editar Peças" : "Registar Peças"}
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => safeSetStep("diagnostico")}><ArrowLeft className="h-4 w-4 mr-1" /> Anterior</Button>
            <Button
              className="flex-1 bg-orange-500 hover:bg-orange-600"
              onClick={() => {
                if (formData.usedParts && formData.usedPartsList.length === 0) {
                  toast.error("Por favor, registe pelo menos uma peça utilizada.");
                  return;
                }
                safeSetStep("pedir_peca");
              }}
            >
              Continuar <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog >

      {/* Modal 4: Pedir Peça */}
      < Dialog open={currentStep === "pedir_peca" && !showCamera && !showPartsModal} onOpenChange={handleStepDialogOpenChange}>
        <DialogContent className="max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto p-6" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
          <ModalHeader title="Pedir Peça?" step="Passo 4" />

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">É necessário pedir alguma peça para continuar a reparação?</p>

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
                <div>
                  <Label htmlFor="partToOrder" className="text-sm">
                    Nome da peça *
                  </Label>
                  <Textarea
                    id="partToOrder"
                    placeholder="Nome/descrição da peça necessária..."
                    value={formData.partToOrder}
                    onChange={(e) => setFormData((prev) => ({ ...prev, partToOrder: e.target.value }))}
                    rows={2}
                    className="mt-1.5 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="partNotes" className="text-sm">
                    Observações (opcional)
                  </Label>
                  <Textarea
                    id="partNotes"
                    placeholder="Informações adicionais..."
                    value={formData.partNotes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, partNotes: e.target.value }))}
                    rows={2}
                    className="mt-1.5 text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => safeSetStep("pecas_usadas")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            {formData.needsPartOrder ? (
              <Button
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black"
                onClick={handleRequestPart}
                disabled={isSubmitting || !formData.partToOrder.trim()}
              >
                <Package className="h-4 w-4 mr-1" />
                Solicitar Peça
              </Button>
            ) : (
              <Button className="flex-1 bg-green-500 hover:bg-green-600" onClick={() => safeSetStep("conclusao")}>
                Continuar <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog >

      {/* Modal 5: Conclusão */}
      < Dialog open={currentStep === "conclusao" && !showCamera && !showPartsModal} onOpenChange={handleStepDialogOpenChange}>
        <DialogContent className="max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto p-6" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
          <ModalHeader title="Conclusão" step="Passo 5" />

          <div className="space-y-4">
            <div>
              <Label htmlFor="work_performed" className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Resumo da reparação *
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
          </div>

          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => safeSetStep("pedir_peca")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <Button
              className="flex-1 bg-green-500 hover:bg-green-600"
              onClick={handleComplete}
              disabled={isSubmitting || !formData.workPerformed.trim()}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Concluir Reparação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog >

      {/* Camera Modal */}
      < CameraCapture
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

            if (currentStep === "foto_aparelho") {
              setFormData((prev) => ({ ...prev, photoAparelho: publicUrl }));
            } else if (currentStep === "foto_etiqueta") {
              setFormData((prev) => ({ ...prev, photoEtiqueta: publicUrl }));
            } else if (currentStep === "foto_estado") {
              setFormData((prev) => ({ ...prev, photosEstado: [...prev.photosEstado, publicUrl] }));
            }

            queryClient.invalidateQueries({ queryKey: ["service-photos", service.id] });
            setShowCamera(false);
            toast.success("Foto guardada!");
          } catch (error) {
            console.error("Error saving photo:", error);
            toast.error(humanizeError(error));
          }
        }}
        title="Foto do Aparelho"
      />

      {/* Parts Modal */}
      < UsedPartsModal
        open={showPartsModal}
        onOpenChange={setShowPartsModal}
        onConfirm={handlePartsConfirm}
        title="Registar Peças Utilizadas"
        subtitle="Adicione as peças utilizadas na reparação."
        initialParts={formData.usedPartsList.length > 0 ? formData.usedPartsList : undefined}
      />


    </>
  );
}
