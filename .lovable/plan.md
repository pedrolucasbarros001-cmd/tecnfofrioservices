
# Plano: Corrigir Login Bloqueado por Timeout de Base de Dados

## Problema Raiz

O login falha para TODOS os utilizadores porque, apos a autenticacao bem-sucedida, as queries a base de dados (`profiles` e `user_roles`) ficam penduradas indefinidamente quando a BD esta lenta. O SDK do Supabase nao tem timeout para queries, entao `loading` nunca passa a `false` e o utilizador fica preso na pagina de login.

```text
Fluxo actual (com BD lenta):

signInWithPassword -----> OK (auth service separado)
  |
  v
onAuthStateChange fires
  |
  v
fetchUserData() chamado
  |
  v
query profiles ---------> PENDE PARA SEMPRE (DB timeout)
  |
  v
loading = true PARA SEMPRE
  |
  v
LoginPage useEffect: isAuthenticated=true, role=null, loading=true
  --> NAO redireciona
  --> Botao preso em "A entrar..."
```

## Solucao (2 ficheiros)

### Ficheiro 1: `src/contexts/AuthContext.tsx`

**Problema:** `fetchUserData` nao tem timeout. Se a BD estiver lenta, as queries pendem para sempre.

**Correcao:**
- Criar funcao helper `withTimeout` que envolve qualquer Promise com um tempo limite (10 segundos)
- Aplicar `withTimeout` as queries de `profiles` e `user_roles` dentro de `fetchUserData`
- Se o timeout disparar, definir `loading = false` com `role = null` e `profile = null` (o utilizador fica autenticado mas sem role carregada)
- Adicionar uma flag para evitar chamadas duplicadas de `fetchUserData` (o `getSession` e o `onAuthStateChange` podem ambos chamar a funcao)

```text
fetchUserData (modificado):

  try {
    profileData = await withTimeout(query profiles, 10000)
    roleData = await withTimeout(query user_roles, 10000)
  } catch (timeout) {
    console.error('Timeout ao carregar dados do utilizador')
    // loading = false mesmo assim, para nao bloquear a UI
  } finally {
    setLoading(false)
  }
```

### Ficheiro 2: `src/pages/LoginPage.tsx`

**Problema:** Apos `signIn` bem-sucedido, `isLoading` nunca e redefinido para `false` (o codigo assume que o redirect vai acontecer). Se o redirect nao acontecer (porque `loading` ficou preso), o botao fica desabilitado para sempre.

**Correcoes:**
1. Apos signIn sem erro, definir um safety timeout de 20 segundos que:
   - Redefine `isLoading = false`
   - Mostra toast informando que houve problema ao carregar dados
2. Adicionar um `useEffect` que observa `isAuthenticated` + `loading`: se autenticado e `loading=false` mas sem `role`, mostrar toast com erro claro e redefinir `isLoading`
3. Garantir que TODOS os caminhos de codigo terminam com `setIsLoading(false)`

```text
LoginPage onSubmit (modificado):

  const { error } = await Promise.race([signIn, timeout])
  
  if (error) {
    // ... toast de erro (ja existente)
    setIsLoading(false)  // ja existente
    return
  }

  // Sucesso: safety timeout
  setTimeout(() => {
    setIsLoading(false)
    // Se ainda nao redirecionou, algo correu mal
  }, 20000)
```

```text
Novo useEffect:

  // Se autenticado sem role (BD timeout), dar feedback
  if (isAuthenticated && !loading && !role) {
    toast.warning('Nao foi possivel carregar perfil. Tente recarregar.')
    setIsLoading(false)
  }
```

## Resultado

- Se a BD responder normalmente: login funciona como antes (< 2 segundos)
- Se a BD estiver lenta (timeout): o utilizador ve uma mensagem clara em vez de ficar preso
- O botao "Entrar" NUNCA fica preso indefinidamente
- `loading` NUNCA fica `true` para sempre

## Secao Tecnica

- `withTimeout` usa `Promise.race` com um `setTimeout` que rejeita apos N ms
- As queries de `profiles` e `user_roles` sao independentes, mas o timeout cobre ambas
- O `finally` garante que `setLoading(false)` e SEMPRE chamado
- A flag de `fetchInProgress` (useRef) previne chamadas concorrentes de `getSession` + `onAuthStateChange`
- Nao altera a logica de autenticacao do Supabase (signIn/signOut continuam iguais)
- Nao requer alteracoes na base de dados
