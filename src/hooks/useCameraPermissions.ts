import { useState, useEffect, useCallback } from 'react';

export type PermissionStatus = 'checking' | 'granted' | 'denied' | 'prompt' | 'unsupported';

interface CameraPermissionState {
  status: PermissionStatus;
  isSupported: boolean;
  canRequest: boolean;
}

export function useCameraPermissions() {
  const [state, setState] = useState<CameraPermissionState>({
    status: 'checking',
    isSupported: false,
    canRequest: false,
  });

  const checkPermission = useCallback(async (): Promise<PermissionStatus> => {
    // Check if mediaDevices is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return 'unsupported';
    }

    // Try to use Permissions API (not supported in Safari/iOS)
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
        return result.state as PermissionStatus;
      } catch {
        // Permissions API doesn't support camera query (Safari/iOS)
        // Return 'prompt' to trigger getUserMedia which will show native prompt
        return 'prompt';
      }
    }

    // Fallback for browsers without Permissions API
    return 'prompt';
  }, []);

  useEffect(() => {
    let permissionStatus: PermissionStatus | null = null;

    const init = async () => {
      const isSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      
      if (!isSupported) {
        setState({
          status: 'unsupported',
          isSupported: false,
          canRequest: false,
        });
        return;
      }

      permissionStatus = await checkPermission();
      
      setState({
        status: permissionStatus,
        isSupported: true,
        canRequest: permissionStatus === 'prompt' || permissionStatus === 'granted',
      });

      // Listen for permission changes (Chrome/Edge/Firefox)
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
          result.addEventListener('change', () => {
            setState(prev => ({
              ...prev,
              status: result.state as PermissionStatus,
              canRequest: result.state === 'prompt' || result.state === 'granted',
            }));
          });
        } catch {
          // Ignore - Safari doesn't support this
        }
      }
    };

    init();
  }, [checkPermission]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      // Stop tracks immediately - we just wanted to trigger the permission prompt
      stream.getTracks().forEach(track => track.stop());
      
      setState(prev => ({
        ...prev,
        status: 'granted',
        canRequest: true,
      }));
      
      return true;
    } catch (err) {
      const error = err as Error;
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setState(prev => ({
          ...prev,
          status: 'denied',
          canRequest: false,
        }));
      }
      
      return false;
    }
  }, []);

  return {
    ...state,
    requestPermission,
    checkPermission,
  };
}
