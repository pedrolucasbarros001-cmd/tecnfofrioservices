import { useRef, useCallback, useState, useEffect } from 'react';
import { Camera, RotateCcw, Check, X, Upload, Loader2 } from 'lucide-react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraReady(false);
  }, [stream]);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);
      setCameraReady(false);

      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Câmara não suportada neste dispositivo/browser. Use a opção de upload.');
        setIsLoading(false);
        return;
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false,
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
            .then(() => {
              setStream(mediaStream);
              setCameraReady(true);
              setIsLoading(false);
            })
            .catch((playError) => {
              console.error('Error playing video:', playError);
              setError('Erro ao iniciar o vídeo da câmara.');
              setIsLoading(false);
            });
        };
      }
    } catch (err: unknown) {
      console.error('Error accessing camera:', err);
      
      let errorMessage = 'Não foi possível aceder à câmara.';
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMessage = 'Permissão negada. Por favor, permita o acesso à câmara nas definições do browser.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          errorMessage = 'Nenhuma câmara encontrada neste dispositivo.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          errorMessage = 'A câmara está a ser usada por outra aplicação.';
        } else if (err.name === 'OverconstrainedError') {
          errorMessage = 'Não foi possível aceder à câmara com as configurações solicitadas.';
        } else if (err.name === 'NotSupportedError') {
          errorMessage = 'Câmara não suportada. Requer HTTPS.';
        }
      }
      
      setError(errorMessage);
      setIsLoading(false);
    }
  }, []);

  // Start camera when modal opens
  useEffect(() => {
    if (open) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        startCamera();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      stopCamera();
      setCapturedImage(null);
      setError(null);
      setIsLoading(false);
    }
  }, [open, startCamera, stopCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(imageData);
      stopCamera();
    }
  }, [stopCamera]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result as string);
        stopCamera();
      };
      reader.readAsDataURL(file);
    }
  }, [stopCamera]);

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    setError(null);
    startCamera();
  }, [startCamera]);

  const confirmPhoto = useCallback(() => {
    if (capturedImage) {
      onCapture(capturedImage);
      onOpenChange(false);
    }
  }, [capturedImage, onCapture, onOpenChange]);

  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setError(null);
    setIsLoading(false);
    onOpenChange(false);
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

        <div className="relative aspect-[4/3] bg-black overflow-hidden">
          {/* Hidden file input for fallback */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileUpload}
          />

          {isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
              <Loader2 className="h-10 w-10 animate-spin mb-3" />
              <p className="text-sm">A iniciar câmara...</p>
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4 text-center">
              <X className="h-10 w-10 mb-3 text-red-500" />
              <p className="text-sm mb-4">{error}</p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={startCamera}
                >
                  Tentar Novamente
                </Button>
                <Button 
                  size="sm"
                  onClick={triggerFileUpload}
                  className="gap-1"
                >
                  <Upload className="h-4 w-4" />
                  Upload
                </Button>
              </div>
            </div>
          ) : capturedImage ? (
            <img 
              src={capturedImage} 
              alt="Foto capturada" 
              className="w-full h-full object-cover"
            />
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {!cameraReady && !isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              )}
            </>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="p-3 flex justify-center gap-3">
          {capturedImage ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={retakePhoto}
                className="gap-1.5"
              >
                <RotateCcw className="h-4 w-4" />
                Nova Foto
              </Button>
              <Button
                size="sm"
                onClick={confirmPhoto}
                className="gap-1.5 bg-green-600 hover:bg-green-700"
              >
                <Check className="h-4 w-4" />
                Guardar
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={triggerFileUpload}
                className="gap-1.5"
              >
                <Upload className="h-4 w-4" />
                Upload
              </Button>
              <Button
                size="sm"
                onClick={capturePhoto}
                disabled={!cameraReady}
                className="gap-1.5"
              >
                <Camera className="h-4 w-4" />
                Capturar
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
