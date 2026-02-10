
# Correcoes: Orcamento, Etiqueta e Exclusao de Colaboradores

## 1. Corrigir texto na ficha de orcamento

**Problema**: Na ficha de impressao do orcamento (`BudgetPrintPage.tsx`), aparece "Descricao do Problema" quando deveria ser "Descricao do Orcamento".

**Solucao**: Alterar o texto na linha 340 de `src/pages/BudgetPrintPage.tsx`:
- De: `Descrição do Problema`
- Para: `Descrição do Orçamento`

---

## 2. Ajustar tamanho da etiqueta para 29mm x 90mm

**Problema**: A etiqueta esta configurada para 102mm x 152mm (4x6 polegadas), mas o tamanho real da etiqueta fisica e 29mm x 90mm. Isto causa uma pagina extra na impressao porque o conteudo excede o papel.

**Solucao**: Actualizar TODOS os locais que referenciam o tamanho da etiqueta:

### Ficheiros a alterar:

**`src/utils/printUtils.ts`** (linha 11):
- De: `@page { size: 102mm 152mm; margin: 0; }`
- Para: `@page { size: 29mm 90mm; margin: 0; }`

**`src/index.css`** - Actualizar todas as dimensoes de tag:
- `.print-tag-page .print-tag-container`: width 29mm, min-height 90mm
- `@media print .print-tag-page .print-tag-container`: width/height 29mm x 90mm
- `@media print .print-tag`: width/height 29mm x 90mm

**`src/pages/ServiceTagPage.tsx`**:
- Alterar o formato do PDF de `[102, 152]` para `[29, 90]`
- Reduzir tamanhos de QR code (de 140px para ~60px), logo, fonte e espacamentos para caber em 29x90mm

**`src/components/modals/ServiceTagModal.tsx`**:
- Alterar o formato do PDF de `[80, 170]` para `[29, 90]`
- Mesmas reducoes de tamanho no layout do preview

**Redesign do conteudo da etiqueta para 29x90mm** (muito mais pequena):
- Logo reduzido (h-6 em vez de h-12)
- QR Code reduzido para ~50px
- Codigo de servico em texto menor
- Dados do cliente em fonte compacta (text-[8px])
- Espacamentos minimos (mb-1 em vez de mb-6)
- Remover texto do rodape (nao cabe)

---

## 3. Adicionar opcao de excluir perfil de colaborador

**Problema**: Actualmente so e possivel desactivar tecnicos. Nao existe opcao para o admin excluir completamente um perfil de colaborador.

**Solucao**:

### Edge Function `delete-user` (nova)
- Recebe o `user_id` do colaborador a excluir
- Valida que quem chama e "dono" (admin)
- Usa o Supabase Admin API para:
  1. Eliminar registos na tabela `user_roles`
  2. Eliminar registos na tabela `technicians` (se existir)
  3. Eliminar o perfil na tabela `profiles`
  4. Eliminar o utilizador do Supabase Auth via `admin.deleteUser()`

### `ColaboradoresPage.tsx` - Alteracoes:
- Adicionar botao de excluir (icone Trash2) na coluna de acoes, ao lado do botao de editar
- Adicionar AlertDialog de confirmacao para exclusao ("Tem a certeza que deseja excluir permanentemente este colaborador?")
- Impedir exclusao do proprio utilizador logado
- Chamar a edge function `delete-user` ao confirmar

---

## Sequencia de implementacao

1. Corrigir texto "Descricao do Orcamento" no BudgetPrintPage
2. Redimensionar etiqueta para 29x90mm (CSS + componentes + PDF)
3. Criar edge function `delete-user`
4. Adicionar botao e dialog de exclusao na pagina de colaboradores
