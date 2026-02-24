
# Plano: Corrigir Scroll e Responsividade nos Modais de Criacao de Servico e Pedido de Peca

## Problemas Identificados

### 1. Modal de criar servico a partir do perfil do cliente (CustomerDetailSheet.tsx)

**Ficheiro:** `src/components/shared/CustomerDetailSheet.tsx`, linha 672

O `DialogContent` usa:
```
className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0 overflow-hidden"
```

Falta `max-w-[95vw]` -- em telemoveis, o modal pode ultrapassar a largura do ecra e cortar conteudo/botoes. Todos os outros modais do sistema ja usam `max-w-[95vw]` como padrao.

### 2. RequestPartModal -- sem ScrollArea padrao

**Ficheiro:** `src/components/modals/RequestPartModal.tsx`, linha 126/135

O modal usa um `<div className="flex-1 overflow-y-auto">` em vez do componente `ScrollArea` padrao usado em todos os outros modais. O `overflow-y-auto` nativo pode nao mostrar a scrollbar visivel em alguns dispositivos moveis, dando a impressao de que nao ha scroll. O padrao do sistema e usar `ScrollArea` do Radix para garantir scrollbar visivel e consistente.

### 3. ConfirmPartOrderModal -- falta max-w-[95vw]

**Ficheiro:** `src/components/modals/ConfirmPartOrderModal.tsx`, linha 141

Ja tem `ScrollArea` e `max-h-[95vh]`, mas falta `max-w-[95vw]` para responsividade mobile.

## Alteracoes

### Ficheiro 1: `src/components/shared/CustomerDetailSheet.tsx`

**Linha 672** -- Adicionar `max-w-[95vw]`:

```
// DE:
<DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0 overflow-hidden">

// PARA:
<DialogContent className="sm:max-w-[600px] max-w-[95vw] max-h-[90vh] flex flex-col p-0 overflow-hidden">
```

### Ficheiro 2: `src/components/modals/RequestPartModal.tsx`

**Linha 126** -- Adicionar `max-w-[95vw]` (ja tem `max-w-[95vw]`, confirmar consistencia com max-h):

**Linhas 135-217** -- Substituir `<div className="flex-1 overflow-y-auto min-h-0 px-6">` por `<ScrollArea>` padrao:

```typescript
// DE:
<div className="flex-1 overflow-y-auto min-h-0 px-6">
  <div className="space-y-4 py-4">
    ...conteudo...
  </div>
</div>

// PARA:
<ScrollArea className="flex-1 px-6">
  <div className="space-y-4 py-4 pr-3">
    ...conteudo... (sem alteracoes ao conteudo)
  </div>
</ScrollArea>
```

Adicionar import do `ScrollArea`:
```typescript
import { ScrollArea } from '@/components/ui/scroll-area';
```

### Ficheiro 3: `src/components/modals/ConfirmPartOrderModal.tsx`

Ja esta correto -- usa `ScrollArea` e tem `max-h-[95vh]`. Apenas falta `max-w-[95vw]` para mobile (embora `sm:max-w-lg` cubra desktop).

Nao e necessaria alteracao, ja tem a estrutura correta.

## Ficheiros Alterados

| Ficheiro | Alteracao |
|---|---|
| `src/components/shared/CustomerDetailSheet.tsx` | Adicionar `max-w-[95vw]` ao DialogContent (linha 672) |
| `src/components/modals/RequestPartModal.tsx` | Substituir div overflow-y-auto por ScrollArea padrao + import |

## Resultado

- Modal de criar servico a partir do perfil do cliente funciona corretamente em mobile (390px)
- RequestPartModal mostra scrollbar visivel em todos os dispositivos
- Consistencia visual com todos os outros modais do sistema
