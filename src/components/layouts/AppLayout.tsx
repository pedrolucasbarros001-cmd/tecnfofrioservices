import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { OwnerSidebar } from './OwnerSidebar';
import { SecretarySidebar } from './SecretarySidebar';
import { TechnicianSidebar } from './TechnicianSidebar';
import { NotificationPanel } from '@/components/shared/NotificationPanel';
import { GuidedTour } from '@/components/onboarding/GuidedTour';
import { DemoRunner } from '@/components/onboarding/DemoRunner';
import { useDemo } from '@/contexts/DemoContext';
import { Bell, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useRealtime } from '@/hooks/useRealtime';

export function AppLayout() {
  const { role, user } = useAuth();
  const { isOpen: isOnboardingOpen } = useOnboarding();
  const { isActive: isDemoActive } = useDemo();
  const [showNotifications, setShowNotifications] = useState(false);

  // ─── Realtime centralizado ───────────────────────────────────────────────
  // Um único conjunto de canais cobre todo o sistema. Debounce de 800ms já
  // está no hook; tabs em background são ignoradas automaticamente.
  useRealtime('services', [
    ['services'],
    ['services-paginated'],
    ['agenda-services'],
  ]);
  useRealtime('service_parts', [['all-pending-parts']]);
  useRealtime('budgets', [['budgets']]);
  useRealtime('notifications', [['unread-notifications', user?.id ?? ''], ['notifications']]);

  // Sanitize UI when returning from idle/tab switch
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Close notification panel to avoid residual sheet overlay
        setShowNotifications(false);
        // Clean orphan body classes if no active tour/demo
        if (!document.querySelector('[data-tour-overlay]')) {
          document.body.classList.remove('tour-active');
        }
        if (!document.querySelector('[data-demo-banner]')) {
          document.body.classList.remove('demo-active');
          document.body.style.paddingTop = '';
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Query for unread notifications count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('Error fetching unread count:', error);
        return 0;
      }
      return count || 0;
    },
    enabled: !!user?.id,
  });

  const getSidebar = () => {
    switch (role) {
      case 'dono':
        return <OwnerSidebar />;
      case 'secretaria':
        return <SecretarySidebar />;
      case 'tecnico':
        return <TechnicianSidebar />;
      default:
        return <OwnerSidebar />;
    }
  };

  return (
    <SidebarProvider>
      {getSidebar()}
      <SidebarInset className="flex flex-col min-h-screen">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border/50 bg-background/80 backdrop-blur-md px-4">
          <SidebarTrigger className="-ml-1">
            <Menu className="h-5 w-5" />
          </SidebarTrigger>

          <div className="flex-1" />

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9 rounded-full"
            onClick={() => setShowNotifications(true)}
            data-tour="notifications-btn"
            data-demo="notifications-btn"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </header>
        <main className="flex-1 overflow-auto bg-background">
          <Outlet />
        </main>
      </SidebarInset>

      {/* Notification Panel */}
      <NotificationPanel
        open={showNotifications}
        onOpenChange={setShowNotifications}
      />

      {/* Guided Tour */}
      {isOnboardingOpen && !isDemoActive && <GuidedTour />}
      {/* Interactive Demo */}
      {isDemoActive && <DemoRunner />}
    </SidebarProvider>
  );
}
