import { useState } from 'react';
import { Camera, ImageIcon, Loader2, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CameraCapture } from '@/components/shared/CameraCapture';
import { PhotoGalleryModal } from '@/components/shared/PhotoGalleryModal';
import { uploadServicePhoto } from '@/utils/photoUpload';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PHOTO_TYPE_LABELS, type PhotoType } from '@/types/database';

interface AdminPhotoUploadSectionProps {
  serviceId: string;
}

export function AdminPhotoUploadSection({ serviceId }: AdminPhotoUploadSectionProps) {
  const [showCamera, setShowCamera] = useState(false);
  const [photoType, setPhotoType] = useState<string>('oficina');
  const [isUploading, setIsUploading] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const queryClient = useQueryClient();

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ['service-photos-admin', serviceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_photos')
        .select('*')
        .eq('service_id', serviceId)
        .order('uploaded_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!serviceId,
  });

  const handleCapture = async (imageData: string | string[]) => {
    setIsUploading(true);
    try {
      const images = Array.isArray(imageData) ? imageData : [imageData];
      for (const img of images) {
        await uploadServicePhoto(
          serviceId,
          img,
          photoType,
          `Foto adicionada pelo administrador (${PHOTO_TYPE_LABELS[photoType as PhotoType] || photoType})`
        );
      }
      queryClient.invalidateQueries({ queryKey: ['service-photos-admin', serviceId] });
      queryClient.invalidateQueries({ queryKey: ['full-service-data', serviceId] });
      toast.success(`${images.length} foto(s) adicionada(s) com sucesso`);
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Erro ao carregar foto');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    const { error } = await supabase
      .from('service_photos')
      .delete()
      .eq('id', photoId);
    if (error) {
      toast.error('Erro ao eliminar foto');
      throw error;
    }
    queryClient.invalidateQueries({ queryKey: ['service-photos-admin', serviceId] });
    queryClient.invalidateQueries({ queryKey: ['full-service-data', serviceId] });
    toast.success('Foto eliminada');
  };

  return (
    <div className="bg-white p-5 rounded-xl border border-border/50 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Fotografias
          </h3>
          {photos.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {photos.length}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={photoType} onValueChange={setPhotoType}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="aparelho">Aparelho</SelectItem>
              <SelectItem value="etiqueta">Etiqueta</SelectItem>
              <SelectItem value="estado">Estado</SelectItem>
              <SelectItem value="oficina">Oficina</SelectItem>
              <SelectItem value="antes">Antes</SelectItem>
              <SelectItem value="depois">Depois</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowCamera(true)}
            disabled={isUploading}
            className="gap-1.5"
          >
            {isUploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Adicionar
          </Button>
        </div>
      </div>

      {/* Photo grid */}
      {isLoading ? (
        <p className="text-xs text-muted-foreground text-center py-4">A carregar fotos...</p>
      ) : photos.length === 0 ? (
        <div className="text-center py-6 border border-dashed rounded-lg">
          <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-xs text-muted-foreground">Nenhuma foto registada</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {photos.map((photo: any, index: number) => (
            <div
              key={photo.id}
              className="relative aspect-square rounded-lg overflow-hidden border cursor-pointer group"
              onClick={() => {
                setGalleryIndex(index);
                setGalleryOpen(true);
              }}
            >
              <img
                src={photo.file_url}
                alt={photo.description || 'Foto'}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {photo.photo_type && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] text-center py-0.5 truncate px-1">
                  {PHOTO_TYPE_LABELS[photo.photo_type as PhotoType] || photo.photo_type}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showCamera ? (
        <CameraCapture
          open={showCamera}
          onOpenChange={setShowCamera}
          onCapture={handleCapture}
          title={`Adicionar Foto - ${PHOTO_TYPE_LABELS[photoType as PhotoType] || photoType}`}
        />
      ) : null}

      {galleryOpen ? (
        <PhotoGalleryModal
          photos={photos}
          initialIndex={galleryIndex}
          open={galleryOpen}
          onOpenChange={setGalleryOpen}
          onDelete={handleDeletePhoto}
        />
      ) : null}
    </div>
  );
}
