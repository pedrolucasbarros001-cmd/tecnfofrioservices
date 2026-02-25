

# Correcao Manual de Pagamentos Duplicados pelo Administrador

## Contexto

Pagamentos duplicados ocorrem quando a base de dados confirma o INSERT mas o frontend nao recebe a confirmacao (timeout). O tecnico ou secretaria tenta novamente, criando entradas duplicadas. O administrador precisa de poder apagar pagamentos individuais directamente no historico de pagamentos do servico.

## O que ja existe

- A tabela `service_payments` ja tem RLS policy que permite DELETE apenas para o role `dono`
- O `ServiceDetailSheet` ja mostra o historico de pagamentos com cada entrada individual
- O `useFullServiceData` ja carrega os pagamentos do servico

## Plano de Implementacao

### 1. Adicionar botao de apagar no historico de pagamentos (`ServiceDetailSheet.tsx`)

No bloco que renderiza cada pagamento (linhas 688-712), adicionar um botao de lixo (Trash2 icon) visivel apenas para o role `dono`. Ao clicar, abre um AlertDialog de confirmacao com o valor e a data do pagamento.

### 2. Logica de eliminacao

Ao confirmar:
1. DELETE do registo em `service_payments` pelo `id`
2. Recalcular o `amount_paid` do servico somando os pagamentos restantes
3. UPDATE em `services.amount_paid` com o novo total
4. Invalidar queries de pagamentos e servicos
5. Toast de confirmacao

### 3. Proteccao contra duplicacao futura (`RegisterPaymentModal.tsx`)

Antes de inserir, verificar se ja existe um pagamento com o mesmo `service_id`, `amount` e `payment_method` criado nos ultimos 2 minutos. Se existir, mostrar aviso e bloquear.

### Ficheiros a alterar

| Ficheiro | Alteracao |
|---|---|
| `src/components/services/ServiceDetailSheet.tsx` | Botao de apagar pagamento (apenas dono) com confirmacao e recalculo de amount_paid |
| `src/components/modals/RegisterPaymentModal.tsx` | Verificacao de duplicacao antes do INSERT |

### Detalhes tecnicos

- DELETE usa `supabase.from('service_payments').delete().eq('id', paymentId)` — ja permitido pela RLS para dono
- Recalculo: `SELECT COALESCE(SUM(amount), 0) FROM service_payments WHERE service_id = X` apos o delete, depois UPDATE em services
- Verificacao de duplicacao: query antes do insert com filtro `created_at > now() - interval '2 minutes'` e mesmo amount/method
- Nenhuma migracao SQL necessaria — as permissoes ja existem

