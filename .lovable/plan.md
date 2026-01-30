
# Plano: Corrigir Servico Existente com Status Incorrecto

## Diagnostico

Analisei a base de dados e encontrei o problema:

O servico **TF-00004** foi criado **antes** da correcao de codigo e tem:
- `status: 'em_debito'` (incorrecto)
- `service_location: 'cliente'`
- `service_type: 'instalacao'`
- `scheduled_date: 2026-01-30` (hoje)

A query do tecnico filtra por:
```sql
status IN ('por_fazer', 'em_execucao', 'para_pedir_peca', 'em_espera_de_peca')
```

Como `em_debito` nao esta nesta lista, o servico nao aparece!

## Servicos do Tecnico Pedro Lucas

| Codigo | Status | Localizacao | Motivo de nao aparecer |
|--------|--------|-------------|------------------------|
| TF-00004 | `em_debito` | cliente | Status incorrecto (criado antes da correcao) |
| OS-00001 | `a_precificar` | cliente | Ja concluido operacionalmente |
| OS-00002 | `na_oficina` | oficina | Vai para pagina Oficina |
| OS-00003 | `finalizado` | entregue | Ja concluido |

## Solucao

O codigo ja foi corrigido na mensagem anterior. Apenas precisamos de corrigir o servico existente na base de dados.

### Correcao de Dados (SQL)

Executar este SQL para corrigir o servico afectado:

```sql
UPDATE public.services
SET status = 'por_fazer'
WHERE id = 'fd39531d-3bdc-4820-a612-98c00f648e74';
```

Ou de forma mais generica para todos os servicos afectados:

```sql
UPDATE public.services
SET status = 'por_fazer'
WHERE status = 'em_debito'
  AND service_type IN ('entrega', 'instalacao')
  AND delivery_date IS NULL;
```

Esta query:
1. Encontra servicos com status `em_debito` (incorrecto)
2. Que sejam de entrega ou instalacao
3. Que ainda nao foram entregues (`delivery_date IS NULL`)
4. Corrige o status para `por_fazer`

## Proximo Passo

Pode executar esta correcao de duas formas:

**Opcao 1**: Cloud View > Run SQL (no ambiente Test)
**Opcao 2**: Posso propor uma migracao SQL que sera executada automaticamente

Apos a correcao, o servico TF-00004 aparecera na agenda do tecnico para o dia de hoje (Sexta, 30/01).

## Validacao

Apos executar a correcao:
1. O servico TF-00004 aparece na agenda do tecnico (Sexta)
2. O servico tambem continua a aparecer na lista "Em Debito" (calculado: final_price > amount_paid)
3. O tecnico pode executar o fluxo de instalacao
