
## Contexto

No código atual `cheque` já está listado em `RegisterPaymentModal.tsx` (linhas 48–62) e em `FieldPaymentStep.tsx`, e o tipo `PaymentMethod` já o inclui. O insert na BD não tem CHECK constraint sobre `payment_method`, portanto não há bloqueio de schema. Para o orçamento seguro, a RLS de `INSERT` em `budgets` permite `dono | secretaria | tecnico`, sem restrições adicionais sobre `is_insurance_budget`.

Isto significa que **provavelmente o problema é runtime/UX**, não estrutural. Preciso de capturar o erro real antes de mudar código.

## Plano de execução

### 1. Diagnóstico do "Pagamento cheque está em desenvolvimento"

1. Pedir um print/exato do que aparece (toast, modal, etiqueta "em breve").
2. Confirmar em runtime que o `<Select>` mostra a opção e que o submit chega ao `INSERT` (adicionar `console.log` temporário em `handleSubmit`).
3. Cenários prováveis:
   - **Cache do bundle antigo** — a sessão da secretaria pode ter versão pré-cheque. Fix: pedir refresh forçado (Ctrl+Shift+R) e validar.
   - **Toast "Já existe pagamento pendente"** — a guarda em `RegisterPaymentModal.tsx:104-109` bloqueia se há pagamento do técnico com mesmo valor+método. Pode parecer "não funciona". Fix UX: alterar o toast bloqueante para deixar prosseguir quando o utilizador é dono/secretaria e escolher conscientemente (botão "Registar mesmo assim").
   - **Bug invisível**: caso o `humanizeError` esteja a mostrar mensagem genérica, log do erro real para a consola.

### 2. Diagnóstico do "Secretaria não cria orçamento Seguro"

1. Pedir o **texto exato do toast vermelho** (`Erro ao criar orçamento: …`). É a chave.
2. Hipóteses prováveis (por ordem de probabilidade):
   - **`source_service_id` lockado por outro orçamento pendente** — após criar, faz `UPDATE services SET awaiting_budget_approval=true` (linha 343). Se `awaiting_budget_approval` já era true, a UI bloqueia abrir de novo. Verificar.
   - **RLS no UPDATE de `services`** — secretaria está autorizada, mas confirmar que o erro não vem desse passo (`is_dono OR is_secretaria OR assigned_tech`).
   - **Validação Zod do formulário** ao marcar "Seguro" — alguma combinação de campos obrigatórios fica vazia (ex.: cliente sem NIF). Inspecionar branch `is_insurance_budget=true` no `handleSubmit`/`handleCreateBudget`.
   - **Política de view de `budgets`** — depois do insert a UI lê de volta com `select`. A view-policy exige `is_dono OR is_secretaria OR (source_service_id IS NOT NULL AND can_access_service(...))`. Secretaria passa, mas se `select` falhar silenciosamente pode parecer "erro". Validar.
3. Reproduzir num utilizador com role `secretaria` (eu posso forçar via test DB) e capturar o erro do `postgres_logs`.

### 3. Correções propostas após confirmar causa

| Sintoma confirmado | Fix |
|---|---|
| Cache antigo | Bump versão do bundle (alterar `src/main.tsx` ou pedir reload) |
| Bloqueio por pendente | Tornar bloqueio em aviso com confirmação |
| Erro RLS no insert/update | Ajustar política específica |
| Falha de validação Zod oculta | Mostrar `form.formState.errors` no toast, marcar campo |
| `awaiting_budget_approval` já a true | Adicionar botão "Cancelar orçamento pendente" antes de criar novo |

### 4. Não tocar

- Não alterar lista de métodos de pagamento (já contém cheque).
- Não alterar RLS de `budgets` sem confirmação do erro real (risco de regressão).
- Comportamento do "Levantar para Oficina" e do tracker de duplicação fica como está.

## Pergunta que preciso de resposta antes de codificar

**Mensagem exata do toast vermelho ao guardar o orçamento Seguro** (ou print do ecrã). Sem isto, qualquer fix em `budgets` é palpite. Para o cheque, basta-me saber se vês a opção no dropdown e o que aparece ao clicar "Registar".
