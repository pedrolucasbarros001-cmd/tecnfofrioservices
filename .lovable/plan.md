

# Plano Completo: Correções de Ficha + Lógica de Oficina + Sistema de Transferência

## Resumo das Alterações

Este plano aborda 6 áreas principais:
1. **Corrigir layout da Ficha de Serviço** (cabeçalho da empresa vertical, fonte pequena)
2. **Corrigir título truncado "Ficha de arra"** (layout do título)
3. **Corrigir botão de imprimir** (texto "Imprimir" visível)
4. **Aviso de 30 dias apenas para oficina** (condição por service_location)
5. **Uniformizar lógica de oficina** (remover técnico ao levantar)
6. **Sistema de transferência de serviço** (nova funcionalidade completa)

---

## 1. Corrigir Layout do Cabeçalho da Ficha

### Problema
As informações da empresa estão numa linha horizontal, ocupando espaço e causando truncamento ("Ficha de arra").

### Solução
Reorganizar o cabeçalho para:
- Logo TECNOFRIO à esquerda
- Título "Ficha de Serviço" à direita (sem truncamento)
- Dados da empresa em coluna vertical abaixo do logo, com fonte muito pequena (text-[10px])

### Ficheiros a Alterar

| Ficheiro | Alteração |
|----------|-----------|
| `src/pages/ServicePrintPage.tsx` | Reformular header com dados da empresa em coluna vertical abaixo do logo |
| `src/components/modals/ServicePrintModal.tsx` | Aplicar mesmo layout em 2 locais (PrintContent e DialogContent) |

### Novo Layout do Cabeçalho

```text
┌─────────────────────────────────────────────────────┐
│  [LOGO TECNOFRIO]                    Ficha de Serviço │
│                                                       │
│  R. Dom Pedro IV 3 R/C, Bairro da Coxa               │
│  5300-124 Bragança                                    │
│  Tel: 273 332 772 | tecno.frio@sapo.pt               │
└───────────────────────────────────────────────────────┘
```

### Código do Header Actualizado (ServicePrintPage.tsx)

```tsx
{/* Header */}
<div className="flex items-start justify-between mb-1.5 relative z-10">
  <div className="flex flex-col">
    <img 
      src={tecnofrioLogoFull} 
      alt="TECNOFRIO" 
      className="h-10 object-contain"
    />
    <div className="mt-1 text-[10px] text-muted-foreground leading-tight">
      <p>{COMPANY_INFO.address}</p>
      <p>{COMPANY_INFO.postalCode} {COMPANY_INFO.city}</p>
      <p>Tel: {COMPANY_INFO.phone} | {COMPANY_INFO.email}</p>
    </div>
  </div>
  <div className="text-right">
    <h1 className="text-lg font-bold">Ficha de Serviço</h1>
  </div>
</div>
```

---

## 2. Remover Linha de Contactos Horizontal

### Problema Actual
Existe uma barra horizontal com ícones (MapPin, Phone, Mail) que ocupa espaço desnecessário:

```tsx
<div className="flex items-center justify-center gap-4 text-xs text-muted-foreground mb-1.5 border-y py-1 bg-muted/30">
```

### Solução
Remover esta secção já que os dados passam a estar no header vertical.

---

## 3. Aviso de 30 Dias Apenas para Oficina

### Problema
O aviso "IMPORTANTE - Termos de Guarda" sobre os 30 dias aparece em todas as fichas, incluindo instalação e entrega.

### Solução
Adicionar condição para mostrar apenas quando `service_location === 'oficina'`:

### Alteração em ServicePrintPage.tsx (linhas 576-589)

De:
```tsx
<Separator className="my-1" />

{/* Terms Section */}
<section className="bg-amber-50 border border-amber-200 rounded p-1.5 text-xs">
  ...
</section>
```

