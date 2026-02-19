import { useState, useEffect } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { useUpdateService } from "@/hooks/useServices";
import { useAuth } from "@/contexts/AuthContext";
import { logWorkshopPickup, logPartRequest, logServiceCompletion } from "@/utils/activityLogUtils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { humanizeError } from "@/utils/errorMessages";
import { useQueryClient } from "@tanstack/react-query";
import { CameraCapture } from "@/components/shared/CameraCapture";
import { SignatureCanvas } from "@/components/shared/SignatureCanvas";
import { useFlowPersistence } from "@/hooks/useFlowPersistence";
import type { Service, PhotoType } from "@/types/database";

// Steps for repair services (reparacao)
type RepairModalStep =
  | "resumo"
  | "deslocacao"
  | "foto_aparelho"
  | "foto_etiqueta"
  | "foto_estado"
  | "diagnostico"
  | "decisao"
  | "pecas_usadas"
  | "pedir_peca";

// Steps for other services (original flow)
type OtherModalStep = "resumo" | "deslocacao" | "foto" | "diagnostico" | "decisao" | "pecas_usadas" | "pedir_peca";

type ModalStep = RepairModalStep | OtherModalStep;
type DecisionType = "reparar_local" | "levantar_oficina";
type SignatureType = "conclusao" | "recolha" | "pedido_peca";

interface PartEntry {
  name: string;
  reference: string;
  quantity: number;
}

interface VisitFlowModalsProps {
  service: Service;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
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
  usedParts: boolean;
  usedPartsList: PartEntry[];
  needsPartOrder: boolean;
  partToOrder: {
    name: string;
    reference: string;
  };
  [key: string]: unknown;
}

