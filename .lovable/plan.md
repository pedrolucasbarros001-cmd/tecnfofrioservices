
# Plano: Cores dos Cards da Agenda por Tipo de Servico + Header com Branding TECNOFRIO

## Resumo das Alteracoes

1. **Cores dos cards da agenda** - Aplicar cores baseadas no tipo de servico (reparacao/instalacao/entrega)
2. **Codigos TF-** - Ja implementado na funcao `generate_service_code` (novos servicos usam TF-)
3. **Header com branding TECNOFRIO** - Adicionar logo e nome no header principal, remover cargos do topo

---

## 1. Cores dos Cards da Agenda por Tipo de Servico

### 1.1 Ficheiros a Modificar

| Ficheiro | Componente | Alteracao |
|----------|------------|-----------|
| `src/components/agenda/WeeklyAgenda.tsx` | `ServiceCard` | Aplicar cores por service_type |
| `src/components/agenda/AgendaDrawer.tsx` | `ServiceDrawerCard` | Aplicar cores por service_type |

### 1.2 Mapeamento de Cores por Tipo

| Tipo de Servico | Cor de Fundo | Cor da Borda | Icone |
|-----------------|--------------|--------------|-------|
| `reparacao` (visita) | `bg-blue-50` | `border-blue-500` | MapPin azul |
| `reparacao` (oficina) | `bg-orange-50` | `border-orange-500` | Package laranja |
| `instalacao` | `bg-yellow-50` | `border-yellow-500` | Settings amarelo |
| `entrega` | `bg-green-50` | `border-green-500` | Truck verde |

### 1.3 Logica de Cores no ServiceCard

```typescript
const getServiceTypeColors = (service: Service) => {
  if (service.service_type === 'instalacao') {
    return {
      bg: 'bg-yellow-50',
      border: 'border-yellow-500',
      iconColor: 'text-yellow-600',
      hoverBg: 'hover:bg-yellow-100'
    };
  }
  if (service.service_type === 'entrega') {
    return {
      bg: 'bg-green-50',
      border: 'border-green-500',
      iconColor: 'text-green-600',
      hoverBg: 'hover:bg-green-100'
    };
  }
  // Reparacao
  if (service.service_location === 'cliente') {
    return {
      bg: 'bg-blue-50',
      border: 'border-blue-500',
      iconColor: 'text-blue-500',
      hoverBg: 'hover:bg-blue-100'
    };
  }
  return {
    bg: 'bg-orange-50',
    border: 'border-orange-500',
    iconColor: 'text-orange-500',
    hoverBg: 'hover:bg-orange-100'
  };
};
```

### 1.4 Icones por Tipo

| Tipo | Icone Lucide |
|------|--------------|
| Reparacao (visita) | `MapPin` |
| Reparacao (oficina) | `Wrench` |
| Instalacao | `Settings` |
| Entrega | `Truck` |

---

## 2. Codigos TF- (Ja Implementado)

A funcao de base de dados `generate_service_code` ja foi atualizada para usar prefixo "TF-":

```sql
NEW.code := 'TF-' || LPAD(next_num::TEXT, 5, '0');
```

Os novos servicos criados ja usam TF-. Codigos OS- existentes continuam validos.

---

## 3. Header com Branding TECNOFRIO

### 3.1 Estado Atual vs Pretendido

**Atual (AppLayout.tsx):**
- Header simples com menu hamburguer e botao de notificacoes
- Sidebar mostra cargo ("Administracao", "Secretaria", "Tecnico") junto do logo

**Pretendido:**
- Header mostra logo TECNOFRIO + "Sistema de Gestao"
- Card branco com branding
- Remover cargo do header das sidebars
- Manter cargo junto ao nome do utilizador no footer das sidebars

### 3.2 Alteracoes no AppLayout.tsx

Adicionar branding no header principal:

```tsx
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
        Sistema de Gestao
      </span>
    </div>
  </div>
  
  <div className="flex-1" />
  
  <Button variant="ghost" size="icon" ...>
    <Bell className="h-5 w-5" />
  </Button>
</header>
```

### 3.3 Alteracoes nas Sidebars

