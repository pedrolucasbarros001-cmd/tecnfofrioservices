

# Plano: Ajustar Fluxos de Tecnico e Sistema de Tags

## Resumo das Alteracoes Solicitadas

O utilizador especificou um fluxo preciso para a visita ao cliente e pediu ajustes no sistema de tags para evitar duplicacao de informacao.

---

## 1. FLUXO DE VISITA - Alteracoes

### 1.1 Remover Opcao "Pedir Peca" na Decisao

**Ficheiro:** `src/components/technician/VisitFlowModals.tsx`

**Estado Actual (linha 36):**
```typescript
type DecisionType = 'reparar_local' | 'levantar_oficina' | 'pedir_peca';
```

**Alteracao:**
```typescript
type DecisionType = 'reparar_local' | 'levantar_oficina';
```

**Remover:** O terceiro radio button "Pedir Peca" do modal de decisao (linhas 456-475)

### 1.2 Novo Fluxo para "Reparar no Local"

Apos seleccionar "Reparar no Local", o tecnico deve seguir estes passos:

```text
Decisao (Reparar no Local)
    │
    ▼
┌─────────────────────────────┐
│ Passo 6: Pecas Usadas       │
│                             │
│ "Usou pecas na reparacao?"  │
│ ○ Nao                       │
│ ○ Sim                       │
│                             │
│ Se Sim:                     │
│ [Nome] [Referencia] [Qtd]   │
│ + Adicionar Peca            │
└─────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│ Passo 7: Precisa Pedir Peca?│
│                             │
│ "Precisa pedir alguma peca?"│
│ ○ Nao                       │
│ ○ Sim                       │
└─────────────────────────────┘
    │
    ├── Se Sim ──────────────────┐
    │                            ▼
    │            ┌─────────────────────────────┐
    │            │ Modal: Detalhes da Peca     │
    │            │ [Nome] [Referencia]         │
    │            │                             │
    │            │ + Assinatura do Cliente     │
    │            │                             │
    │            │ Status → para_pedir_peca    │
    │            └─────────────────────────────┘
    │
    └── Se Nao ──────────────────┐
                                 ▼
                 ┌─────────────────────────────┐
                 │ Modal: Assinatura Final     │
                 │                             │
                 │ "Confirme a conclusao do    │
                 │  servico no local"          │
                 │                             │
                 │ Status → a_precificar/      │
                 │          finalizado         │
                 └─────────────────────────────┘
```

### 1.3 Novos Estados no FormData

```typescript
interface PartEntry {
  name: string;
  reference: string;
  quantity: number;
}

interface FormData {
  detectedFault: string;
  photoFile: string | null;
  decision: DecisionType;
  // NOVOS CAMPOS:
  usedParts: boolean;
  usedPartsList: PartEntry[];
  needsPartOrder: boolean;
  partToOrder: {
    name: string;
    reference: string;
  } | null;
}
```

### 1.4 Novos Passos no Modal

**Adicionar tipos de passo:**
```typescript
type ModalStep = 'resumo' | 'deslocacao' | 'foto' | 'diagnostico' | 'decisao' | 'pecas_usadas' | 'pedir_peca' | 'finalizacao';
```

**Novo Modal: Pecas Usadas (Passo 6)**
- Pergunta: "Usou pecas na reparacao?"
- RadioGroup: Nao / Sim
- Se Sim: Lista dinamica de pecas (nome, referencia, quantidade)
- Botao "+ Adicionar Peca"
- Guardar em `service_parts` com `is_requested: false`

**Novo Modal: Pedir Peca? (Passo 7)**
- Pergunta: "Precisa pedir alguma peca?"
- RadioGroup: Nao / Sim
- Se Sim: Campos nome + referencia + abre assinatura
- Apos assinatura (tipo `pedido_peca`): status → `para_pedir_peca`
- Se Nao: Abre assinatura de conclusao → status → `a_precificar`

### 1.5 Logica de Transicao de Status

**Reparar no Local + Nao precisa pedir peca:**
```typescript
await updateService.mutateAsync({
  id: service.id,
  status: 'a_precificar',
  pending_pricing: true,
  detected_fault: formData.detectedFault,
  work_performed: 'Reparado no local do cliente',
});
```

**Reparar no Local + Precisa pedir peca:**
```typescript
// Guardar assinatura tipo 'pedido_peca'
await supabase.from('service_signatures').insert({
  service_id: service.id,
  signature_type: 'pedido_peca',
  file_url: signatureData,
  signer_name: signerName,
});

// Guardar peca a pedir
await supabase.from('service_parts').insert({
  service_id: service.id,
  part_name: formData.partToOrder.name,
  part_code: formData.partToOrder.reference,
  quantity: 1,
  is_requested: true,
  arrived: false,
});

// Guardar status anterior e mudar para para_pedir_peca
await updateService.mutateAsync({
  id: service.id,
  status: 'para_pedir_peca',
  last_status_before_part_request: service.status,
  detected_fault: formData.detectedFault,
});
```

