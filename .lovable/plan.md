

## Diagnóstico

O erro React #310 significa **"Rendered fewer hooks than expected"** — isto é, o componente chamou menos hooks numa renderização do que na anterior.

**Causa raiz**: No `ServiceDetailSheet.tsx`, o `useMemo` de `centralItems` (linha 322) está **depois** do `if (!service) return null;` (linha 316). Quando `service` muda de não-nulo para nulo (ou vice-versa), o número de hooks chamados muda, violando as regras de hooks do React.

## Correção

**Ficheiro**: `src/components/services/ServiceDetailSheet.tsx`

Mover o `useMemo` de `centralItems` (linhas 322-331) para **antes** do early return na linha 316. Adicionar guard para `service`/`displayService` nulo dentro do memo:

```ts
const centralItems = React.useMemo(() => {
    if (!displayService) return [];
    if (serviceParts.filter(...).length > 0) return [];
    // rest stays the same
}, [serviceParts, displayService?.pricing_description]);
```

Também verificar se `displayService` (linha 319) não causa problemas ao ser definido antes do early return — mover a atribuição `const displayService = fullData || service;` para antes do memo, junto com os outros dados derivados.

Na prática, o bloco inteiro `displayService` + `centralItems` deve ficar entre as linhas ~293 e 316, antes do `if (!service) return null`.

