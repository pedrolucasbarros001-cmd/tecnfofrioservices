

# Diagnostico: Fotos e valores nao aparecem na ficha de consulta

## Problema identificado

A pagina `ServiceConsultPage` (`/service/:serviceId`) — a "ficha de consulta" — faz apenas uma query basica:

```sql
SELECT *, customer:customers(*) FROM services WHERE id = :serviceId
```

Esta query carrega **apenas** os dados da tabela `services` e do cliente. **Nao carrega**:
- Fotos (`service_photos`)
- Historico de pagamentos (`service_payments`)
- Pecas utilizadas (`service_parts`)
- Assinaturas (`service_signatures`)
- Diagnostico/trabalho realizado (estes campos existem em `services` mas nao sao renderizados na pagina)

As fotos estao a ser guardadas correctamente no Storage (confirmei 15 registos recentes com URLs publicas validas). O problema e exclusivamente de **renderizacao** — a pagina nao carrega nem mostra esses dados.

## Causa raiz

O `ServiceConsultPage` foi desenhado como pagina minimalista de estado para clientes, mas os colaboradores estao a usa-lo como ficha de consulta completa. Faltam seccoes inteiras.

## Plano de correcao (sem carga adicional no Supabase)

### 1. Expandir a query existente com JOINs embutidos

Em vez de criar queries separadas (que multiplicam pedidos), expandir o `select` existente para incluir apenas os campos necessarios:

```sql
SELECT *,
  customer:customers(*),
  photos:service_photos(id, file_url, photo_type, description),
  payments:service_payments(id, amount, payment_method, payment_date),
  parts:service_parts(id, part_name, quantity, arrived, is_requested),
  signatures:service_signatures(id, file_url, signature_type, signer_name, signed_at)
FROM services WHERE id = :serviceId
```

Uma unica query com JOINs embutidos — **zero queries adicionais**.

### 2. Adicionar seccoes que faltam no JSX

| Seccao | Dados | Visibilidade |
|---|---|---|
| Diagnostico e trabalho | `detected_fault`, `work_performed` da tabela services | Se existirem |
| Fotos do servico | Grid de thumbnails com zoom | Se houver fotos |
| Pecas | Lista simples com estado (registada/pedida/chegou) | Se houver pecas |
| Pagamentos | Lista com valor, metodo e data | Se houver pagamentos |
| Assinaturas | Miniaturas das assinaturas | Se houver assinaturas |

### 3. Corrigir invalidacao de cache no ServiceDetailSheet

O `handleDeletePhoto` invalida `['service-photos', service.id]` mas os dados estao em `['service-full', service.id]`. Corrigir para invalidar a query correcta.

### Ficheiros a alterar

| Ficheiro | Alteracao |
|---|---|
| `src/pages/ServiceConsultPage.tsx` | Expandir query com JOINs, adicionar seccoes de fotos/pagamentos/pecas/assinaturas/diagnostico |
| `src/components/services/ServiceDetailSheet.tsx` | Corrigir query key de invalidacao no `handleDeletePhoto` (linha 249) |

### Impacto no Supabase

- **Zero queries adicionais** — tudo resolvido com JOINs embutidos na query existente
- Os indices criados anteriormente em `service_photos.service_id`, `service_parts.service_id`, etc. garantem performance dos JOINs
- Sem migracoes SQL necessarias

