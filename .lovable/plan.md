

# Correcao: Modal fecha ao escrever no campo Modelo

## Problema

Quando o tecnico toca num campo de texto (como "Modelo") no modal de edicao, o teclado virtual do telemovel abre e redimensiona a viewport. O Radix Dialog interpreta essa mudanca como uma interaccao fora do modal e fecha-o automaticamente.

## Solucao

Adicionar `onPointerDownOutside` e `onInteractOutside` ao `DialogContent` do `TechnicianEditServiceModal` para impedir o fecho inesperado -- exactamente o mesmo padrao ja usado nos outros modais do sistema (fluxos de visita, oficina, etc.).

## Alteracao

**Ficheiro**: `src/components/technician/TechnicianEditServiceModal.tsx`

Linha 181, no `DialogContent`, adicionar:

```tsx
<DialogContent
  className="sm:max-w-lg max-w-[95vw] max-h-[90vh] flex flex-col overflow-hidden p-0"
  onPointerDownOutside={(e) => e.preventDefault()}
  onInteractOutside={(e) => e.preventDefault()}
>
```

Apenas 2 linhas adicionadas. Nenhum outro ficheiro precisa de alteracao.

