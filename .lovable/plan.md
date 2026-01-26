

# Plano: Melhorias na Pagina Oficina, Sistema de Historico e Codigo TF-

## Resumo das Alteracoes

1. **Reformular pagina Oficina** para Dono/Secretaria com cards e botoes de atribuicao
2. **Criar sistema de historico de atividades** (activity log) 
3. **Sistema de notificacoes para tarefas** com exibicao publica no monitor
4. **Atualizar TV Monitor** - remover "a precificar", cards maiores e legiveis
5. **Alterar codigo dos servicos** de "OS-" para "TF-"

---

## 1. Sistema de Historico de Atividades

### 1.1 Nova Tabela: `activity_logs`

Criar tabela para registar todas as acoes do sistema:

```sql
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  is_public BOOLEAN DEFAULT false,  -- Para mostrar no monitor
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
```

**Tipos de acao (`action_type`):**
- `atribuicao` - "Secretaria atribuiu servico X ao tecnico Y"
- `inicio_execucao` - "Tecnico Y comecou servico X"
- `levantamento` - "Tecnico levantou equipamento para oficina"
- `pedido_peca` - "Tecnico solicitou peca X"
- `peca_chegou` - "Peca X chegou"
- `conclusao` - "Tecnico concluiu reparacao"
- `precificacao` - "Dono definiu preco X para servico"
- `pagamento` - "Registado pagamento de X€"
- `entrega` - "Equipamento entregue ao cliente"
- `tarefa` - "Notificacao de tarefa enviada"

### 1.2 Funcao Utilitaria para Registar Atividade

**Novo ficheiro:** `src/utils/activityLogUtils.ts`

```typescript
export async function logActivity({
  serviceId,
  actorId,
  actionType,
  description,
  metadata,
  isPublic
}: ActivityLogData): Promise<void> {
  await supabase.from('activity_logs').insert({
    service_id: serviceId,
    actor_id: actorId,
    action_type: actionType,
    description: description,
    metadata: metadata || null,
    is_public: isPublic || false,
  });
}
```

---

## 2. Sistema de Notificacoes para Tarefas

### 2.1 Novo Tipo de Notificacao

Adicionar novos tipos em `notificationUtils.ts`:

```typescript
type NotificationType = 
  | 'peca_pedida' 
  | 'peca_chegou' 
  | 'servico_atrasado' 
  | 'servico_atribuido' 
  | 'precificacao' 
  | 'entrega_agendada' 
  | 'tarefa_tecnico'
  | 'tarefa_secretaria'  // NOVO
  | 'tarefa_geral';       // NOVO - publica
```

### 2.2 Modal de Enviar Tarefa

**Novo componente:** `src/components/modals/SendTaskModal.tsx`

- Campo de destinatario (tecnico especifico ou todos)
- Campo de mensagem/tarefa
- Toggle "Mostrar no Monitor" (is_public)
- Envia notificacao e cria activity_log

---

## 3. Reformular Pagina Oficina (Dono/Secretaria)

### 3.1 Layout em Cards

**Ficheiro:** `src/pages/OficinaPage.tsx`

Estrutura visual:

