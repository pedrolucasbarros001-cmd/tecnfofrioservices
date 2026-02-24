

# Plano: Corrigir Todos os Bugs nos Fluxos de Servico do Tecnico

## Problemas Identificados

Apos analise completa dos 4 fluxos (Visita, Oficina, Instalacao, Entrega) e componentes partilhados, identifiquei os seguintes problemas concretos:

### BUG 1: InstallationFlowModals -- Assinatura NAO e idempotente (CRASH em duplo-clique)

**Ficheiro:** `src/components/technician/InstallationFlowModals.tsx`, linha 205

O `handleSignatureComplete` insere a assinatura diretamente sem verificar se ja existe:
```typescript
await supabase.from('service_signatures').insert({...});
```

O `VisitFlowModals` e o `DeliveryFlowModals` JA foram corrigidos com `.maybeSingle()` antes do insert. A Instalacao ficou para tras. Resultado: duplo-clique gera registos duplicados ou erro de constraint.

**Correcao:** Adicionar verificacao `maybeSingle()` antes do insert, seguindo o mesmo padrao dos outros fluxos.

### BUG 2: InstallationFlowModals -- Materiais NAO sao idempotentes (duplicados)

**Ficheiro:** `src/components/technician/InstallationFlowModals.tsx`, linhas 177-198

O `handleMaterialsConfirm` insere materiais sem verificar se ja existem:
```typescript
for (const material of materials) {
  await supabase.from('service_parts').insert({...});
}
```

Resultado: Se o tecnico clicar "Registar Materiais" duas vezes, ou se a rede falhar no meio e ele retentar, os materiais sao duplicados.

**Correcao:** Antes de inserir, verificar se ja existem pecas com o mesmo nome para este servico (mesmo padrao usado no `saveUsedParts` do VisitFlowModals).

### BUG 3: InstallationFlowModals -- Falta ensureValidSession em handleMaterialsConfirm

**Ficheiro:** `src/components/technician/InstallationFlowModals.tsx`, linha 177

A funcao nao valida a sessao antes de fazer INSERT na base de dados. Se a sessao expirou, da erro de RLS sem mensagem clara.

**Correcao:** Adicionar `await ensureValidSession()` no inicio e envolver em try/catch com `humanizeError`.

### BUG 4: InstallationFlowModals -- Mensagens de erro genericas em vez de humanizeError

**Ficheiro:** `src/components/technician/InstallationFlowModals.tsx`

Multiplos handlers usam strings fixas em vez de `humanizeError`:
- Linha 136: `toast.error('Erro ao iniciar instalacao')`
- Linha 172: `toast.error('Erro ao guardar foto')`
- Linha 240: `toast.error('Erro ao concluir instalacao')`

Resultado: O tecnico ve mensagens genericas quando o problema real e sessao expirada ou RLS.

**Correcao:** Substituir por `toast.error(humanizeError(error))` e importar `humanizeError`.

### BUG 5: VisitFlowModals -- "confirmacao_peca" sem scroll responsivo (UI cortada em mobile)

**Ficheiro:** `src/components/technician/VisitFlowModals.tsx`, linha 1414

O dialog de confirmacao de peca usa `className="max-w-md p-6"` sem as classes responsivas padrao.

**Correcao:** Mudar para `className="max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto p-6"`.

### BUG 6: SignatureCanvas -- Sem classes responsivas (cortado em telemoveis pequenos)

**Ficheiro:** `src/components/shared/SignatureCanvas.tsx`, linha 119

O DialogContent usa apenas `className="sm:max-w-[500px]"` sem `max-w-[95vw] max-h-[90vh] overflow-y-auto`.

Resultado: Em telemoveis pequenos (360px), o modal de assinatura fica cortado e o botao "Confirmar Assinatura" pode ficar inacessivel. Este componente e PARTILHADO por TODOS os fluxos (Visita, Instalacao, Entrega), portanto a correcao beneficia todo o sistema.

**Correcao:** Adicionar `max-w-[95vw] max-h-[90vh] overflow-y-auto`.

### BUG 7: DeliveryFlowModals -- handlePhotoCapture usa erro generico

