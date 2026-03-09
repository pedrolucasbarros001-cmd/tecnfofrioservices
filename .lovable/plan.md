

## Diagnóstico e Plano de Correções

### Problema 1 (CRÍTICO): Login falha — Race Condition no AuthContext

**Causa raiz**: O `signIn()` (linha 178) chama `supabase.auth.signOut({ scope: 'local' })` antes do login. Isto dispara o evento `SIGNED_OUT` no listener `onAuthStateChange` (linha 80-88), que executa:
```
setProfile(null); setRole(null); setLoading(false);
```
Com `loading=false` e `role=null`, o `LoginPage` renderiza o ecrã "Falha ao Carregar Permissões" **antes** do novo login completar. É uma corrida entre o cleanup e o login.

**Correção**: Adicionar `suppressAuthEventsRef = useRef(false)` ao `AuthContext`. Ativar antes do signOut no `signIn()`, desativar no `finally`. O listener ignora todos os eventos enquanto a flag estiver ativa.

---

### Problema 2: Página Colaboradores — Botões inconsistentes entre utilizadores

**Causa**: Não é um bug de permissões. O código mostra corretamente:
- Botão **Power** (ativar/desativar): só aparece para `role === 'tecnico'` (linha 314)
- Botão **Trash** (excluir): aparece para todos **exceto** o próprio utilizador logado (linha 326)
- Estado "Inativo": só técnicos podem ser inativos; outros roles mostram sempre "Ativo" (linha 117-119)

Isto é o comportamento correto, mas pode confundir visualmente. O problema real é que o estado "Inativo" aparece como badge vermelha/cinza para **todos** os roles, quando deveria ser contextual.

**Correção**: Esconder a coluna "Estado" e o botão Power para utilizadores que não são técnicos, tornando a interface mais limpa e menos confusa.

---

### Problema 3: EditUserModal — useEffect dispara sem modal aberto

**Causa**: O `useEffect` na linha 95-99 chama `loadTechnicianData()` quando `user` muda, sem verificar se `open === true`. Isto causa queries fantasma ao Supabase quando o componente está fechado.

**Correção**: Adicionar guarda `if (!open) return;` ao useEffect.

---

### Problema 4 (PEDIDO DO UTILIZADOR): Atualizações em tempo real sem refresh

**Causa**: O hook `useRealtime` existe mas **não é usado em nenhuma página**. A `ServicosPage` (técnico), `GeralPage` (admin/secretária) e `ColaboradoresPage` não subscrevem a mudanças Realtime. O técnico precisa fazer refresh manual para ver serviços atribuídos.

**Correção**: Adicionar `useRealtime` às páginas críticas:
- **ServicosPage**: `useRealtime('services', [['technician-services', profile?.id]])` — técnico vê novos serviços atribuídos em ~5s
- **GeralPage**: `useRealtime('services', [['services-paginated']])` — admin vê mudanças de estado
- Sem polling adicional. O throttle de 5s do hook já previne sobrecarga.

---

### Plano de Ficheiros a Modificar

1. **`src/contexts/AuthContext.tsx`** — Correção crítica do login:
   - Adicionar `suppressAuthEventsRef`
   - No `onAuthStateChange`: `if (suppressAuthEventsRef.current) return;`
   - No `signIn()`: ativar antes do signOut, desativar no finally

2. **`src/components/modals/EditUserModal.tsx`** — Correção defensiva:
   - Condicionar `loadTechnicianData` a `open === true`

3. **`src/pages/ColaboradoresPage.tsx`** — UX e performance:
   - Esconder coluna "Estado" e botão Power para não-técnicos
   - Reduzir `staleTime` de 5min para 30s

4. **`src/pages/ServicosPage.tsx`** — Realtime para técnicos:
   - Adicionar `useRealtime('services', [['technician-services', profile?.id]])`

5. **`src/pages/GeralPage.tsx`** — Realtime para admin/secretária:
   - Adicionar `useRealtime('services', [['services-paginated']])`

Sem migrações de base de dados. Sem novas Edge Functions.

