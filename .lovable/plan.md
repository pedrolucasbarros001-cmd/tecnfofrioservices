

# Plano: Conectar e Garantir Funcionamento End-to-End com Supabase

## Situacao Atual

Apos a analise detalhada do sistema, identifiquei **3 problemas criticos** que impedem o funcionamento correto:

### Problema 1: Politica RLS do TV Monitor Desatualizada
A politica atual no Supabase ainda usa a versao antiga:
```sql
status IN ('na_oficina', 'em_execucao', 'para_pedir_peca', 'em_espera_de_peca', 'concluidos')
```
Isso **exclui servicos com status `por_fazer` e `a_precificar`** da oficina, mesmo quando `service_location = 'oficina'`.

### Problema 2: Config.toml Perdeu Configuracao do Edge Function
O ficheiro `supabase/config.toml` foi simplificado e perdeu a configuracao:
```toml
[functions.invite-user]
verify_jwt = false
```
Isso pode causar erros na criacao de utilizadores.

### Problema 3: Warning de React no LoginPage
Ha um warning de `Function components cannot be given refs` no FormField do LoginPage.

---

## Implementacao

### A) Corrigir RLS do TV Monitor

Criar migracao SQL para atualizar a politica:

```sql
-- Remover politica antiga
DROP POLICY IF EXISTS "Public read for workshop services on TV monitor" ON public.services;

-- Criar politica corrigida (baseada em location, nao apenas status)
CREATE POLICY "Public read for workshop services on TV monitor"
  ON public.services FOR SELECT
  TO anon, authenticated
  USING (
    service_location = 'oficina' 
    AND status NOT IN ('finalizado')
  );
```

E atualizar a politica de customers associados:
```sql
DROP POLICY IF EXISTS "Public read for customers with workshop services" ON public.customers;

CREATE POLICY "Public read for customers with workshop services"
  ON public.customers FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.customer_id = customers.id
        AND s.service_location = 'oficina'
        AND s.status NOT IN ('finalizado')
    )
  );
```

**Ficheiro**: Nova migracao SQL via ferramenta de migracoes

---

### B) Restaurar Configuracao do Edge Function

Atualizar `supabase/config.toml` para:

```toml
project_id = "flialeqlwrtfnonxtsnx"

[functions.invite-user]
verify_jwt = false
```

**Ficheiro**: `supabase/config.toml`

---

### C) Corrigir Dados Legados

Marcar servicos finalizados sem preco como `pending_pricing=true`:

```sql
UPDATE public.services
SET pending_pricing = true
WHERE status = 'finalizado'
  AND pending_pricing = false
  AND (final_price IS NULL OR final_price = 0)
  AND is_warranty = false;
```

---

### D) Corrigir Warning de React no LoginPage

O warning ocorre porque o componente `Input` dentro de `FormField` nao esta a usar `forwardRef`. Isso e apenas um warning e nao afeta a funcionalidade, mas podemos corrigir para limpar a consola.

**Ficheiro**: `src/pages/LoginPage.tsx` (verificar se o Input precisa de ref)

---

## Resumo de Alteracoes

| Componente | Acao | Prioridade |
|------------|------|------------|
| **RLS Policies** | Migracao para corrigir visibilidade TV Monitor | CRITICA |
| **config.toml** | Restaurar config do edge function invite-user | ALTA |
| **Dados legados** | Marcar pending_pricing em finalizados sem preco | ALTA |
| **LoginPage** | Corrigir warning de ref (opcional) | BAIXA |

---

## Validacao Pos-Implementacao

1. **TV Monitor**: Verificar que servicos `por_fazer` e `a_precificar` na oficina aparecem
2. **Dashboard**: Confirmar que contagens de "A Precificar" e "Em Debito" estao corretas
3. **Criacao de Utilizador**: Testar criacao de novo colaborador via edge function
4. **Fluxo de Instalacao**: Finalizar instalacao e verificar que aparece em "A Precificar"
5. **Pagamentos**: Registar pagamento e verificar que "Em Debito" atualiza corretamente

---

## Detalhes Tecnicos

### Ficheiros a Criar/Modificar

1. **Nova Migracao SQL** - Corrigir RLS policies para TV Monitor
2. `supabase/config.toml` - Restaurar configuracao do edge function

### Ordem de Execucao

1. Aplicar migracao SQL (RLS + dados legados)
2. Atualizar config.toml
3. Redeployar edge function
4. Validar end-to-end

