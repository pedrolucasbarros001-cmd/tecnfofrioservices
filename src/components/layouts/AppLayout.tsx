import { Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { OwnerSidebar } from './OwnerSidebar';
import { SecretarySidebar } from './SecretarySidebar';
import { TechnicianSidebar } from './TechnicianSidebar';
import { Bell, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AppLayout() {
  const { role } = useAuth();

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
        <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
          <SidebarTrigger className="-ml-1">
            <Menu className="h-5 w-5" />
          </SidebarTrigger>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
              3
            </span>
          </Button>
        </header>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
