import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Camera, X, ZoomIn } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { PHOTO_TYPE_LABELS, type PhotoType } from '@/types/database';

interface DiagnosisPhotosGalleryProps {
  serviceId: string;
  className?: string;
}

interface ServicePhoto {
  id: string;
  photo_type: string | null;
  file_url: string;
  description: string | null;
  uploaded_at: string;
}

export function DiagnosisPhotosGallery({ serviceId, className }: DiagnosisPhotosGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<ServicePhoto | null>(null);

  const { data: photos, isLoading } = useQuery({
    queryKey: ['service-diagnosis-photos', serviceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_photos')
        .select('*')
        .eq('service_id', serviceId)
        .in('photo_type', ['aparelho', 'etiqueta', 'estado', 'visita'])
        .order('uploaded_at', { ascending: true });

      if (error) throw error;
      return data as ServicePhoto[];
    },
    enabled: !!serviceId,
  });

  if (isLoading || !photos || photos.length === 0) {
    return null;
  }

  // Group photos by type
  const groupedPhotos = photos.reduce((acc, photo) => {
    const type = (photo.photo_type || 'visita') as PhotoType;
    if (!acc[type]) acc[type] = [];
    acc[type].push(photo);
    return acc;
  }, {} as Record<PhotoType, ServicePhoto[]>);

  const photoOrder: PhotoType[] = ['aparelho', 'etiqueta', 'estado', 'visita'];

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2">
        <Camera className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Fotos do Diagnóstico</span>
        <Badge variant="secondary" className="text-xs">
          {photos.length}
        </Badge>
      </div>

      <div className="bg-muted/30 rounded-lg p-3">
        <div className="flex flex-wrap gap-2">
          {photoOrder.map((type) => {
            const typePhotos = groupedPhotos[type];
            if (!typePhotos || typePhotos.length === 0) return null;

            return typePhotos.map((photo, idx) => (
              <div
                key={photo.id}
                className="relative group cursor-pointer"
                onClick={() => setSelectedPhoto(photo)}
              >
                <img
                  src={photo.file_url}
                  alt={photo.description || PHOTO_TYPE_LABELS[type]}
                  className="w-16 h-16 object-cover rounded-lg border"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                  <ZoomIn className="h-4 w-4 text-white" />
                </div>
                <Badge 
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[9px] px-1.5 py-0"
                  variant="secondary"
                >
                  {PHOTO_TYPE_LABELS[type]}
                </Badge>
              </div>
            ));
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Clique para ampliar
        </p>
      </div>

      {/* Full-screen photo viewer */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-3xl p-2">
          {selectedPhoto && (
            <div className="relative">
              <img
                src={selectedPhoto.file_url}
                alt={selectedPhoto.description || 'Foto do serviço'}
                className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
              />
              <Badge className="absolute top-2 left-2">
                {PHOTO_TYPE_LABELS[(selectedPhoto.photo_type || 'visita') as PhotoType]}
              </Badge>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
