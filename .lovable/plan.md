

# Editar Detalhes do Servico e Orcamento (Apenas Admin)

## Resumo

Criar um modal de edicao de detalhes reutilizavel para o admin (dono) poder editar os campos de equipamento e descricao tanto nos servicos como nos orcamentos. O botao "Editar Detalhes" aparece apenas para utilizadores com role `dono`.

## Alteracoes

### 1. Novo componente: `src/components/modals/EditServiceDetailsModal.tsx`

Modal com formulario para editar os seguintes campos de um servico:

| Campo | Tipo |
|-------|------|
| Tipo de Aparelho (appliance_type) | Input |
| Marca (brand) | Input |
| Modelo (model) | Input |
| N. Serie (serial_number) | Input |
| Descricao da Avaria (fault_description) | Textarea |
| Notas (notes) | Textarea |

- Pre-preenche todos os campos com os valores actuais do servico
- Ao guardar, faz update na tabela `services` via Supabase
- Chama `onSuccess` para refrescar os dados

### 2. Novo componente: `src/components/modals/EditBudgetDetailsModal.tsx`

Modal para editar os artigos de um orcamento (reutilizando a mesma estrutura do `CreateBudgetModal`):

| Campo | Tipo |
|-------|------|
| Artigos (pricing_description items) | Tabela editavel com artigo, descricao, qtd, valor, imposto |
| Desconto | Input |
| Notas (notes) | Textarea |

- Pre-preenche com os artigos existentes do `pricing_description` JSON
- Ao guardar, actualiza `pricing_description`, `estimated_labor`, `estimated_parts`, `estimated_total` e `notes` na tabela `budgets`

### 3. Integrar no `ServiceDetailSheet.tsx`

- Adicionar estado `showEditDetailsModal`
- Na seccao "Detalhes do Servico" (linha ~492), adicionar um botao de edicao (icone Pencil) visivel apenas quando `role === 'dono'`
- Renderizar o `EditServiceDetailsModal` com os dados do servico actual

### 4. Integrar no `BudgetDetailPanel.tsx`

- Adicionar estado `showEditBudgetModal`
- No header ou na seccao de artigos, adicionar botao "Editar" visivel apenas quando `role === 'dono'`
- Renderizar o `EditBudgetDetailsModal` com os dados do orcamento actual

## Detalhes tecnicos

### EditServiceDetailsModal

```text
Props:
  open: boolean
  onOpenChange: (open: boolean) => void
  service: Service
  onSuccess: () => void

Campos do formulario:
  appliance_type (Input, obrigatorio)
  brand (Input)
  model (Input)
  serial_number (Input)
  fault_description (Textarea)
  notes (Textarea)

Ao guardar:
  supabase.from('services').update({...}).eq('id', service.id)
```

### EditBudgetDetailsModal

```text
Props:
  open: boolean
  onOpenChange: (open: boolean) => void
  budget: any
  onSuccess: () => void

Logica:
  - Parse do pricing_description JSON para preencher a tabela de artigos
  - Permite adicionar/remover artigos
  - Recalcula subtotal, IVA, desconto e total
  - Ao guardar: supabase.from('budgets').update({
      pricing_description: JSON.stringify(pricingData),
      estimated_labor: subtotal,
      estimated_parts: totalTax,
      estimated_total: total,
      notes: notes
    }).eq('id', budget.id)
```

### Verificacao de role

Ambos os botoes de edicao usam `useAuth()` e so aparecem quando `role === 'dono'`. As RLS policies ja estao configuradas correctamente -- apenas `dono` pode fazer UPDATE em budgets e services.

### Botao na UI

No ServiceDetailSheet, na seccao "Detalhes do Servico":
- Botao com icone Pencil ao lado do titulo da seccao
- Apenas visivel para role `dono`

No BudgetDetailPanel, na seccao "Artigos do Orcamento":
- Botao com icone Pencil ao lado do titulo
- Apenas visivel para role `dono`

## Sequencia de implementacao

1. Criar `EditServiceDetailsModal` (campos simples de equipamento)
2. Criar `EditBudgetDetailsModal` (tabela de artigos editavel)
3. Integrar botao no `ServiceDetailSheet` (seccao Detalhes do Servico)
4. Integrar botao no `BudgetDetailPanel` (seccao Artigos)
