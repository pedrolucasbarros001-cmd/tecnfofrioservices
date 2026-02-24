
# Plano: Corrigir Problemas de Credenciais e Troca de Nivel de Acesso

## Problemas Identificados

### 1. Troca de role nao e atomica (risco de perda de acesso)
No `EditUserModal.tsx`, a troca de nivel de acesso faz **delete** da role antiga e depois **insert** da nova, tudo via cliente. Se o insert falhar (ex: erro de rede), o utilizador fica **sem role nenhuma** e nao consegue aceder ao sistema. Alem disso, a operacao de delete/insert de roles so funciona para o `dono` (RLS), o que esta correto mas nao ha tratamento de erro adequado.

### 2. Nao existe opcao de redefinir palavra-passe pelo admin
Quando um utilizador nao consegue entrar (palavra-passe esquecida ou errada), o admin nao tem forma de redefinir a senha pelo sistema -- tem de ir ao painel do Supabase manualmente.

### 3. Criacao de conta pode falhar silenciosamente em partes
No `invite-user`, a criacao do perfil depende de um trigger e de um `setTimeout(500ms)`. Se o trigger demorar mais, a role ou o registo de tecnico podem falhar sem que o admin saiba.

---

## Solucao

### Parte A: Edge Function `update-user-role` (novo)

Criar uma nova edge function que executa a troca de role de forma **atomica** usando o service role key:

- Recebe: `user_id`, `new_role`, `specialization` (opcional)
- Valida que o chamador e `dono`
- Numa unica transacao logica:
  1. Apaga todas as roles do utilizador
  2. Insere a nova role
  3. Se a nova role e `tecnico` e nao existe registo em `technicians`, cria-o
  4. Se a nova role NAO e `tecnico` e existe registo em `technicians`, desativa-o (active=false)
  5. Se a nova role e `tecnico` e ja existe registo inativo, reativa-o (active=true)
- Retorna sucesso ou erro claro

**Ficheiro:** `supabase/functions/update-user-role/index.ts`

**Config:** Adicionar `[functions.update-user-role] verify_jwt = false` ao `supabase/config.toml`

### Parte B: Edge Function `reset-user-password` (novo)

Criar uma edge function para o admin redefinir a senha de qualquer utilizador:

- Recebe: `user_id`, `new_password`
- Valida que o chamador e `dono`
- Valida forca da senha (min 8 chars, maiuscula, minuscula, numero)
- Usa `admin.updateUserById` para redefinir
- Retorna sucesso ou erro

**Ficheiro:** `supabase/functions/reset-user-password/index.ts`

**Config:** Adicionar `[functions.reset-user-password] verify_jwt = false` ao `supabase/config.toml`

### Parte C: Atualizar `EditUserModal.tsx`

- Substituir a logica de delete+insert de roles no cliente pela chamada a edge function `update-user-role`
- Adicionar botao "Redefinir Palavra-passe" que abre um mini-formulario inline com campo de nova senha
- Ao submeter, chama a edge function `reset-user-password`
- Melhorar mensagens de erro e feedback

### Parte D: Melhorar `invite-user` Edge Function

- Aumentar o timeout de espera pelo trigger de 500ms para 1500ms
- Adicionar verificacao explicita de que o perfil foi criado antes de continuar
- Se o perfil nao existir apos o timeout, cria-lo manualmente via service role
- Garantir que erros na criacao de role ou tecnico sao reportados ao admin

### Parte E: Melhorar `LoginPage.tsx`

- Garantir que o botao "Entrar" mostra feedback visual imediato (spinner)
- Garantir que erros de credenciais mostram toast visivel mesmo em caso de timeout de rede
- Adicionar try/catch robusto para cobrir erros de rede

---

## Resumo de Ficheiros

| Ficheiro | Accao |
|----------|-------|
| `supabase/functions/update-user-role/index.ts` | Criar (novo) |
| `supabase/functions/reset-user-password/index.ts` | Criar (novo) |
| `supabase/config.toml` | Adicionar 2 funcoes |
| `src/components/modals/EditUserModal.tsx` | Refazer logica de role + adicionar reset password |
| `supabase/functions/invite-user/index.ts` | Melhorar robustez da criacao |
| `src/pages/LoginPage.tsx` | Melhorar tratamento de erros |

## Secao Tecnica

- As edge functions usam `SUPABASE_SERVICE_ROLE_KEY` (ja configurado como secret)
- `verify_jwt = false` permite validacao manual do token no codigo (padrao ja usado)
- A troca de role via edge function garante atomicidade -- nao ha estado intermedio sem role
- O reset de senha nao afeta a sessao do admin (usa `admin.updateUserById`, nao `signIn`)
- Dados existentes na BD estao corretos (14 utilizadores, todos com exactamente 1 role, sem duplicados)