**Ficheiro:** `src/components/technician/DeliveryFlowModals.tsx`, linha 155

Usa `toast.error('Erro ao guardar foto')` em vez de `humanizeError(error)`.

**Correcao:** Substituir por `toast.error(humanizeError(error))`.

## Detalhes da Correcao por Ficheiro

### 1. `src/components/technician/InstallationFlowModals.tsx`

**a) Importar humanizeError:**
```typescript
import { humanizeError } from '@/utils/errorMessages';
```

**b) handleStartInstallation (linha 136):**
```typescript
// DE:
toast.error('Erro ao iniciar instalacao');
// PARA:
toast.error(humanizeError(error));
```

**c) handlePhotoCapture (linha 172):**
```typescript
// DE:
toast.error('Erro ao guardar foto');
// PARA:
toast.error(humanizeError(error));
```

**d) handleMaterialsConfirm (linhas 177-198):** Reescrever com ensureValidSession, try/catch, idempotencia:
```typescript
const handleMaterialsConfirm = async (materials: PartEntry[]) => {
  try {
    await ensureValidSession();
    
    // Idempotent: fetch existing parts
    const { data: existing } = await supabase
      .from('service_parts')
      .select('part_name')
      .eq('service_id', service.id)
      .eq('is_requested', false);
    
    const existingNames = new Set(
      (existing || []).map((p: any) => p.part_name?.toLowerCase().trim())
    );
    
    for (const material of materials) {
      if (material.name.trim() && 
          !existingNames.has(material.name.toLowerCase().trim())) {
        await supabase.from('service_parts').insert({...});
      }
    }
    
    // ... rest stays the same
  } catch (error) {
    console.error('Error confirming materials:', error);
    toast.error(humanizeError(error));
  }
};
```

**e) handleSignatureComplete (linhas 200-244):** Adicionar idempotencia:
```typescript
// Antes do insert da assinatura, verificar se ja existe:
const { data: existingSig } = await supabase
  .from('service_signatures')
  .select('id')
  .eq('service_id', service.id)
  .eq('signature_type', 'instalacao')
  .maybeSingle();

if (!existingSig) {
  await supabase.from('service_signatures').insert({...});
}
```

E mudar a mensagem de erro:
```typescript
// DE:
toast.error('Erro ao concluir instalacao');
// PARA:
toast.error(humanizeError(error));
```

### 2. `src/components/technician/VisitFlowModals.tsx`

**Linha 1414 -- confirmacao_peca dialog:**
```typescript
// DE:
<DialogContent className="max-w-md p-6" ...>
// PARA:
<DialogContent className="max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto p-6" ...>
```

### 3. `src/components/shared/SignatureCanvas.tsx`

**Linha 119 -- DialogContent:**
```typescript
// DE:
<DialogContent className="sm:max-w-[500px]">
// PARA:
<DialogContent className="sm:max-w-[500px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
```

### 4. `src/components/technician/DeliveryFlowModals.tsx`

**Linha 155 -- handlePhotoCapture erro:**
```typescript
// DE:
toast.error('Erro ao guardar foto');
// PARA:
toast.error(humanizeError(error));
```

## Ficheiros Alterados

| Ficheiro | Alteracao |
|---|---|
| `src/components/technician/InstallationFlowModals.tsx` | Importar humanizeError, idempotencia assinatura + materiais, ensureValidSession, mensagens de erro |
| `src/components/technician/VisitFlowModals.tsx` | Scroll no confirmacao_peca dialog |
| `src/components/shared/SignatureCanvas.tsx` | Scroll responsivo (afeta TODOS os fluxos) |
| `src/components/technician/DeliveryFlowModals.tsx` | humanizeError na foto |

## Resultado

- Zero duplicacoes de assinaturas ou materiais ao clicar duas vezes
- Sessoes expiradas mostram mensagens claras em todos os fluxos
- Modais de assinatura e confirmacao de peca funcionam em todos os tamanhos de tela
- Padrao consistente entre os 4 fluxos (todos com idempotencia + humanizeError + ensureValidSession)
- Nenhum impacto funcional nos fluxos existentes (todas as correcoes sao aditivas/defensivas)

