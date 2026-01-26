import { NavLink, useLocation } from 'react-router-dom';
import {
  List,
  Wrench,
  CheckCircle2,
  AlertCircle,
  Users,
  Settings,
  LogOut,
  Snowflake,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

const menuItems = [
  { title: 'Geral', url: '/geral', icon: List },
  { title: 'Oficina', url: '/oficina', icon: Wrench },
  { title: 'Concluídos', url: '/concluidos', icon: CheckCircle2 },
  { title: 'Em Débito', url: '/em-debito', icon: AlertCircle },
  { title: 'Clientes', url: '/clientes', icon: Users },
  { title: 'Preferências', url: '/preferencias', icon: Settings },
];

export function SecretarySidebar() {
  const location = useLocation();
  const { signOut, profile } = useAuth();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary">
            <Snowflake className="h-6 w-6 text-sidebar-primary-foreground" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-bold text-sidebar-foreground">TECNOFRIO</span>
              <span className="text-xs text-sidebar-foreground/60">Secretaria</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.url)}
                tooltip={item.title}
              >
                <NavLink
                  to={item.url}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all',
                    isActive(item.url)
                      ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!isCollapsed && <span>{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        {/* TECNOFRIO Branding */}
        {!isCollapsed && (
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 mb-4">
            <p className="font-bold text-slate-800">TECNOFRIO</p>
            <p className="text-xs text-slate-500">Sistema de Gestão</p>
          </div>
        )}
        
        {!isCollapsed && profile && (
          <div className="mb-3 px-2">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile.full_name || profile.email}
            </p>
            <p className="text-xs text-sidebar-foreground/60">Secretária</p>
          </div>
        )}
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent',
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
