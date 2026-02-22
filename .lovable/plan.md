

# Correcao: Crash na Pagina Geral + Erro de Build

## Causa Raiz Confirmada (sem teorias)

### Problema 1: Crash na pagina Geral (erro visivel no ecra)

**Ficheiro**: `src/components/modals/EditServiceDetailsModal.tsx`, **linha 184**

```
Editar Servico {service.code}
```

O componente `EditServiceDetailsModal` e renderizado na `GeralPage` (linha 456) com `service={currentService}`. O valor inicial de `currentService` e `null`. O Radix Dialog renderiza o conteudo internamente mesmo quando `open={false}`, e a linha 184 acede a `service.code` sem verificar se `service` e `null`. Isto causa:

```
TypeError: null is not an object (evaluating 'r.code')
```

Este erro e capturado pelo `ErrorBoundary` que envolve a pagina, mostrando o ecra "Ocorreu um erro".

### Problema 2: Erro de Build (TypeScript)

**Ficheiro**: `src/components/modals/EditServiceDetailsModal.tsx`, **linha 271**

```tsx
<Badge variant={part.is_requested ? "warning" : "success"}>
```

Os variants `"warning"` e `"success"` NAO existem no componente `Badge`. Os variants disponiveis sao: `default`, `destructive`, `outline`, `secondary`, `subtle`, `subtle-debit`, `subtle-pricing`, `subtle-urgent`, `subtle-warranty`, `type-entrega`, `type-instalacao`, `type-oficina`, `type-visita`.

## Solucao

### Correcao 1: Guard de null no service

Adicionar verificacao no inicio do render para retornar `null` quando `service` nao existe:

```tsx
// Linha 178, antes do return
if (!service) return null;
```

### Correcao 2: Substituir variants inexistentes

Linha 271, substituir:
- `"warning"` por `"subtle-urgent"` (badge amarelo/vermelho para pecas pedidas)
- `"success"` por `"outline"` (badge neutro para pecas usadas)

## Ficheiro Unico a Alterar

`src/components/modals/EditServiceDetailsModal.tsx` -- 2 correcoes, 2 linhas

