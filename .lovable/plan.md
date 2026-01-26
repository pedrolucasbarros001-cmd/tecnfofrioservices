

# Plano: Redesign Sofisticado do Sistema TECNOFRIO

## Objetivo

Melhorar o design do sistema com:
- Toggle de tema claro/escuro em todos os acessos
- Design responsivo sem sobreposicao de texto
- Remocao de informacoes repetitivas visuais
- Estetica "glass" sofisticada inspirada no Apple Vision Pro
- Manter cores, logos e fontes da marca TECNOFRIO

---

## 1. Problemas Identificados

### 1.1 Informacoes Repetitivas
- **Header + Sidebar**: Logo TECNOFRIO aparece 2x (sidebar header + main header)
- **Sidebar Footer**: SecretarySidebar tem card de branding extra desnecessario

### 1.2 Tema Nao Funcional
- `next-themes` esta instalado mas **ThemeProvider nao esta configurado** no App.tsx
- Preferencias de tema nao persistem

### 1.3 Problemas de Responsividade
- Header rigido com `bg-white` hardcoded (nao funciona em dark mode)
- Tabelas podem transbordar em ecras pequenos
- Sidebars com texto que pode sobrepor

### 1.4 Falta de Sofisticacao Visual
- Cards com sombras basicas
- Falta de efeitos glass/blur
- Sem transicoes suaves

---

## 2. Alteracoes por Ficheiro

### 2.1 App.tsx - Adicionar ThemeProvider

```typescript
import { ThemeProvider } from 'next-themes';

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <QueryClientProvider client={queryClient}>
      ...
    </QueryClientProvider>
  </ThemeProvider>
);
```

### 2.2 index.css - Design System Glass

Adicionar novas variaveis e classes:

```css
:root {
  /* Glass effects */
  --glass-bg: 0 0% 100% / 0.7;
  --glass-border: 0 0% 100% / 0.2;
  --glass-blur: 12px;
  
  /* Enhanced shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  --shadow-glow: 0 0 20px rgb(43 79 132 / 0.15);
}

.dark {
  --glass-bg: 222 47% 8% / 0.7;
  --glass-border: 0 0% 100% / 0.1;
}

/* Glass card utility */
.glass-card {
  background: hsl(var(--glass-bg));
  backdrop-filter: blur(var(--glass-blur));
  border: 1px solid hsl(var(--glass-border));
}

/* Hover glow effect */
.hover-glow {
  transition: box-shadow 0.3s ease, transform 0.2s ease;
}
.hover-glow:hover {
  box-shadow: var(--shadow-glow);
  transform: translateY(-2px);
}
```

### 2.3 AppLayout.tsx - Header Unificado

**Remover** duplicacao de branding e adicionar toggle de tema:

```tsx
// Novo header limpo
<header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4">
  <SidebarTrigger className="-ml-1">
    <Menu className="h-5 w-5" />
  </SidebarTrigger>
  
  <div className="flex-1" />
  
  {/* Theme Toggle */}
  <ThemeToggle />
  
  {/* Notifications */}
  <Button variant="ghost" size="icon" className="relative" ...>
    <Bell className="h-5 w-5" />
    ...
  </Button>
</header>
```

### 2.4 Novo Componente: ThemeToggle.tsx

```tsx
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="relative"
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Alternar tema</span>
    </Button>
  );
}
```

### 2.5 Sidebars - Remover Redundancias

**OwnerSidebar.tsx, SecretarySidebar.tsx, TechnicianSidebar.tsx:**

1. Remover logo e texto TECNOFRIO do header da sidebar (ja esta no main header)
2. Remover card de branding extra no footer da SecretarySidebar
3. Simplificar para mostrar apenas menu items

```tsx
// Sidebar Header - Simplificado
<SidebarHeader className="border-b border-sidebar-border px-4 py-3">
  {!isCollapsed && (
    <span className="text-sm font-medium text-sidebar-foreground/70">
      Menu
    </span>
  )}
</SidebarHeader>
```

### 2.6 Card.tsx - Glass Effect

```tsx
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border bg-card/80 text-card-foreground shadow-sm backdrop-blur-sm transition-all",
        "hover:shadow-md hover:border-border/80",
        className
      )}
      {...props}
    />
  )
);
```

### 2.7 DashboardPage.tsx - Cards Sofisticados

```tsx
<Card
  key={card.key}
  className={cn(
    "cursor-pointer transition-all duration-200",
    "hover:shadow-lg hover:scale-[1.02] hover:-translate-y-0.5",
    "border border-border/50 backdrop-blur-sm",
    card.bgClass
  )}
  onClick={() => navigate(card.route)}
>
  <CardContent className="p-5 h-[120px] flex flex-col justify-between">
    ...
  </CardContent>
</Card>
```

### 2.8 GeralPage.tsx - Tabela Responsiva

```tsx
// Wrapper para scroll horizontal em mobile
<div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
  <Table className="min-w-[800px]">
    ...
  </Table>
</div>
```

### 2.9 LoginPage.tsx - Glass Login

```tsx
<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
  <Card className="w-full max-w-md shadow-2xl border-0 bg-white/10 backdrop-blur-xl">
    <CardHeader className="space-y-4 text-center pb-8">
      <div className="mx-auto p-4 rounded-full bg-white/10 backdrop-blur-sm">
        <img 
          src={tecnofrioLogoIcon} 
          alt="TECNOFRIO" 
          className="h-20 w-20 object-contain"
        />
      </div>
      <CardTitle className="text-3xl font-bold tracking-tight text-white">
        <span className="text-blue-400">TECNO</span>
        <span className="text-slate-200">FRIO</span>
      </CardTitle>
      ...
    </CardHeader>
  </Card>
</div>
```

