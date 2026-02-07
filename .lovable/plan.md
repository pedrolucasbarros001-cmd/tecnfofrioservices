
# Plano: Corrigir Exibição de Artigos e Aparelho no Orçamento

## Problema Diagnosticado

Analisei a base de dados e o código, e descobri **dois problemas**:

### 1. Orçamentos antigos sem dados
Os orçamentos ORC-00001 e ORC-00002 foram criados antes das últimas alterações:
- `pricing_description` está **null** (não guardava os artigos)
- `appliance_type`, `brand`, `model` estão **null**

### 2. Formulário não tem campos de Aparelho
O `CreateBudgetModal` tem os campos `appliance_type`, `brand`, `model` definidos no schema mas **não existem inputs visíveis** no formulário para preenchê-los. Por isso, a secção "Aparelho" fica sempre vazia.

---

## Solução

### Parte 1: Adicionar secção "Aparelho" ao formulário de criação

No `CreateBudgetModal`, adicionar uma secção entre "Cliente" e "Artigos" com os campos:
- Tipo de Aparelho (input texto)
- Marca (input texto)
- Modelo (input texto)
- Descrição da Avaria (textarea - já existe mas está deslocado)

### Parte 2: Melhorar exibição no BudgetDetailPanel

- Combinar a secção "Aparelho" com os "Artigos do Orçamento" numa apresentação mais coerente
- Se não houver dados de aparelho, esconder a secção em vez de mostrar em branco
- Garantir que os artigos são sempre exibidos quando existem

### Parte 3: Garantir novos orçamentos guardam todos os dados

Verificar que o `processSubmit` está a passar correctamente:
- `appliance_type`
- `brand`
- `model`
- `fault_description`
- `pricing_description` (JSON dos artigos)

---

## Ficheiros a Alterar

| Ficheiro | Acção | Descrição |
|----------|-------|-----------|
| `src/components/modals/CreateBudgetModal.tsx` | Alterar | Adicionar campos visíveis para Aparelho |
| `src/components/shared/BudgetDetailPanel.tsx` | Alterar | Esconder secção Aparelho se vazia, melhorar layout |

---

## Alterações Detalhadas

### CreateBudgetModal.tsx

**Nova secção "Aparelho" após Cliente:**

```tsx
<Separator />

{/* Appliance Section - NOVO */}
<div className="space-y-4">
  <h3 className="font-semibold text-lg">Aparelho</h3>
  <div className="grid grid-cols-3 gap-4">
    <FormField
      control={form.control}
      name="appliance_type"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Tipo de Aparelho</FormLabel>
          <FormControl>
            <Input placeholder="Ex: Frigorífico" {...field} />
          </FormControl>
        </FormItem>
      )}
    />
    <FormField
      control={form.control}
      name="brand"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Marca</FormLabel>
          <FormControl>
            <Input placeholder="Ex: Samsung" {...field} />
          </FormControl>
        </FormItem>
      )}
    />
    <FormField
      control={form.control}
      name="model"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Modelo</FormLabel>
          <FormControl>
            <Input placeholder="Ex: RT38K50" {...field} />
          </FormControl>
        </FormItem>
      )}
    />
  </div>
  <FormField
    control={form.control}
    name="fault_description"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Descrição da Avaria</FormLabel>
        <FormControl>
          <Textarea 
            placeholder="Descreva o problema reportado pelo cliente..."
            rows={2}
            {...field} 
          />
        </FormControl>
      </FormItem>
    )}
  />
</div>
```

### BudgetDetailPanel.tsx

**Esconder secções vazias:**

```tsx
{/* Appliance Section - só mostra se tiver dados */}
{(budget.appliance_type || budget.brand || budget.model) && (
  <div className="rounded-lg border-l-4 border-l-pink-500 ...">
    {/* conteúdo existente */}
  </div>
)}
```

---

## Resultado Esperado

1. Ao criar um orçamento, o utilizador pode preencher o tipo de aparelho, marca e modelo
2. A secção "Aparelho" só aparece na ficha de consulta se tiver dados
3. Os artigos são sempre exibidos correctamente com referência, descrição, quantidade, valor e IVA
4. Orçamentos antigos continuam a funcionar (mostram apenas o resumo financeiro)