Para:
```tsx
{/* Terms Section - Only for workshop services */}
{service.service_location === 'oficina' && (
  <>
    <Separator className="my-1" />
    <section className="bg-amber-50 border border-amber-200 rounded p-1.5 text-xs">
      <h3 className="font-semibold text-amber-800 mb-0.5 flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        IMPORTANTE - Termos de Guarda
      </h3>
      <p className="text-amber-700 leading-tight text-[10px]">
        Os equipamentos só podem permanecer nas instalações por <strong>30 dias</strong> após 
        conclusão e notificação. Após este prazo, a empresa <strong>não se responsabiliza</strong> 
        pela guarda ou danos.
      </p>
    </section>
  </>
)}
```

### Alteração em ServicePrintModal.tsx

Aplicar a mesma condição em 2 locais:
1. PrintContent (linhas 431-444) - inline styles
2. DialogContent (linhas 799-812) - Tailwind classes

---

## 4. Uniformizar Lógica de "Levantar para Oficina"

### Problema Actual
- `TechnicianVisitFlow.tsx` (standalone): Remove `technician_id`, `scheduled_date`, `scheduled_shift`
- `VisitFlowModals.tsx` (modal): NÃO remove o técnico

### Solução
Actualizar `VisitFlowModals.tsx` para também remover o técnico quando o aparelho é levantado para oficina.

### Ficheiro a Alterar

**`src/components/technician/VisitFlowModals.tsx`** - Linhas 291-296

De:
```typescript
await updateService.mutateAsync({
  id: service.id,
  status: 'na_oficina',
  service_location: 'oficina',
  detected_fault: formData.detectedFault,
});
```

Para:
```typescript
await updateService.mutateAsync({
  id: service.id,
  status: 'por_fazer',           // Trigger normaliza para oficina sem técnico
  service_location: 'oficina',
  technician_id: null,           // Remove técnico - serviço fica disponível
  scheduled_date: null,          // Limpa agendamento
  scheduled_shift: null,
  detected_fault: formData.detectedFault,
});
```

---

## 5. Sistema de Transferência de Serviço Entre Técnicos

### Descrição Funcional

1. **Técnico A** tem um serviço atribuído
2. **Técnico A** clica no ícone de transferência (seta inclinada) no canto superior esquerdo do card
3. Abre modal para escolher **Técnico B**
4. **Técnico A** envia solicitação
5. **Técnico B** recebe notificação de pedido de transferência
6. **Técnico B** pode aceitar ou recusar
7. Se aceitar:
   - Serviço move para Técnico B
   - Técnico A recebe notificação de aceitação
   - Administrador e Secretária recebem notificação de aviso
   - Histórico do serviço mantém registo da transferência (activity_logs)

### Alterações na Base de Dados

#### Nova Tabela: `service_transfer_requests`

```sql
CREATE TABLE service_transfer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  from_technician_id UUID NOT NULL REFERENCES technicians(id),
  to_technician_id UUID NOT NULL REFERENCES technicians(id),
  status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente', 'aceite', 'recusado', 'cancelado'
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  
  CONSTRAINT different_technicians CHECK (from_technician_id != to_technician_id)
);

-- RLS Policies
ALTER TABLE service_transfer_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Technicians see own transfers" ON service_transfer_requests
  FOR SELECT USING (
    from_technician_id IN (SELECT id FROM technicians WHERE profile_id = get_technician_profile_id(auth.uid()))
    OR to_technician_id IN (SELECT id FROM technicians WHERE profile_id = get_technician_profile_id(auth.uid()))
    OR is_dono(auth.uid())
    OR is_secretaria(auth.uid())
  );

CREATE POLICY "Technicians can request transfers" ON service_transfer_requests
  FOR INSERT WITH CHECK (
    from_technician_id IN (SELECT id FROM technicians WHERE profile_id = get_technician_profile_id(auth.uid()))
  );

CREATE POLICY "Technicians can update their transfers" ON service_transfer_requests
  FOR UPDATE USING (
    (to_technician_id IN (SELECT id FROM technicians WHERE profile_id = get_technician_profile_id(auth.uid())) AND status = 'pendente')
    OR (from_technician_id IN (SELECT id FROM technicians WHERE profile_id = get_technician_profile_id(auth.uid())) AND status = 'pendente')
    OR is_dono(auth.uid())
  );
```