### 2.10 index.html - Titulo e Meta

```html
<title>TECNOFRIO - Sistema de Gestao</title>
<meta name="description" content="Sistema de Gestao de Servicos TECNOFRIO" />
```

---

## 3. Ficheiros a Modificar

| Ficheiro | Acao | Descricao |
|----------|------|-----------|
| `src/App.tsx` | Modificar | Adicionar ThemeProvider |
| `index.html` | Modificar | Atualizar titulo e meta tags |
| `src/index.css` | Modificar | Adicionar variaveis glass e utilitarios |
| `src/components/ThemeToggle.tsx` | Criar | Componente de toggle de tema |
| `src/components/layouts/AppLayout.tsx` | Modificar | Remover branding duplicado, adicionar ThemeToggle |
| `src/components/layouts/OwnerSidebar.tsx` | Modificar | Simplificar header |
| `src/components/layouts/SecretarySidebar.tsx` | Modificar | Remover branding card, simplificar header |
| `src/components/layouts/TechnicianSidebar.tsx` | Modificar | Simplificar header |
| `src/components/ui/card.tsx` | Modificar | Adicionar efeitos glass |
| `src/pages/LoginPage.tsx` | Modificar | Design glass escuro |
| `src/pages/DashboardPage.tsx` | Modificar | Cards com hover sofisticado |
| `src/pages/GeralPage.tsx` | Modificar | Tabela responsiva |
| `src/pages/PreferenciasPage.tsx` | Modificar | Garantir funcionamento do tema |

---

## 4. Secao Tecnica

### 4.1 ThemeProvider Configuration

```tsx
// App.tsx
import { ThemeProvider } from 'next-themes';

const App = () => (
  <ThemeProvider 
    attribute="class" 
    defaultTheme="system" 
    enableSystem
    disableTransitionOnChange={false}
  >
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              ...
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);
```

### 4.2 CSS Glass Variables

```css
@layer base {
  :root {
    /* Existing variables... */
    
    /* Glass morphism */
    --glass-opacity: 0.7;
    --blur-strength: 12px;
  }
  
  .dark {
    /* Existing dark variables... */
    
    --glass-opacity: 0.6;
  }
}

@layer utilities {
  .glass {
    @apply bg-background/70 backdrop-blur-md border border-white/10;
  }
  
  .glass-card {
    @apply bg-card/80 backdrop-blur-sm border border-border/50 shadow-sm;
    @apply hover:shadow-md hover:border-border/80 transition-all duration-200;
  }
  
  .hover-lift {
    @apply transition-all duration-200;
    @apply hover:-translate-y-0.5 hover:shadow-lg;
  }
}
```

### 4.3 Sidebar Simplificado (exemplo OwnerSidebar)

```tsx
export function OwnerSidebar() {
  // ... existing code ...

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border/50">
      {/* Header simplificado - sem logo duplicado */}
      <SidebarHeader className="px-4 py-3">
        <div className="flex items-center gap-3">
          <img 
            src={tecnofrioLogoIcon} 
            alt="TECNOFRIO" 
            className="h-9 w-9 shrink-0 rounded-lg object-contain"
          />
          {!isCollapsed && (
            <span className="text-lg font-bold">
              <span className="text-[#2B4F84]">TECNO</span>
              <span className="text-sidebar-foreground/80">FRIO</span>
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarMenu>
          {menuItems.map(item => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton 
                asChild 
                isActive={isActive(item.url)} 
                tooltip={item.title}
              >
                <NavLink
                  to={item.url}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200',
                    isActive(item.url)
                      ? 'bg-sidebar-primary/10 text-sidebar-primary font-medium'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
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

      <SidebarFooter className="border-t border-sidebar-border/50 p-4">
        {!isCollapsed && profile && (
          <div className="mb-3 px-2">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile.full_name || profile.email}
            </p>
            <p className="text-xs text-sidebar-foreground/60">Dono</p>
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
```

### 4.4 Header Unificado - AppLayout

```tsx
export function AppLayout() {
  // ... existing code ...

  return (
    <SidebarProvider>
      {getSidebar()}
      <SidebarInset className="flex flex-col min-h-screen">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border/50 bg-background/80 backdrop-blur-md px-4">
          <SidebarTrigger className="-ml-1">
            <Menu className="h-5 w-5" />
          </SidebarTrigger>
          
          <div className="flex-1" />
          
          {/* Theme Toggle */}
          <ThemeToggle />
          
          {/* Notifications */}
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
        <main className="flex-1 overflow-auto bg-background">
          <Outlet />
        </main>
      </SidebarInset>
      
      <NotificationPanel
        open={showNotifications}
        onOpenChange={setShowNotifications}
      />
    </SidebarProvider>
  );
}
```

---

## 5. Resultado Esperado

1. **Tema Funcional**
   - Toggle no header principal
   - Persiste preferencia
   - Respeita tema do sistema

2. **Sem Duplicacao**
   - Logo apenas na sidebar (centralizado)
   - Header principal limpo com apenas toggle e notificacoes

3. **Visual Sofisticado**
   - Cards com efeito glass/blur
   - Sombras suaves com hover
   - Transicoes fluidas
   - Gradientes sutis

4. **Responsivo**
   - Tabelas com scroll horizontal
   - Sidebar responsiva
   - Sem sobreposicao de texto

5. **Marca Preservada**
   - Cores TECNOFRIO (#2B4F84)
   - Logo do pinguim
   - Tipografia existente

