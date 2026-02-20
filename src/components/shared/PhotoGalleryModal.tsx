import { useState, useCallback, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Trash2, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import { PHOTO_TYPE_LABELS, type PhotoType } from '@/types/database';

interface Photo {
  id: string;
  file_url: string;
  photo_type?: string | null;
  description?: string | null;
}

interface PhotoGalleryModalProps {
  photos: Photo[];
  initialIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: (photoId: string) => Promise<void>;
}

export function PhotoGalleryModal({
  photos,
  initialIndex = 0,
  open,
  onOpenChange,
  onDelete,
}: PhotoGalleryModalProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(initialIndex);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!api) return;
    api.scrollTo(initialIndex, true);
  }, [api, initialIndex]);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on('select', onSelect);
    onSelect();
    return () => { api.off('select', onSelect); };
  }, [api]);

  const scrollPrev = useCallback(() => api?.scrollPrev(), [api]);
  const scrollNext = useCallback(() => api?.scrollNext(), [api]);

  if (photos.length === 0) return null;

  const currentPhoto = photos[current];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full w-full h-full max-h-[100dvh] p-0 bg-black/95 border-none rounded-none [&>button]:hidden z-[100]">
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-9 w-9"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-5 w-5" />
          </Button>
          <span className="text-white/80 text-sm font-medium">
            {current + 1} / {photos.length}
          </span>
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-destructive h-9 w-9"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting}
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Carousel */}
        <div className="flex items-center justify-center h-full w-full">
          <Carousel
            setApi={setApi}
            opts={{ startIndex: initialIndex, loop: photos.length > 1 }}
            className="w-full h-full"
          >
            <CarouselContent className="h-full">
              {photos.map((photo) => (
                <CarouselItem key={photo.id} className="flex items-center justify-center h-[100dvh]">
                  <img
                    src={photo.file_url}
                    alt={photo.description || 'Foto do serviço'}
                    className="max-w-full max-h-[80dvh] object-contain select-none"
                    draggable={false}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>

            {/* Nav buttons - desktop */}
            {photos.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-10 w-10 hidden sm:flex"
                  onClick={scrollPrev}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-10 w-10 hidden sm:flex"
                  onClick={scrollNext}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}
          </Carousel>
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 z-10 flex flex-col items-center gap-2 pb-6">
          {currentPhoto?.photo_type && (
            <Badge variant="secondary" className="bg-white/20 text-white border-none">
              {PHOTO_TYPE_LABELS[currentPhoto.photo_type as PhotoType] || currentPhoto.photo_type}
            </Badge>
          )}
          {/* Dot indicators */}
          {photos.length > 1 && photos.length <= 10 && (
            <div className="flex gap-1.5">
              {photos.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full transition-colors ${i === current ? 'bg-white' : 'bg-white/40'
                    }`}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Foto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja eliminar esta foto? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async (e) => {
                e.preventDefault();
                if (!onDelete || !currentPhoto) return;
                setIsDeleting(true);
                try {
                  await onDelete(currentPhoto.id);
                  if (photos.length <= 1) {
                    onOpenChange(false);
                  }
                } finally {
                  setIsDeleting(false);
                  setShowDeleteConfirm(false);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
