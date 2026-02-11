
# Absorver Artigos do Orcamento para Detalhes do Servico na Conversao

## Problema

Quando um orcamento e convertido em servico, os campos `appliance_type`, `brand`, `model` e `fault_description` do servico ficam vazios. Isto acontece porque o orcamento nao guarda esses campos directamente -- a informacao relevante esta dentro do `pricing_description` (JSON com artigos: `description` e `details`).

## Solucao

Alterar o `ConvertBudgetModal` para extrair automaticamente o conteudo dos artigos do orcamento e preencher os campos do servico:

- **`appliance_type`**: Primeiro artigo (`description`) do orcamento (ex: "Maquina Lavar Roupa")
- **`fault_description`**: Concatenacao de todos os artigos e suas descricoes detalhadas (`details`), formando uma descricao completa do servico
- **`notes`**: Manter as notas do orcamento se existirem
- **`pricing_description`**: Copiar o JSON completo para o servico, para manter o detalhe financeiro

O modal mantem o design actual (tipo + local + info do orcamento) sem acrescentar passos adicionais.

## Alteracoes

### `src/components/modals/ConvertBudgetModal.tsx`

1. Adicionar funcao `extractBudgetDetails(budget)` que:
   - Faz parse do `pricing_description` JSON
   - Extrai o `description` do primeiro item como `appliance_type`
   - Concatena todos os items no formato "Artigo: descricao detalhada" como `fault_description`
   - Retorna `{ appliance_type, fault_description, pricing_description }`

2. Actualizar o `handleConvert` para usar os valores extraidos no insert:

```text
Antes:
  appliance_type: budget.appliance_type      // sempre null
  fault_description: budget.fault_description // sempre null

Depois:
  appliance_type: extracted.appliance_type    // "Maquina Lavar Roupa"
  fault_description: extracted.fault_description  // "MLR Bosch: Reparacao motor..."
  pricing_description: budget.pricing_description // JSON completo dos artigos
```

### Exemplo pratico

Orcamento com 2 artigos:
- Artigo: "Maquina Lavar Roupa" | Descricao: "Reparacao do motor principal"
- Artigo: "Peca de substituicao" | Descricao: "Rolamento frontal"

Resultado no servico:
- `appliance_type`: "Maquina Lavar Roupa"
- `fault_description`: "Maquina Lavar Roupa - Reparacao do motor principal; Peca de substituicao - Rolamento frontal"
- `pricing_description`: (JSON completo copiado)

## Impacto

- A ficha de consulta do servico passa a mostrar o tipo de aparelho e a descricao
- A ficha de impressao passa a ter os detalhes preenchidos
- Nenhuma alteracao no fluxo do utilizador -- o modal continua igual, apenas o mapeamento interno melhora