```text
┌─────────────────────────────────────────────────────────────────┐
│ Oficina                     [Enviar Tarefa] [Monitor] [Link]   │
├─────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────┐ ┌──────────────────────────────┐  │
│ │ TF-00045                 │ │ TF-00046                     │  │
│ │ ━━━━━━━━━━━━━━━━━━━━━━  │ │ ━━━━━━━━━━━━━━━━━━━━━━━━━━  │  │
│ │ Cliente: Joao Silva     │ │ Cliente: Maria Santos        │  │
│ │ Frigorifico • Samsung   │ │ Ar Condicionado • LG         │  │
│ │ Status: Na Oficina      │ │ Status: Em Espera de Peca   │  │
│ │                          │ │                               │  │
│ │ ┌────────────────┐       │ │ Tecnico: Pedro Costa         │  │
│ │ │ ⚡ Sem Tecnico │       │ │ [    Reatribuir    ]         │  │
│ │ │ [Atribuir Tec] │       │ │                               │  │
│ │ └────────────────┘       │ └──────────────────────────────┘  │
│ └──────────────────────────┘                                    │
│                                                                  │
│ ┌──────────────────────────────────────────────────────────────┐│
│ │ Historico de Atividades                           [Ver Mais] ││
│ │ ─────────────────────────────────────────────────────────────││
│ │ 14:32 - Secretaria atribuiu TF-00044 ao tecnico Pedro       ││
│ │ 14:25 - Tecnico Pedro comecou TF-00043                      ││
│ │ 14:10 - Equipamento TF-00042 levantado para oficina         ││
│ └──────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Componentes do Card

Cada card de servico inclui:
- Codigo TF-XXXXX
- Cliente e equipamento
- Badge de status
- Tecnico atribuido (ou "Disponivel para assumir")
- Botao [Atribuir Tecnico] ou [Reatribuir]
- Tags urgente/garantia

### 3.3 Seccao de Historico

- Lista compacta das ultimas 5-10 atividades
- Ordenado por data (mais recente primeiro)
- Link "Ver Mais" abre painel completo

---

## 4. Atualizar TV Monitor

### 4.1 Remover Status "a_precificar" dos Contadores

**Ficheiro:** `src/pages/TVMonitorPage.tsx`

```typescript
// De:
const statusOrder: ServiceStatus[] = [
  'em_execucao', 'na_oficina', 'para_pedir_peca', 
  'em_espera_de_peca', 'a_precificar', 'concluidos'
];

// Para:
const statusOrder: ServiceStatus[] = [
  'em_execucao', 'na_oficina', 'para_pedir_peca', 
  'em_espera_de_peca', 'concluidos'
];
```

### 4.2 Cards Maiores e Mais Legiveis

- Aumentar tamanho base dos cards
- Grid 3 colunas maximo (xl:grid-cols-3)
- Fonte maior para codigo e cliente
- Mostrar "Disponivel para Assumir" quando sem tecnico

### 4.3 Adicionar Feed de Atividades Publicas

```text
┌─────────────────────────────────────────────────────────────────┐
│ TECNOFRIO        Monitor da Oficina              15:32:45      │
├─────────────────────────────────────────────────────────────────┤
│ Contadores: [Em Exec] [Na Oficina] [Pedir Peca] [Espera] [Conc]│
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ │
│ │    TF-00045      │ │    TF-00046      │ │    TF-00047      │ │
│ │ ━━━━━━━━━━━━━━━━ │ │ ━━━━━━━━━━━━━━━━ │ │ ━━━━━━━━━━━━━━━━ │ │
│ │                   │ │                   │ │                   │ │
│ │ Joao Silva       │ │ Maria Santos     │ │ Antonio Pereira  │ │
│ │ Frigorifico      │ │ Ar Condicionado  │ │ Maquina Lavar    │ │
│ │                   │ │                   │ │                   │ │
│ │ [🟢 Na Oficina]  │ │ [🟡 Pedir Peca]  │ │ [🟢 Concluido]   │ │
│ │                   │ │                   │ │                   │ │
│ │ ⚡ DISPONIVEL    │ │ Pedro Costa      │ │ Joao Tecnico     │ │
│ └──────────────────┘ └──────────────────┘ └──────────────────┘ │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ 📋 Atividades Recentes (publicas)                               │
│ ─────────────────────────────────────────────────────────────── │
│ 15:30 - Secretaria atribuiu TF-00044 ao tecnico Pedro          │
│ 15:25 - Tecnico Pedro concluiu TF-00043                        │
│ 15:10 - ⚠️ TAREFA: Verificar stock de pecas (para todos)       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Alterar Codigo de Servico para TF-

### 5.1 Atualizar Funcao no Banco de Dados

**Migracao SQL:**

```sql
-- Atualizar funcao de geracao de codigo
CREATE OR REPLACE FUNCTION public.generate_service_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  -- Buscar o maior numero existente (de OS- ou TF-)
  SELECT COALESCE(
    GREATEST(
      COALESCE(MAX(CAST(SUBSTRING(code FROM 4) AS INTEGER)) FILTER (WHERE code LIKE 'TF-%'), 0),
      COALESCE(MAX(CAST(SUBSTRING(code FROM 4) AS INTEGER)) FILTER (WHERE code LIKE 'OS-%'), 0)
    ), 0) + 1
  INTO next_num
  FROM public.services;
  
  NEW.code := 'TF-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$;
```

