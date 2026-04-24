# Plano: 3 melhorias na criação de serviços e orçamentos

## 1. Corrigir "erro ao criar orçamento" (URGENTE)

**Causa raiz identificada:** A coluna `budgets.code` tem um índice UNIQUE (`budgets_code_key`). No `CreateBudgetModal.processSubmit` (linha 324), o código está a ser derivado do serviço de origem:

```ts
code: sourceService?.code?.replace(/^TF-/, 'ORC-')
```

Isto produz, por exemplo, `ORC-00261` a partir de `TF-00261`. Mas a base de dados já tem orçamentos com códigos sequenciais `ORC-NNNNN` gerados automaticamente pelo trigger `set_budget_code` (ex: `ORC-00261`, `ORC-00279`, `ORC-00283` já existem). Quando o número coincide, o INSERT viola a unique constraint e devolve "Erro ao criar orçamento".

**Correção:** Remover por completo o campo `code` do payload do INSERT. O trigger `set_budget_code` (BEFORE INSERT WHEN code IS NULL) gera sempre um código único e sequencial.

- Em `src/components/modals/CreateBudgetModal.tsx` (linha ~323), retirar a linha `code: sourceService?.code?.replace(/^TF-/, 'ORC-'),` do objeto enviado ao `supabase.from('budgets').insert(...)`.

## 2. Atalho "Novo Orçamento" no dropdown da página Geral

Em `src/pages/GeralPage.tsx`:

- No dropdown "Novo Serviço" (linhas 457–475), adicionar um quarto item: **"Novo Orçamento"**.
- Adicionar estado `showBudgetModal` e renderizar `<CreateBudgetModal open={showBudgetModal} onOpenChange={setShowBudgetModal} />` (sem `sourceService`, criação livre).
- O import de `CreateBudgetModal` já existe.

## 3. Upload de até 5 fotos na criação de Instalação e Entrega

A criação de **Reparação** (`CreateServiceModal`) já suporta multi-upload de até 5 fotos (`MAX_PHOTOS=5`, `<input type="file" multiple>`, validação de 10MB) e upload para o bucket `service-photos` com inserção em `service_photos`.

Replicar o mesmo bloco em:
- `src/components/modals/CreateInstallationModal.tsx`
- `src/components/modals/CreateDeliveryModal.tsx`

Cada modal recebe:
- Estado `workshopPhotos: File[]` com limite 5 e tamanho ≤10MB.
- Bloco visual idêntico ao da Reparação (grid de pré-visualizações + botão "Adicionar" com `<input multiple accept="image/*">`).
- Após criar o serviço (no `onSuccess` do insert), iterar pelas fotos, fazer `supabase.storage.from('service-photos').upload(...)`, obter a `publicUrl` e inserir em `service_photos` com `photo_type='aparelho'`.
- Limpar `workshopPhotos` no reset/close do modal.

## Detalhes técnicos

| Ficheiro | Alteração |
|---|---|
| `src/components/modals/CreateBudgetModal.tsx` | Remover `code:` do INSERT (deixar o trigger `set_budget_code` gerar). |
| `src/pages/GeralPage.tsx` | +1 estado `showBudgetModal`, +1 `<DropdownMenuItem>` "Novo Orçamento", +1 `<CreateBudgetModal>` montado. |
| `src/components/modals/CreateInstallationModal.tsx` | Adicionar bloco de fotos (estado, UI, upload pós-criação). |
| `src/components/modals/CreateDeliveryModal.tsx` | Adicionar bloco de fotos (estado, UI, upload pós-criação). |

Não há alterações de schema nem novas migrations — o bucket `service-photos` e a tabela `service_photos` já existem.