### Novos Tipos de Notificação

Adicionar ao sistema:
- `transferencia_solicitada` - Para o técnico destino
- `transferencia_aceite` - Para o técnico origem
- `transferencia_recusada` - Para o técnico origem
- `transferencia_aviso` - Para admin/secretária

### Novos Componentes

| Componente | Descrição |
|------------|-----------|
| `src/components/modals/RequestTransferModal.tsx` | Modal para selecionar técnico e enviar pedido |
| `src/hooks/useServiceTransfers.ts` | Hook para gestão de transferências |

### UI do Ícone de Transferência nos Cards

No canto superior esquerdo de cada card de serviço:

```tsx
<Button
  variant="ghost"
  size="icon"
  className="absolute top-2 left-2 h-7 w-7 opacity-60 hover:opacity-100"
  onClick={(e) => {
    e.stopPropagation();
    setTransferService(service);
    setShowTransferModal(true);
  }}
  title="Solicitar transferência"
>
  <ArrowRightLeft className="h-4 w-4" />
</Button>
```

### Alterações em Componentes Existentes

| Ficheiro | Alteração |
|----------|-----------|
| `src/pages/technician/TechnicianOfficePage.tsx` | Adicionar ícone de transferência nos cards |
| `src/pages/ServicosPage.tsx` | Adicionar ícone de transferência nos cards (se técnico) |
| `src/components/shared/NotificationPanel.tsx` | Suporte para notificações de transferência com botões Aceitar/Recusar |
| `src/utils/notificationUtils.ts` | Funções para criar notificações de transferência |
| `src/utils/activityLogUtils.ts` | Função `logServiceTransfer` para manter histórico |
| `src/types/database.ts` | Adicionar tipo ServiceTransferRequest |

### Fluxo de Aceitação

1. Técnico B clica em "Aceitar" na notificação
2. Sistema atualiza `service_transfer_requests.status = 'aceite'`
3. Sistema atualiza `services.technician_id = to_technician_id`
4. Sistema cria notificação para Técnico A (aceite)
5. Sistema cria notificação para Admin/Secretária (aviso)
6. Sistema cria registo em `activity_logs` com tipo 'transferencia_aceite'

---

## Resumo de Ficheiros

### Criar Novos

| Ficheiro | Descrição |
|----------|-----------|
| `src/components/modals/RequestTransferModal.tsx` | Modal de pedido de transferência |
| `src/hooks/useServiceTransfers.ts` | Hook para gestão de transferências |
| Migração SQL | Nova tabela service_transfer_requests |

### Alterar Existentes

| Ficheiro | Alteração |
|----------|-----------|
| `src/pages/ServicePrintPage.tsx` | Header vertical + aviso condicional |
| `src/components/modals/ServicePrintModal.tsx` | Header vertical + aviso condicional (2 locais) |
| `src/components/technician/VisitFlowModals.tsx` | Remover técnico ao levantar para oficina |
| `src/pages/technician/TechnicianOfficePage.tsx` | Ícone de transferência nos cards |
| `src/components/shared/NotificationPanel.tsx` | Notificações de transferência com ações |
| `src/utils/notificationUtils.ts` | Funções de notificação de transferência |
| `src/utils/activityLogUtils.ts` | Log de transferência |
| `src/types/database.ts` | Tipo ServiceTransferRequest |

---

## Ordem de Implementação

1. **Fase 1**: Correções visuais (Header vertical, remover contactos horizontal, aviso condicional)
2. **Fase 2**: Uniformizar lógica de oficina (VisitFlowModals)
3. **Fase 3**: Criar tabela e migração SQL para transferências
4. **Fase 4**: Implementar hook e modal de transferência
5. **Fase 5**: Actualizar NotificationPanel para aceitar/recusar
6. **Fase 6**: Integrar ícone nos cards de serviço
7. **Fase 7**: Testar fluxo completo

