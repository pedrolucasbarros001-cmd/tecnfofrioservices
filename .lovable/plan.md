
# Plano: Corrigir Login com Credenciais Correctas e Permitir Sessoes Simultaneas

## Problema Raiz

Ha dois problemas distintos a causar o erro de "credenciais invalidas" com senhas correctas:

### Problema 1: O logout mata TODAS as sessoes

O `signOut()` actual chama `supabase.auth.signOut()` **sem parametros**. Por defeito, o Supabase usa `scope: 'global'`, que **invalida TODOS os refresh tokens** do utilizador em todos os dispositivos. Isto significa:

```text
Utilizador loga no PC -> OK
Utilizador loga no telemovel -> OK
Utilizador faz logout no telemovel -> MATA a sessao do PC tambem!
  |
  v
PC tenta renovar token -> token invalido
  |
  v
Proximo login no PC pode falhar com erro ambiguo
```

### Problema 2: Erros de servidor sao classificados como "credenciais invalidas"

Quando a base de dados esta lenta e retorna 500/504, o Supabase Auth por vezes retorna mensagens de erro que nao contem as palavras-chave de servidor ("database error", "timeout"), e caem no bloco generico que o utilizador interpreta como "senha errada".

### Problema 3: TVMonitorPage faz signOut global separado

A pagina `TVMonitorPage.tsx` chama `supabase.auth.signOut()` directamente (sem usar o contexto), tambem com scope global.

## Solucao (3 ficheiros)

### Ficheiro 1: `src/contexts/AuthContext.tsx`

Alterar a funcao `signOut` para usar `scope: 'local'`:

```text
Antes:  await supabase.auth.signOut()              // mata TODAS as sessoes
Depois: await supabase.auth.signOut({ scope: 'local' })  // so mata ESTA sessao
```

Isto permite que a mesma conta esteja logada em multiplos dispositivos simultaneamente sem conflito.

### Ficheiro 2: `src/pages/TVMonitorPage.tsx`

Alterar o logout directo para tambem usar scope local:

```text
Antes:  await supabase.auth.signOut()
Depois: await supabase.auth.signOut({ scope: 'local' })
```

### Ficheiro 3: `src/pages/LoginPage.tsx`

Melhorar a deteccao de erros para evitar classificar erros de servidor como "credenciais invalidas":

- Antes de verificar "invalid"/"credentials", primeiro limpar sessao local antiga (que pode estar a causar conflito)
- Adicionar mais palavras-chave de servidor: "context deadline", "connection", "ECONNREFUSED"
- Chamar `localStorage.clear()` automaticamente antes de cada tentativa de login para eliminar sessoes fantasma

## Resultado

- A mesma conta pode estar logada em quantos dispositivos quiser, ao mesmo tempo
- Fazer logout num dispositivo NAO afecta os outros
- Sessoes antigas nao interferem com novos logins
- Erros de servidor nao sao confundidos com "senha errada"

## Seccao Tecnica

- `supabase.auth.signOut({ scope: 'local' })` apenas remove a sessao do localStorage do browser actual, sem tocar no servidor
- O Supabase suporta nativamente sessoes multiplas -- cada `signInWithPassword` gera um novo par access/refresh token independente
- Nenhuma alteracao de base de dados e necessaria
- A limpeza de localStorage antes do login garante que tokens expirados/invalidos de sessoes anteriores nao interferem
