import { useLocation, useNavigate } from 'react-router-dom';
import { ClipboardList, Wrench, History, User, Settings, LogOut } from 'lucide-react';
import tecnofrioLogoIcon from '@/assets/tecnofrio-logo-icon.png';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';

const menuItems = [
  { title: 'Serviços', url: '/servicos', icon: ClipboardList },
  { title: 'Oficina', url: '/oficina-tecnico', icon: Wrench },
  { title: 'Histórico', url: '/technician/history', icon: History },
  { title: 'Orçamentos', url: '/orcamentos', icon: ClipboardList },
  { title: 'Perfil', url: '/perfil', icon: User },
  { title: 'Preferências', url: '/preferencias', icon: Settings },
];

export function TechnicianSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const isActive = (path: string) => location.pathname === path;

  // Handle navigation with mobile sidebar close
  const handleNavClick = (url: string) => {
    if (isMobile) {
      setOpenMobile(false);
    }
    navigate(url);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <div className="flex items-center gap-3">
          <img src={tecnofrioLogoIcon} alt="TECNOFRIO" className="h-9 w-9 shrink-0 rounded-lg object-contain bg-white p-0.5" />
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-bold leading-tight">
                <span className="text-sidebar-primary">TECNO</span>
                <span className="text-sidebar-foreground">FRIO</span>
              </span>
              <span className="text-[10px] text-sidebar-foreground/60 -mt-0.5">Sistema de Gestão</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarMenu data-tour="sidebar-menu" data-demo="sidebar-menu">
          {menuItems.map(item => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton
                isActive={isActive(item.url)}
                tooltip={item.title}
                onClick={() => handleNavClick(item.url)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 cursor-pointer',
                  isActive(item.url)
                    ? 'bg-sidebar-primary/10 text-sidebar-primary font-medium'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!isCollapsed && <span>{item.title}</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        {!isCollapsed && profile && (
          <div className="mb-3 px-2">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile.full_name || profile.email}
            </p>
            <p className="text-xs text-sidebar-foreground/70">Técnico</p>
          </div>
        )}
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50',
            isCollapsed && 'justify-center px-2'
          )}
          onClick={signOut}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!isCollapsed && <span className="ml-3">Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
