
# Plano: Alinhamento Completo do Sistema com o Documento Tecnico de Interaccoes e Fluxos

## Resumo da Analise

Apos analise detalhada do codigo actual vs. o documento tecnico de especificacoes fornecido, identifiquei as seguintes areas que necessitam de alinhamento ou correcao.

---

## 1. Conformidades Verificadas (Implementacao Correcta)

### 1.1 Botoes e Modais Implementados Correctamente

| Funcionalidade | Estado |
|----------------|--------|
| "Adicionar Servico" (Dono/Secretaria) | CONFORME - Dropdown com opcoes Reparacao/Instalacao/Entrega |
| "Atribuir/Reatribuir Tecnico" | CONFORME - AssignTechnicianModal com data/turno |
| "Definir Preco" (Dono) | CONFORME - SetPriceModal com labor/parts/discount |
| "Registrar Pagamento" (Dono/Secretaria) | CONFORME - RegisterPaymentModal com historico |
| "Forcar Status" (Dono exclusivo) | CONFORME - ForceStateModal disponivel |
| "Gerir Entrega" com bifurcacao | CONFORME - DeliveryManagementModal com opcoes |
| "Dar Baixa" (Cliente Recolhe) | CONFORME - SecretaryConcluidosPage implementa |
| Auto-deteccao de cliente | CONFORME - CreateServiceModal pesquisa por telefone/NIF |
| Fluxo de Oficina (Tecnico) | CONFORME - WorkshopFlowModals com 5 passos |
| Fluxos de Visita/Instalacao/Entrega | CONFORME - Modais sequenciais implementados |

### 1.2 Permissoes por Role

| Verificacao | Estado |
|-------------|--------|
| Dono pode definir preco | CONFORME |
| Secretaria NAO pode definir preco | CONFORME |
| Tecnico ve apenas servicos atribuidos | CONFORME |
| Dono/Secretaria podem criar servicos | CONFORME |

---

## 2. Discrepancias Identificadas

### 2.1 CRITICO: Falta Campo `last_status_before_part_request`

**Documento:**
> "Guarda Service.last_status_before_part_request [...] Peca Recebida → restaura last_status_before_part_request"

**Implementacao Actual:**
- O campo `last_status_before_part_request` NAO existe na tabela `services`
- Na funcao `handleMarkPartArrived` (GeralPage.tsx, linha 143-151), o status e definido como `por_fazer` fixo em vez de restaurar o status anterior

**Codigo Actual (Linha 143-151):**
```typescript
const handleMarkPartArrived = async (service: Service) => {
  try {
    await updateService.mutateAsync({
      id: service.id,
      status: 'por_fazer'  // PROBLEMA: Deveria restaurar o status anterior
    });
    toast.success('Peça marcada como chegada. Serviço pronto para retomar.');
  }
};
```

**Correcao Necessaria:**
1. Adicionar coluna `last_status_before_part_request` na tabela `services`
2. No `RequestPartModal`, guardar o status actual antes de mudar para `para_pedir_peca`
3. No `handleMarkPartArrived`, restaurar o status guardado

---

### 2.2 Falta Transicao `para_pedir_peca` → `em_espera_de_peca`

**Documento:**
> "para_pedir_peca: Confirmacao do pedido [...] → em_espera_de_peca"

**Implementacao Actual:**
- O `RequestPartModal` muda directamente para `para_pedir_peca`
- NAO ha implementacao da transicao para `em_espera_de_peca` quando o Dono "Registra Pedido"
- O botao "Registar Pedido" em `StateActionButtons` dispara `onMarkPartArrived`, mas esta funcao nao distingue entre os dois estados

**Codigo Actual (StateActionButtons, linhas 110-119):**
```typescript
case 'para_pedir_peca':
  if (isDono && onMarkPartArrived) {
    return {
      label: 'Registar Pedido',
      icon: Package,
      onClick: onMarkPartArrived,  // PROBLEMA: Mesma funcao para ambos estados
    };
  }
```

**Correcao Necessaria:**
1. Criar handler separado `onConfirmPartOrder` para transitar `para_pedir_peca` → `em_espera_de_peca`
2. Manter `onMarkPartArrived` para transitar `em_espera_de_peca` → status anterior

---

### 2.3 Falta Botao "Assumir Servico" para Tecnicos

**Documento:**
> "Botao 'Assumir Servico' [...] Servico Nao Atribuido (technician_id === null) [...] aparece na seccao 'Servicos Disponiveis para Assumir'"

