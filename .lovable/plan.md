
# Plano: Melhorias na Ficha de Servico, Impressao e Tipo na Tabela Geral

## Resumo das Alteracoes Solicitadas

1. **ServiceDetailSheet (Ficha)**: Adicionar imagens do tecnico, assinaturas com descricao, e informacao financeira detalhada
2. **ServicePrintModal (Impressao)**: Incluir imagens, assinaturas do cliente com descricao do motivo, e detalhes financeiros
3. **GeralPage (Tabela Geral)**: Mostrar texto do tipo de servico em vez de apenas icones

---

## 1. Alteracoes na Ficha do Servico (ServiceDetailSheet.tsx)

### 1.1 Adicionar Seccao de Fotos do Servico

**Nova query para buscar fotos:**
```typescript
const { data: servicePhotos = [] } = useQuery({
  queryKey: ['service-photos', service?.id],
  queryFn: async () => {
    if (!service?.id) return [];
    const { data, error } = await supabase
      .from('service_photos')
      .select('*')
      .eq('service_id', service.id)
      .order('uploaded_at', { ascending: false });
    if (error) throw error;
    return data as ServicePhoto[];
  },
  enabled: !!service?.id && open,
});
```

**Nova seccao visual:**
- Exibir galeria de fotos com tipo (visita, oficina, antes, depois)
- Miniaturas clicaveis para ampliar
- Mostrar data de upload e descricao

### 1.2 Adicionar Seccao de Assinaturas

**Nova query para buscar assinaturas:**
```typescript
const { data: serviceSignatures = [] } = useQuery({
  queryKey: ['service-signatures', service?.id],
  queryFn: async () => {
    if (!service?.id) return [];
    const { data, error } = await supabase
      .from('service_signatures')
      .select('*')
      .eq('service_id', service.id)
      .order('signed_at', { ascending: true });
    if (error) throw error;
    return data as ServiceSignature[];
  },
  enabled: !!service?.id && open,
});
```

**Descricao por tipo de assinatura:**
| signature_type | Descricao a mostrar |
|----------------|---------------------|
| `recolha` | "Autorizacao de levantamento do aparelho para reparacao em oficina" |
| `entrega` | "Confirmacao da entrega do aparelho" |
| `visita` | "Confirmacao da execucao do servico no local" |
| `pedido_peca` | "Autorizacao para encomenda de peca" |

**Nova seccao visual:**
- Imagem da assinatura
- Nome do signatario
- Data
- Descricao do motivo

### 1.3 Melhorar Seccao Financeira

A seccao actual ja mostra preco, pago, desconto e debito. Vamos melhorar para incluir:

- **Preco Final**: Total a pagar
- **Valor Pago**: Quanto ja foi pago
- **Desconto**: Se aplicavel
- **Em Debito**: Valor em divida
- **Falta para Pagamento Completo**: Diferenca entre total e pago

```typescript
// Calculos
const totalPaid = service.amount_paid || 0;
const finalPrice = service.final_price || 0;
const remainingBalance = Math.max(0, finalPrice - totalPaid);
```

---

## 2. Alteracoes na Impressao (ServicePrintModal.tsx)

### 2.1 Adicionar Seccao de Fotos

**Nova seccao no documento impresso:**
```tsx
{/* Fotos do Serviço */}
{photos.length > 0 && (
  <section className="mb-6">
    <h2 className="text-lg font-semibold mb-3 border-b pb-1">Evidências Fotográficas</h2>
    <div className="grid grid-cols-3 gap-2">
      {photos.map((photo) => (
        <div key={photo.id} className="border rounded overflow-hidden">
          <img 
            src={photo.file_url} 
            alt={photo.description || 'Foto do serviço'} 
            className="w-full h-24 object-cover"
          />
          <p className="text-xs text-center p-1 bg-gray-50 capitalize">
            {photo.photo_type}
          </p>
        </div>
      ))}
    </div>
  </section>
)}
```

### 2.2 Adicionar Seccao de Assinaturas

**Nova seccao no documento impresso:**
```tsx
{/* Assinaturas */}
{signatures.length > 0 && (
  <section className="mb-6">
    <h2 className="text-lg font-semibold mb-3 border-b pb-1">Assinaturas</h2>
    <div className="space-y-4">
      {signatures.map((sig) => (
        <div key={sig.id} className="flex items-start gap-4 p-3 border rounded">
          <img 
            src={sig.file_url} 
            alt="Assinatura" 
            className="w-32 h-16 object-contain border"
          />
          <div className="flex-1">
            <p className="font-medium">{sig.signer_name || 'Cliente'}</p>
            <p className="text-sm text-muted-foreground">
              {getSignatureDescription(sig.signature_type)}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(sig.signed_at), "dd/MM/yyyy HH:mm")}
            </p>
          </div>
        </div>
      ))}
    </div>
  </section>
)}
```

**Funcao helper para descricao:**
```typescript
const getSignatureDescription = (type: string): string => {
  switch (type) {
    case 'recolha':
      return 'Autorizacao de levantamento do aparelho para reparacao em oficina';
    case 'entrega':
      return 'Confirmacao da entrega do aparelho';
    case 'visita':
      return 'Confirmacao da execucao do servico no local';
    case 'pedido_peca':
      return 'Autorizacao para encomenda de peca';
    default:
      return 'Assinatura do cliente';
  }
};
```

### 2.3 Melhorar Resumo Financeiro na Impressao

