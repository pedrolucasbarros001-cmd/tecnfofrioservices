import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { OwnerSidebar } from './OwnerSidebar';
import { SecretarySidebar } from './SecretarySidebar';
import { TechnicianSidebar } from './TechnicianSidebar';
import { NotificationPanel } from '@/components/shared/NotificationPanel';
import { Bell, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import tecnofrioLogoIcon from '@/assets/tecnofrio-logo-icon.png';

export function AppLayout() {
  const { role, user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);

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
    refetchInterval: 30000, // Refetch every 30 seconds
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
        <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-white px-4">
          <SidebarTrigger className="-ml-1">
            <Menu className="h-5 w-5" />
          </SidebarTrigger>
          
          {/* Branding TECNOFRIO */}
          <div className="flex items-center gap-3">
            <img 
              src={tecnofrioLogoIcon} 
              alt="TECNOFRIO" 
              className="h-8 w-8 object-contain"
            />
            <div className="flex flex-col">
              <span className="text-base font-bold leading-tight">
                <span className="text-[#2B4F84]">TECNO</span>
                <span className="text-slate-700">FRIO</span>
              </span>
              <span className="text-[10px] text-muted-foreground leading-tight">
                Sistema de Gestão
              </span>
            </div>
          </div>
          
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => setShowNotifications(true)}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </header>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </SidebarInset>

      {/* Notification Panel */}
      <NotificationPanel
        open={showNotifications}
        onOpenChange={setShowNotifications}
      />
    </SidebarProvider>
  );
}
