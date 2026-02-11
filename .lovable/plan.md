

# Adicionar "Editar Detalhes" nos Menus de 3 Pontos

## Resumo

Adicionar a opcao "Editar Detalhes" no menu de accoes (3 pontos) tanto dos servicos como dos orcamentos, restrito ao admin (dono). Para orcamentos, so aparece antes de aprovar (status `pendente`).

## Alteracoes

### 1. `src/components/services/StateActionButtons.tsx`

- Adicionar nova prop `onEditDetails?: () => void`
- No dropdown, adicionar item "Editar Detalhes" com icone Pencil, visivel apenas para `isDono`, antes do separador de accoes perigosas

### 2. `src/pages/GeralPage.tsx`

- Adicionar estado `showEditDetailsModal`
- Adicionar handler `handleEditDetails(service)`
- Passar `onEditDetails` ao `StateActionButtons`
- Importar e renderizar `EditServiceDetailsModal` com o servico actual

### 3. `src/pages/OrcamentosPage.tsx`

- Adicionar estado `showEditBudgetModal` e `budgetToEdit`
- No dropdown de accoes de cada orcamento, adicionar "Editar Detalhes" com icone Pencil, visivel apenas quando `budget.status === 'pendente'`
- Importar e renderizar `EditBudgetDetailsModal`

## Detalhes tecnicos

### StateActionButtons - novo item no dropdown

```text
Posicao: antes do DropdownMenuSeparator das accoes de dono
Condicao: isDono && onEditDetails
Icone: Pencil
Label: "Editar Detalhes"
```

### GeralPage - integracao

```text
Novo estado: showEditDetailsModal (boolean)
Handler: handleEditDetails -> setCurrentService + setShowEditDetailsModal(true)
Prop passada: onEditDetails={() => handleEditDetails(service)}
Modal renderizado junto dos outros modais de gestao
```

### OrcamentosPage - integracao

```text
Novo estado: showEditBudgetModal (boolean), budgetToEdit (any)
Condicao no dropdown: budget.status === 'pendente'
Icone: Pencil
Label: "Editar Detalhes"
Modal: EditBudgetDetailsModal com budget={budgetToEdit}
```

