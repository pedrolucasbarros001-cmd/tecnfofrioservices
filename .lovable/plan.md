
# Plano: Adicionar Botão de Excluir e Garantir Coerência

## Resumo

O utilizador solicita:
1. Adicionar botão de **excluir orçamento** no dropdown de ações
2. Garantir que o modal de criação está idêntico à imagem
3. Garantir que o painel de consulta lateral mostra exactamente o que foi registado no modal

## Análise Actual

### Modal de Criação (CreateBudgetModal)
O modal já está completo com:
- Secção Cliente (Nome, Telefone, NIF, Técnico Sugerido, Observação)
- Secção Aparelho (Tipo, Marca, Modelo, Descrição da Avaria)
- Tabela de Artigos com colunas: Ref. | Artigo | Descrição | Qtd | Valor | Imposto | Subtotal
- Botão "Adicionar Linha" para adicionar mais artigos
- Resumo de Totais (Subtotal, IVA, Total)

### Painel Lateral (BudgetDetailPanel)
Já mostra correctamente:
- Cliente com dados completos
- Aparelho (quando preenchido)
- Descrição da Avaria (quando preenchida)
- Artigos do Orçamento com tabela
- Resumo Financeiro
- Notas/Observações

### O que falta
Apenas o **botão de excluir** no dropdown de ações da tabela.

---

## Alteração Necessária

### Ficheiro: `src/pages/OrcamentosPage.tsx`

**1. Adicionar import do ícone Trash2:**
```tsx
import { Search, Plus, FileText, Check, X, ArrowRight, Trash2 } from 'lucide-react';
```

**2. Adicionar AlertDialog para confirmação de exclusão:**
```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
```

**3. Adicionar estados para controlar a exclusão:**
```tsx
const [budgetToDelete, setBudgetToDelete] = useState<any | null>(null);
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
```

**4. Adicionar função para excluir:**
```tsx
const handleDeleteBudget = async () => {
  if (!budgetToDelete) return;
  
  try {
    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', budgetToDelete.id);

    if (error) throw error;
    
    toast.success('Orçamento excluído com sucesso!');
    refetch();
  } catch (error) {
    console.error('Error deleting budget:', error);
    toast.error('Erro ao excluir orçamento');
  } finally {
    setBudgetToDelete(null);
    setShowDeleteConfirm(false);
  }
};
```

**5. Adicionar item de menu "Excluir" no dropdown:**
```tsx
<DropdownMenuItem
  className="text-red-600 focus:text-red-600"
  onClick={(e) => {
    e.stopPropagation();
    setBudgetToDelete(budget);
    setShowDeleteConfirm(true);
  }}
>
  <Trash2 className="h-4 w-4 mr-2" />
  Excluir
</DropdownMenuItem>
```

**6. Adicionar AlertDialog de confirmação:**
```tsx
<AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Excluir Orçamento?</AlertDialogTitle>
      <AlertDialogDescription>
        Esta ação não pode ser desfeita. O orçamento {budgetToDelete?.code} será 
        permanentemente removido do sistema.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel onClick={() => setBudgetToDelete(null)}>
        Cancelar
      </AlertDialogCancel>
      <AlertDialogAction 
        className="bg-red-600 hover:bg-red-700"
        onClick={handleDeleteBudget}
      >
        Excluir
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## Ficheiros a Alterar

| Ficheiro | Acção |
|----------|-------|
| `src/pages/OrcamentosPage.tsx` | Adicionar botão excluir e AlertDialog de confirmação |

---

## Resultado Visual

### Dropdown de Ações (Actualizado):
```text
┌──────────────────────────┐
│ 📄 Ver Detalhes          │
│ ✓ Aprovar                │  ← só se pendente
│ ✗ Recusar                │  ← só se pendente
│ → Converter em Serviço   │  ← só se aprovado
│──────────────────────────│
│ 🗑 Excluir (vermelho)    │  ← NOVO
└──────────────────────────┘
```

---

## Nota sobre Coerência

O painel lateral (`BudgetDetailPanel`) já está **100% coerente** com o modal de criação:

| Modal de Criação | Painel de Consulta |
|------------------|---------------------|
| Cliente (Nome, Telefone, NIF) | ✅ Secção "Cliente" |
| Aparelho (Tipo, Marca, Modelo) | ✅ Secção "Aparelho" |
| Descrição da Avaria | ✅ Secção "Descrição da Avaria" |
| Artigos (Ref, Artigo, Descrição, Qtd, Valor, IVA) | ✅ Secção "Artigos do Orçamento" |
| Totais (Subtotal, IVA, Total) | ✅ Secção "Resumo Financeiro" |
| Observação | ✅ Secção "Notas / Observações" |

O modal de criação já permite adicionar múltiplos artigos através do botão "Adicionar Linha".
