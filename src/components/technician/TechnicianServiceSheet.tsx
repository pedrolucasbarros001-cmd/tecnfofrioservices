import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, Send, User, MessageSquare, X, Pencil } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { toast } from 'sonner';
import { logActivity } from '@/utils/activityLogUtils';
import { CameraCapture } from '@/components/shared/CameraCapture';
import {
  SERVICE_STATUS_CONFIG,
  type Service,
  type ServicePhoto,
  type PhotoType,
  PHOTO_TYPE_LABELS,
} from '@/types/database';
import { cn } from '@/lib/utils';
import { PhotoGalleryModal } from '@/components/shared/PhotoGalleryModal';
import { useAuth } from '@/contexts/AuthContext';
import { ServiceStatusBadge } from '@/components/shared/ServiceStatusBadge';
import { TechnicianEditServiceModal } from '@/components/technician/TechnicianEditServiceModal';

interface TechnicianServiceSheetProps {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TechnicianServiceSheet({
  service,
  open,
  onOpenChange,
}: TechnicianServiceSheetProps) {
  const { user } = useAuth();
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // content addition state
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  // Default photo type for observations is 'visita'
  const photoType: PhotoType = 'visita';
  const MAX_PHOTOS = 3;
  // Multi-photo support
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);

  const queryClient = useQueryClient();

  // Reset state when sheet opens/closes or service changes
  useEffect(() => {
    if (open) {
      setNewNote('');
      setCapturedPhotos([]);
    }
  }, [open, service?.id]);

  // Fetch photos
  const { data: servicePhotos = [] } = useQuery({
    queryKey: ['service-photos', service?.id],
    queryFn: async () => {
      if (!service?.id) return [];
      const { data, error } = await supabase
        .from('service_photos')
        .select('*')
        .eq('service_id', service.id)
        .order('uploaded_at', { ascending: false });
      if (error) throw error;
      return data as ServicePhoto[];
    },
    enabled: !!service?.id && open,
  });

  const handlePhotoCapture = (imageData: string) => {
    setCapturedPhotos(prev => prev.length < MAX_PHOTOS ? [...prev, imageData] : prev);
    setShowCamera(false);
  };

  const handleAddStart = async () => {
    if (!service?.id || (!newNote.trim() && capturedPhotos.length === 0)) return;

    setIsSubmitting(true);
    try {
      let noteText = newNote.trim();

      // Upload all photos to Storage bucket
      if (capturedPhotos.length > 0) {
        for (const photoData of capturedPhotos) {
          // Convert base64 to Blob
          const base64Data = photoData.split(',')[1];
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'image/jpeg' });

          const fileName = `${service.id}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`;
          const { error: uploadError } = await supabase.storage
            .from('service-photos')
            .upload(fileName, blob, { contentType: 'image/jpeg' });
          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from('service-photos')
            .getPublicUrl(fileName);

          const { error: photoError } = await supabase.from('service_photos').insert({
            service_id: service.id,
            photo_type: photoType,
            file_url: urlData.publicUrl,
            description: noteText || 'Foto de observação',
            uploaded_by: user?.id
          });
          if (photoError) throw photoError;
        }
        if (capturedPhotos.length > 0) noteText += ` (${capturedPhotos.length} foto${capturedPhotos.length > 1 ? 's' : ''} anexada${capturedPhotos.length > 1 ? 's' : ''})`;
        queryClient.invalidateQueries({ queryKey: ['service-photos', service.id] });
      }

      // Log activity
      await logActivity({
        serviceId: service.id,
        actorId: user?.id,
        actionType: 'nota_adicionada',
        description: `Observação: ${noteText}`,
        isPublic: true,
      });

