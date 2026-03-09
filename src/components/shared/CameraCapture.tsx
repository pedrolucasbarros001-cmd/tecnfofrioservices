import { useRef, useCallback, useState } from 'react';
import { Camera, RotateCcw, Check, X, ImageIcon, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface CameraCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (imageData: string | string[]) => void;
  title?: string;
}

export function CameraCapture({
  open,
  onOpenChange,
  onCapture,
  title = 'Tirar Foto',
}: CameraCaptureProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setIsProcessing(true);
      const fileList = Array.from(files).slice(0, 5); // Limit to 5
      const readers = fileList.map(file => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      Promise.all(readers)
        .then(results => {
          setCapturedImages(prev => [...prev, ...results].slice(0, 5));
          setIsProcessing(false);
        })
        .catch(err => {
          setIsProcessing(false);
          console.error("Erro ao ler arquivos", err);
        });
    }
    // Reset input to allow same file selection
    e.target.value = '';
  }, []);

  const triggerCameraInput = () => cameraInputRef.current?.click();
  const triggerGalleryInput = () => galleryInputRef.current?.click();

  const confirmPhotos = useCallback(() => {
    if (capturedImages.length > 0) {
      onCapture(capturedImages.length === 1 ? capturedImages[0] : capturedImages);
      handleClose();
    }
  }, [capturedImages, onCapture]);

  const handleClose = useCallback(() => {
    setCapturedImages([]);
    setIsProcessing(false);
    onOpenChange(false);
  }, [onOpenChange]);

  const removePhoto = (index: number) => {
    setCapturedImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-[500px] w-[95vw] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Camera className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="relative aspect-[4/3] max-h-[50vh] bg-black overflow-hidden">
          {/* Hidden file inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileUpload}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileUpload}
          />

          {capturedImages.length > 0 ? (
            <div className="w-full h-full flex flex-col">
              <div className="flex-1 relative bg-black flex items-center justify-center">
                <img
                  src={capturedImages[capturedImages.length - 1]}
                  alt="Última foto capturada"
                  className="max-w-full max-h-full object-contain"
                />
                {capturedImages.length > 1 && (
                  <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded-full backdrop-blur-md">
                    {capturedImages.length} fotos selecionadas
                  </div>
                )}
              </div>
              <div className="h-20 bg-muted/50 border-t flex items-center gap-2 px-2 overflow-x-auto">
                {capturedImages.map((img, idx) => (
                  <div key={idx} className="relative h-16 aspect-square shrink-0 rounded border bg-black group">
                    <img src={img} className="w-full h-full object-cover rounded" />
                    <button
                      onClick={() => removePhoto(idx)}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {capturedImages.length < 5 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-16 aspect-square shrink-0 border-dashed"
                    onClick={() => triggerGalleryInput()}
                  >
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-background/10 backdrop-blur-sm">
              {isProcessing ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-10 w-10 animate-spin text-white" />
                  <p className="text-white text-sm">A processar imagem...</p>
                </div>
              ) : (
                <>
                  <Camera className="h-12 w-12 text-white/50 mb-4" />
                  <p className="text-white text-sm mb-6">
                    Selecione uma opção para capturar a foto do aparelho ou documento.
                  </p>
                  <div className="flex flex-col gap-3 w-full max-w-xs">
                    <Button
                      onClick={triggerCameraInput}
                      className="gap-2 bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      <Camera className="h-4 w-4" />
                      Câmara Nativa
                    </Button>
                    <Button
                      variant="outline"
                      onClick={triggerGalleryInput}
                      className="gap-2 border-white/20 text-white hover:bg-white/10"
                    >
                      <ImageIcon className="h-4 w-4" />
                      Galeria
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="p-4 flex justify-center gap-3 bg-muted/30">
          {capturedImages.length > 0 ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCapturedImages([])}
                className="gap-1.5"
                disabled={isProcessing}
              >
                <RotateCcw className="h-4 w-4" />
                Limpar tudo
              </Button>
              <Button
                size="sm"
                onClick={confirmPhotos}
                className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                disabled={isProcessing}
              >
                <Check className="h-4 w-4" />
                Confirmar {capturedImages.length} {capturedImages.length === 1 ? 'Foto' : 'Fotos'}
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="sm" onClick={handleClose} disabled={isProcessing}>
              Cancelar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
