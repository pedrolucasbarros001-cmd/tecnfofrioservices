import { useRef, useCallback, useState, useEffect } from 'react';
import { Camera, RotateCcw, Check, X, Upload, Loader2, ImageIcon, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCameraPermissions, PermissionStatus } from '@/hooks/useCameraPermissions';

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
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [permissionState, setPermissionState] = useState<PermissionStatus>('checking');
  
  const { status, isSupported, requestPermission } = useCameraPermissions();

  // Sync permission state from hook
  useEffect(() => {
    if (open) {
      setPermissionState(status);
    }
  }, [status, open]);

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

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setPermissionState('unsupported');
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
        
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
            .then(() => {
              setStream(mediaStream);
              setCameraReady(true);
              setIsLoading(false);
              setPermissionState('granted');
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
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setPermissionState('denied');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError('Nenhuma câmara encontrada neste dispositivo.');
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setError('A câmara está a ser usada por outra aplicação.');
        } else if (err.name === 'OverconstrainedError') {
          setError('Não foi possível aceder à câmara com as configurações solicitadas.');
        } else if (err.name === 'NotSupportedError') {
          setError('Câmara não suportada. Requer HTTPS.');
        } else {
          setError('Não foi possível aceder à câmara.');
        }
      }
      
      setIsLoading(false);
    }
  }, []);

  const handleRequestPermission = useCallback(async () => {
    setIsLoading(true);
    const granted = await requestPermission();
    setIsLoading(false);
    
    if (granted) {
      setPermissionState('granted');
      startCamera();
    } else {
      setPermissionState('denied');
    }
  }, [requestPermission, startCamera]);

  // Start camera flow when modal opens
  useEffect(() => {
    if (open) {
      // Reset state
      setCapturedImage(null);
      setError(null);
      setIsLoading(false);
      
      // Check permission and start camera if already granted
      if (status === 'granted') {
        const timer = setTimeout(() => {
          startCamera();
        }, 100);
        return () => clearTimeout(timer);
      } else if (status === 'prompt' || status === 'checking') {
        // Will show permission request UI
        setPermissionState(status === 'checking' ? 'prompt' : status);
      } else {
        setPermissionState(status);
      }
    } else {
      stopCamera();
      setCapturedImage(null);
      setError(null);
      setIsLoading(false);
    }
  }, [open, status, startCamera, stopCamera]);

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
    // Reset input value so same file can be selected again
    e.target.value = '';
  }, [stopCamera]);

  const triggerCameraInput = () => {
    cameraInputRef.current?.click();
  };

  const triggerGalleryInput = () => {
    galleryInputRef.current?.click();
  };

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    setError(null);
    if (permissionState === 'granted') {
      startCamera();
    }
  }, [permissionState, startCamera]);

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

  // Render permission request screen
  const renderPermissionPrompt = () => (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-background">
      <Camera className="h-16 w-16 text-primary mb-4" />
      <h3 className="text-lg font-semibold mb-2">Acesso à Câmara</h3>
      <p className="text-sm text-muted-foreground mb-6">
        Para tirar fotos, precisamos de permissão para aceder à câmara do dispositivo.
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button 
          onClick={handleRequestPermission} 
          className="gap-2"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
          Permitir Acesso à Câmara
        </Button>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={triggerCameraInput}
            className="flex-1 gap-1.5"
          >
            <Camera className="h-4 w-4" />
            Câmara Nativa
          </Button>
          <Button 
            variant="outline" 
            onClick={triggerGalleryInput}
            className="flex-1 gap-1.5"
          >
            <ImageIcon className="h-4 w-4" />
            Galeria
          </Button>
        </div>
      </div>
    </div>
  );

  // Render permission denied screen
  const renderPermissionDenied = () => (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-background">
      <AlertCircle className="h-16 w-16 text-destructive mb-4" />
      <h3 className="text-lg font-semibold mb-2">Permissão Negada</h3>
      <p className="text-sm text-muted-foreground mb-4">
        O acesso à câmara foi bloqueado. Para usar a câmara:
      </p>
      <div className="text-left text-sm bg-muted p-4 rounded-lg mb-4 w-full max-w-xs">
        <p className="font-medium mb-1">📱 No telemóvel:</p>
        <p className="text-muted-foreground text-xs mb-3">
          Definições → Aplicações → Browser → Permissões → Câmara
        </p>
        <p className="font-medium mb-1">💻 No computador:</p>
        <p className="text-muted-foreground text-xs">
          Clique no ícone 🔒 na barra de endereço → Permissões → Câmara → Permitir
        </p>
      </div>
      <div className="flex gap-2 w-full max-w-xs">
        <Button 
          variant="outline" 
          onClick={triggerCameraInput}
          className="flex-1 gap-1.5"
        >
          <Camera className="h-4 w-4" />
          Câmara Nativa
        </Button>
        <Button 
          variant="outline" 
          onClick={triggerGalleryInput}
          className="flex-1 gap-1.5"
        >
          <ImageIcon className="h-4 w-4" />
          Galeria
        </Button>
      </div>
    </div>
  );

  // Render unsupported browser screen
  const renderUnsupported = () => (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-background">
      <X className="h-16 w-16 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">Câmara Não Suportada</h3>
      <p className="text-sm text-muted-foreground mb-6">
        O seu browser não suporta acesso à câmara. Use as opções abaixo:
      </p>
      <div className="flex gap-2 w-full max-w-xs">
        <Button 
          variant="outline" 
          onClick={triggerCameraInput}
          className="flex-1 gap-1.5"
        >
          <Camera className="h-4 w-4" />
          Tirar Foto
        </Button>
        <Button 
          variant="outline" 
          onClick={triggerGalleryInput}
          className="flex-1 gap-1.5"
        >
          <ImageIcon className="h-4 w-4" />
          Da Galeria
        </Button>
      </div>
    </div>
  );

  // Render error screen
  const renderError = () => (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4 text-center">
      <X className="h-10 w-10 mb-3 text-destructive" />
      <p className="text-sm mb-4">{error}</p>
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
            setError(null);
            startCamera();
          }}
        >
          Tentar Novamente
        </Button>
        <Button 
          size="sm"
          onClick={triggerGalleryInput}
          className="gap-1"
        >
          <Upload className="h-4 w-4" />
          Upload
        </Button>
      </div>
    </div>
  );

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

          {/* Captured image preview */}
          {capturedImage ? (
            <img 
              src={capturedImage} 
              alt="Foto capturada" 
              className="w-full h-full object-cover"
            />
          ) : (
            <>
              {/* Permission states */}
              {permissionState === 'checking' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
                  <p className="text-sm text-muted-foreground">A verificar permissões...</p>
                </div>
              )}
              
              {permissionState === 'prompt' && !isLoading && !cameraReady && renderPermissionPrompt()}
              
              {permissionState === 'denied' && renderPermissionDenied()}
              
              {permissionState === 'unsupported' && !isSupported && renderUnsupported()}
              
              {/* Loading camera */}
              {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <Loader2 className="h-10 w-10 animate-spin mb-3" />
                  <p className="text-sm">A iniciar câmara...</p>
                </div>
              )}
              
              {/* Error state */}
              {error && renderError()}
              
              {/* Video preview when camera is ready */}
              {permissionState === 'granted' && !error && (
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
              {permissionState === 'granted' && cameraReady && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={triggerGalleryInput}
                    className="gap-1.5"
                  >
                    <ImageIcon className="h-4 w-4" />
                    Galeria
                  </Button>
                  <Button
                    size="sm"
                    onClick={capturePhoto}
                    className="gap-1.5"
                  >
                    <Camera className="h-4 w-4" />
                    Capturar
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