---

## 2. SISTEMA DE TAGS - Alteracoes

### 2.1 Problema Actual

Na tabela de servicos (`GeralPage.tsx`) e no painel de detalhes (`ServiceDetailSheet.tsx`), o estado aparece duas vezes:
1. Na coluna/badge "Estado" 
2. Como tag (ex: "A Precificar" aparece como estado E como tag)

### 2.2 Nova Logica de Tags

**Tags devem ser informacoes COMPLEMENTARES, nao duplicar o estado.**

**Tags a mostrar:**
| Tag | Condicao | Cor |
|-----|----------|-----|
| Urgente | `service.is_urgent === true` | Vermelho (destructive) + pulsante |
| Garantia | `service.is_warranty === true` | Roxo |
| Em Debito | `service.status !== 'em_debito' && service.final_price > service.amount_paid && service.final_price > 0` | Vermelho |
| A Precificar | `service.status !== 'a_precificar' && service.pending_pricing === true` | Amarelo |

**Regra importante:** Tags "Em Debito" e "A Precificar" so aparecem se o estado PRINCIPAL for diferente (para evitar duplicacao).

### 2.3 Alteracao em GeralPage.tsx (linhas 289-295)

**Codigo Actual:**
```tsx
{/* Tags */}
<TableCell>
  <div className="flex gap-1 flex-wrap">
    {service.pending_pricing && <Badge className="bg-yellow-500 text-black text-xs">A Precificar</Badge>}
    {service.is_urgent && <Badge variant="destructive" className="text-xs animate-pulse">Urgente</Badge>}
    {service.is_warranty && <Badge className="bg-purple-500 text-white text-xs">Garantia</Badge>}
  </div>
</TableCell>
```

**Novo Codigo:**
```tsx
{/* Tags - Informacoes complementares, nao duplicar estado */}
<TableCell>
  <div className="flex gap-1 flex-wrap">
    {/* Urgente - sempre mostra se true */}
    {service.is_urgent && (
      <Badge variant="destructive" className="text-xs animate-pulse">Urgente</Badge>
    )}
    
    {/* Garantia - sempre mostra se true */}
    {service.is_warranty && (
      <Badge className="bg-purple-500 text-white text-xs">Garantia</Badge>
    )}
    
    {/* A Precificar - so mostra se estado NAO for a_precificar */}
    {service.pending_pricing && service.status !== 'a_precificar' && (
      <Badge className="bg-yellow-500 text-black text-xs">A Precificar</Badge>
    )}
    
    {/* Em Debito - indica debito quando estado principal e outro */}
    {service.status !== 'em_debito' && 
     service.final_price > 0 && 
     service.amount_paid < service.final_price && (
      <Badge className="bg-red-500 text-white text-xs">Em Debito</Badge>
    )}
  </div>
</TableCell>
```

### 2.4 Alteracao em ServiceDetailSheet.tsx (linhas 275-318)

**Novo Codigo:**
```tsx
{/* Tags */}
<div className="flex gap-2 flex-wrap">
  {/* Estado principal - sempre primeiro */}
  <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
  
  {/* Tipo de servico */}
  {service.service_type === 'instalacao' && (
    <Badge className="bg-yellow-500 text-black">
      <Wrench className="h-3 w-3 mr-1" />
      Instalacao
    </Badge>
  )}
  {service.service_type === 'entrega' && (
    <Badge className="bg-green-500 text-white">
      <Truck className="h-3 w-3 mr-1" />
      Entrega
    </Badge>
  )}
  {service.service_type === 'reparacao' && service.service_location === 'oficina' && (
    <Badge className="bg-orange-500 text-white">
      <Wrench className="h-3 w-3 mr-1" />
      Oficina
    </Badge>
  )}
  {service.service_type === 'reparacao' && service.service_location === 'cliente' && (
    <Badge className="bg-blue-500 text-white">
      <MapPin className="h-3 w-3 mr-1" />
      Visita
    </Badge>
  )}
  
  {/* Tags complementares - NAO duplicar estado */}
  {service.is_urgent && (
    <Badge variant="destructive" className="animate-pulse">
      <AlertCircle className="h-3 w-3 mr-1" />
      Urgente
    </Badge>
  )}
  {service.is_warranty && (
    <Badge className="bg-purple-500 text-white">
      <Shield className="h-3 w-3 mr-1" />
      Garantia
    </Badge>
  )}
  
  {/* A Precificar - so se estado nao for a_precificar */}
  {service.pending_pricing && service.status !== 'a_precificar' && (
    <Badge className="bg-yellow-500 text-black">
      A Precificar
    </Badge>
  )}
  
  {/* Em Debito - indica debito coexistente */}
  {service.status !== 'em_debito' && 
   service.final_price > 0 && 
   service.amount_paid < service.final_price && (
    <Badge className="bg-red-500 text-white">
      Em Debito
    </Badge>
  )}
</div>
```

