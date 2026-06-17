import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useNotificationSound, playNotificationSound } from '@/hooks/useNotificationSound';

export function NotificationSoundToggle() {
  const { soundEnabled, setSoundEnabled } = useNotificationSound();

  const handleToggle = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (next) {
      // Test beep + primes AudioContext on first enable
      playNotificationSound();
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleToggle}
            aria-label={soundEnabled ? 'Desativar som' : 'Ativar som'}
          >
            {soundEnabled ? (
              <Volume2 className="h-4 w-4 text-primary" />
            ) : (
              <VolumeX className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Som de notificação: {soundEnabled ? 'Ativado' : 'Desativado'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