**Implementacao Actual:**
- `TechnicianOfficePage.tsx` (linha 42-43) filtra apenas servicos JA atribuidos ao tecnico:
```typescript
.eq('technician_id', tech.id)  // PROBLEMA: Ignora servicos sem atribuicao
```
- NAO existe seccao "Servicos Disponiveis para Assumir"
- NAO existe botao "Assumir Servico"

**Correcao Necessaria:**
1. Adicionar query separada para servicos com `technician_id = null`
2. Criar seccao "Servicos Disponiveis para Assumir"
3. Implementar botao "Assumir Servico" que atribui o tecnico logado

---

### 2.4 QR Code na Ficha/Etiqueta

**Documento:**
> "O QR Code [...] codifica o Service.id [...] redireciona para [...] /technician/flow?serviceId=[ID]"

**Implementacao Actual:**
- O ficheiro `ServiceTagModal.tsx` usa `qrcode.react` (existe na lista de dependencias)
- Precisa verificar se o URL codificado esta correcto

**Verificar:** O modal ServiceTagModal.tsx precisa ser analisado para confirmar a implementacao do QR Code.

---

### 2.5 CreateServiceModal: Status Inicial

**Documento:**
> "Service.status: Define-se como por_fazer (se service_location: 'cliente') ou na_oficina (se service_location: 'oficina')."

**Implementacao Actual (CreateServiceModal.tsx, linha 240):**
```typescript
status: 'por_fazer',  // PROBLEMA: Sempre 'por_fazer' independente da localizacao
```

**Correcao Necessaria:**
Mudar para:
```typescript
status: values.service_location === 'oficina' ? 'na_oficina' : 'por_fazer',
```

---

### 2.6 Falta Botao "Caminho para o Cliente"

**Documento:**
> "Botao 'Caminho para o Cliente' [...] Abre o navegador com o Google Maps"

**Implementacao Actual:**
- Os modais de fluxo (`VisitFlowModals`, etc.) NAO incluem botao de navegacao GPS
- A morada esta disponivel em `service.service_address`

**Correcao Necessaria:**
Adicionar botao nos fluxos de Visita, Instalacao e Entrega:
```typescript
<Button
  variant="outline"
  onClick={() => {
    const address = encodeURIComponent(
      `${service.service_address}, ${service.service_postal_code} ${service.service_city}`
    );
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${address}`, '_blank');
  }}
>
  <MapPin className="h-4 w-4 mr-2" />
  Caminho para o Cliente
</Button>
```

---

## 3. Ficheiros a Modificar

| Ficheiro | Alteracao |
|----------|-----------|
| `supabase/migrations/` | Adicionar coluna `last_status_before_part_request` |
| `src/types/database.ts` | Adicionar tipo para novo campo |
| `src/components/modals/RequestPartModal.tsx` | Guardar status anterior antes de mudar |
| `src/pages/GeralPage.tsx` | Implementar logica de transicao de pecas correcta |
| `src/components/services/StateActionButtons.tsx` | Adicionar handler separado para confirmar pedido |
| `src/pages/technician/TechnicianOfficePage.tsx` | Adicionar seccao "Servicos Disponiveis" |
| `src/components/modals/CreateServiceModal.tsx` | Corrigir status inicial baseado em localizacao |
| `src/components/technician/VisitFlowModals.tsx` | Adicionar botao "Caminho para o Cliente" |
| `src/components/technician/InstallationFlowModals.tsx` | Adicionar botao "Caminho para o Cliente" |
| `src/components/technician/DeliveryFlowModals.tsx` | Adicionar botao "Caminho para o Cliente" |

---

## 4. Diagrama: Fluxo de Pecas Corrigido

```text
                    Tecnico identifica necessidade
                              │
                              ▼
                    ┌─────────────────────┐
                    │  RequestPartModal   │
                    │                     │
                    │ 1. Guardar status   │
                    │    actual em        │
                    │    last_status_...  │
                    │                     │
                    │ 2. status →         │
                    │    para_pedir_peca  │
                    └─────────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │  para_pedir_peca    │
                    │                     │
                    │ Botao: "Registar    │
                    │ Pedido" (Dono)      │
                    └─────────────────────┘
                              │
                              ▼ onConfirmPartOrder()
                    ┌─────────────────────┐
                    │ em_espera_de_peca   │
                    │                     │
                    │ Botao: "Peca        │
                    │ Chegou" (Dono)      │
                    └─────────────────────┘
                              │
                              ▼ onMarkPartArrived()
                    ┌─────────────────────┐
                    │ Restaurar:          │
                    │ last_status_...     │
                    │                     │
                    │ Ex: na_oficina ou   │
                    │     em_execucao     │
                    └─────────────────────┘
