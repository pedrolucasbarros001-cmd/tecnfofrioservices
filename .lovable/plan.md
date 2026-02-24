

# Plano: Corrigir Bugs de Modais, Dropdowns e Navegacao em Todo o Sistema

## Problema Raiz

Quando um **Select dropdown** (nivel de acesso, turno, etc.) esta dentro de um **Dialog**, clicar nas opcoes do dropdown **fecha o modal** em vez de selecionar o valor. Isto acontece porque o Radix UI renderiza o dropdown num portal separado (fora do Dialog), e o Dialog interpreta isso como um "clique fora" e fecha-se.

O mesmo problema afecta o botao **X de fechar** em alguns contextos -- se o Dialog fecha antes da interacao ser processada, o estado fica inconsistente.

## Solucao Global (1 ficheiro, corrige TODOS os modais)

Em vez de adicionar `onPointerDownOutside` e `onInteractOutside` modal a modal (como ja se fez nos fluxos de tecnico), a correcao sera feita **no componente base `dialog.tsx`**, garantindo que NENHUM modal do sistema sofra deste bug.

### Ficheiro: `src/components/ui/dialog.tsx`

**Alteracao no `DialogContent`:**
- Adicionar handler `onPointerDownOutside` que verifica se o alvo do clique esta dentro de um portal Radix (Select, Popover, Dropdown, etc.)
- Se estiver, previne o fecho do Dialog (`e.preventDefault()`)
- Se nao estiver (clique real fora), permite o fecho normalmente
- Adicionar `onInteractOutside` com a mesma logica

A verificacao usa selectores CSS para identificar elementos de portais Radix:
- `[data-radix-popper-content-wrapper]` (Select, Popover, DropdownMenu)
- `[role="listbox"]` (Select options)
- `[role="option"]` (Select items)

```text
DialogContent (modificado)
+-- onPointerDownOutside(e):
|     se e.target esta dentro de portal Radix -> e.preventDefault()
|     senao -> permite fechar normalmente
+-- onInteractOutside(e):
|     mesma logica
```

### Resultado

- **CreateUserModal**: dropdown de nivel de acesso funciona correctamente
- **EditUserModal**: dropdown de nivel de acesso funciona + confirmacao de role change funciona
- **CreateServiceModal**, **CreateInstallationModal**, **CreateDeliveryModal**: dropdown de turno (Manha/Tarde) funciona
- **AssignTechnicianModal**, **RescheduleServiceModal**: dropdowns funcionam
- **ConvertBudgetModal**, **PartArrivedModal**, **AssignDeliveryModal**: dropdowns funcionam
- **Todos os outros modais presentes e futuros**: protegidos automaticamente
- Botao X continua a funcionar normalmente (usa `DialogClose`, nao e afectado)
- Clicar fora do modal (no overlay escuro) continua a fechar normalmente quando nao ha dropdown aberto

## Secao Tecnica

- A correcao e feita no nivel mais baixo (componente UI base), garantindo cobertura total
- Nao afecta o comportamento do botao X (que usa `DialogPrimitive.Close`)
- Nao afecta o fecho por Escape (que usa evento de teclado, nao pointer)
- Os modais de tecnico que ja tinham `onPointerDownOutside={(e) => e.preventDefault()}` continuam a funcionar (a prevencao total sobrepoe-se a parcial)
- Apenas 1 ficheiro precisa de ser alterado: `src/components/ui/dialog.tsx`

