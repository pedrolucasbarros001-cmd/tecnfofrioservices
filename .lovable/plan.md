

# Corrigir Acesso ao Monitor + Botao de Logout

## Problema

1. A rota `/tv-monitor` permite acesso a `['monitor', 'dono', 'secretaria']` -- qualquer utilizador com esses cargos consegue ver o monitor, o que nao deveria acontecer. Apenas a conta `monitor` deve aceder.
2. Na pagina do monitor nao existe botao de logout, obrigando o utilizador a limpar cookies manualmente para sair.

## Solucao

### 1. Restringir acesso apenas ao role `monitor`

**Ficheiro**: `src/App.tsx` (linha 100)

Alterar `allowedRoles` de `['monitor', 'dono', 'secretaria']` para apenas `['monitor']`.

Resultado: se um `dono` ou `secretaria` tentar aceder a `/tv-monitor`, o `ProtectedRoute` redireciona automaticamente para a pagina correcta do seu cargo (dashboard, geral, etc.).

### 2. Adicionar botao de logout na pagina do monitor

**Ficheiro**: `src/pages/TVMonitorPage.tsx`

Adicionar um botao pequeno e discreto no canto inferior direito do footer (na barra de marca), ao lado do texto "TECNOFRIO - Sistema de Gestao":

- Icone `LogOut` do Lucide (tamanho pequeno, 14px)
- Texto "Sair" em tamanho xs
- Estilo discreto: texto slate-500, hover slate-300
- Ao clicar: chama `supabase.auth.signOut()` e redireciona para `/login`

O botao fica integrado no footer existente sem perturbar o layout do monitor.

### Ficheiros a alterar

| Ficheiro | Alteracao |
|----------|-----------|
| `src/App.tsx` | Mudar allowedRoles para `['monitor']` |
| `src/pages/TVMonitorPage.tsx` | Importar LogOut, useNavigate, supabase; adicionar botao de logout no footer |