```

---

## 5. Seccao Tecnica: Alteracoes Detalhadas

### 5.1 Migracao SQL para Campo de Status Anterior

```sql
ALTER TABLE public.services 
ADD COLUMN last_status_before_part_request text;

COMMENT ON COLUMN public.services.last_status_before_part_request IS 
'Armazena o status anterior quando o servico entra em para_pedir_peca ou em_espera_de_peca';
```

### 5.2 RequestPartModal - Guardar Status Anterior

```typescript
// Linha ~76, antes de updateService
const currentStatus = service.status;

await updateService.mutateAsync({
  id: service.id,
  status: 'para_pedir_peca',
  last_status_before_part_request: currentStatus, // NOVO
});
```

### 5.3 GeralPage - Handlers Separados para Pecas

```typescript
// Handler para confirmar que o pedido foi feito (para_pedir_peca → em_espera_de_peca)
const handleConfirmPartOrder = async (service: Service) => {
  try {
    await updateService.mutateAsync({
      id: service.id,
      status: 'em_espera_de_peca',
    });
    toast.success('Pedido de peça registado. Aguardando chegada.');
  } catch (error) {
    console.error('Error confirming part order:', error);
  }
};

// Handler para quando a peca chega (em_espera_de_peca → status anterior)
const handleMarkPartArrived = async (service: Service) => {
  try {
    const previousStatus = service.last_status_before_part_request || 'na_oficina';
    await updateService.mutateAsync({
      id: service.id,
      status: previousStatus,
      last_status_before_part_request: null, // Limpar
    });
    toast.success('Peça chegou! Serviço pronto para retomar.');
  } catch (error) {
    console.error('Error marking part arrived:', error);
  }
};
```

### 5.4 StateActionButtons - Logica Separada

```typescript
case 'para_pedir_peca':
  if (isDono && onConfirmPartOrder) {
    return {
      label: 'Registar Pedido',
      icon: Package,
      onClick: onConfirmPartOrder,
      className: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    };
  }
  return null;

case 'em_espera_de_peca':
  if (isDono && onMarkPartArrived) {
    return {
      label: 'Peça Chegou',
      icon: CheckCircle,
      onClick: onMarkPartArrived,
      className: 'bg-green-600 hover:bg-green-700 text-white',
    };
  }
  return null;
```

### 5.5 TechnicianOfficePage - Servicos Disponiveis

```typescript
// Query adicional para servicos sem atribuicao
const { data: availableServices = [] } = useQuery({
  queryKey: ['available-workshop-services'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('services')
      .select('*, customer:customers(*)')
      .is('technician_id', null)
      .eq('service_location', 'oficina')
      .in('status', ['por_fazer', 'na_oficina'])
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data as Service[]) || [];
  },
  staleTime: 30000,
});

// Funcao para assumir servico
const handleAssumeService = async (service: Service) => {
  if (!profile) return;
  
  const { data: tech } = await supabase
    .from('technicians')
    .select('id')
    .eq('profile_id', profile.id)
    .maybeSingle();
  
  if (!tech) return;
  
  await updateService.mutateAsync({
    id: service.id,
    technician_id: tech.id,
    status: 'na_oficina',
  });
  
  toast.success('Serviço assumido com sucesso!');
  refetch();
};
```

---

## 6. Prioridade de Implementacao

| Prioridade | Item | Justificacao |
|------------|------|--------------|
| 1 - ALTA | Campo `last_status_before_part_request` | Impacto critico no fluxo de pecas |
| 1 - ALTA | Transicao `para_pedir_peca` → `em_espera_de_peca` | Fluxo incompleto |
| 2 - MEDIA | Status inicial baseado em localizacao | Conformidade com documento |
| 2 - MEDIA | Servicos Disponiveis para Tecnicos | Funcionalidade em falta |
| 3 - BAIXA | Botao "Caminho para o Cliente" | Melhoria de UX |
| 3 - BAIXA | Verificar QR Code | Funcionalidade secundaria |

---

## 7. Conclusao

O sistema actual tem uma base solida com a maioria das funcionalidades implementadas correctamente. As principais lacunas estao no:

1. **Fluxo de gestao de pecas** - falta o campo de persistencia do status anterior e a separacao clara entre "registar pedido" e "peca chegou"
2. **Autonomia do tecnico** - falta opcao de assumir servicos sem atribuicao
3. **Status inicial de servicos de oficina** - sempre `por_fazer` em vez de `na_oficina`

A implementacao destas correcoes alinhara completamente o sistema com o documento tecnico de especificacoes.
