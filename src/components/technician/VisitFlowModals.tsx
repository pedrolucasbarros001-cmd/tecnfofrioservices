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
import { invalidateServiceQueries } from "@/lib/queryInvalidation";
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
import { AdminPricingReadOnly } from "@/components/technician/AdminPricingReadOnly";
import { useFlowPersistence, deriveStepFromDb, isValidStepForFlow } from "@/hooks/useFlowPersistence";
import { parseAdminPricing, calculateAdminPricingTotals, type AdminPricingData } from "@/utils/adminPricingUtils";
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
  partsToOrder: {
    name: string;
    reference: string;
  }[];
  // Product info
  productBrand: string;
  productModel: string;
  productSerial: string;
  productPNC: string;
  productType: string;
  partInstalled: boolean;
  sendEmailReport: boolean;
  isInsuranceBudget: boolean;
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
  taxRate: 0,
  articlesLocked: false,
  needsPartOrder: false,
  partsToOrder: [],
  productBrand: "",
  productModel: "",
  productSerial: "",
  productPNC: "",
  productType: "",
  partInstalled: false,
  sendEmailReport: false,
  isInsuranceBudget: false,
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
  const [adminPricing, setAdminPricing] = useState<AdminPricingData | null>(null);
  const [previousArticles, setPreviousArticles] = useState<{ reference: string; description: string; quantity: number; unit_price: number; registeredByName: string; registeredLocation: string; created_at: string }[]>([]);

  // Transition guard: prevents Dialog onOpenChange from firing handleClose during step changes
  const isTransitioning = useRef(false);

  const persistenceFlowTypeRef = mode === "continuacao_peca" ? "visita_continuacao" : "visita";

  const safeSetStep = (step: ModalStep) => {
    // Validate step belongs to this flow — fallback to resumo if invalid
    if (!isValidStepForFlow(step, persistenceFlowTypeRef as any)) {
      console.warn(`[VisitFlow] Invalid step "${step}" for flow "${persistenceFlowTypeRef}", falling back to resumo`);
      step = (mode === "continuacao_peca" ? "resumo_continuacao" : "resumo") as ModalStep;
    }

    // Auto-save current state before moving
    saveState(currentStep, formData);
    saveStateToDb(currentStep, formData);

    isTransitioning.current = true;
    setCurrentStep(step);
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

  // Load existing visit articles with owner tracking
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
  const handleStartVisit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await ensureValidSession();
      // Mark service as em_execucao on server
      const { error } = await technicianUpdateService({
        serviceId: service.id,
        status: 'em_execucao',
      });
      if (error) throw error;

      invalidateServiceQueries(queryClient, service.id);

      if (derivedResumeStep && derivedResumeStep !== "resumo" && derivedResumeStep !== "resumo_continuacao") {
        safeSetStep(derivedResumeStep);
      } else {
        safeSetStep("deslocacao");
      }
    } catch (error) {
      console.error("Error starting visit:", error);
      toast.error(humanizeError(error));
    } finally {
      setIsSubmitting(false);
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

  const handlePhotoCapture = async (data: string | string[]) => {
    try {
      const images = Array.isArray(data) ? data : [data];
      await ensureValidSession();
      const { uploadServicePhoto } = await import('@/utils/photoUpload');

      for (const img of images) {
        const publicUrl = await uploadServicePhoto(service.id, img, currentPhotoType, getPhotoDescription(currentPhotoType));

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
      }

      invalidateServiceQueries(queryClient, service.id);
      setShowCamera(false);
      toast.success(images.length > 1 ? `${images.length} fotos guardadas!` : "Foto guardada!");
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
      articles: [...(prev.articles as ArticleEntry[]), { reference: "", description: "", quantity: 1, unit_price: 0, notes: "" }],
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
  const adminPricingTotals = adminPricing ? calculateAdminPricingTotals(adminPricing) : null;
  const adminPricingTotal = adminPricingTotals?.total || 0;

  const discountAmount = (() => {
    const val = parseFloat(formData.discountValue as string) || 0;
    if (formData.discountType === "percent") return articlesSubtotal * (val / 100);
    return val;
  })();

  const taxAmount = (articlesSubtotal - discountAmount) * ((formData.taxRate as number) / 100);
  const totalFinal = articlesSubtotal - discountAmount + taxAmount + adminPricingTotal;

  const separateArticlesByOwner = () => {
    const ownArticles: (ArticleEntry & { allIndex: number })[] = [];
    const othersArticles: (ArticleEntry & { allIndex: number; ownerName: string })[] = [];

    formData.articles.forEach((article, index) => {
      if (article.isExisting) {
        const prevArticle = previousArticles[index];
        if (prevArticle && prevArticle.registeredByName) {
          const isOwn = prevArticle.registeredByName === profile?.full_name;
          if (isOwn) {
            ownArticles.push({ ...article, allIndex: index });
          } else {
            othersArticles.push({ ...article, allIndex: index, ownerName: prevArticle.registeredByName });
          }
        }
      } else {
        ownArticles.push({ ...article, allIndex: index });
      }
    });

    return { ownArticles, othersArticles };
  };

  // Save articles to service_parts (idempotent delete+insert)
  const handleConfirmArticles = async () => {
    setIsSubmitting(true);
    try {
      await ensureValidSession();

      const newArticles = (formData.articles as ArticleEntry[]).filter(a => !a.isExisting && a.description.trim());

      for (const article of newArticles) {
        const { error: insertErr } = await supabase.from("service_parts").insert({
          service_id: service.id,
          part_name: article.description,
          part_code: article.reference || null,
          quantity: article.quantity,
          cost: article.unit_price,
          is_requested: false,
          arrived: true,
          iva_rate: formData.taxRate as number,
          registered_by: user?.id || null,
          registered_location: "visita",
          notes: article.notes?.trim() || null,
        });
        if (insertErr) throw insertErr;
      }

      // setFormData(prev => ({ ...prev, articlesLocked: true }));
      invalidateServiceQueries(queryClient, service.id);
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

      // STEP 1: Persist all current form data to the service explicitly (Atomic Save)
      // This ensures that even if status update fails, we didn't lose the diagnostic/products/articles
      await updateService.mutateAsync({
        id: service.id,
        detected_fault: formData.detectedFault || (service as any).detected_fault,
        brand: formData.productBrand || service.brand,
        model: formData.productModel || service.model,
        serial_number: formData.productSerial || service.serial_number,
        pnc: formData.productPNC || (service as any).pnc,
        appliance_type: formData.productType || service.appliance_type,
      } as any);

      // STEP 2: Execute Flow-specific Action
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

        // Insert parts to order if any
        for (const part of formData.partsToOrder) {
          if (!part.name.trim()) continue;
          const { error: partInsertErr } = await supabase.from("service_parts").insert({
            service_id: service.id,
            part_name: part.name.trim(),
            part_code: part.reference.trim() || null,
            quantity: 1,
            is_requested: true,
            arrived: false,
            cost: 0,
          });
          if (partInsertErr) throw partInsertErr;
        }

        // Update service status (Transaction Phase 2)
        await updateService.mutateAsync({
          id: service.id,
          status: "para_pedir_peca",
          last_status_before_part_request: service.status,
          skipToast: true,
        });

        if (!existingSig) {
          await logPartRequest(
            service.code || "N/A",
            service.id,
            (formData.partsToOrder?.[0]?.name || '').trim(),
            profile?.full_name || "Técnico",
            user?.id,
          );
        }

        toast.success("Pedido de peça registado com sucesso!");
      } else if (signatureType === "recolha") {
        // Idempotent signature
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
        toast.success("Aparelho recolhido para oficina!");
      } else {
        // Idempotent signature for completion
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

        // Final Status Update (Transaction Phase 2)
        // On-site repairs: no physical delivery needed, so skip 'concluidos' (Oficina Reparados)
        const hasPricingPreDefined = !!((service.final_price || 0) > 0);
        const isFullyPaid = hasPricingPreDefined && (service.amount_paid || 0) >= (service.final_price || 0);
        const finalStatus = isFullyPaid ? 'finalizado' : 'a_precificar';

        const defaultWork = mode === "continuacao_peca" ? "Artigo instalada e serviço concluído" : "Reparado no local do cliente";
        const { error: rpcError } = await technicianUpdateService({
          serviceId: service.id,
          status: finalStatus,
          pendingPricing: !hasPricingPreDefined,
          workPerformed: (typeof formData.workPerformed === 'string' ? formData.workPerformed.trim() : '') || defaultWork,
          detectedFault: (typeof formData.detectedFault === 'string' ? formData.detectedFault.trim() : '') || null,
          lastStatusBeforePartRequest: null,
        });
        if (rpcError) throw rpcError;

        if (!existingSig) {
          await logServiceCompletion(service.code || "N/A", service.id, profile?.full_name || "Técnico", user?.id);
        }

        // --- EMAIL LOGIC (DIRECT CALL) ---
        if (formData.sendEmailReport && service.customer?.email) {
          try {
            const { error: emailError } = await supabase.functions.invoke('send-email-notification', {
              body: { 
                service_id: service.id, 
                action_type: 'visit_report' 
              }
            });

            if (emailError) throw emailError;

            // Update timestamp for record keeping
            await supabase
              .from('services')
              .update({ last_visit_report_sent_at: new Date().toISOString() } as any)
              .eq('id', service.id);
            
            console.log("Relatório enviado com sucesso.");
            toast.success("Relatório enviado por email ao cliente.");
          } catch (e) {
            console.error("Erro ao enviar email:", e);
            toast.error("Serviço guardado, mas falhou o envio do relatório por email.");
          }
        } else if (formData.sendEmailReport && !service.customer?.email) {
          toast.warning("Serviço concluído. O cliente não tem email registado.");
        }
        // --- END EMAIL LOGIC ---

        toast.success("Visita concluída com sucesso!");
      }

      invalidateServiceQueries(queryClient, service.id);

      clearState();
      saveStateToDb(null as any);
      setShowSignature(false);
      onComplete();
    } catch (error) {
      console.error("Error completing transaction:", error);
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
      // Validate that at least one part has a name filled in
      const hasValidPart = (formData.partsToOrder || []).some(
        (p) => p.name && p.name.trim().length > 0
      );
      if (!hasValidPart) {
        toast.error("Adicione pelo menos uma peça com o nome preenchido.");
        return;
      }
    }
    // Proceed to summary regardless of needsPartOrder
    safeSetStep("resumo_reparacao");
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

  const handleCreateBudgetFromService = async () => {
    setIsSubmitting(true);
    try {
      await ensureValidSession();
      
      // Save current articles exactly like confirm articles
      const newArticles = (formData.articles as ArticleEntry[]).filter(a => !a.isExisting && a.description.trim());
      for (const article of newArticles) {
        const { error: insertErr } = await supabase.from("service_parts").insert({
          service_id: service.id,
          part_name: article.description,
          part_code: article.reference || null,
          quantity: article.quantity,
          cost: article.unit_price,
          is_requested: false,
          arrived: true,
          iva_rate: formData.taxRate as number,
          registered_by: user?.id || null,
          registered_location: "visita",
          notes: article.notes?.trim() || null,
        });
        if (insertErr) throw insertErr;
      }
      
      // Insert parts to order
      for (const part of formData.partsToOrder) {
        if (!part.name.trim()) continue;
        const { error: partInsertErr } = await supabase.from("service_parts").insert({
          service_id: service.id,
          part_name: part.name.trim(),
          part_code: part.reference.trim() || null,
          quantity: 1,
          is_requested: true,
          arrived: false,
          cost: 0,
        });
        if (partInsertErr) throw partInsertErr;
      }
      
      const budgetCode = service.code?.replace(/^TF-/, 'ORC-') || `ORC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const pricingData = {
        items: (formData.articles as ArticleEntry[]).map(a => ({
          description: a.description,
          details: a.notes || '',
          qty: a.quantity,
          price: a.unit_price,
          tax: formData.taxRate || 23,
          ref: a.reference || '',
          type: 'part'
        })),
        discount: discountAmount,
        discountType: formData.discountType,
        discountValue: parseFloat(formData.discountValue as string) || 0,
      };

      // Add labor if adminPricing exists
      if (adminPricing && adminPricingTotal > 0) {
        pricingData.items.push({
          description: 'Mão de Obra',
          details: '',
          qty: 1,
          price: adminPricingTotal,
          tax: 23,
          ref: 'LABOR',
          type: 'labor'
        } as any);
      }

      // Create Pending Budget linked to this service
      const { error: budgetErr } = await supabase.from('budgets').insert({
        code: budgetCode,
        customer_id: service.customer_id,
        appliance_type: formData.productType || service.appliance_type,
        brand: formData.productBrand || service.brand,
        model: formData.productModel || service.model,
        fault_description: formData.detectedFault || (service as any).detected_fault,
        estimated_labor: isNaN(adminPricingTotal) ? 0 : adminPricingTotal,
        estimated_parts: isNaN(articlesSubtotal) ? 0 : articlesSubtotal,
        estimated_total: isNaN(totalFinal) ? 0 : totalFinal,
        status: 'pendente',
        source_service_id: service.id,
        is_insurance_budget: formData.isInsuranceBudget || false,
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        pricing_description: JSON.stringify(pricingData),
      });
      if (budgetErr) {
        toast.error(`Erro ao criar orçamento: ${budgetErr.message}`);
        throw budgetErr;
      }

      // "Lock" the service waiting for budget approval
      await updateService.mutateAsync({
        id: service.id,
        awaiting_budget_approval: true,
        status: "a_precificar",
        skipToast: true,
      });

      toast.success("Enviado para Orçamento no painel!");
      
      invalidateServiceQueries(queryClient, service.id);
      clearState();
      saveStateToDb(null as any);
      onComplete(); // Closes the modal flow
      
    } catch (error) {
      console.error("Error creating budget:", error);
      toast.error(humanizeError(error));
    } finally {
      setIsSubmitting(false);
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
        <Badge variant="type-visita" className="text-[10px]">{step}</Badge>
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



  const renderStepContent = () => {
    switch (currentStep) {
      case "resumo":
      case "resumo_continuacao":
        return (
          <div className="space-y-4">
            <ModalHeader
              title={mode === "continuacao_peca" ? "Resumo Cont. Artigo" : "Resumo do Serviço"}
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
              {service.notes && (
                <div className="pt-2 border-t mt-2">
                  <p className="text-muted-foreground text-xs flex items-center gap-1">
                    <ClipboardList className="h-3 w-3" /> Observações
                  </p>
                  <p className="font-medium text-amber-700 whitespace-pre-wrap">{service.notes}</p>
                </div>
              )}
              {mode === "continuacao_peca" && service.detected_fault && (
                <div className="pt-2 border-t mt-2">
                  <p className="text-muted-foreground text-xs">Diagnóstico Anterior</p>
                  <p className="font-medium text-amber-600">{service.detected_fault}</p>
                </div>
              )}
            </div>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-blue-500 hover:bg-blue-600 font-bold"
                onClick={handleStartVisit}
                disabled={isResuming || isSubmitting}
              >
                {(isResuming || isSubmitting) ? "A carregar..." : (mode === "continuacao_peca" ? "Continuar Visita" : "Iniciar Visita")}
              </Button>
            </DialogFooter>
          </div>
        );

      case "deslocacao":
        return (
          <div className="space-y-4">
            <ModalHeader title="Deslocação" step="Passo 2" />
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
            </div>
            <Button variant="outline" className="w-full h-14 text-base" onClick={handleNavigateToClient}>
              <Navigation className="h-5 w-5 mr-2" />
              Caminho para o Cliente
            </Button>
            <DialogFooter className="flex gap-2">
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
          </div>
        );

      case "foto_aparelho":
        return (
          <div className="space-y-4">
            <ModalHeader title="Foto do Aparelho" step="Passo 3" />
            <div className="flex items-center gap-2 text-sm">
              <Camera className="h-4 w-4 text-blue-500" />
              <span>Tire uma foto geral do aparelho</span>
              <span className="text-destructive">*</span>
            </div>
            {isRealPhoto(formData.photoAparelho) ? (
              <div className="relative">
                <img src={formData.photoAparelho!} alt="Foto" className="w-full h-48 object-cover rounded-lg" />
                <Button variant="secondary" size="sm" className="absolute bottom-2 right-2" onClick={() => openCamera("aparelho")}>Nova Foto</Button>
              </div>
            ) : (
              <Button variant="outline" className="w-full h-32 flex-col gap-2" onClick={() => openCamera("aparelho")}>
                <Camera className="h-8 w-8 text-muted-foreground" />
                <span>Tirar Foto</span>
              </Button>
            )}
            <DialogFooter className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => safeSetStep("deslocacao")}>Anterior</Button>
              <Button className="flex-1 bg-blue-500" onClick={goToNextPhotoStep} disabled={!canProceedFromFotoAparelho}>Continuar</Button>
            </DialogFooter>
          </div>
        );

      case "foto_etiqueta":
        return (
          <div className="space-y-4">
            <ModalHeader title="Foto da Etiqueta" step="Passo 4" />
            <div className="flex items-center gap-2 text-sm">
              <Tag className="h-4 w-4 text-blue-500" />
              <span>Tire uma foto da etiqueta do aparelho</span>
              <span className="text-destructive">*</span>
            </div>
            {isRealPhoto(formData.photoEtiqueta) ? (
              <div className="relative">
                <img src={formData.photoEtiqueta!} alt="Etiqueta" className="w-full h-48 object-cover rounded-lg" />
                <Button variant="secondary" size="sm" className="absolute bottom-2 right-2" onClick={() => openCamera("etiqueta")}>Nova Foto</Button>
              </div>
            ) : (
              <Button variant="outline" className="w-full h-32 flex-col gap-2" onClick={() => openCamera("etiqueta")}>
                <Tag className="h-8 w-8 text-muted-foreground" />
                <span>Tirar Foto</span>
              </Button>
            )}
            <DialogFooter className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={goToPreviousPhotoStep}>Anterior</Button>
              <Button className="flex-1 bg-blue-500" onClick={goToNextPhotoStep} disabled={!canProceedFromFotoEtiqueta}>Continuar</Button>
            </DialogFooter>
          </div>
        );

      case "foto_estado":
        return (
          <div className="space-y-4">
            <ModalHeader title="Estado do Aparelho" step="Passo 5" />
            <div className="flex items-center gap-2 text-sm">
              <ClipboardList className="h-4 w-4 text-blue-500" />
              <span>Registe o estado físico do aparelho</span>
              <span className="text-destructive">*</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {formData.photosEstado.map((photo, idx) => (
                <div key={idx} className="relative group">
                  <img src={photo} alt={`Estado ${idx}`} className="w-full h-20 object-cover rounded-lg" />
                  <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100" onClick={() => removeEstadoPhoto(idx)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <button onClick={() => openCamera("estado")} className="h-20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center">
                <Plus className="h-5 w-5" />
                <span className="text-[10px]">Mais</span>
              </button>
            </div>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={goToPreviousPhotoStep}>Anterior</Button>
              <Button className="flex-1 bg-blue-500" onClick={goToNextPhotoStep} disabled={!canProceedFromFotoEstado}>Continuar</Button>
            </DialogFooter>
          </div>
        );

      case "foto":
        return (
          <div className="space-y-4">
            <ModalHeader title="Tirar Foto" step="Passo 3" />
            {isRealPhoto(formData.photoFile) ? (
              <div className="relative">
                <img src={formData.photoFile!} alt="Foto" className="w-full h-48 object-cover rounded-lg" />
                <Button variant="secondary" size="sm" className="absolute bottom-2 right-2" onClick={() => openCamera("visita")}>Nova Foto</Button>
              </div>
            ) : (
              <Button variant="outline" className="w-full h-32 flex-col gap-2" onClick={() => openCamera("visita")}>
                <Camera className="h-8 w-8 text-muted-foreground" />
                <span>Tirar Foto</span>
              </Button>
            )}
            <DialogFooter className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => safeSetStep("deslocacao")}>Anterior</Button>
              <Button className="flex-1 bg-blue-500" onClick={() => safeSetStep("diagnostico")} disabled={!canProceedFromFoto}>Continuar</Button>
            </DialogFooter>
          </div>
        );

      case "produto":
        return (
          <div className="space-y-4">
            <ModalHeader title="Informação do Produto" step={isReparacao ? "Passo 6" : "Passo 4"} />
            <div className="space-y-3">
              <div>
                <Label>Tipo de Aparelho</Label>
                <Input value={formData.productType} onChange={(e) => setFormData(prev => ({ ...prev, productType: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Marca</Label>
                  <Input value={formData.productBrand} onChange={(e) => setFormData(prev => ({ ...prev, productBrand: e.target.value }))} />
                </div>
                <div>
                  <Label>Modelo</Label>
                  <Input value={formData.productModel} onChange={(e) => setFormData(prev => ({ ...prev, productModel: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>PNC</Label>
                  <Input value={formData.productPNC} onChange={(e) => setFormData(prev => ({ ...prev, productPNC: e.target.value }))} />
                </div>
                <div>
                  <Label>N/S</Label>
                  <Input value={formData.productSerial} onChange={(e) => setFormData(prev => ({ ...prev, productSerial: e.target.value }))} />
                </div>
              </div>
            </div>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={goToPreviousPhotoStep}>Anterior</Button>
              <Button className="flex-1 bg-blue-500" onClick={handleProductoConfirm}>Continuar</Button>
            </DialogFooter>
          </div>
        );

      case "diagnostico":
        return (
          <div className="space-y-4">
            <ModalHeader title="Diagnóstico" step={isReparacao ? "Passo 6" : "Passo 4"} />
            <div>
              <Label htmlFor="detected_fault" className="text-sm">Avaria Detectada *</Label>
              <Textarea
                id="detected_fault"
                placeholder="Descreva a avaria..."
                value={formData.detectedFault}
                onChange={(e) => setFormData(prev => ({ ...prev, detectedFault: e.target.value }))}
                rows={4}
                className="mt-1.5"
              />
            </div>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={goToPreviousPhotoStep}>Anterior</Button>
              <Button className="flex-1 bg-blue-500" onClick={() => safeSetStep("decisao")} disabled={!canProceedFromDiagnostico}>Continuar</Button>
            </DialogFooter>
          </div>
        );

      case "decisao":
        return (
          <div className="space-y-4">
            <ModalHeader title="Decisão" step={isReparacao ? "Passo 7" : "Passo 5"} />
            <RadioGroup value={formData.decision} onValueChange={(val) => setFormData(prev => ({ ...prev, decision: val as DecisionType }))} className="space-y-3">
              <label htmlFor="reparar_local" className={cn("flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer", formData.decision === "reparar_local" ? "border-blue-500 bg-blue-50" : "border-muted")}>
                <RadioGroupItem value="reparar_local" id="reparar_local" />
                <div className="flex-1">
                  <span className="font-medium text-sm">Reparar no Local</span>
                  <p className="text-xs text-muted-foreground">Serviço concluído no cliente</p>
                </div>
              </label>
              <label htmlFor="levantar_oficina" className={cn("flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer", formData.decision === "levantar_oficina" ? "border-orange-500 bg-orange-50" : "border-muted")}>
                <RadioGroupItem value="levantar_oficina" id="levantar_oficina" />
                <div className="flex-1">
                  <span className="font-medium text-sm">Levantar para Oficina</span>
                  <p className="text-xs text-muted-foreground">Recolher aparelho</p>
                </div>
              </label>
            </RadioGroup>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => safeSetStep("diagnostico")}>Anterior</Button>
              <Button className={cn("flex-1", formData.decision === "reparar_local" ? "bg-blue-500" : "bg-orange-500")} onClick={handleDecisionConfirm}>Continuar</Button>
            </DialogFooter>
          </div>
        );

      case "registo_artigos":
        return (
          <div className="space-y-4 max-h-[70vh] flex flex-col">
            <ModalHeader title="Registo de Artigos" step={isReparacao ? "Passo 8" : "Passo 6"} />
            <div className="flex-1 overflow-y-auto space-y-4">
              {adminPricing && <AdminPricingReadOnly data={adminPricing} />}

              <div className="space-y-2">
                <Label className="text-sm font-medium">Artigos Utilizados</Label>

                {/* Split articles by ownership */}
                {(() => {
                  const { ownArticles, othersArticles } = separateArticlesByOwner();
                  return (
                    <div className="space-y-4">
                      {/* Own articles section */}
                      {ownArticles.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">✏️ Meus Artigos (Editáveis)</Label>
                          <div className="space-y-3">
                            {ownArticles.map((article) => (
                              <div key={article.allIndex} className="p-3 border rounded-lg bg-blue-50/30 relative group">
                                {!formData.articlesLocked && !article.isExisting && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 absolute -right-2 -top-2 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => removeArticle(article.allIndex)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                )}
                                <div className="grid grid-cols-12 gap-2 mt-1">
                                  <div className="col-span-4 space-y-1">
                                    <Label className="text-[10px] uppercase text-muted-foreground">Ref.</Label>
                                    <Input
                                      placeholder="F01..."
                                      value={article.reference}
                                      disabled={formData.articlesLocked || article.isExisting}
                                      className="h-8 text-sm px-2"
                                      onChange={(e) => updateArticle(article.allIndex, 'reference', e.target.value)}
                                    />
                                  </div>
                                  <div className="col-span-4 space-y-1">
                                    <Label className="text-[10px] uppercase text-muted-foreground">Descrição</Label>
                                    <Textarea
                                      placeholder="Artigo"
                                      value={article.description}
                                      disabled={formData.articlesLocked || article.isExisting}
                                      className="min-h-[32px] h-8 text-sm resize-y py-1 px-2"
                                      rows={1}
                                      onChange={(e) => updateArticle(article.allIndex, 'description', e.target.value)}
                                    />
                                  </div>
                                  <div className="col-span-2 space-y-1">
                                    <Label className="text-[10px] uppercase text-muted-foreground text-center block">Qtd</Label>
                                    <Input
                                      type="number"
                                      min="1"
                                      value={article.quantity}
                                      disabled={formData.articlesLocked || article.isExisting}
                                      className="h-8 text-sm text-center px-1"
                                      onChange={(e) => updateArticle(article.allIndex, 'quantity', parseInt(e.target.value) || 1)}
                                    />
                                  </div>
                                  <div className="col-span-2 space-y-1">
                                    <Label className="text-[10px] uppercase text-muted-foreground text-right block">Valor</Label>
                                    <Input
                                      placeholder="0"
                                      value={article.unit_price}
                                      disabled={formData.articlesLocked || article.isExisting}
                                      className="h-8 text-sm px-2 text-right"
                                      onChange={(e) => updateArticle(article.allIndex, 'unit_price', parseFloat(e.target.value) || 0)}
                                    />
                                  </div>
                                </div>
                                {(!formData.articlesLocked && !article.isExisting) && (
                                  <div className="mt-2 space-y-1">
                                    <Label className="text-[10px] uppercase text-muted-foreground">Observações</Label>
                                    <textarea
                                      placeholder="Observações opcionais sobre este artigo..."
                                      value={article.notes || ""}
                                      className="w-full min-h-[52px] resize-y rounded-md border border-input bg-background px-2 py-1.5 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                      onChange={(e) => updateArticle(article.allIndex, 'notes', e.target.value)}
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Others' articles section */}
                      {othersArticles.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">👥 Artigos de Outros Utilizadores (Apenas Leitura)</Label>
                          <div className="space-y-3">
                            {othersArticles.map((article) => (
                              <div key={article.allIndex} className="p-3 border rounded-lg bg-slate-50 opacity-75 relative group">
                                <div className="grid grid-cols-12 gap-2 mt-1">
                                  <div className="col-span-4 space-y-1">
                                    <Label className="text-[10px] uppercase text-muted-foreground">Ref.</Label>
                                    <Input
                                      placeholder="F01..."
                                      value={article.reference}
                                      disabled={true}
                                      className="h-8 text-sm px-2"
                                    />
                                  </div>
                                  <div className="col-span-4 space-y-1">
                                    <Label className="text-[10px] uppercase text-muted-foreground">Descrição</Label>
                                    <Textarea
                                      placeholder="Artigo"
                                      value={article.description}
                                      disabled={true}
                                      className="min-h-[32px] h-8 text-sm resize-y py-1 px-2"
                                      rows={1}
                                    />
                                  </div>
                                  <div className="col-span-2 space-y-1">
                                    <Label className="text-[10px] uppercase text-muted-foreground text-center block">Qtd</Label>
                                    <Input
                                      type="number"
                                      min="1"
                                      value={article.quantity}
                                      disabled={true}
                                      className="h-8 text-sm text-center px-1"
                                    />
                                  </div>
                                  <div className="col-span-2 space-y-1">
                                    <Label className="text-[10px] uppercase text-muted-foreground text-right block">Valor</Label>
                                    <Input
                                      placeholder="0"
                                      value={article.unit_price}
                                      disabled={true}
                                      className="h-8 text-sm px-2 text-right"
                                    />
                                  </div>
                                </div>
                                <div className="text-[10px] text-muted-foreground mt-2 text-right italic">
                                  Por: {article.ownerName} — Apenas leitura
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Single Add button always visible */}
                      <Button variant="outline" className="w-full h-10" onClick={addArticle}>
                        <Plus className="h-4 w-4 mr-2" /> Adicionar Artigo
                      </Button>
                    </div>
                  );
                })()}
              </div>

              {formData.articles.filter(a => !a.isExisting).length > 0 && (
                <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleConfirmArticles} disabled={isSubmitting}>
                  {isSubmitting ? "A confirmar..." : "Confirmar Registo"}
                </Button>
              )}

              {/* Resumo Financeiro */}
              <div className="bg-muted p-3 rounded-lg space-y-2 mt-4 text-sm border">
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="font-semibold text-xs text-muted-foreground uppercase">Subtotal Bruto:</span>
                  <span className="font-bold">{articlesSubtotal.toFixed(2)} €</span>
                </div>

                <div className="grid grid-cols-2 gap-3 items-end pt-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-muted-foreground">Desconto</Label>
                    <div className="flex gap-1">
                      <Input
                        placeholder="0"
                        className="h-8 text-right px-2 flex-1"
                        value={formData.discountValue}
                        onChange={(e) => setFormData(p => ({ ...p, discountValue: e.target.value }))}
                      />
                      <Select
                        value={formData.discountType}
                        onValueChange={(v: any) => setFormData(p => ({ ...p, discountType: v }))}
                      >
                        <SelectTrigger className="h-8 w-12 text-[10px] px-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="euro">€</SelectItem>
                          <SelectItem value="percent">%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-muted-foreground">IVA (%)</Label>
                    <Input
                      type="number"
                      className="h-8 text-center px-1"
                      value={formData.taxRate}
                      onChange={(e) => setFormData(p => ({ ...p, taxRate: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>Taxa Aplicada:</span>
                  <span>{formData.taxRate}%</span>
                </div>

                {articlesSubtotal > 0 && (
                  <div className="flex justify-between items-center text-xs">
                    <span>Total Artigos:</span>
                    <span className="text-secondary-foreground">{(articlesSubtotal - discountAmount + taxAmount).toFixed(2)} €</span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t font-bold text-lg text-primary">
                  <span>TOTAL FINAL:</span>
                  <span>{totalFinal.toFixed(2)} €</span>
                </div>
              </div>
            </div>
            <DialogFooter className="flex gap-2 pt-2 border-t mt-4">
              <Button variant="outline" className="flex-1" onClick={() => safeSetStep("decisao")}><ArrowLeft className="h-4 w-4 mr-1" /> Anterior</Button>
              <Button className="flex-1 bg-blue-500 hover:bg-blue-600" disabled={isSubmitting} onClick={async () => {
                const pending = formData.articles.filter(a => !a.isExisting && (a as ArticleEntry).description?.trim());
                if (pending.length > 0 && !formData.articlesLocked) {
                  await handleConfirmArticles();
                }
                safeSetStep("pedir_peca");
              }}>Continuar <ArrowRight className="h-4 w-4 ml-1" /></Button>
            </DialogFooter>
          </div>
        );

      case "pedir_peca":
        return (
          <div className="space-y-4">
            <ModalHeader title="Pedir Artigos Complementares?" step={isReparacao ? "Passo 9" : "Passo 7"} />
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg flex gap-3 mb-2">
                <Package className="h-5 w-5 text-yellow-600 shrink-0" />
                <p className="text-xs text-yellow-800">
                  Se a reparação necessita de mais peças que não tem em stock agora, solicite-as aqui para o escritório.
                </p>
              </div>

              <RadioGroup
                value={formData.needsPartOrder ? "sim" : "nao"}
                onValueChange={(val) => setFormData(p => ({ ...p, needsPartOrder: val === "sim" }))}
                className="flex gap-4"
              >
                <div className="flex-1">
                  <RadioGroupItem value="nao" id="visit_needs_no" className="sr-only" />
                  <Label
                    htmlFor="visit_needs_no"
                    className={cn(
                      "flex flex-col items-center justify-center p-4 border-2 rounded-xl cursor-pointer transition-all",
                      !formData.needsPartOrder ? "border-green-500 bg-green-50 text-green-900" : "border-muted hover:border-primary/20"
                    )}
                  >
                    <CheckCircle2 className={cn("h-6 w-6 mb-1", !formData.needsPartOrder ? "text-green-600" : "text-muted-foreground")} />
                    <span className="font-semibold text-sm">Tudo OK</span>
                    <span className="text-[10px] opacity-70 italic text-center">Não preciso de peças</span>
                  </Label>
                </div>
                <div className="flex-1">
                  <RadioGroupItem value="sim" id="visit_needs_yes" className="sr-only" />
                  <Label
                    htmlFor="visit_needs_yes"
                    className={cn(
                      "flex flex-col items-center justify-center p-4 border-2 rounded-xl cursor-pointer transition-all",
                      formData.needsPartOrder ? "border-yellow-500 bg-yellow-50 text-yellow-900" : "border-muted hover:border-primary/20"
                    )}
                  >
                    <Plus className={cn("h-6 w-6 mb-1", formData.needsPartOrder ? "text-yellow-600" : "text-muted-foreground")} />
                    <span className="font-semibold text-sm">Pedir Peça</span>
                    <span className="text-[10px] opacity-70 italic text-center">Preciso encomendar</span>
                  </Label>
                </div>
              </RadioGroup>

              {formData.needsPartOrder && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">Lista de Encomenda</Label>
                    <Button variant="ghost" size="sm" onClick={() => setFormData(p => ({ ...p, partsToOrder: [...p.partsToOrder, { name: "", reference: "" }] }))} className="h-7 text-[10px]">
                      <Plus className="h-3 w-3 mr-1" /> Add Peça
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1">
                    {formData.partsToOrder.map((part, idx) => (
                      <div key={idx} className="flex gap-2 items-start bg-muted/30 p-2 rounded-lg relative group">
                        <div className="flex-1 space-y-2">
                          <Input
                            placeholder="Nome da peça..."
                            className="h-8 text-sm"
                            value={part.name}
                            onChange={(e) => {
                              const newList = [...formData.partsToOrder];
                              newList[idx] = { ...newList[idx], name: e.target.value };
                              setFormData(p => ({ ...p, partsToOrder: newList }));
                            }}
                          />
                          <Input
                            placeholder="Referência (opcional)"
                            className="h-7 text-[10px]"
                            value={part.reference}
                            onChange={(e) => {
                              const newList = [...formData.partsToOrder];
                              newList[idx] = { ...newList[idx], reference: e.target.value };
                              setFormData(p => ({ ...p, partsToOrder: newList }));
                            }}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive rounded-full absolute -right-2 -top-2 bg-background border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => setFormData(p => ({ ...p, partsToOrder: p.partsToOrder.filter((_, i) => i !== idx) }))}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    {formData.partsToOrder.length === 0 && (
                      <Button variant="outline" className="w-full border-dashed h-12 gap-2 text-muted-foreground" onClick={() => setFormData(p => ({ ...p, partsToOrder: [{ name: "", reference: "" }] }))}>
                        <Plus className="h-4 w-4" /> Clique para adicionar a peça
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => safeSetStep("registo_artigos")}><ArrowLeft className="h-4 w-4 mr-1" /> Anterior</Button>
              <Button className="flex-1 bg-blue-500 hover:bg-blue-600" onClick={handlePedirPecaConfirm}>
                Continuar <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </DialogFooter>
          </div>
        );

      case "confirmacao_peca":
        return (
          <div className="space-y-4">
            <ModalHeader title="Confirmação do Artigo" step="Instalação" />
            <div className="space-y-4 py-4">
              <div className="flex flex-col items-center text-center gap-3">
                <Package className="h-12 w-12 text-blue-500 bg-blue-100 p-2 rounded-full" />
                <h3 className="font-semibold text-lg">O artigo encomendado foi instalado?</h3>
                <p className="text-sm text-muted-foreground">Confirme se o artigo que chegou foi instalado com sucesso.</p>
              </div>

              <label className="flex items-center gap-3 p-3 mt-4 bg-muted/30 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex h-5 items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                    checked={formData.sendEmailReport}
                    onChange={(e) => setFormData(p => ({ ...p, sendEmailReport: e.target.checked }))}
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Enviar relatório da intervenção por email</span>
                  <span className="text-xs text-muted-foreground">O cliente receberá um resumo automático do serviço.</span>
                </div>
              </label>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <Button variant="outline" className="h-20 flex flex-col gap-1 border-red-200 hover:bg-red-50 hover:text-red-700" onClick={handleClose}>
                  <X className="h-6 w-6 text-red-500" />
                  <span>Ainda não</span>
                </Button>
                <Button className="h-20 flex flex-col gap-1 bg-green-600 hover:bg-green-700" onClick={handleConfirmacaoPeca}>
                  <CheckCircle2 className="h-6 w-6" />
                  <span>Sim, instalada</span>
                </Button>
              </div>
            </div>
          </div>
        );

      case "resumo_reparacao":
        return (
          <div className="space-y-4 max-h-[70vh] flex flex-col">
            <ModalHeader title="Resumo Final" step="Final" />
            <div className="flex-1 overflow-y-auto space-y-4">
              {adminPricing && <AdminPricingReadOnly data={adminPricing} />}

              {/* Artigos — próprios editáveis + outros só leitura */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Materiais Registados</Label>
                {(() => {
                  const { ownArticles, othersArticles } = separateArticlesByOwner();
                  return (
                    <div className="space-y-4">
                      {ownArticles.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">✏️ Meus Artigos (Editáveis)</Label>
                            {!formData.articlesLocked && (
                              <Button variant="outline" size="sm" onClick={addArticle} className="h-8 gap-1">
                                <Plus className="h-4 w-4" /> Adicionar
                              </Button>
                            )}
                          </div>
                          <div className="space-y-3">
                            {ownArticles.map((article) => (
                              <div key={article.allIndex} className="p-3 border rounded-lg bg-blue-50/30 relative group">
                                {!formData.articlesLocked && !article.isExisting && (
                                  <Button type="button" variant="ghost" size="icon"
                                    className="h-6 w-6 absolute -right-2 -top-2 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => removeArticle(article.allIndex)}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                )}
                                <div className="grid grid-cols-12 gap-2 mt-1">
                                  <div className="col-span-4 space-y-1">
                                    <Label className="text-[10px] uppercase text-muted-foreground">Ref.</Label>
                                    <Input placeholder="F01..." value={article.reference}
                                      disabled={formData.articlesLocked || article.isExisting} className="h-8 text-sm px-2"
                                      onChange={(e) => updateArticle(article.allIndex, 'reference', e.target.value)} />
                                  </div>
                                  <div className="col-span-4 space-y-1">
                                    <Label className="text-[10px] uppercase text-muted-foreground">Descrição</Label>
                                    <Input placeholder="Artigo" value={article.description}
                                      disabled={formData.articlesLocked || article.isExisting} className="h-8 text-sm"
                                      onChange={(e) => updateArticle(article.allIndex, 'description', e.target.value)} />
                                  </div>
                                  <div className="col-span-2 space-y-1">
                                    <Label className="text-[10px] uppercase text-muted-foreground text-center block">Qtd</Label>
                                    <Input type="number" min="1" value={article.quantity}
                                      disabled={formData.articlesLocked || article.isExisting} className="h-8 text-sm text-center px-1"
                                      onChange={(e) => updateArticle(article.allIndex, 'quantity', parseInt(e.target.value) || 1)} />
                                  </div>
                                  <div className="col-span-2 space-y-1">
                                    <Label className="text-[10px] uppercase text-muted-foreground text-right block">Valor</Label>
                                    <Input placeholder="0" value={article.unit_price}
                                      disabled={formData.articlesLocked || article.isExisting} className="h-8 text-sm px-2 text-right"
                                      onChange={(e) => updateArticle(article.allIndex, 'unit_price', parseFloat(e.target.value) || 0)} />
                                  </div>
                                </div>
                                {(!formData.articlesLocked && !article.isExisting) && (
                                  <div className="mt-2 space-y-1">
                                    <Label className="text-[10px] uppercase text-muted-foreground">Observações</Label>
                                    <textarea
                                      placeholder="Observações opcionais sobre este artigo..."
                                      value={article.notes || ""}
                                      className="w-full min-h-[52px] resize-y rounded-md border border-input bg-background px-2 py-1.5 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                      onChange={(e) => updateArticle(article.allIndex, 'notes', e.target.value)}
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {othersArticles.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">👥 Artigos de Outros (Apenas Leitura)</Label>
                          <div className="space-y-3">
                            {othersArticles.map((article) => (
                              <div key={article.allIndex} className="p-3 border rounded-lg bg-slate-50 opacity-75">
                                <div className="grid grid-cols-12 gap-2">
                                  <div className="col-span-4 space-y-1">
                                    <Label className="text-[10px] uppercase text-muted-foreground">Ref.</Label>
                                    <Input value={article.reference} disabled className="h-8 text-sm px-2" />
                                  </div>
                                  <div className="col-span-4 space-y-1">
                                    <Label className="text-[10px] uppercase text-muted-foreground">Descrição</Label>
                                    <Input value={article.description} disabled className="h-8 text-sm" />
                                  </div>
                                  <div className="col-span-2 space-y-1">
                                    <Label className="text-[10px] uppercase text-muted-foreground text-center block">Qtd</Label>
                                    <Input type="number" value={article.quantity} disabled className="h-8 text-sm text-center px-1" />
                                  </div>
                                  <div className="col-span-2 space-y-1">
                                    <Label className="text-[10px] uppercase text-muted-foreground text-right block">Valor</Label>
                                    <Input value={article.unit_price} disabled className="h-8 text-sm px-2 text-right" />
                                  </div>
                                </div>
                                <div className="text-[10px] text-muted-foreground mt-2 text-right italic">
                                  Por: {article.ownerName} — Apenas leitura
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {!formData.articlesLocked && (
                        <Button variant="outline" className="w-full h-10" onClick={addArticle}>
                          <Plus className="h-4 w-4 mr-2" /> Adicionar Artigo
                        </Button>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Totais */}
              <div className="bg-muted p-3 rounded-lg space-y-1 text-sm border">
                {adminPricing && (
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Serviços Administrativos</span>
                    <span>{adminPricingTotal.toFixed(2)} €</span>
                  </div>
                )}
                <div className="bg-blue-50 rounded p-2 mt-1 flex justify-between items-center">
                  <span className="font-bold text-blue-900">Total Previsto</span>
                  <span className="font-bold text-blue-600 text-lg">{totalFinal.toFixed(2)} €</span>
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg flex gap-3 items-start">
                <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-blue-900 leading-none">Guardar e Bloquear</p>
                  <p className="text-xs text-blue-700 leading-snug">
                    Esta ação irá registar permanentemente os artigos no ficheiro do serviço. Não poderá alterar após guardar.
                  </p>
                </div>
              </div>

              {formData.articlesLocked && (
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex h-5 items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                      checked={formData.sendEmailReport}
                      onChange={(e) => setFormData(p => ({ ...p, sendEmailReport: e.target.checked }))}
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">Enviar relatório da intervenção por email</span>
                    <span className="text-xs text-muted-foreground">O cliente receberá um resumo em PDF/Email.</span>
                  </div>
                </label>
              )}

              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors mt-2 bg-blue-50/50">
                <div className="flex h-5 items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                    checked={formData.isInsuranceBudget}
                    onChange={(e) => setFormData(p => ({ ...p, isInsuranceBudget: e.target.checked }))}
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">Orçamento para Seguro</span>
                  <span className="text-xs text-muted-foreground">Marque esta opção se o cliente for utilizar para seguradora.</span>
                </div>
              </label>
            </div>
            <DialogFooter className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => safeSetStep("pedir_peca")}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
              <div className="flex-1 flex flex-col sm:flex-row gap-2">
                {!formData.articlesLocked && (
                  <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleConfirmArticles} disabled={isSubmitting}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> {isSubmitting ? "A guardar..." : "Confirmar Artigos"}
                  </Button>
                )}
                <Button variant="secondary" className="flex-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300" onClick={handleCreateBudgetFromService} disabled={isSubmitting}>
                   <FileText className="h-4 w-4 mr-1"/> Solicitar Orçamento
                </Button>
                <Button className="flex-1 bg-blue-500 hover:bg-blue-600" onClick={handleResumoReparacaoConfirm} disabled={isSubmitting}>
                  Concluir Serviço <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </DialogFooter>
          </div>
        );

      default:
        return <div className="p-4 text-center">Passo "{currentStep}" em desenvolvimento...</div>;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={!showCamera && !showSignature && !showPayment} onOpenChange={handleStepDialogOpenChange}>
        <DialogContent
          className="max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto p-6"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          translate="no"
        >
          {renderStepContent()}
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
