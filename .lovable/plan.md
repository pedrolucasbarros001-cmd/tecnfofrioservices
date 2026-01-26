
# Plano: Desenvolver Paginas Perfil e Preferencias do Tecnico

## Resumo

Implementar as duas paginas em falta na interface do tecnico:
1. **Perfil** (/perfil) - Visualizar e editar dados pessoais
2. **Preferencias** (/preferencias) - Configuracoes da aplicacao

---

## 1. Pagina de Perfil (PerfilPage.tsx)

### 1.1 Funcionalidades

| Funcionalidade | Descricao |
|----------------|-----------|
| Visualizar dados | Nome, email, telefone, especializacao |
| Editar dados | Nome e telefone (email apenas leitura) |
| Avatar | Iniciais coloridas baseadas no nome |
| Estatisticas | Total de servicos, concluidos este mes, em andamento |
| Informacao da conta | Data de criacao, cargo atual |

### 1.2 Estrutura Visual

```text
┌─────────────────────────────────────────────────────┐
│ Perfil                                              │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐ │
│ │  ┌──────┐                                       │ │
│ │  │  JD  │  Joao Dias                            │ │
│ │  │(icon)│  tecnico@tecnofrio.pt                 │ │
│ │  └──────┘  +351 912 345 678                     │ │
│ │           Especializacao: Ar Condicionado       │ │
│ │                                                 │ │
│ │  [Editar Perfil]                                │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Estatisticas                                    │ │
│ │ ┌──────────┐ ┌──────────┐ ┌──────────┐         │ │
│ │ │   127    │ │    23    │ │     5    │         │ │
│ │ │ Servicos │ │ Este Mes │ │ Ativos   │         │ │
│ │ │ Total    │ │Concluidos│ │          │         │ │
│ │ └──────────┘ └──────────┘ └──────────┘         │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Informacao da Conta                             │ │
│ │ • Cargo: Tecnico                                │ │
│ │ • Membro desde: Janeiro 2025                    │ │
│ │ • Estado: Ativo                                 │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### 1.3 Componentes a Usar

- Card, CardHeader, CardContent, CardTitle
- Avatar, AvatarFallback
- Badge (para estado ativo/inativo)
- Button (editar perfil)
- Dialog (modal de edicao)
- Form com Input (nome, telefone)

### 1.4 Dados a Buscar

```typescript
// 1. Profile do AuthContext (ja disponivel)
const { profile, user } = useAuth();

// 2. Dados do tecnico (especializacao, cor)
const { data: technicianData } = useQuery({
  queryKey: ['technician-profile', profile?.id],
  queryFn: async () => {
    const { data } = await supabase
      .from('technicians')
      .select('*')
      .eq('profile_id', profile.id)
      .single();
    return data;
  },
});

// 3. Estatisticas de servicos
const { data: stats } = useQuery({
  queryKey: ['technician-stats', technicianId],
  queryFn: async () => {
    // Total de servicos
    // Concluidos este mes
    // Servicos ativos
  },
});
```

### 1.5 Modal de Edicao

Campos editaveis:
- Nome completo
- Telefone

Campos somente leitura:
- Email (gerido pelo Supabase Auth)

---

## 2. Pagina de Preferencias (PreferenciasPage.tsx)

### 2.1 Funcionalidades

| Funcionalidade | Descricao |
|----------------|-----------|
| Notificacoes | Toggle para receber notificacoes (visual apenas) |
| Tema | Selector claro/escuro (usando next-themes) |
| Idioma | Portugues (fixo, apenas informativo) |
| Alteracao de senha | Link/botao para alterar palavra-passe |
| Versao | Mostrar versao da aplicacao |

### 2.2 Estrutura Visual

```text
┌─────────────────────────────────────────────────────┐
│ Preferencias                                        │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐ │
│ │ Aparencia                                       │ │
│ │ ─────────────────────────────────────────────── │ │
│ │ Tema               [Claro ▼] ou [Toggle]        │ │
│ │                                                 │ │
│ │ Idioma             Portugues (Portugal)         │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Notificacoes                                    │ │
│ │ ─────────────────────────────────────────────── │ │
│ │ Novos servicos     [====] ON                    │ │
│ │ Pecas chegaram     [====] ON                    │ │
│ │ Alertas urgentes   [====] ON                    │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Seguranca                                       │ │
│ │ ─────────────────────────────────────────────── │ │
│ │ Palavra-passe      [Alterar Palavra-passe]      │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Sobre                                           │ │
│ │ ─────────────────────────────────────────────── │ │
│ │ TECNOFRIO Sistema de Gestao                     │ │
│ │ Versao 1.0.0                                    │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### 2.3 Componentes a Usar

- Card, CardHeader, CardContent, CardTitle
- Switch (para toggles de notificacao)
- Select (para tema)
- Separator
- Button (alterar senha)
- Dialog (modal de alteracao de senha)

### 2.4 Tema (next-themes)

O projeto ja tem `next-themes` instalado. Implementar:

```typescript
import { useTheme } from 'next-themes';

const { theme, setTheme } = useTheme();
```

