
# Plano: Corrigir Logica de Coexistencia de Estados na Criacao e Conclusao de Servicos

## Problema

Servicos de Entrega e Instalacao criados com preco definido vao para `em_debito` como status principal, fazendo com que o tecnico NAO consiga ver nem executar o servico.

Adicionalmente, ao concluir uma Entrega sem preco definido, o fluxo nao marca `pending_pricing = true`, perdendo o servico da lista "A Precificar".

## Logica Correcta de Coexistencia

Um servico tem DUAS dimensoes:

| Dimensao | Como funciona |
|----------|---------------|
| **Operacional** | Campo `status` - onde esta no fluxo (por_fazer → em_execucao → finalizado) |
| **Financeiro** | Calculado dinamicamente: `final_price > amount_paid` = em debito |
| **Precificacao** | Campo `pending_pricing` - indica se precisa de definir preco |

Estas dimensoes COEXISTEM. Exemplos validos:
- `status: por_fazer` + debito calculado (final_price > 0, amount_paid = 0)
- `status: finalizado` + `pending_pricing: true` (precisa de preco)
- `status: finalizado` + debito calculado (aguarda pagamento)

## Correcoes a Implementar

### 1. CreateDeliveryModal.tsx

**Linha 209 - Antes:**
```typescript
const status = values.final_price && values.final_price > 0 ? 'em_debito' : 'por_fazer';
```

**Depois:**
```typescript
// Status operacional - sempre por_fazer na criacao
// O debito e calculado dinamicamente via final_price > amount_paid
const status = 'por_fazer';

// Se nao tem preco definido, marcar como pending_pricing
const needsPricing = !values.final_price || values.final_price <= 0;
```

**Linhas 211-229 - Adicionar pending_pricing:**
```typescript
await createService.mutateAsync({
  // ... campos existentes ...
  status,
  pending_pricing: needsPricing,  // NOVO
  // ...
});
```

### 2. CreateInstallationModal.tsx

**Linha 209 - Antes:**
```typescript
const status = values.final_price && values.final_price > 0 ? 'em_debito' : 'por_fazer';
```

**Depois:**
```typescript
// Status operacional - sempre por_fazer na criacao
const status = 'por_fazer';

// Se nao tem preco definido, marcar como pending_pricing
const needsPricing = !values.final_price || values.final_price <= 0;
```

**Linhas 211-229 - Adicionar pending_pricing:**
```typescript
await createService.mutateAsync({
  // ... campos existentes ...
  status,
  pending_pricing: needsPricing,  // NOVO
  // ...
});
```

### 3. TechnicianDeliveryFlow.tsx

**Linhas 61-66 - Antes:**
```typescript
await updateService.mutateAsync({
  id: service.id,
  status: 'finalizado',
  service_location: 'entregue',
  delivery_date: new Date().toISOString(),
});
```

**Depois:**
```typescript
// Verificar se precisa de precificacao
const needsPricing = !service.is_warranty && (service.final_price || 0) === 0;

await updateService.mutateAsync({
  id: service.id,
  status: 'finalizado',
  service_location: 'entregue',
  delivery_date: new Date().toISOString(),
  pending_pricing: needsPricing,  // NOVO - coexiste com finalizado
});
```

### 4. TechnicianInstallationFlow.tsx

**Sem alteracoes necessarias** - ja implementa a logica correcta (linha 87).

## Fluxos Corrigidos

### Entrega Direta COM Preco Definido na Criacao

```text
Criacao:
  status: por_fazer
  final_price: 50.00
  pending_pricing: false

Tecnico executa:
  Aparece na sua agenda ✓
  Faz entrega, recolhe assinatura

Conclusao:
  status: finalizado
  pending_pricing: false

Resultado:
  - NAO aparece em "A Precificar"
  - Aparece em "Em Debito" (calculado: 50 > 0)
  - Apos pagamento total, sai de "Em Debito"
```

### Entrega Direta SEM Preco Definido na Criacao

```text
Criacao:
  status: por_fazer
  final_price: null
  pending_pricing: true

Tecnico executa:
  Aparece na sua agenda ✓
  Faz entrega, recolhe assinatura

Conclusao:
  status: finalizado
  pending_pricing: true

Resultado:
  - Aparece em "A Precificar"
  - Administrador define preco
  - Apos definir preco: pending_pricing = false
  - Passa para "Em Debito" (calculado)
  - Apos pagamento total, finalizado limpo
```

### Instalacao COM Preco Definido na Criacao

```text
Criacao:
  status: por_fazer
  final_price: 120.00
  pending_pricing: false

Tecnico executa:
  Aparece na sua agenda ✓
  Faz instalacao, tira fotos, recolhe assinatura

Conclusao:
  status: finalizado
  pending_pricing: false (ja tem preco)

Resultado:
  - NAO aparece em "A Precificar"
  - Aparece em "Em Debito" (calculado: 120 > 0)
  - Apos pagamento total, sai de "Em Debito"
```

### Instalacao SEM Preco Definido na Criacao

```text
Criacao:
  status: por_fazer
  final_price: null
  pending_pricing: true

Tecnico executa:
  Aparece na sua agenda ✓
  Faz instalacao, tira fotos, recolhe assinatura

Conclusao:
  status: finalizado
  pending_pricing: true

Resultado:
  - Aparece em "A Precificar"
  - Administrador define preco
  - Passa para "Em Debito"
  - Apos pagamento total, finalizado limpo
```

## Ficheiros a Modificar

| Ficheiro | Alteracoes |
|----------|------------|
| `src/components/modals/CreateDeliveryModal.tsx` | Linha 209: status sempre `por_fazer`, adicionar `pending_pricing` |
| `src/components/modals/CreateInstallationModal.tsx` | Linha 209: status sempre `por_fazer`, adicionar `pending_pricing` |
| `src/pages/technician/TechnicianDeliveryFlow.tsx` | Linhas 61-66: adicionar verificacao e `pending_pricing` na conclusao |

## Impacto

### O que muda:
- Servicos com preco ja definido aparecem para o tecnico (status operacional `por_fazer`)
- Servicos sem preco ficam marcados para precificacao desde a criacao
- Entrega passa a marcar `pending_pricing` na conclusao se nao tiver preco

### O que NAO muda:
- Dashboard continua a calcular debito dinamicamente
- SecretaryDebitoPage continua a funcionar
- SetPriceModal continua a limpar `pending_pricing` ao definir preco
- Servicos existentes continuam a funcionar

## Nota Importante

Servicos ja criados incorretamente com status `em_debito` podem necessitar de correcao manual via SQL:

```sql
-- Corrigir servicos de entrega/instalacao que estao em em_debito mas deveriam estar por_fazer
UPDATE public.services
SET status = 'por_fazer'
WHERE status = 'em_debito'
  AND service_type IN ('entrega', 'instalacao')
  AND delivery_date IS NULL;  -- Ainda nao foram entregues
```

Esta correcao manual e opcional e pode ser executada se existirem servicos afectados.
