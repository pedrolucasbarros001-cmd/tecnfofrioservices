import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, List, Wrench, Users, FileText, BarChart3, UserCog, Settings, LogOut } from 'lucide-react';
import tecnofrioLogoIcon from '@/assets/tecnofrio-logo-icon.png';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';
import { useSidebarBadges } from '@/hooks/useSidebarBadges';

// ─── Tiny badge pill ──────────────────────────────────────────────────────────

function NavBadge({ count, collapsed }: { count: number; collapsed: boolean }) {
  if (!count || count <= 0) return null;
  const label = count > 99 ? '99+' : String(count);

  if (collapsed) {
    // In collapsed mode: small red dot over the icon
    return (
      <span
        className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none px-0.5 shadow-sm"
        aria-label={`${count} pendentes`}
      >
        {label}
      </span>
    );
  }

  return (
    <span className="ml-auto min-w-[20px] h-5 rounded-full bg-[#2B4F84] text-white text-[10px] font-semibold flex items-center justify-center leading-none px-1.5 shadow-sm">
      {label}
    </span>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

export function OwnerSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const { data: badges } = useSidebarBadges();

  const isActive = (path: string) => location.pathname === path;

  const handleNavClick = (url: string) => {
    if (isMobile) setOpenMobile(false);
    navigate(url);
  };

  // Badge counts per route
  const badgeFor: Record<string, number> = {
    '/orcamentos': badges?.orcamentos ?? 0,
    '/oficina': badges?.precificar ?? 0,
    '/geral': badges?.semTecnico ?? 0,
  };

  const menuItems = [
    { title: 'Dashboard',     url: '/dashboard',    icon: LayoutDashboard },
    { title: 'Geral',         url: '/geral',         icon: List },
    { title: 'Oficina',       url: '/oficina',       icon: Wrench },
    { title: 'Clientes',      url: '/clientes',      icon: Users },
    { title: 'Orçamentos',    url: '/orcamentos',    icon: FileText },
    { title: 'Performance',   url: '/performance',   icon: BarChart3 },
    { title: 'Colaboradores', url: '/colaboradores', icon: UserCog },
    { title: 'Preferências',  url: '/preferencias',  icon: Settings },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <div className="flex items-center gap-3">
          <img
            src={tecnofrioLogoIcon}
            alt="TECNOFRIO"
            className="h-9 w-9 shrink-0 rounded-lg object-contain bg-white p-0.5"
          />
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
          {menuItems.map(item => {
            const count = badgeFor[item.url] ?? 0;
            const active = isActive(item.url);

            return (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton
                  isActive={active}
                  tooltip={item.title}
                  onClick={() => handleNavClick(item.url)}
                  className={cn(
                    'relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 cursor-pointer',
                    active
                      ? 'bg-sidebar-primary/10 text-sidebar-primary font-medium'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  )}
                >
                  {/* Icon wrapper — needed for the collapsed dot overlay */}
                  <span className="relative shrink-0">
                    <item.icon className="h-5 w-5" />
                    {isCollapsed && <NavBadge count={count} collapsed />}
                  </span>

                  {!isCollapsed && (
                    <>
                      <span className="flex-1 truncate">{item.title}</span>
                      <NavBadge count={count} collapsed={false} />
                    </>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        {!isCollapsed && profile && (
          <div className="mb-3 px-2">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile.full_name || profile.email}
            </p>
            <p className="text-xs text-sidebar-foreground/70">Proprietário</p>
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