### 2.5 Alteracao de Palavra-passe

Usar `supabase.auth.updateUser({ password: newPassword })` dentro de um modal com:
- Password atual (validacao)
- Nova password
- Confirmar nova password

---

## 3. Rotas no App.tsx

Alterar de `PlaceholderPage` para os novos componentes:

```typescript
// De:
<Route path="/perfil" element={<PlaceholderPage />} />
<Route path="/preferencias" element={<PlaceholderPage />} />

// Para:
<Route path="/perfil" element={
  <ProtectedRoute allowedRoles={['tecnico']}>
    <PerfilPage />
  </ProtectedRoute>
} />
<Route path="/preferencias" element={
  <ProtectedRoute>
    <PreferenciasPage />
  </ProtectedRoute>
} />
```

---

## 4. Ficheiros a Criar/Modificar

| Ficheiro | Acao | Descricao |
|----------|------|-----------|
| `src/pages/PerfilPage.tsx` | Criar | Pagina de perfil do tecnico |
| `src/pages/PreferenciasPage.tsx` | Criar | Pagina de preferencias |
| `src/App.tsx` | Modificar | Atualizar rotas para usar novos componentes |

---

## 5. Seccao Tecnica

### 5.1 PerfilPage.tsx - Estrutura

```typescript
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { User, Mail, Phone, Wrench, Calendar, Edit2, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, ... } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth } from 'date-fns';
import { pt } from 'date-fns/locale';

export default function PerfilPage() {
  const { profile, user } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Query technician data
  // Query service statistics
  
  return (
    <div className="p-6 space-y-6">
      {/* Profile Card */}
      {/* Stats Cards */}
      {/* Account Info Card */}
      {/* Edit Modal */}
    </div>
  );
}
```

### 5.2 PreferenciasPage.tsx - Estrutura

```typescript
import { useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun, Bell, Lock, Globe, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, ... } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Dialog, ... } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import tecnofrioLogoIcon from '@/assets/tecnofrio-logo-icon.png';

export default function PreferenciasPage() {
  const { theme, setTheme } = useTheme();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  
  // Notification preferences (local state for now)
  const [notifications, setNotifications] = useState({
    newServices: true,
    partsArrived: true,
    urgentAlerts: true,
  });
  
  return (
    <div className="p-6 space-y-6">
      {/* Appearance Card */}
      {/* Notifications Card */}
      {/* Security Card */}
      {/* About Card with TECNOFRIO branding */}
      {/* Password Change Modal */}
    </div>
  );
}
```

### 5.3 Estatisticas do Tecnico

```typescript
// Query para estatisticas
const { data: stats } = useQuery({
  queryKey: ['technician-stats', technicianId],
  queryFn: async () => {
    if (!technicianId) return null;
    
    // Total de servicos
    const { count: total } = await supabase
      .from('services')
      .select('*', { count: 'exact', head: true })
      .eq('technician_id', technicianId);
    
    // Concluidos este mes
    const startOfCurrentMonth = startOfMonth(new Date()).toISOString();
    const { count: thisMonth } = await supabase
      .from('services')
      .select('*', { count: 'exact', head: true })
      .eq('technician_id', technicianId)
      .in('status', ['concluidos', 'em_debito', 'finalizado'])
      .gte('updated_at', startOfCurrentMonth);
    
    // Servicos ativos
    const { count: active } = await supabase
      .from('services')
      .select('*', { count: 'exact', head: true })
      .eq('technician_id', technicianId)
      .in('status', ['por_fazer', 'em_execucao', 'na_oficina', 'para_pedir_peca', 'em_espera_de_peca']);
    
    return { total, thisMonth, active };
  },
  enabled: !!technicianId,
});
```

### 5.4 Modal de Alteracao de Senha

```typescript
const handlePasswordChange = async (currentPassword: string, newPassword: string) => {
  try {
    // Re-authenticate with current password first
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email || '',
      password: currentPassword,
    });
    
    if (signInError) {
      toast.error('Palavra-passe atual incorreta');
      return;
    }
    
    // Update password
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    
    if (error) throw error;
    
    toast.success('Palavra-passe alterada com sucesso');
    setShowPasswordModal(false);
  } catch (error) {
    toast.error('Erro ao alterar palavra-passe');
  }
};
```

---

## 6. Cores e Estilos

Seguir o padrao existente no sistema:
- Cards com `CardHeader` e `CardContent`
- Icones da biblioteca `lucide-react`
- Badge com cores semanticas
- Botoes primarios com `bg-primary`
- Avatar com cores baseadas no nome (reutilizar logica do ColaboradoresPage)

---

## 7. Resultado Esperado

1. **Perfil**:
   - Exibir dados do tecnico (nome, email, telefone, especializacao)
   - Permitir edicao de nome e telefone
   - Mostrar estatisticas de servicos
   - Mostrar informacao da conta (cargo, data de registo)

2. **Preferencias**:
   - Toggle entre tema claro/escuro
   - Switches de notificacoes (visual, preparado para futuro)
   - Botao para alterar palavra-passe com modal funcional
   - Branding TECNOFRIO na seccao "Sobre"
