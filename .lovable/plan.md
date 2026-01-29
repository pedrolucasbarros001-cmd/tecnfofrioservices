
# Plano: Correção de Idioma para Português de Portugal (pt-PT)

## Resumo

Após análise do código, identifiquei várias inconsistências linguísticas que misturam Português do Brasil com Português de Portugal. Este plano corrige todos os textos para seguir as convenções do pt-PT, garantindo consistência em toda a aplicação.

---

## Problemas Identificados

### 1. "Senha" → "Palavra-passe" (pt-BR → pt-PT)

| Arquivo | Linha | Texto Atual | Texto Correto |
|---------|-------|-------------|---------------|
| `src/components/modals/CreateUserModal.tsx` | 38 | "Senha deve ter pelo menos 8 caracteres" | "Palavra-passe deve ter pelo menos 8 caracteres" |
| `src/components/modals/CreateUserModal.tsx` | 163 | label "Senha" | label "Palavra-passe" |
| `src/components/modals/CreateUserModal.tsx` | 236 | FormLabel "Senha *" | FormLabel "Palavra-passe *" |
| `supabase/functions/invite-user/index.ts` | 84 | "Senha é obrigatória..." | "Palavra-passe é obrigatória..." |

### 2. "Tem certeza" → "Tem a certeza" (pt-BR → pt-PT)

| Arquivo | Linha | Contexto |
|---------|-------|----------|
| `src/pages/GeralPage.tsx` | 388 | "Tem certeza que deseja eliminar o serviço..." |
| `src/pages/ClientesPage.tsx` | 54 | confirm('Tem certeza que deseja eliminar...') |
| `src/pages/ColaboradoresPage.tsx` | 346-347 | "Tem certeza que deseja desativar/ativar..." |
| `src/components/services/ServiceDetailSheet.tsx` | 968 | "Tem certeza que deseja eliminar o serviço..." |
| `src/components/modals/EditUserModal.tsx` | 324 | "Tem certeza que deseja alterar o nível de acesso..." |

### 3. Outras Correções Menores

| Arquivo | Atual | Correto | Razão |
|---------|-------|---------|-------|
| `src/pages/PreferenciasPage.tsx` | "Preencha todos os campos" | "Preencha todos os campos" | OK - já correto |
| Vários | "Por favor, faça login novamente" | "Inicie sessão novamente" | "fazer login" é anglicismo |

---

## Alterações por Arquivo

### 1. `src/components/modals/CreateUserModal.tsx`

```typescript
// Linha 38: Correção da validação
.min(8, 'Palavra-passe deve ter pelo menos 8 caracteres')

// Linha 163: Label de sucesso
<span className="text-xs text-muted-foreground uppercase">Palavra-passe</span>

// Linha 236: FormLabel
<FormLabel>Palavra-passe *</FormLabel>
```

### 2. `supabase/functions/invite-user/index.ts`

```typescript
// Linha 84
JSON.stringify({ error: 'Palavra-passe é obrigatória e deve ter pelo menos 8 caracteres' })
```

### 3. `src/pages/GeralPage.tsx`

```typescript
// Linha 388
Tem a certeza que deseja eliminar o serviço {currentService?.code}?
```

### 4. `src/pages/ClientesPage.tsx`

```typescript
// Linha 54
if (confirm('Tem a certeza que deseja eliminar este cliente?')) {
```

### 5. `src/pages/ColaboradoresPage.tsx`

```typescript
// Linhas 346-347
? `Tem a certeza que deseja desativar ${userToDeactivate?.full_name || 'este utilizador'}?`
: `Tem a certeza que deseja ativar ${userToDeactivate?.full_name || 'este utilizador'}?`
```

### 6. `src/components/services/ServiceDetailSheet.tsx`

```typescript
// Linha 968
Tem a certeza que deseja eliminar o serviço {service.code}?
```

### 7. `src/components/modals/EditUserModal.tsx`

```typescript
// Linha 324
Tem a certeza que deseja alterar o nível de acesso deste utilizador?
```

---

## Resumo de Alterações

| Arquivo | Nº Alterações |
|---------|---------------|
| `CreateUserModal.tsx` | 3 |
| `invite-user/index.ts` | 1 |
| `GeralPage.tsx` | 1 |
| `ClientesPage.tsx` | 1 |
| `ColaboradoresPage.tsx` | 2 |
| `ServiceDetailSheet.tsx` | 1 |
| `EditUserModal.tsx` | 1 |
| **Total** | **10** |

---

## Verificações Adicionais (Já Corretos)

Os seguintes textos já estão em pt-PT correto:
- "A carregar..." ✅
- "Palavra-passe" em LoginPage e PreferenciasPage ✅
- "Eliminar" (não "Apagar" ou "Deletar") ✅
- "Utilizador" (não "Usuário") ✅
- "Guardar" (não "Salvar") ✅
- "Telemóvel" não usado, mas "Telefone" é aceitável ✅

---

## Resultado Esperado

Após as alterações:
- Toda a interface usará "Palavra-passe" em vez de "Senha"
- Todas as confirmações usarão "Tem a certeza" (com artigo "a")
- Consistência linguística em pt-PT em toda a aplicação
