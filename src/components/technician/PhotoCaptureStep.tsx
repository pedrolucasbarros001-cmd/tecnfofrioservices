import { useState } from 'react';
import { Camera, Image, Plus, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CameraCapture } from '@/components/shared/CameraCapture';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateServiceQueries } from '@/lib/queryInvalidation';
import type { PhotoType } from '@/types/database';

interface PhotoCaptureStepProps {
  serviceId: string;
  photoType: PhotoType;
  title: string;
  description: string;
  required?: boolean;
  multiple?: boolean;
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  className?: string;
}

export function PhotoCaptureStep({
  serviceId,
  photoType,
  title,
  description,
  required = false,
  multiple = false,
  photos,
  onPhotosChange,
  className,
}: PhotoCaptureStepProps) {
  const [showCamera, setShowCamera] = useState(false);
  const queryClient = useQueryClient();

  const handlePhotoCapture = async (imageData: string) => {
    try {
      await supabase.from('service_photos').insert({
        service_id: serviceId,
        photo_type: photoType,
        file_url: imageData,
        description: title,
      });
      
      queryClient.invalidateQueries({ queryKey: ['service-photos', serviceId] });
      
      if (multiple) {
        onPhotosChange([...photos, imageData]);
      } else {
        onPhotosChange([imageData]);
      }
      
      setShowCamera(false);
      toast.success('Foto guardada!');
    } catch (error) {
      console.error('Error saving photo:', error);
      toast.error('Erro ao guardar foto');
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
  };

  const hasPhotos = photos.length > 0;
  const canAddMore = multiple || photos.length === 0;

  return (
    <div className={cn('space-y-4', className)}>
      <div>
        <h3 className="font-medium text-sm flex items-center gap-2">
          {title}
          {required && <span className="text-destructive">*</span>}
          {hasPhotos && <Check className="h-4 w-4 text-green-500" />}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>

      {/* Photo Grid */}
      {hasPhotos && (
        <div className={cn(
          'grid gap-2',
          multiple ? 'grid-cols-3' : 'grid-cols-1'
        )}>
          {photos.map((photo, idx) => (
            <div key={idx} className="relative group">
              <img
                src={photo}
                alt={`${title} ${idx + 1}`}
                className={cn(
                  'object-cover rounded-lg border',
                  multiple ? 'w-full h-24' : 'w-full h-48'
                )}
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removePhoto(idx)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
          
          {/* Add more button for multiple */}
          {multiple && canAddMore && (
            <button
              onClick={() => setShowCamera(true)}
              className="flex flex-col items-center justify-center h-24 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30 transition-colors"
            >
              <Plus className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground mt-1">Adicionar</span>
            </button>
          )}
        </div>
      )}

      {/* Initial capture button */}
      {!hasPhotos && (
        <Button
          variant="outline"
          className="w-full h-32 flex-col gap-2"
          onClick={() => setShowCamera(true)}
        >
          <Camera className="h-8 w-8 text-muted-foreground" />
          <span>Tirar Foto</span>
        </Button>
      )}

      {/* Replace photo button for single */}
      {hasPhotos && !multiple && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setShowCamera(true)}
        >
          <Camera className="h-4 w-4 mr-1" />
          Tirar Nova Foto
        </Button>
      )}

      {/* Camera Modal */}
      <CameraCapture
        open={showCamera}
        onOpenChange={setShowCamera}
        onCapture={handlePhotoCapture}
        title={title}
      />
    </div>
  );
}
