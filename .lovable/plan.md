

## Corrigir Envio de Emails — Edge Function

### Problema
Os logs da edge function mostram o erro:
```
Could not embed because more than one relationship was found for 'services' and 'technicians'
```

A tabela `services` tem mais do que uma FK para `technicians`, e a query na edge function não especifica qual usar. O código da app já resolve isto com `technicians!services_technician_id_fkey`, mas a edge function usa apenas `tech:technicians(*)`.

### Correção

**Ficheiro**: `supabase/functions/send-email-notification/index.ts`

**Linha 69** — Alterar a query de:
```typescript
.select('*, customer:customers(*), tech:technicians(*, profile:profiles(*))')
```
Para:
```typescript
.select('*, customer:customers(*), tech:technicians!services_technician_id_fkey(*, profile:profiles(*))')
```

Isto é a única alteração necessária. Após o deploy automático, todos os 4 tipos de email (relatório, pagamento, peças, mensagem personalizada) passarão a funcionar.

### Secção Técnica
- A causa raiz é a ambiguidade de FK entre `services` e `technicians` — o PostgREST exige o hint `!services_technician_id_fkey` quando há múltiplas relações
- Não há alterações nos templates, apenas na query de dados
- A edge function será redeployada automaticamente após a edição

