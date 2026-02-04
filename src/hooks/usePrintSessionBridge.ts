import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SessionBridgeState {
  isSettling: boolean;
  sessionRestored: boolean;
  error: string | null;
}

/**
 * Hook for print pages to request session from opener window.
 * Solves the issue where new tabs in partitioned storage environments
 * (like iframes) don't have access to the parent's Supabase session.
 * 
 * Flow:
 * 1. Check if we already have a session
 * 2. If not, and we have window.opener, request session via postMessage
 * 3. Wait for response or timeout
 * 4. If session received, inject it into Supabase client
 */
export function usePrintSessionBridge(timeoutMs = 3000): SessionBridgeState {
  const [state, setState] = useState<SessionBridgeState>({
    isSettling: true,
    sessionRestored: false,
    error: null,
  });
  const hasAttemptedBridge = useRef(false);

  useEffect(() => {
    // Only run once
    if (hasAttemptedBridge.current) return;
    hasAttemptedBridge.current = true;

    const attemptBridge = async () => {
      try {
        // First check if we already have a session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          console.log('[SessionBridge] Already have session');
          setState({ isSettling: false, sessionRestored: true, error: null });
          return;
        }

        // No session - check if we have an opener to request from
        if (!window.opener) {
          console.log('[SessionBridge] No opener window, cannot bridge');
          setState({ isSettling: false, sessionRestored: false, error: 'no_opener' });
          return;
        }

        console.log('[SessionBridge] Requesting session from opener...');

        // Set up timeout
        const timeoutId = setTimeout(() => {
          console.log('[SessionBridge] Timeout waiting for session');
          setState({ isSettling: false, sessionRestored: false, error: 'timeout' });
        }, timeoutMs);

        // Listen for session response
        const handleMessage = async (event: MessageEvent) => {
          // Security: only accept messages from same origin
          if (event.origin !== window.location.origin) return;
          
          if (event.data?.type === 'SUPABASE_SESSION') {
            clearTimeout(timeoutId);
            window.removeEventListener('message', handleMessage);

            const { access_token, refresh_token } = event.data;
            
            if (access_token && refresh_token) {
              try {
                console.log('[SessionBridge] Received session, setting...');
                const { error } = await supabase.auth.setSession({
                  access_token,
                  refresh_token,
                });
                
                if (error) {
                  console.error('[SessionBridge] Error setting session:', error);
                  setState({ isSettling: false, sessionRestored: false, error: 'set_session_failed' });
                } else {
                  console.log('[SessionBridge] Session restored successfully');
                  setState({ isSettling: false, sessionRestored: true, error: null });
                }
              } catch (err) {
                console.error('[SessionBridge] Exception setting session:', err);
                setState({ isSettling: false, sessionRestored: false, error: 'exception' });
              }
            } else {
              console.log('[SessionBridge] Received empty session');
              setState({ isSettling: false, sessionRestored: false, error: 'empty_session' });
            }
          }
        };

        window.addEventListener('message', handleMessage);

        // Request session from opener
        try {
          window.opener.postMessage(
            { type: 'REQUEST_SUPABASE_SESSION' },
            window.location.origin
          );
        } catch (err) {
          console.error('[SessionBridge] Failed to postMessage to opener:', err);
          clearTimeout(timeoutId);
          window.removeEventListener('message', handleMessage);
          setState({ isSettling: false, sessionRestored: false, error: 'postmessage_failed' });
        }

      } catch (err) {
        console.error('[SessionBridge] Unexpected error:', err);
        setState({ isSettling: false, sessionRestored: false, error: 'unexpected' });
      }
    };

    attemptBridge();
  }, [timeoutMs]);

  return state;
}
