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
  onCapture: (imageData: string) => void;
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

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessing(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result as string);
        setIsProcessing(false);
      };
      reader.onerror = () => {
        setIsProcessing(false);
        console.error("Erro ao ler arquivo");
      };
      reader.readAsDataURL(file);
    }
    // Reset input to allow same file selection
    e.target.value = '';
  }, []);

  const triggerCameraInput = () => cameraInputRef.current?.click();
  const triggerGalleryInput = () => galleryInputRef.current?.click();

  const retakePhoto = () => {
    setCapturedImage(null);
  };

  const confirmPhoto = useCallback(() => {
    if (capturedImage) {
      onCapture(capturedImage);
      handleClose();
    }
  }, [capturedImage, onCapture]);

  const handleClose = useCallback(() => {
    setCapturedImage(null);
    setIsProcessing(false);
    onOpenChange(false);
  }, [onOpenChange]);

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
            className="hidden"
            onChange={handleFileUpload}
          />

          {capturedImage ? (
            <img
              src={capturedImage}
              alt="Foto capturada"
              className="w-full h-full object-cover"
            />
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
          {capturedImage ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={retakePhoto}
                className="gap-1.5"
                disabled={isProcessing}
              >
                <RotateCcw className="h-4 w-4" />
                Tentar novamente
              </Button>
              <Button
                size="sm"
                onClick={confirmPhoto}
                className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                disabled={isProcessing}
              >
                <Check className="h-4 w-4" />
                Confirmar Foto
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