export function VisitFlowModals({ service, isOpen, onClose, onComplete }: VisitFlowModalsProps) {
  const updateService = useUpdateService();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const [currentStep, setCurrentStep] = useState<ModalStep>("resumo");
  const [formData, setFormData] = useState<VisitFormData>({
    detectedFault: "",
    photoFile: null,
    photoAparelho: null,
    photoEtiqueta: null,
    photosEstado: [],
    decision: "reparar_local",
    usedParts: false,
    usedPartsList: [{ name: "", reference: "", quantity: 1 }],
    needsPartOrder: false,
    partToOrder: { name: "", reference: "" },
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [currentPhotoType, setCurrentPhotoType] = useState<PhotoType>("visita");
  const [showSignature, setShowSignature] = useState(false);
  const [signatureType, setSignatureType] = useState<SignatureType>("conclusao");

  // Check if this is a repair service
  const isReparacao = service.service_type === "reparacao";

  // Flow persistence
  const { loadState, saveState, clearState } = useFlowPersistence<VisitFormData>(service.id, "visita");

  // Load saved state or reset when opened
  useEffect(() => {
    if (isOpen) {
      const savedState = loadState();
      if (savedState) {
        setCurrentStep(savedState.currentStep as ModalStep);
        setFormData(savedState.formData);
      } else {
        setCurrentStep("resumo");
        setFormData({
          detectedFault: service.detected_fault || "",
          photoFile: null,
          photoAparelho: null,
          photoEtiqueta: null,
          photosEstado: [],
          decision: "reparar_local",
          usedParts: false,
          usedPartsList: [{ name: "", reference: "", quantity: 1 }],
          needsPartOrder: false,
          partToOrder: { name: "", reference: "" },
        });
      }
    }
  }, [isOpen, service, loadState]);

  // Auto-save state on step/data changes
  useEffect(() => {
    if (isOpen && currentStep !== "resumo") {
      saveState(currentStep, formData);
    }
  }, [isOpen, currentStep, formData, saveState]);

  const handleNavigateToClient = () => {
    const address = service.service_address || service.customer?.address;
    if (address) {
      const encodedAddress = encodeURIComponent(address);
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, "_blank");
    } else {
      toast.error("Morada não disponível");
    }
  };

  const handlePhotoCapture = async (imageData: string) => {
    try {
      await supabase.from("service_photos").insert({
        service_id: service.id,
        photo_type: currentPhotoType,
        file_url: imageData,
        description: getPhotoDescription(currentPhotoType),
      });
      queryClient.invalidateQueries({ queryKey: ["service-photos", service.id] });

      // Update form data based on photo type
      if (currentPhotoType === "aparelho") {
        setFormData((prev) => ({ ...prev, photoAparelho: imageData }));
      } else if (currentPhotoType === "etiqueta") {
        setFormData((prev) => ({ ...prev, photoEtiqueta: imageData }));
      } else if (currentPhotoType === "estado") {
        setFormData((prev) => ({ ...prev, photosEstado: [...prev.photosEstado, imageData] }));
      } else {
        setFormData((prev) => ({ ...prev, photoFile: imageData }));
      }

      setShowCamera(false);
      toast.success("Foto guardada!");
    } catch (error) {
      console.error("Error saving photo:", error);
      toast.error("Erro ao guardar foto");
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

  // Save used parts to database
  const saveUsedParts = async () => {
    if (!formData.usedParts) return;

    for (const part of formData.usedPartsList) {
      if (part.name.trim()) {
        await supabase.from("service_parts").insert({
          service_id: service.id,
          part_name: part.name.trim(),
          part_code: part.reference.trim() || null,
          quantity: part.quantity,
          is_requested: false,
          arrived: true,
          cost: 0,
        });
      }
    }
  };

  const handleSignatureComplete = async (signatureData: string, signerName: string) => {
    setIsSubmitting(true);
    try {
      // Save used parts if any
      await saveUsedParts();

      if (signatureType === "pedido_peca") {
        // Save signature for part request
        await supabase.from("service_signatures").insert({
          service_id: service.id,
          signature_type: "pedido_peca",
          file_url: signatureData,
          signer_name: signerName || service.customer?.name,
        });

        // Save part to order
        await supabase.from("service_parts").insert({
          service_id: service.id,
          part_name: formData.partToOrder.name.trim(),
          part_code: formData.partToOrder.reference.trim() || null,
          quantity: 1,
          is_requested: true,
          arrived: false,
          cost: 0,
        });

        // Update service status
        await updateService.mutateAsync({
          id: service.id,
          status: "para_pedir_peca",
          last_status_before_part_request: service.status,
          detected_fault: formData.detectedFault,
        });

        // Log activity - pedido de peça
        await logPartRequest(
          service.code || "N/A",
          service.id,
          formData.partToOrder.name.trim(),
          profile?.full_name || "Técnico",
          user?.id,
        );

        queryClient.invalidateQueries({ queryKey: ["service-signatures", service.id] });
        queryClient.invalidateQueries({ queryKey: ["service-parts", service.id] });
        toast.success("Pedido de peça registado com assinatura!");
      } else if (signatureType === "recolha") {
        // Save signature for pickup
        await supabase.from("service_signatures").insert({
          service_id: service.id,
          signature_type: "recolha",
          file_url: signatureData,
          signer_name: signerName || service.customer?.name,
        });

        // Update to workshop - remove technician so it's available for anyone to assume
        await updateService.mutateAsync({
          id: service.id,
          status: "por_fazer", // Trigger normalizes for workshop without technician
          service_location: "oficina",
          technician_id: null, // Remove technician - service becomes available
          scheduled_date: null, // Clear scheduling
          scheduled_shift: null,
          detected_fault: formData.detectedFault,
          shouldSelect: false, // Prevent RLS error as technician loses access
        });

        // Log activity - levantamento para oficina
        await logWorkshopPickup(service.code || "N/A", service.id, profile?.full_name || "Técnico", user?.id);

        queryClient.invalidateQueries({ queryKey: ["service-signatures", service.id] });
        toast.success("Aparelho recolhido para oficina!");
      } else {
        // Save signature for conclusion
        await supabase.from("service_signatures").insert({
          service_id: service.id,
          signature_type: "visita",
          file_url: signatureData,
          signer_name: signerName || service.customer?.name,
        });

        // Update service - repaired on site goes to concluidos (financially coexists with pending_pricing + em_debito)
        await updateService.mutateAsync({
          id: service.id,
          status: "concluidos",
          pending_pricing: true,
          detected_fault: formData.detectedFault,
          work_performed: "Reparado no local do cliente",
        });

        // Log activity - conclusão
        await logServiceCompletion(service.code || "N/A", service.id, profile?.full_name || "Técnico", user?.id);

        queryClient.invalidateQueries({ queryKey: ["service-signatures", service.id] });
        toast.success("Visita concluída com sucesso!");
      }

      // Clear persisted state on completion
      clearState();
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
      setShowSignature(true);
    } else {
      // Go to pecas_usadas step
      setCurrentStep("pecas_usadas");
    }
  };

  const handlePecasUsadasConfirm = () => {
    // Validate if usedParts is true, at least one part with name must exist
    if (formData.usedParts) {
      const hasValidPart = formData.usedPartsList.some((p) => p.name.trim().length > 0);
      if (!hasValidPart) {
        toast.error("Adicione pelo menos uma peça com nome.");
        return;
      }
    }
    setCurrentStep("pedir_peca");
  };

  const handlePedirPecaConfirm = () => {
    if (formData.needsPartOrder) {
      // Validate part to order
      if (!formData.partToOrder.name.trim()) {
        toast.error("Informe o nome da peça a pedir.");
        return;
      }
      setSignatureType("pedido_peca");
      setShowSignature(true);
    } else {
      // Go to conclusion signature
      setSignatureType("conclusao");
      setShowSignature(true);
    }
  };

  const handleClose = () => {
    setCurrentStep("resumo");
    setFormData({
      detectedFault: "",
      photoFile: null,
      photoAparelho: null,
      photoEtiqueta: null,
      photosEstado: [],
      decision: "reparar_local",
      usedParts: false,
      usedPartsList: [{ name: "", reference: "", quantity: 1 }],
      needsPartOrder: false,
      partToOrder: { name: "", reference: "" },
    });
    onClose();
  };

  // Part list management
  const addPart = () => {
    setFormData((prev) => ({
      ...prev,
      usedPartsList: [...prev.usedPartsList, { name: "", reference: "", quantity: 1 }],
    }));
  };

  const removePart = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      usedPartsList: prev.usedPartsList.filter((_, i) => i !== index),
    }));
  };

  const updatePart = (index: number, field: keyof PartEntry, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      usedPartsList: prev.usedPartsList.map((part, i) => (i === index ? { ...part, [field]: value } : part)),
    }));
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
  const canProceedFromFotoEstado = formData.photosEstado.length > 0; // Estado is now required
  const canProceedFromFoto = formData.photoFile !== null; // Legacy for non-reparacao
  const canProceedFromDiagnostico = formData.detectedFault.trim().length > 0;

  // Get step list based on service type
  const getSteps = (): string[] => {
    if (isReparacao) {
      return [
        "resumo",
        "deslocacao",
        "foto_aparelho",
        "foto_etiqueta",
        "foto_estado",
        "diagnostico",
        "decisao",
        "pecas_usadas",
        "pedir_peca",
      ];
    }
    return ["resumo", "deslocacao", "foto", "diagnostico", "decisao", "pecas_usadas", "pedir_peca"];
  };

  // Progress calculation
  const steps = getSteps();
  const stepIndex = steps.indexOf(currentStep);
  const showProgress = currentStep !== "resumo";
  const totalSteps = formData.decision === "reparar_local" ? steps.length : isReparacao ? 7 : 5;

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
        <DialogTitle className="text-base font-bold text-white">Visita</DialogTitle>
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
    if (currentStep === "foto_etiqueta") setCurrentStep("foto_aparelho");
    else if (currentStep === "foto_estado") setCurrentStep("foto_etiqueta");
    else if (currentStep === "diagnostico" && isReparacao) setCurrentStep("foto_estado");
    else if (currentStep === "diagnostico") setCurrentStep("foto");
    else setCurrentStep("deslocacao");
  };

  const goToNextPhotoStep = () => {
    if (currentStep === "foto_aparelho") setCurrentStep("foto_etiqueta");
    else if (currentStep === "foto_etiqueta") setCurrentStep("foto_estado");
    else if (currentStep === "foto_estado") setCurrentStep("diagnostico");
    else if (currentStep === "foto") setCurrentStep("diagnostico");
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Modal 1: Resumo */}
      <Dialog open={currentStep === "resumo" && !showCamera && !showSignature} onOpenChange={() => handleClose()}>
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto p-6">
          <ModalHeader title="Resumo do Serviço" step="Passo 1" />

          <div className="space-y-3 bg-muted/50 rounded-lg p-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-muted-foreground text-xs">Cliente</p>
                <p className="font-medium">{service.customer?.name || "N/A"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Telefone</p>
                <p className="font-medium">{service.customer?.phone || "N/A"}</p>
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
          </div>

          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={handleClose}>
              Cancelar
            </Button>
            <Button className="flex-1 bg-blue-500 hover:bg-blue-600" onClick={() => setCurrentStep("deslocacao")}>
              Começar Visita
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Deslocação */}
      <Dialog open={currentStep === "deslocacao" && !showCamera && !showSignature} onOpenChange={() => handleClose()}>
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto p-6">
          <ModalHeader title="Deslocação" step="Passo 2" />

          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4 text-sm">
              <p className="text-muted-foreground text-xs flex items-center gap-1 mb-1">
                <MapPin className="h-3 w-3" /> Morada do Cliente
              </p>
              <p className="font-medium">{service.service_address || service.customer?.address || "N/A"}</p>
              <p className="text-muted-foreground mt-2">{service.customer?.phone || ""}</p>
            </div>

            <Button variant="outline" className="w-full h-14 text-base" onClick={handleNavigateToClient}>
              <Navigation className="h-5 w-5 mr-2" />
              Caminho para o Cliente
            </Button>
          </div>

          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setCurrentStep("resumo")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <Button
              className="flex-1 bg-blue-500 hover:bg-blue-600"
              onClick={() => setCurrentStep(isReparacao ? "foto_aparelho" : "foto")}
            >
              Cheguei ao Local <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 3a: Foto do Aparelho (only for reparacao) */}
      {isReparacao && (
        <Dialog
          open={currentStep === "foto_aparelho" && !showCamera && !showSignature}
          onOpenChange={() => handleClose()}
        >
          <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto p-6">
            <ModalHeader title="Foto do Aparelho" step="Passo 3" />

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <Camera className="h-4 w-4 text-blue-500" />
                <span>Tire uma foto geral do aparelho</span>
                <span className="text-destructive">*</span>
              </div>

              {formData.photoAparelho ? (
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
                    onClick={() => openCamera("aparelho")}
                  >
                    Nova Foto
                  </Button>
                </div>
              ) : (
                <Button variant="outline" className="w-full h-32 flex-col gap-2" onClick={() => openCamera("aparelho")}>
                  <Camera className="h-8 w-8 text-muted-foreground" />
                  <span>Tirar Foto do Aparelho</span>
                </Button>
              )}
            </div>

            <DialogFooter className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => setCurrentStep("deslocacao")}>
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
          open={currentStep === "foto_etiqueta" && !showCamera && !showSignature}
          onOpenChange={() => handleClose()}
        >
          <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto p-6">
            <ModalHeader title="Foto da Etiqueta" step="Passo 4" />

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <Tag className="h-4 w-4 text-blue-500" />
                <span>Tire uma foto da etiqueta do aparelho</span>
                <span className="text-destructive">*</span>
              </div>
              <p className="text-xs text-muted-foreground">Capture a etiqueta com número de série, modelo, etc.</p>

              {formData.photoEtiqueta ? (
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
                    onClick={() => openCamera("etiqueta")}
                  >
                    Nova Foto
                  </Button>
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
          open={currentStep === "foto_estado" && !showCamera && !showSignature}
          onOpenChange={() => handleClose()}
        >
          <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto p-6">
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
                  {formData.photosEstado.map((photo, idx) => (
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
        <Dialog open={currentStep === "foto" && !showCamera && !showSignature} onOpenChange={() => handleClose()}>
          <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto p-6">
            <ModalHeader title="Tirar Foto" step="Passo 3" />

            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Tire uma foto do aparelho antes de iniciar o diagnóstico.</p>

              {formData.photoFile ? (
                <div className="relative">
                  <img
                    src={formData.photoFile}
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
              ) : (
                <Button variant="outline" className="w-full h-32 flex-col gap-2" onClick={() => openCamera("visita")}>
                  <Camera className="h-8 w-8 text-muted-foreground" />
                  <span>Tirar Foto</span>
                </Button>
              )}
            </div>

            <DialogFooter className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => setCurrentStep("deslocacao")}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
              <Button
                className="flex-1 bg-blue-500 hover:bg-blue-600"
                onClick={() => setCurrentStep("diagnostico")}
                disabled={!canProceedFromFoto}
              >
                Continuar <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal 4/6: Diagnóstico */}
      <Dialog open={currentStep === "diagnostico" && !showCamera && !showSignature} onOpenChange={() => handleClose()}>
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto p-6">
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
              onClick={() => setCurrentStep("decisao")}
              disabled={!canProceedFromDiagnostico}
            >
              Continuar <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 5/7: Decisão */}
      <Dialog open={currentStep === "decisao" && !showCamera && !showSignature} onOpenChange={() => handleClose()}>
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto p-6">
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
            <Button variant="outline" className="flex-1" onClick={() => setCurrentStep("diagnostico")}>
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

      {/* Modal 6/8: Peças Usadas (only for reparar_local) */}
      <Dialog open={currentStep === "pecas_usadas" && !showCamera && !showSignature} onOpenChange={() => handleClose()}>
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto p-6">
          <ModalHeader title="Peças Usadas" step={isReparacao ? "Passo 8" : "Passo 6"} />

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Usou peças na reparação?</p>

            <RadioGroup
              value={formData.usedParts ? "sim" : "nao"}
              onValueChange={(val) => setFormData((prev) => ({ ...prev, usedParts: val === "sim" }))}
              className="flex gap-4"
            >
              <label
                htmlFor="usedParts_nao"
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors",
                  !formData.usedParts ? "border-blue-500 bg-blue-50" : "border-muted hover:border-muted-foreground/30",
                )}
              >
                <RadioGroupItem value="nao" id="usedParts_nao" />
                <span className="font-medium text-sm">Não</span>
              </label>

              <label
                htmlFor="usedParts_sim"
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors",
                  formData.usedParts ? "border-blue-500 bg-blue-50" : "border-muted hover:border-muted-foreground/30",
                )}
              >
                <RadioGroupItem value="sim" id="usedParts_sim" />
                <span className="font-medium text-sm">Sim</span>
              </label>
            </RadioGroup>

            {formData.usedParts && (
              <div className="space-y-3 pt-2">
                <Label className="text-sm">Peças utilizadas:</Label>
                {formData.usedPartsList.map((part, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <Input
                      className="col-span-5"
                      placeholder="Nome da peça"
                      value={part.name}
                      onChange={(e) => updatePart(idx, "name", e.target.value)}
                    />
                    <Input
                      className="col-span-4"
                      placeholder="Referência"
                      value={part.reference}
                      onChange={(e) => updatePart(idx, "reference", e.target.value)}
                    />
                    <Input
                      className="col-span-2"
                      type="number"
                      min="1"
                      value={part.quantity}
                      onChange={(e) => updatePart(idx, "quantity", parseInt(e.target.value) || 1)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="col-span-1 h-8 w-8"
                      onClick={() => removePart(idx)}
                      disabled={formData.usedPartsList.length === 1}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full" onClick={addPart}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar Peça
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setCurrentStep("decisao")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <Button className="flex-1 bg-blue-500 hover:bg-blue-600" onClick={handlePecasUsadasConfirm}>
              Continuar <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 7/9: Pedir Peça? (only for reparar_local) */}
      <Dialog open={currentStep === "pedir_peca" && !showCamera && !showSignature} onOpenChange={() => handleClose()}>
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto p-6">
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
                        partToOrder: { ...prev.partToOrder, name: e.target.value },
                      }))
                    }
                  />
                  <Input
                    placeholder="Referência (opcional)"
                    value={formData.partToOrder.reference}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        partToOrder: { ...prev.partToOrder, reference: e.target.value },
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
            <Button variant="outline" className="flex-1" onClick={() => setCurrentStep("pecas_usadas")}>
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
              {formData.needsPartOrder ? "Pedir Peça" : "Concluir Reparação"}
              <CheckCircle2 className="h-4 w-4 ml-1" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Camera Modal */}
      <CameraCapture
        open={showCamera}
        onOpenChange={setShowCamera}
        onCapture={handlePhotoCapture}
        title={getPhotoDescription(currentPhotoType)}
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