---

## 3. Ficheiros a Modificar

| Ficheiro | Alteracoes |
|----------|------------|
| `src/components/technician/VisitFlowModals.tsx` | Remover opcao "Pedir Peca" da decisao; Adicionar passos "Pecas Usadas" e "Pedir Peca?"; Ajustar logica de transicao |
| `src/pages/GeralPage.tsx` | Ajustar logica de tags para nao duplicar estado |
| `src/components/services/ServiceDetailSheet.tsx` | Ajustar logica de tags para nao duplicar estado |

---

## 4. Resumo do Novo Fluxo de Visita

```text
1. Resumo ──────────────► Dados do servico/cliente
2. Deslocacao ──────────► Botao "Caminho para Cliente" + "Cheguei"
3. Foto ────────────────► Tirar foto(s) do aparelho (obrigatorio)
4. Diagnostico ─────────► Campo de texto para avaria detectada
5. Decisao ─────────────► "Reparar no Local" OU "Levantar para Oficina"
   │
   ├─► Levantar Oficina → Assinatura de Recolha → na_oficina
   │
   └─► Reparar no Local
       │
       6. Pecas Usadas ─► "Usou pecas?" → Registar se sim
       │
       7. Pedir Peca? ──► "Precisa pedir peca?"
          │
          ├─► Sim → Nome + Ref + Assinatura → para_pedir_peca
          │
          └─► Nao → Assinatura Final → a_precificar
```

---

## 5. Seccao Tecnica

### 5.1 Componente de Lista de Pecas

```typescript
// Componente reutilizavel para adicionar pecas
interface PartEntryRowProps {
  part: PartEntry;
  index: number;
  onChange: (index: number, field: keyof PartEntry, value: string | number) => void;
  onRemove: (index: number) => void;
}

function PartEntryRow({ part, index, onChange, onRemove }: PartEntryRowProps) {
  return (
    <div className="grid grid-cols-12 gap-2 items-center">
      <Input
        className="col-span-5"
        placeholder="Nome da peca"
        value={part.name}
        onChange={(e) => onChange(index, 'name', e.target.value)}
      />
      <Input
        className="col-span-4"
        placeholder="Referencia"
        value={part.reference}
        onChange={(e) => onChange(index, 'reference', e.target.value)}
      />
      <Input
        className="col-span-2"
        type="number"
        min="1"
        value={part.quantity}
        onChange={(e) => onChange(index, 'quantity', parseInt(e.target.value) || 1)}
      />
      <Button
        variant="ghost"
        size="icon"
        className="col-span-1"
        onClick={() => onRemove(index)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
```

### 5.2 Guardar Pecas Usadas no Banco

```typescript
// Ao confirmar pecas usadas
const saveUsedParts = async () => {
  for (const part of formData.usedPartsList) {
    if (part.name.trim()) {
      await supabase.from('service_parts').insert({
        service_id: service.id,
        part_name: part.name.trim(),
        part_code: part.reference.trim() || null,
        quantity: part.quantity,
        is_requested: false, // Peca usada, nao pedida
        arrived: true, // Ja foi usada
        cost: 0, // Sera definido na precificacao
      });
    }
  }
};
```

### 5.3 Validacoes

- Foto obrigatoria antes de avancar para diagnostico
- Diagnostico obrigatorio (texto nao vazio)
- Se "Usou pecas = Sim", pelo menos 1 peca com nome preenchido
- Se "Pedir peca = Sim", nome da peca obrigatorio + assinatura obrigatoria
- Assinatura final obrigatoria para conclusao

---

## 6. Resultado Esperado

1. Fluxo de visita simplificado com apenas 2 opcoes na decisao
2. Tecnico pode registar pecas usadas antes de concluir
3. Tecnico pode indicar necessidade de pedir peca (com assinatura do cliente)
4. Tags nao duplicam informacao do estado
5. Tags "Em Debito" e "A Precificar" aparecem como informacao complementar quando coexistem com outros estados