      toast.success('Registo adicionado!');
      setNewNote('');
      setCapturedPhotos([]);
      queryClient.invalidateQueries({ queryKey: ['activity-logs', service.id] });
    } catch (err) {
      console.error('Error adding record:', err);
      toast.error('Erro ao adicionar registo');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!service) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col h-full bg-background" side="right">
        <SheetHeader className="p-4 border-b bg-background z-10 shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <span className="font-mono font-bold text-primary">{service.code}</span>
              <ServiceStatusBadge service={service} />
            </SheetTitle>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-6 p-4">
            {/* Edit button */}
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={() => setEditModalOpen(true)}
            >
              <Pencil className="h-4 w-4" />
              Editar Serviço
            </Button>

            {(service.customer || service.contact_name) && (
              <div className="space-y-1">
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Cliente</div>
                <div className="font-medium text-lg">{service.contact_name || service.customer?.name}</div>
                {(service.contact_phone || service.customer?.phone) && <div className="text-sm text-muted-foreground">{service.contact_phone || service.customer?.phone}</div>}
              </div>
            )}

            <div className="space-y-1">
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Equipamento</div>
              <div className="font-medium text-base">
                {[service.appliance_type, service.brand, service.model]
                  .filter(Boolean)
                  .join(' ') || 'Não especificado'}
              </div>
            </div>

            {service.fault_description && (
              <div className="space-y-1">
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Avaria Reportada</div>
                <div className="text-sm bg-muted/50 p-3 rounded-md italic">"{service.fault_description}"</div>
              </div>
            )}

            {service.work_performed && (
              <div className="space-y-1">
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Trabalho Realizado</div>
                <div className="text-sm border-l-2 border-primary/50 pl-3 py-1">{service.work_performed}</div>
              </div>
            )}

            {/* Photos gallery preview */}
            {servicePhotos && servicePhotos.length > 0 && (
              <div className="pt-2">
                <Separator className="mb-4" />
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium">Fotos ({servicePhotos.length})</div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {servicePhotos.map((photo, index) => (
                    <button
                      key={photo.id}
                      className="relative aspect-square group rounded-md overflow-hidden bg-muted"
                      onClick={(e) => {
                        e.stopPropagation();
                        setGalleryIndex(index);
                        setGalleryOpen(true);
                      }}
                    >
                      <img
                        src={photo.file_url}
                        alt={photo.description || 'Foto do serviço'}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Note Area (Instead of a tab) */}
            <Separator />
            <div className="space-y-3">
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Adicionar Observação</div>
              <Textarea
                placeholder="Escreva uma observação..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="min-h-[80px] resize-none focus-visible:ring-1 text-sm"
              />

              {capturedPhotos.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {capturedPhotos.map((photo, i) => (
                    <div key={i} className="relative inline-block border rounded-md overflow-hidden h-16 w-16">
                      <img src={photo} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => setCapturedPhotos(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-0 right-0 bg-destructive text-destructive-foreground p-0.5 rounded-bl shadow-sm"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCamera(true)}
                  disabled={capturedPhotos.length >= MAX_PHOTOS}
                  className={cn("gap-2 text-[10px] h-8", capturedPhotos.length > 0 ? "text-primary border-primary bg-primary/5" : "")}
                >
                  <Camera className="h-3.5 w-3.5" />
                  {capturedPhotos.length > 0 ? `${capturedPhotos.length} fotos` : 'Foto'}
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddStart}
                  disabled={(!newNote.trim() && capturedPhotos.length === 0) || isSubmitting}
                  className="gap-2 text-[10px] h-8 px-4"
                >
                  {isSubmitting ? '...' : 'Publicar'}
                  <Send className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>

      {servicePhotos && servicePhotos.length > 0 && (
        <PhotoGalleryModal
          photos={servicePhotos}
          initialIndex={galleryIndex}
          open={galleryOpen}
          onOpenChange={setGalleryOpen}
        />
      )}

      <CameraCapture
        open={showCamera}
        onOpenChange={setShowCamera}
        onCapture={handlePhotoCapture}
        title="Registar Foto"
      />

      <TechnicianEditServiceModal
        service={service}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
      />
    </Sheet>
  );
}
