import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, Send, User, MessageSquare, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const [activeTab, setActiveTab] = useState('details');

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
      setActiveTab('details');
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

  // Fetch activity logs
  const { data: activityLogs = [] } = useQuery({
    queryKey: ['activity-logs', service?.id],
    queryFn: async () => {
      if (!service?.id) return [];
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('service_id', service.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
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

      // Upload all photos
      if (capturedPhotos.length > 0) {
        for (const photoData of capturedPhotos) {
          const { error: photoError } = await supabase.from('service_photos').insert({
            service_id: service.id,
            photo_type: photoType,
            file_url: photoData,
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

  const statusConfig = SERVICE_STATUS_CONFIG[service.status];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col h-full bg-background" side="right">
        <SheetHeader className="p-4 border-b bg-background z-10 shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <span className="font-mono font-bold text-primary">{service.code}</span>
              <Badge
                variant="outline"
                className="text-xs font-normal"
                style={{
                  backgroundColor: statusConfig?.color ? statusConfig.color.includes('bg-') ? undefined : statusConfig.color + '15' : undefined,
                  color: statusConfig?.color?.split(' ')[1] || 'currentColor',
                  borderColor: 'transparent'
                }}
              >
                {statusConfig?.label}
              </Badge>
            </SheetTitle>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 pt-2 shrink-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Detalhes</TabsTrigger>
              <TabsTrigger value="history">Histórico</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="details" className="flex-1 overflow-hidden data-[state=active]:flex flex-col mt-2">
            <ScrollArea className="flex-1">
              <div className="space-y-6 p-4">
                {service.customer && (
                  <div className="space-y-1">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Cliente</div>
                    <div className="font-medium text-lg">{service.customer.name}</div>
                    {service.customer.phone && <div className="text-sm text-muted-foreground">{service.customer.phone}</div>}
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
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="history" className="flex-1 overflow-hidden data-[state=active]:flex flex-col mt-0 bg-muted/10">
            {/* Input Area */}
            <div className="p-4 bg-background border-b shadow-sm space-y-3 shrink-0">
              <Textarea
                placeholder="Escreva uma observação..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="min-h-[80px] resize-none focus-visible:ring-1"
              />

              {/* Photos preview - multi-photo */}
              {capturedPhotos.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {capturedPhotos.map((photo, i) => (
                    <div key={i} className="relative inline-block border rounded-md overflow-hidden h-20 w-20">
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
                  className={cn("gap-2 text-xs", capturedPhotos.length > 0 ? "text-primary border-primary bg-primary/5" : "")}
                >
                  <Camera className="h-4 w-4" />
                  {capturedPhotos.length > 0 ? `${capturedPhotos.length}/${MAX_PHOTOS} fotos` : 'Adicionar Foto'}
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddStart}
                  disabled={(!newNote.trim() && capturedPhotos.length === 0) || isSubmitting}
                  className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground transition-all"
                >
                  {isSubmitting ? 'A enviar...' : 'Publicar'}
                  <Send className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-6 pb-4">
                {activityLogs.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8 text-sm flex flex-col items-center gap-2">
                    <MessageSquare className="h-8 w-8 text-muted-foreground/30" />
                    Nenhuma atividade registada ainda.
                  </div>
                ) : (
                  activityLogs.map((log: any, index: number) => {
                    const isNote = log.action_type === 'nota_adicionada';
                    return (
                      <div key={log.id} className="relative pl-6 pb-6 last:pb-0 group">
                        {/* Timeline line */}
                        {index !== activityLogs.length - 1 && (
                          <div className="absolute left-[9px] top-7 bottom-0 w-px bg-border group-last:hidden" />
                        )}

                        {/* Timeline dot */}
                        <div className={cn(
                          "absolute left-0 top-1 h-[19px] w-[19px] rounded-full flex items-center justify-center border-[3px] border-background shadow-sm z-10",
                          isNote ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300" : "bg-muted text-muted-foreground"
                        )}>
                          {isNote ? <MessageSquare className="h-2.5 w-2.5" /> : <User className="h-2.5 w-2.5" />}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">
                              {log.created_at ? format(new Date(log.created_at), "d MMM HH:mm", { locale: pt }) : '-'}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                            {log.description}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
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
    </Sheet>
  );
}
