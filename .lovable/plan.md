

## Plano: Palavras-passe Visíveis + Corrigir Fluxo de Entrega

### Problema 1 — Palavras-passe
O Supabase encripta as palavras-passe (não é possível recuperá-las). A solução é guardar a ultima palavra-passe definida pelo administrador numa tabela dedicada, atualizando-a sempre que o admin cria um utilizador ou redefine a password. Assim, na pagina de Colaboradores, aparece a coluna com a password actual com opção de mostrar/ocultar.

### Problema 2 — Entregas fantasma
No `AssignDeliveryModal`, quando se atribui uma entrega, o código actual **não muda** o `status`, `service_type` nem `technician_id`. O serviço fica em `concluidos` e a query do tecnico em `ServicosPage.tsx` so busca servicos com `status in ('por_fazer', 'em_execucao', ...)` e filtrados por `technician_id` - logo a entrega nunca aparece.

### O que muda

**Passo 1 — Migração SQL**: Criar tabela `user_passwords`
- Colunas: `id`, `user_id` (uuid, unique), `password_plain` (text), `set_by` (uuid), `updated_at`
- RLS: apenas `dono` pode SELECT. Ninguem mais.

**Passo 2 — Edge Functions**: Actualizar `invite-user` e `reset-user-password`
- Após criar/redefinir a password com sucesso, fazer upsert na tabela `user_passwords` com a password em texto plano e quem a definiu.

**Passo 3 — ColaboradoresPage**: Adicionar coluna "Palavra-passe"
- Buscar dados de `user_passwords` no query existente
- Nova coluna na tabela com texto mascarado (`••••••••`) e botão Eye/EyeOff para revelar por utilizador
- Só aparece para utilizadores com password registada

**Passo 4 — Corrigir AssignDeliveryModal**: Quando se atribui entrega a um tecnico
- Mudar `status` para `'por_fazer'`
- Mudar `service_type` para `'entrega'`
- Mudar `technician_id` para o tecnico selecionado (em vez de so `delivery_technician_id`)
- Definir `scheduled_date` com a data da entrega
- Isto faz o servico aparecer na agenda do tecnico exactamente como qualquer outro servico

**Passo 5 — DeliveryManagementModal (Cliente Recolhe)**: Garantir que o fluxo "cliente recolhe" continua a funcionar correctamente, transitando directamente para `finalizado`.

### Secção Técnica
- **Migração**: 1 tabela nova (`user_passwords`) com RLS restritivo
- **Edge Functions**: `invite-user/index.ts`, `reset-user-password/index.ts` (adicionar upsert)
- **Frontend**: `ColaboradoresPage.tsx` (coluna password), `AssignDeliveryModal.tsx` (status + technician_id)
- **Retrocompatibilidade**: a tabela `user_passwords` começa vazia — passwords anteriores só aparecem após proximo reset pelo admin
- **Segurança**: apenas o role `dono` pode ler a tabela de passwords

