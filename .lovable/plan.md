
# Corrigir Botoes de Aprovar/Recusar que Permanecem Apos Clicar

## Problema

Ao clicar "Aprovar", o status do orcamento e atualizado na base de dados e a lista e re-carregada (`refetch()`), mas o `selectedBudget` no `OrcamentosPage` e uma copia local que nao se atualiza automaticamente. O painel continua a mostrar o objeto antigo com `status: 'pendente'`, mantendo os botoes visiveis.

## Solucao

Atualizar o estado local do `budget` dentro do `BudgetDetailPanel` apos a mutacao bem-sucedida, para que os botoes desaparecam imediatamente sem depender do refetch externo.

## Alteracao

### `src/components/shared/BudgetDetailPanel.tsx`

Na funcao `handleUpdateStatus`, apos a atualizacao ser bem-sucedida, atualizar o objeto `budget` localmente nao e possivel porque e uma prop. Em vez disso, vamos usar um estado local para rastrear o status atualizado.

**Abordagem:** Adicionar um estado `localStatus` que comeca como `null` e, apos aprovar/recusar, guarda o novo status. O componente usa `localStatus ?? budget.status` para determinar que botoes mostrar.

### Detalhes Tecnicos

1. Adicionar `const [localStatus, setLocalStatus] = useState<string | null>(null)`
2. Resetar `localStatus` para `null` quando o `budget.id` muda (via `useEffect` ou no render)
3. Em `handleUpdateStatus`, apos sucesso, chamar `setLocalStatus(newStatus)`
4. Usar `const effectiveStatus = localStatus ?? budget.status` para o badge e os botoes do footer
5. Atualizar o `statusConfig` e condicoes do footer para usar `effectiveStatus`
