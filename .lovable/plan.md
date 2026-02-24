

# Plano: Corrigir Scroll nos Modais e Adicionar Pecas no ConfirmPartOrderModal

## Diagnostico

O problema de scroll persiste porque o componente `ScrollArea` do Radix UI nao esta a funcionar corretamente dentro do layout flex dos modais. O `ScrollAreaPrimitive.Viewport` interno depende de estilos inline do Radix para `overflow: scroll`, mas isso nao esta a resultar de forma fiavel neste contexto (flex container com `flex-1 min-h-0`).

**Solucao definitiva:** Substituir `<ScrollArea>` por um `<div>` nativo com `overflow-y-auto` em todos os modais afetados. Isto e 100% fiavel, independente do Radix, e resolve o scroll de forma permanente.

## Alteracoes

### 1. Modais de criacao de servico a partir do perfil do cliente

**Ficheiro: `src/components/shared/CustomerDetailSheet.tsx`** (linha ~778)

Substituir:
```typescript
<ScrollArea className="flex-1 min-h-0 px-6">
  <div className="space-y-4 py-4 pr-4">
```
Por:
```typescript
<div className="flex-1 min-h-0 overflow-y-auto px-6">
  <div className="space-y-4 py-4">
```

### 2. CreateServiceModal

**Ficheiro: `src/components/modals/CreateServiceModal.tsx`** (linha ~396)

Mesma substituicao: `ScrollArea` -> `div overflow-y-auto`.

### 3. CreateInstallationModal

**Ficheiro: `src/components/modals/CreateInstallationModal.tsx`** (linha ~278)

Mesma substituicao.

### 4. CreateDeliveryModal

**Ficheiro: `src/components/modals/CreateDeliveryModal.tsx`**

Mesma substituicao.

### 5. RequestPartModal (solicitar peca - tecnico)

**Ficheiro: `src/components/modals/RequestPartModal.tsx`** (linha 168)

Substituir `<ScrollArea>` por `<div className="flex-1 min-h-0 overflow-y-auto px-6">`.

### 6. ConfirmPartOrderModal (registar pedido - admin)

**Ficheiro: `src/components/modals/ConfirmPartOrderModal.tsx`**

Duas alteracoes:

**a) Corrigir scroll:** Substituir `<ScrollArea>` por `<div className="flex-1 min-h-0 overflow-y-auto px-6">`.

**b) Adicionar funcionalidade de adicionar pecas novas:**

Adicionar state para novas pecas (mesmo padrao do `RequestPartModal`):
```typescript
const [newParts, setNewParts] = useState<{name: string, code: string, quantity: string}[]>([]);
```

Na UI, apos a lista de pecas solicitadas, adicionar botao "Adicionar Peca" que permite ao admin:
- Inserir nome, codigo/referencia e quantidade de pecas adicionais
- Remover pecas adicionadas por engano
- Estas novas pecas serao inseridas na tabela `service_parts` no momento do submit, junto com a atualizacao das pecas existentes

No `handleSubmit`, alem de atualizar as pecas pendentes, tambem inserir as novas pecas:
```typescript
if (newParts.length > 0) {
  const validNew = newParts.filter(p => p.name.trim());
  if (validNew.length > 0) {
    await supabase.from('service_parts').insert(
      validNew.map(p => ({
        service_id: service.id,
        part_name: p.name.trim(),
        part_code: p.code.trim() || null,
        quantity: parseInt(p.quantity) || 1,
        is_requested: true,
        arrived: false,
        estimated_arrival: estimatedArrival,
        cost: cost ? parseCurrencyInput(cost) : null,
        iva_rate: parseFloat(ivaRate),
        supplier: supplier || null,
      }))
    );
  }
}
```

## Ficheiros Alterados

| Ficheiro | Alteracao |
|---|---|
| `src/components/shared/CustomerDetailSheet.tsx` | ScrollArea -> div overflow-y-auto |
| `src/components/modals/CreateServiceModal.tsx` | ScrollArea -> div overflow-y-auto |
| `src/components/modals/CreateInstallationModal.tsx` | ScrollArea -> div overflow-y-auto |
| `src/components/modals/CreateDeliveryModal.tsx` | ScrollArea -> div overflow-y-auto |
| `src/components/modals/RequestPartModal.tsx` | ScrollArea -> div overflow-y-auto |
| `src/components/modals/ConfirmPartOrderModal.tsx` | ScrollArea -> div overflow-y-auto + adicionar pecas novas |

## Resultado

- Scroll funciona em todos os modais de criacao de servico (reparacao, instalacao, entrega)
- Scroll funciona no modal de solicitar peca (tecnico)
- Scroll funciona no modal de registar pedido de peca (admin)
- Admin pode adicionar pecas extras no momento de registar o pedido
- Sem dependencia do Radix ScrollArea para scroll em modais

