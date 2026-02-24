
# Plano: Tornar o Sistema Resiliente a Lentidao do Supabase

## Diagnostico Real (dos logs)

A base de dados Supabase esta a sofrer timeouts intermitentes ao nivel da infraestrutura:

```text
11:16:50 - Auth /token -> 500: "error finding user: timeout: context canceled"
11:11:29 - Auth /token -> 504: "dial tcp [::1]:5432: i/o timeout"
11:12:49 - Auth /token -> 200 mas demorou 9.7 SEGUNDOS
11:11:37 - Auth /token -> 200 mas demorou 6.1 SEGUNDOS
DB logs: multiplos "canceling statement due to statement timeout"
```

O problema nao e do codigo -- e o servico Supabase que perde conexao com a propria base de dados. Mas o sistema pode ser **muito mais inteligente** a lidar com isto.

## Problemas Actuais no Codigo

1. **signIn nao faz retry**: se o Supabase Auth retorna 500/504, o login falha imediatamente sem tentar novamente
2. **Mensagem de erro generica**: o utilizador ve "Erro de autenticacao" quando na verdade e "servidor sobrecarregado, tente de novo"
3. **Sem deteccao proactiva**: a pagina de login nao avisa o utilizador quando o servidor esta lento ANTES de tentar logar

## Solucao (2 ficheiros)

### Ficheiro 1: `src/contexts/AuthContext.tsx`

Adicionar retry automatico ao `signIn`:

```text
signIn (modificado):
  tentativa 1: signInWithPassword (timeout 12s)
  se erro 500/504/timeout:
    espera 2 segundos
    tentativa 2: signInWithPassword (timeout 12s)
    se erro novamente:
      retorna erro ao utilizador
  se sucesso:
    retorna normalmente
```

- Detectar erros de servidor (500, "Database error", "timeout", "context canceled") vs erros de credenciais (401, "Invalid login credentials")
- So fazer retry em erros de servidor, NAO em credenciais invalidas
- Maximo de 1 retry (total 2 tentativas)

### Ficheiro 2: `src/pages/LoginPage.tsx`

Melhorias na experiencia do utilizador:

1. **Deteccao proactiva de saude do servidor**: ao carregar a pagina de login, fazer um "health check" silencioso (query simples ao Supabase) e mostrar um banner amarelo se o servidor estiver lento
2. **Mensagens de erro especificas**: distinguir entre "servidor sobrecarregado" (com opcao de tentar novamente) e "credenciais invalidas"
3. **Feedback de progresso**: durante o login, mostrar texto que muda conforme o tempo passa:
   - 0-3s: "A entrar..."
   - 3-8s: "A conectar ao servidor..."
   - 8s+: "O servidor esta lento, por favor aguarde..."
4. **Botao "Tentar novamente"**: se o login falhar por timeout, mostrar botao para repetir em vez de obrigar o utilizador a preencher tudo de novo

```text
LoginPage (modificado):

  // Health check ao montar
  useEffect -> fetch simples ao Supabase
    se demorar > 3s ou falhar -> mostrar banner "Servidor lento"

  // Feedback progressivo
  useEffect (durante isLoading):
    setTimeout 3s -> "A conectar ao servidor..."
    setTimeout 8s -> "O servidor está lento..."

  // Mensagens de erro melhoradas
  onSubmit:
    se erro.message inclui "Database error" ou "timeout":
      toast: "Servidor temporariamente indisponível. A tentar novamente..."
      // O retry ja acontece no AuthContext
    se erro.message inclui "Invalid login":
      toast: "Credenciais inválidas"
```

## Resultado

- Login com retry automatico: se o servidor falhar na 1a tentativa, tenta novamente automaticamente
- O utilizador sabe ANTES de logar se o servidor esta lento (banner amarelo)
- Mensagens de erro claras: "servidor sobrecarregado" vs "senha errada"
- Feedback visual progressivo durante o login
- O botao "Entrar" NUNCA fica preso (timeouts + safety resets ja existentes)

## Secao Tecnica

- O retry so acontece para erros de servidor (500, 504, timeout, "Database error"), nunca para credenciais invalidas
- O health check usa uma query leve (`supabase.from('profiles').select('count', { count: 'exact', head: true }).limit(0)`) que nao carrega dados
- O timeout do health check e 5 segundos -- se demorar mais, mostra banner
- As queries React Query ja tem `retry: 1` configurado globalmente no QueryClient
- Os timeouts existentes (10s para queries, 15s safety) continuam activos
- A base de dados tem 227MB e apenas 19 servicos -- os timeouts sao da infraestrutura Supabase, nao do volume de dados
