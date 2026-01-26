import { useRef, useCallback, useEffect, useState } from 'react';
import { Camera, RotateCcw, Check, X, Upload, Loader2, ImageIcon, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCameraPermissions } from '@/hooks/useCameraPermissions';

interface CameraCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (imageData: string) => void;
  title?: string;
}

// State machine for camera phases
type CameraPhase = 
  | 'idle'
  | 'checking'
  | 'prompt'
  | 'loading'
  | 'ready'
  | 'denied'
  | 'unsupported'
  | 'error'
  | 'captured';

interface CameraState {
  phase: CameraPhase;
  errorMessage?: string;
  capturedImage?: string;
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
  const streamRef = useRef<MediaStream | null>(null);
  
  // Single consolidated state
  const [state, setState] = useState<CameraState>({ phase: 'idle' });
  
  const { status, isSupported, requestPermission } = useCameraPermissions();

  // Stop camera helper (doesn't cause re-renders)
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Main effect for camera lifecycle - minimal dependencies
  useEffect(() => {
    if (!open) {
      stopCamera();
      setState({ phase: 'idle' });
      return;
    }

    let isMounted = true;

    const initCamera = async () => {
      // Check browser support
      if (!navigator.mediaDevices?.getUserMedia) {
        if (isMounted) setState({ phase: 'unsupported' });
        return;
      }

      // Check permission status
      if (status === 'denied') {
        if (isMounted) setState({ phase: 'denied' });
        return;
      }

      if (status === 'prompt' || status === 'checking') {
        if (isMounted) setState({ phase: 'prompt' });
        return;
      }

      // Permission granted - start camera
      if (isMounted) setState({ phase: 'loading' });

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false,
        });

        // Check if component was unmounted during async operation
        if (!isMounted) {
          mediaStream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = mediaStream;

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          
          // Wait for video to be ready
          await new Promise<void>((resolve, reject) => {
            if (!videoRef.current) {
              reject(new Error('Video ref lost'));
              return;
            }
            
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play()
                .then(() => resolve())
                .catch(reject);
            };
            
            videoRef.current.onerror = () => reject(new Error('Video error'));
          });

          // Stabilization delay - prevents flickering
          await new Promise(resolve => setTimeout(resolve, 300));

          if (isMounted) {
            setState({ phase: 'ready' });
          }
        }
      } catch (err: unknown) {
        if (!isMounted) return;

        console.error('Camera error:', err);

        if (err instanceof Error) {
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            setState({ phase: 'denied' });
          } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            setState({ phase: 'error', errorMessage: 'Nenhuma câmara encontrada neste dispositivo.' });
          } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
            setState({ phase: 'error', errorMessage: 'A câmara está a ser usada por outra aplicação.' });
          } else if (err.name === 'OverconstrainedError') {
            setState({ phase: 'error', errorMessage: 'Não foi possível aceder à câmara com as configurações solicitadas.' });
          } else if (err.name === 'NotSupportedError') {
            setState({ phase: 'error', errorMessage: 'Câmara não suportada. Requer HTTPS.' });
          } else {
            setState({ phase: 'error', errorMessage: 'Não foi possível aceder à câmara.' });
          }
        } else {
          setState({ phase: 'error', errorMessage: 'Erro desconhecido ao aceder à câmara.' });
        }
      }
    };

    initCamera();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [open, status, stopCamera]);

  const handleRequestPermission = useCallback(async () => {
    setState({ phase: 'loading' });
    const granted = await requestPermission();
    
    if (!granted) {
      setState({ phase: 'denied' });
    }
    // If granted, the useEffect will handle starting the camera
  }, [requestPermission]);

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
      stopCamera();
      setState({ phase: 'captured', capturedImage: imageData });
    }
  }, [stopCamera]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        stopCamera();
        setState({ phase: 'captured', capturedImage: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  }, [stopCamera]);

  const triggerCameraInput = () => cameraInputRef.current?.click();
  const triggerGalleryInput = () => galleryInputRef.current?.click();

  const retakePhoto = useCallback(() => {
    setState({ phase: 'loading' });
    // Re-trigger the camera init by forcing a state change
    // The useEffect will handle restarting
  }, []);

  const confirmPhoto = useCallback(() => {
    if (state.capturedImage) {
      onCapture(state.capturedImage);
      onOpenChange(false);
    }
  }, [state.capturedImage, onCapture, onOpenChange]);

  const handleClose = useCallback(() => {
    stopCamera();
    setState({ phase: 'idle' });
    onOpenChange(false);
  }, [stopCamera, onOpenChange]);

  // Render helpers
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
          disabled={state.phase === 'loading'}
        >
          {state.phase === 'loading' ? (
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

  const renderError = () => (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4 text-center">
      <X className="h-10 w-10 mb-3 text-destructive" />
      <p className="text-sm mb-4">{state.errorMessage}</p>
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setState({ phase: 'loading' })}
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

  const renderLoading = () => (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-white">
      <Loader2 className="h-10 w-10 animate-spin mb-3" />
      <p className="text-sm">A iniciar câmara...</p>
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

          {/* State-based rendering */}
          {state.phase === 'captured' && state.capturedImage ? (
            <img 
              src={state.capturedImage} 
              alt="Foto capturada" 
              className="w-full h-full object-cover"
            />
          ) : (
            <>
              {state.phase === 'checking' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
                  <p className="text-sm text-muted-foreground">A verificar permissões...</p>
                </div>
              )}
              
              {state.phase === 'prompt' && renderPermissionPrompt()}
              {state.phase === 'denied' && renderPermissionDenied()}
              {state.phase === 'unsupported' && renderUnsupported()}
              {state.phase === 'loading' && renderLoading()}
              {state.phase === 'error' && renderError()}
              
              {state.phase === 'ready' && (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              )}
            </>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="p-3 flex justify-center gap-3">
          {state.phase === 'captured' ? (
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
              {state.phase === 'ready' && (
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
