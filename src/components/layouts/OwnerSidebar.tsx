import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, List, Wrench, Users, FileText, BarChart3, UserCog, Settings, LogOut, ChevronLeft } from 'lucide-react';
import tecnofrioLogoIcon from '@/assets/tecnofrio-logo-icon.png';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
const menuItems = [{
  title: 'Dashboard',
  url: '/dashboard',
  icon: LayoutDashboard
}, {
  title: 'Geral',
  url: '/geral',
  icon: List
}, {
  title: 'Oficina',
  url: '/oficina',
  icon: Wrench
}, {
  title: 'Clientes',
  url: '/clientes',
  icon: Users
}, {
  title: 'Orçamentos',
  url: '/orcamentos',
  icon: FileText
}, {
  title: 'Performance',
  url: '/performance',
  icon: BarChart3
}, {
  title: 'Colaboradores',
  url: '/colaboradores',
  icon: UserCog
}, {
  title: 'Preferências',
  url: '/preferencias',
  icon: Settings
}];
export function OwnerSidebar() {
  const location = useLocation();
  const {
    signOut,
    profile
  } = useAuth();
  const {
    state
  } = useSidebar();
  const isCollapsed = state === 'collapsed';
  const isActive = (path: string) => location.pathname === path;
  return <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          <img src={tecnofrioLogoIcon} alt="TECNOFRIO" className="h-10 w-10 shrink-0 rounded-lg object-contain" />
          {!isCollapsed && <div className="flex flex-col">
              <span className="text-lg font-bold">
                <span className="text-[#2B4F84]">TECNO</span>
                <span className="text-slate-700">FRIO</span>
              </span>
            </div>}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarMenu>
          {menuItems.map(item => <SidebarMenuItem key={item.url}>
              <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                <NavLink to={item.url} className={cn('flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all', isActive(item.url) ? 'bg-sidebar-accent text-sidebar-primary font-medium' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground')}>
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!isCollapsed && <span>{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>)}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        {/* TECNOFRIO Branding */}
        {!isCollapsed}
        
        {!isCollapsed && profile && <div className="mb-3 px-2">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile.full_name || profile.email}
            </p>
            <p className="text-xs text-sidebar-foreground/60">Dono</p>
          </div>}
        <Button variant="ghost" className={cn('w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent', isCollapsed && 'justify-center px-2')} onClick={signOut}>
          <LogOut className="h-5 w-5 shrink-0" />
          {!isCollapsed && <span className="ml-3">Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>;
}