**OwnerSidebar.tsx:**
- Remover texto "Administracao" do header (linha 61)
- Manter "Dono" junto ao nome no footer (linha 87)

**SecretarySidebar.tsx:**
- Remover texto "Secretaria" do header (linha 58)
- Manter "Secretaria" junto ao nome no footer (linha 108)

**TechnicianSidebar.tsx:**
- Remover texto "Tecnico" do header (linha 45)
- Manter "Tecnico" junto ao nome no footer (linha 71)

### 3.4 Estrutura Visual do Header

```text
┌─────────────────────────────────────────────────────────────────┐
│ [≡]  🐧 TECNOFRIO                                    [🔔]      │
│           Sistema de Gestao                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Ficheiros a Modificar

| Ficheiro | Alteracao |
|----------|-----------|
| `src/components/agenda/WeeklyAgenda.tsx` | Aplicar cores por tipo no ServiceCard |
| `src/components/agenda/AgendaDrawer.tsx` | Aplicar cores por tipo no ServiceDrawerCard |
| `src/components/layouts/AppLayout.tsx` | Adicionar branding TECNOFRIO no header |
| `src/components/layouts/OwnerSidebar.tsx` | Remover "Administracao" do header |
| `src/components/layouts/SecretarySidebar.tsx` | Remover "Secretaria" do header |
| `src/components/layouts/TechnicianSidebar.tsx` | Remover "Tecnico" do header |

---

## 5. Seccao Tecnica

### 5.1 WeeklyAgenda.tsx - ServiceCard Atualizado

```typescript
import { MapPin, Wrench, Settings, Truck } from 'lucide-react';

const getServiceTypeConfig = (service: Service) => {
  if (service.service_type === 'instalacao') {
    return {
      bg: 'bg-yellow-50',
      borderColor: '#EAB308', // yellow-500
      iconColor: 'text-yellow-600',
      Icon: Settings
    };
  }
  if (service.service_type === 'entrega') {
    return {
      bg: 'bg-green-50',
      borderColor: '#22C55E', // green-500
      iconColor: 'text-green-600',
      Icon: Truck
    };
  }
  // Reparacao
  if (service.service_location === 'cliente') {
    return {
      bg: 'bg-blue-50',
      borderColor: '#3B82F6', // blue-500
      iconColor: 'text-blue-500',
      Icon: MapPin
    };
  }
  return {
    bg: 'bg-orange-50',
    borderColor: '#F97316', // orange-500
    iconColor: 'text-orange-500',
    Icon: Wrench
  };
};
```

### 5.2 AppLayout.tsx - Header com Branding

```typescript
import tecnofrioLogoIcon from '@/assets/tecnofrio-logo-icon.png';

// No header:
<header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-white px-4">
  <SidebarTrigger className="-ml-1">
    <Menu className="h-5 w-5" />
  </SidebarTrigger>
  
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
        Sistema de Gestao
      </span>
    </div>
  </div>
  
  <div className="flex-1" />
  
  {/* Notification button */}
</header>
```

### 5.3 Sidebar Headers - Remover Cargo

**OwnerSidebar.tsx (linha 61):**
```typescript
// Remover esta linha:
// <span className="text-xs text-sidebar-foreground/60">Administracao</span>
```

**SecretarySidebar.tsx (linha 58):**
```typescript
// Remover esta linha:
// <span className="text-xs text-sidebar-foreground/60">Secretaria</span>
```

**TechnicianSidebar.tsx (linha 45):**
```typescript
// Remover esta linha:
// <span className="text-xs text-sidebar-foreground/60">Tecnico</span>
```

---

## 6. Resultado Esperado

1. **Cards da Agenda:**
   - Reparacao (visita) = Azul com icone MapPin
   - Reparacao (oficina) = Laranja com icone Wrench
   - Instalacao = Amarelo com icone Settings
   - Entrega = Verde com icone Truck

2. **Header Principal:**
   - Card branco com logo do pinguim
   - "TECNOFRIO" (TECNO azul, FRIO cinza)
   - "Sistema de Gestao" em texto menor

3. **Sidebars:**
   - Header mostra apenas logo + TECNOFRIO (sem cargo)
   - Footer mantem nome + cargo junto do botao Sair
