import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  ArrowLeft,
  Loader2,
  Phone,
  MapPin,
  Wrench,
  Clock,
  Camera,
  FileSignature,
  Package,
  Printer,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { PhotoGalleryModal } from "@/components/shared/PhotoGalleryModal";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { SERVICE_STATUS_CONFIG } from "@/types/database";
import type { Service, Customer, ServicePart, ServiceSignature, ServicePhoto } from "@/types/database";

// Activity log type (from Supabase)
interface ActivityLog {
  id: string;
  service_id: string | null;
  actor_id: string | null;
  action_type: string;
  description: string;
  is_public: boolean | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  actor?: {
    full_name: string | null;
  } | null;
}
import tecnofrioLogoFull from "@/assets/tecnofrio-logo-full.png";
import { useAuth } from "@/contexts/AuthContext";
import { openInNewTabPreservingQuery } from "@/utils/openInNewTab";

export default function ServiceDetailPage() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading, role } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  // Fetch service with customer
  const {
    data: service,
    isLoading: loadingService,
    error,
  } = useQuery({
    queryKey: ["service-detail-internal", serviceId],
    queryFn: async () => {
      if (!serviceId) return null;
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

  // Fetch activity logs
  const { data: activityLogs = [] } = useQuery({
    queryKey: ["service-activity-logs", serviceId],
    queryFn: async () => {
      if (!serviceId) return [];
      const { data, error } = await supabase
        .from("activity_logs")
        .select(
          `
          *,
          actor:profiles(full_name)
        `,
        )
        .eq("service_id", serviceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as ActivityLog[];
    },
    enabled: !!serviceId && isAuthenticated && !authLoading,
  });

  // Fetch parts
  const { data: parts = [] } = useQuery({
    queryKey: ["service-parts-detail", serviceId],
    queryFn: async () => {
      if (!serviceId) return [];
      const { data, error } = await supabase
        .from("service_parts")
        .select("*")
        .eq("service_id", serviceId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as ServicePart[];
    },
    enabled: !!serviceId && isAuthenticated && !authLoading,
  });

  // Fetch photos
  const { data: photos = [] } = useQuery({
    queryKey: ["service-photos-detail", serviceId],
    queryFn: async () => {
      if (!serviceId) return [];
      const { data, error } = await supabase
        .from("service_photos")
        .select("*")
        .eq("service_id", serviceId)
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return data as ServicePhoto[];
    },
    enabled: !!serviceId && isAuthenticated && !authLoading,
  });

  // Fetch signatures
  const { data: signatures = [] } = useQuery({
    queryKey: ["service-signatures-detail", serviceId],
    queryFn: async () => {
      if (!serviceId) return [];
      const { data, error } = await supabase
        .from("service_signatures")
        .select("*")
        .eq("service_id", serviceId)
        .order("signed_at", { ascending: true });
      if (error) throw error;
      return data as ServiceSignature[];
    },
    enabled: !!serviceId && isAuthenticated && !authLoading,
  });

  const handleDeletePhoto = async (photoId: string) => {
    try {
      const { error } = await supabase
        .from("service_photos")
        .delete()
        .eq("id", photoId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["service-photos-detail", serviceId] });
      toast.success("Foto eliminada com sucesso");
    } catch (err) {
      console.error("Error deleting photo:", err);
      toast.error("Erro ao eliminar foto");
    }
  };

  // Show loading while auth is being restored
  if (authLoading || loadingService) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">{authLoading ? "A verificar sessão..." : "A carregar serviço..."}</p>
        </div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <p className="text-muted-foreground mb-4">Serviço não encontrado ou sem permissão.</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
    );
  }

  const statusConfig = SERVICE_STATUS_CONFIG[service.status];
  const usedParts = parts.filter((p) => !p.is_requested);
  const requestedParts = parts.filter((p) => p.is_requested);

  const getSignatureLabel = (type: string | null) => {
    switch (type) {
      case "recolha":
        return "Recolha";
      case "entrega":
        return "Entrega";
      case "visita":
        return "Visita";
      case "pedido_peca":
        return "Pedido Peça";
      default:
        return "Assinatura";
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b shadow-sm">
        <div className="container max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <img src={tecnofrioLogoFull} alt="TECNOFRIO" className="h-8" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => openInNewTabPreservingQuery(`/print/service/${serviceId}`)}
          >
            <Printer className="h-4 w-4 mr-2" />
            Ficha
          </Button>
        </div>
      </header>

      <main className="container max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Service Header */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-mono">{service.code}</CardTitle>
              <Badge style={{ backgroundColor: statusConfig?.color || "#888" }} className="text-white">
                {statusConfig?.label || service.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Criado em {format(new Date(service.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: pt })}
            </p>
          </CardHeader>
        </Card>

        {/* Customer Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Nome: </span>
              <span className="font-medium">{service.customer?.name || "N/A"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Telefone: </span>
              <span className="font-medium">{service.customer?.phone || "N/A"}</span>
            </div>
            {service.customer?.email && (
              <div>
                <span className="text-muted-foreground">Email: </span>
                <span className="font-medium">{service.customer.email}</span>
              </div>
            )}
            {(service.customer?.address || service.customer?.city) && (
              <div className="flex items-start gap-1">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span className="font-medium">
                  {[service.customer?.address, service.customer?.postal_code, service.customer?.city]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Equipment Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Equipamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-muted-foreground">Tipo: </span>
                <span className="font-medium">{service.appliance_type || "N/A"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Marca: </span>
                <span className="font-medium">{service.brand || "N/A"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Modelo: </span>
                <span className="font-medium">{service.model || "N/A"}</span>
              </div>
              {service.serial_number && (
                <div>
                  <span className="text-muted-foreground">Nº Série: </span>
                  <span className="font-medium">{service.serial_number}</span>
                </div>
              )}
            </div>
            <Separator />
            <div>
              <span className="text-muted-foreground">Avaria reportada: </span>
              <span className="font-medium">{service.fault_description || "N/A"}</span>
            </div>
            {service.detected_fault && (
              <div>
                <span className="text-muted-foreground">Diagnóstico: </span>
                <span className="font-medium">{service.detected_fault}</span>
              </div>
            )}
            {service.work_performed && (
              <div>
                <span className="text-muted-foreground">Trabalho realizado: </span>
                <span className="font-medium">{service.work_performed}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity History */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Histórico ({activityLogs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activityLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem atividades registadas.</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {activityLogs.map((log) => (
                  <div key={log.id} className="flex gap-3 text-sm border-l-2 border-muted pl-3">
                    <div className="flex-1">
                      <p className="font-medium">{log.description}</p>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: pt })}
                        </p>
                        {log.actor?.full_name && (
                          <p className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                            Por: {log.actor.full_name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Parts */}
        {parts.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                Peças ({parts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {usedParts.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Utilizadas:</p>
                    {usedParts.map((part) => (
                      <div key={part.id} className="flex justify-between text-sm py-1 border-b last:border-0">
                        <span>
                          {part.part_name} {part.quantity && part.quantity > 1 ? `(x${part.quantity})` : ""}
                        </span>
                        <span className="text-muted-foreground">{part.part_code || "-"}</span>
                      </div>
                    ))}
                  </div>
                )}
                {requestedParts.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Pedidas:</p>
                    {requestedParts.map((part) => (
                      <div key={part.id} className="flex justify-between text-sm py-1 border-b last:border-0">
                        <span>{part.part_name}</span>
                        <Badge variant={part.arrived ? "default" : "secondary"} className="text-xs">
                          {part.arrived ? "Chegou" : "A aguardar"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Photos */}
        {photos.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Fotos ({photos.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo, index) => (
                  <button
                    key={photo.id}
                    onClick={() => setSelectedPhotoIndex(index)}
                    className="aspect-square rounded-lg overflow-hidden border hover:opacity-80 transition"
                  >
                    <img
                      src={photo.file_url}
                      alt={photo.description || "Foto do serviço"}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Photo Gallery Modal */}
        {photos.length > 0 && (
          <PhotoGalleryModal
            photos={photos}
            initialIndex={selectedPhotoIndex || 0}
            open={selectedPhotoIndex !== null}
            onOpenChange={(open) => !open && setSelectedPhotoIndex(null)}
            onDelete={(role === "dono" || role === "secretaria") ? handleDeletePhoto : undefined}
          />
        )}

        {/* Signatures */}
        {signatures.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileSignature className="h-4 w-4" />
                Assinaturas ({signatures.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {signatures.map((sig) => (
                  <div key={sig.id} className="border rounded-lg p-2">
                    <div className="aspect-[3/2] bg-muted rounded overflow-hidden mb-2">
                      <img
                        src={sig.file_url}
                        alt={`Assinatura de ${sig.signer_name || "Cliente"}`}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <p className="text-xs font-medium">{getSignatureLabel(sig.signature_type)}</p>
                    <p className="text-xs text-muted-foreground">
                      {sig.signer_name || "Cliente"} - {format(new Date(sig.signed_at), "dd/MM/yyyy", { locale: pt })}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {service.notes && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Notas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{service.notes}</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