A seccao actual ja existe (linhas 276-322), mas vamos garantir que mostra:
- Mao de Obra
- Pecas
- Desconto (quando aplicavel)
- **TOTAL**
- Valor Pago (quando aplicavel)
- **Em Debito** (quando aplicavel)
- **Falta para pagamento completo** (quando aplicavel)

---

## 3. Alteracoes na Tabela Geral (GeralPage.tsx)

### 3.1 Mudar Tipo de Icone para Texto

**Codigo Actual (linhas 238-259):**
- Para `service_location === 'cliente'` mostra icone MapPin sem texto
- Para outros casos mostra Badge com texto

**Alteracao:**
Remover icones e mostrar sempre texto:
- "REPARACAO" para `service_type === 'reparacao'`
- "INSTALACAO" para `service_type === 'instalacao'`
- "ENTREGA" para `service_type === 'entrega'`

**Novo codigo:**
```tsx
const getTypeConfig = () => {
  if (service.service_type === 'instalacao') {
    return { label: 'INSTALACAO', colorClass: 'bg-yellow-500 text-black' };
  }
  if (service.service_type === 'entrega') {
    return { label: 'ENTREGA', colorClass: 'bg-green-500 text-white' };
  }
  // Reparacao - distinguir visita vs oficina
  if (service.service_location === 'cliente') {
    return { label: 'REPARACAO', colorClass: 'bg-blue-500 text-white' };
  }
  return { label: 'REPARACAO', colorClass: 'bg-orange-500 text-white' };
};

// Na celula:
<TableCell>
  <Badge className={`text-xs ${typeConfig.colorClass}`}>
    {typeConfig.label}
  </Badge>
</TableCell>
```

---

## 4. Ficheiros a Modificar

| Ficheiro | Alteracoes |
|----------|------------|
| `src/components/services/ServiceDetailSheet.tsx` | Adicionar queries para fotos e assinaturas; Nova seccao de fotos; Nova seccao de assinaturas com descricao |
| `src/components/modals/ServicePrintModal.tsx` | Adicionar queries para fotos e assinaturas; Seccoes de fotos e assinaturas no documento impresso |
| `src/pages/GeralPage.tsx` | Simplificar coluna Tipo para mostrar texto em vez de icones |

---

## 5. Estrutura das Novas Seccoes

### 5.1 ServiceDetailSheet - Nova Seccao de Fotos

```text
┌──────────────────────────────────────┐
│ 📷 Fotos do Serviço                  │
├──────────────────────────────────────┤
│ ┌─────┐ ┌─────┐ ┌─────┐             │
│ │ 📷  │ │ 📷  │ │ 📷  │             │
│ │ANTES│ │DEPOIS│ │VISITA│            │
│ └─────┘ └─────┘ └─────┘             │
│                                      │
│ Clique para ampliar                  │
└──────────────────────────────────────┘
```

### 5.2 ServiceDetailSheet - Nova Seccao de Assinaturas

```text
┌──────────────────────────────────────┐
│ ✍️ Assinaturas do Cliente            │
├──────────────────────────────────────┤
│ ┌──────────────────────────────────┐ │
│ │ [Imagem Assinatura]   Cliente    │ │
│ │ ──────────────────              │ │
│ │ "Confirmacao da execucao do     │ │
│ │  servico no local"              │ │
│ │ 26/01/2026 15:30                │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ [Imagem Assinatura]   Cliente    │ │
│ │ ──────────────────              │ │
│ │ "Autorizacao para encomenda     │ │
│ │  de peca"                       │ │
│ │ 26/01/2026 16:45                │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

### 5.3 ServiceDetailSheet - Seccao Financeira Melhorada

```text
┌──────────────────────────────────────┐
│ 💰 Informacao Financeira             │
├──────────────────────────────────────┤
│ Mao de Obra:          50.00 €       │
│ Pecas:                30.00 €       │
│ Desconto:             -5.00 €       │
│ ─────────────────────────────       │
│ TOTAL:                75.00 €       │
│                                      │
│ Ja Pago:              25.00 €       │
│ Em Debito:            50.00 €       │
│ Falta para Pagamento: 50.00 €       │
└──────────────────────────────────────┘
```

---

## 6. Mapeamento de Tipos de Assinatura

| Codigo | Descricao para o Cliente |
|--------|--------------------------|
| `recolha` | "Autorizacao de levantamento do aparelho para reparacao em oficina" |
| `entrega` | "Confirmacao da entrega do aparelho" |
| `visita` | "Confirmacao da execucao do servico no local" |
| `pedido_peca` | "Autorizacao para encomenda de peca" |

---

## 7. Mapeamento de Tipos de Foto

| Codigo | Label a Mostrar |
|--------|-----------------|
| `visita` | "Visita" |
| `oficina` | "Oficina" |
| `entrega` | "Entrega" |
| `instalacao` | "Instalacao" |
| `antes` | "Antes" |
| `depois` | "Depois" |

---

## 8. Resultado Esperado

1. **Ficha do Servico** mostra:
   - Galeria de fotos tiradas pelo tecnico
   - Assinaturas do cliente com descricao clara do motivo
   - Informacao financeira completa (preco, pago, desconto, debito, falta pagar)

2. **Impressao da Ficha** inclui:
   - Todas as fotos do servico
   - Assinaturas com descricao do proposito
   - Resumo financeiro detalhado

3. **Tabela Geral** mostra:
   - Tipo como texto (REPARACAO, INSTALACAO, ENTREGA) em vez de icones
   - Badges coloridos para diferenciar visualmente
