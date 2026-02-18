import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  SERVICE_STATUS_CONFIG,
  type Service,
  type ServicePhoto,
} from '@/types/database';
import { cn } from '@/lib/utils';
import { PhotoGalleryModal } from '@/components/shared/PhotoGalleryModal';

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
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

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

  if (!service) return null;

  const statusConfig = SERVICE_STATUS_CONFIG[service.status];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span className="font-mono font-semibold">{service.code}</span>
            <Badge
              className="text-xs"
              style={{
                backgroundColor: statusConfig?.color + '20',
                borderColor: statusConfig?.color,
                color: statusConfig?.color,
              }}
            >
              {statusConfig?.label}
            </Badge>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[60vh] pb-4">
          {/* Basic details */}
          <div className="space-y-4 p-4">
            {service.customer && (
              <div>
                <div className="text-sm text-muted-foreground">Cliente</div>
                <div className="font-medium">{service.customer.name}</div>
              </div>
            )}

            <div>
              <div className="text-sm text-muted-foreground">Equipamento</div>
              <div className="font-medium">
                {[service.appliance_type, service.brand, service.model]
                  .filter(Boolean)
                  .join(' ') || 'Não especificado'}
              </div>
            </div>

            {service.fault_description && (
              <div>
                <div className="text-sm text-muted-foreground">Avaria</div>
                <p className="text-sm">{service.fault_description}</p>
              </div>
            )}

            {service.work_performed && (
              <div>
                <div className="text-sm text-muted-foreground">Trabalho Realizado</div>
                <p className="text-sm">{service.work_performed}</p>
              </div>
            )}

            {/* Photos gallery preview */}
            {servicePhotos && servicePhotos.length > 0 && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <span>Fotos ({servicePhotos.length})</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {servicePhotos.slice(0, 4).map((photo, index) => (
                      <button
                        key={photo.id}
                        className="relative group rounded-lg overflow-hidden"
                        onClick={(e) => {
                          e.stopPropagation();
                          setGalleryIndex(index);
                          setGalleryOpen(true);
                        }}
                      >
                        <img
                          src={photo.file_url}
                          alt={photo.description || 'Foto do serviço'}
                          className="w-full h-16 object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          {/* icon hidden for simplicity */}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
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
    </Sheet>
  );
}