### 5.2 Manter Retrocompatibilidade

Os codigos existentes "OS-XXXXX" continuam validos. Apenas novos servicos usam "TF-XXXXX".

---

## 6. Ficheiros a Criar/Modificar

| Ficheiro | Acao | Descricao |
|----------|------|-----------|
| Migracao SQL | Criar | Tabela `activity_logs` + atualizar funcao codigo |
| `src/utils/activityLogUtils.ts` | Criar | Funcoes para registar atividades |
| `src/components/modals/SendTaskModal.tsx` | Criar | Modal para enviar tarefas/notificacoes |
| `src/pages/OficinaPage.tsx` | Modificar | Reformular para cards com atribuicao |
| `src/pages/TVMonitorPage.tsx` | Modificar | Remover "a_precificar", cards maiores, feed de atividades |
| `src/utils/notificationUtils.ts` | Modificar | Adicionar novos tipos de notificacao |
| `src/components/modals/AssignTechnicianModal.tsx` | Modificar | Registar atividade ao atribuir |

---

## 7. Seccao Tecnica

### 7.1 Schema da Tabela activity_logs

```sql
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'atribuicao', 'inicio_execucao', 'levantamento', 'pedido_peca',
    'peca_chegou', 'conclusao', 'precificacao', 'pagamento', 'entrega', 'tarefa'
  )),
  description TEXT NOT NULL,
  metadata JSONB,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Activity logs viewable by dono and secretaria"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (is_dono(auth.uid()) OR is_secretaria(auth.uid()) OR is_public = true);

CREATE POLICY "Insert logs for authenticated"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);
```

### 7.2 Hook para Activity Logs

```typescript
// src/hooks/useActivityLogs.ts
export function useActivityLogs(options: { serviceId?: string; limit?: number; publicOnly?: boolean }) {
  return useQuery({
    queryKey: ['activity-logs', options],
    queryFn: async () => {
      let query = supabase
        .from('activity_logs')
        .select(`
          *,
          actor:profiles!activity_logs_actor_id_fkey(full_name),
          service:services(code, customer:customers(name))
        `)
        .order('created_at', { ascending: false })
        .limit(options.limit || 20);

      if (options.serviceId) {
        query = query.eq('service_id', options.serviceId);
      }
      if (options.publicOnly) {
        query = query.eq('is_public', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}
```

### 7.3 Integracao ao Atribuir Tecnico

```typescript
// Em AssignTechnicianModal.tsx, apos sucesso:
await logActivity({
  serviceId: service.id,
  actorId: user?.id,
  actionType: 'atribuicao',
  description: `Secretaria atribuiu ${service.code} ao tecnico ${technicianName}`,
  isPublic: true,
});
```

### 7.4 SendTaskModal - Estrutura

```typescript
interface SendTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Campos:
// - recipientType: 'tecnico' | 'secretaria' | 'todos'
// - recipientId: string (se tecnico especifico)
// - message: string
// - showOnMonitor: boolean
```

---

## 8. Fluxo de Dados do Monitor

```text
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Oficina      │     │  Activity Logs  │     │   TV Monitor    │
│  (Secretaria)   │────▶│    (Supabase)   │◀────│   (Publico)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                        │                       │
        │ Atribuir tecnico       │                       │
        │ Enviar tarefa          │                       │
        ▼                        ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ logActivity()   │────▶│  is_public=true │────▶│ Feed de         │
│ notify()        │     │  is_public=false│     │ Atividades      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## 9. Resultado Esperado

1. **Oficina (Dono/Secretaria)**:
   - Cards de servico com informacao completa
   - Botao "Atribuir Tecnico" em servicos sem tecnico
   - Secao de historico de atividades recentes

2. **TV Monitor**:
   - Sem contador "a_precificar"
   - Cards maiores e mais legiveis
   - Servicos sem tecnico mostram "DISPONIVEL"
   - Feed de atividades publicas em tempo real

3. **Codigos de Servico**:
   - Novos servicos usam "TF-XXXXX"
   - Compatibilidade com codigos "OS-" existentes

4. **Sistema de Tarefas**:
   - Modal para enviar notificacoes/tarefas
   - Opcao de mostrar no monitor (publico)
   - Historico de todas as acoes

