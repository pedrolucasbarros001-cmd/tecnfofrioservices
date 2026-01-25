import { useRef, useCallback, useState } from 'react';
import { Camera, RotateCcw, Check, X } from 'lucide-react';
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
      setStream(mediaStream);
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Não foi possível aceder à câmara. Verifique as permissões.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(imageData);
      stopCamera();
    }
  }, [stopCamera]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  const confirmPhoto = useCallback(() => {
    if (capturedImage) {
      onCapture(capturedImage);
      handleClose();
    }
  }, [capturedImage, onCapture]);

  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setError(null);
    onOpenChange(false);
  };

  // Start camera when modal opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      startCamera();
    } else {
      handleClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="relative aspect-[4/3] bg-black overflow-hidden">
          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4 text-center">
              <X className="h-12 w-12 mb-3 text-red-500" />
              <p>{error}</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={startCamera}
              >
                Tentar Novamente
              </Button>
            </div>
          ) : capturedImage ? (
            <img 
              src={capturedImage} 
              alt="Foto capturada" 
              className="w-full h-full object-cover"
            />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="p-4 flex justify-center gap-4">
          {capturedImage ? (
            <>
              <Button
                variant="outline"
                onClick={retakePhoto}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Nova Foto
              </Button>
              <Button
                onClick={confirmPhoto}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                <Check className="h-4 w-4" />
                Guardar Foto
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                onClick={capturePhoto}
                disabled={!stream}
                className="gap-2"
              >
                <Camera className="h-4 w-4" />
                Tirar Foto
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
