import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { OwnerSidebar } from './OwnerSidebar';
import { SecretarySidebar } from './SecretarySidebar';
import { TechnicianSidebar } from './TechnicianSidebar';
import { NotificationPanel } from '@/components/shared/NotificationPanel';
import { GuidedTour } from '@/components/onboarding/GuidedTour';
import { ServiceBillingNotice } from '@/components/shared/ServiceBillingNotice';
import { ServiceBillingModal } from '@/components/shared/ServiceBillingModal';

import { DemoRunner } from '@/components/onboarding/DemoRunner';
import { useDemo } from '@/contexts/DemoContext';
import { Bell, Menu, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useRealtime } from '@/hooks/useRealtime';
import { isNotificationSoundEnabled, playNotificationSound } from '@/hooks/useNotificationSound';

export function AppLayout() {
  const { role, user } = useAuth();
  const location = useLocation();
  const { isOpen: isOnboardingOpen } = useOnboarding();
  const { isActive: isDemoActive } = useDemo();
  const [showNotifications, setShowNotifications] = useState(false);

  // ─── Realtime centralizado ───────────────────────────────────────────────
  // Um único conjunto de canais cobre todo o sistema. Debounce de 800ms já
  // está no hook; tabs em background são ignoradas automaticamente.
  //
  // FIX: Added 'technician-services' (ServicosPage agenda) and 'services-all'
  // (PerformancePage) — these were missing, causing F5-only updates for technicians.
  useRealtime('services', [
    ['services'],
    ['services-paginated'],
    ['agenda-services'],
    ['technician-services'],
    ['technician-office-services'],
    ['available-workshop-services'],  // TechnicianOfficePage — open pool
    ['services-all'],
    ['dashboard-stats'],              // DashboardPage COUNT queries
    ['technician-history'],           // TechnicianHistoryPage
    ['tv-monitor-services'],          // TVMonitorPage
    ['pending-transfer-requests'],    // Transferências entre técnicos
    ['activity-logs'],                // Logs de actividade actualizam na sidebar de detalhe
  ]);
  useRealtime('service_parts', [['all-pending-parts']]);
  // budgets channel also invalidates dashboard-stats (it counts budgets too)
  useRealtime('budgets', [['budgets'], ['dashboard-stats']]);
  useRealtime('notifications', [['unread-notifications', user?.id ?? ''], ['notifications']]);

  // Play sound on new incoming notification for current user (if enabled)
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`notif-sound-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          if (isNotificationSoundEnabled()) {
            playNotificationSound();
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Customers: para cliente criado numa página aparecer noutra
  useRealtime('customers', [['customers'], ['customers-paginated']]);

  // Activity logs: para logs aparecerem em tempo real na sidebar
  // de detalhe de serviço
  useRealtime('activity_logs', [['activity-logs'], ['public-activity-logs']]);

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
      <SidebarInset className="flex min-w-0 flex-col min-h-svh">
        <header className="native-chrome sticky top-0 z-40 flex min-h-14 items-center gap-3 border-b border-border/60 px-3 sm:px-5">
          <SidebarTrigger className="h-11 w-11 sm:h-9 sm:w-9" aria-label="Abrir ou recolher menu">
            <Menu className="h-5 w-5" />
          </SidebarTrigger>

          <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
            <span className="hidden font-semibold text-muted-foreground sm:inline">Tecnofrio</span>
            <ChevronRight className="hidden h-3 w-3 text-muted-foreground/60 sm:block" aria-hidden="true" />
            <span className="truncate font-semibold">{{ '/dashboard': 'Dashboard', '/geral': 'Geral', '/oficina': 'Oficina', '/clientes': 'Clientes', '/orcamentos': 'Orçamentos', '/performance': 'Performance', '/colaboradores': 'Colaboradores', '/preferencias': 'Preferências', '/servicos': 'Serviços', '/perfil': 'Perfil', '/concluidos': 'Concluídos', '/debito': 'Débito', '/precificar': 'Precificar' }[location.pathname] ?? 'Tecnofrio'}</span>
          </div>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative h-11 w-11 rounded-lg sm:h-9 sm:w-9"
            aria-label="Notificações"
            title="Notificações"
            onClick={() => setShowNotifications(true)}
            data-tour="notifications-btn"
            data-demo="notifications-btn"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span key={unreadCount} className="badge-pop absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </header>
        {role === 'dono' && (
          <>
            <ServiceBillingNotice />
            <ServiceBillingModal />
          </>
        )}
        <main className="min-w-0 flex-1 bg-background">

          <div key={location.pathname} className="route-enter h-full">
            <Outlet />
          </div>
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
