

# Dados de Contacto por Ficha de Servico (Independentes do Perfil do Cliente)

## Problema Actual

Hoje, todos os dados de contacto (nome, telefone, email, NIF, morada) exibidos na ficha de servico vem directamente do perfil do cliente (`customers` table via JOIN). Se o cliente tem duas casas, outro telefone, ou um email diferente para aquele servico, nao ha forma de o registar sem alterar o perfil original.

A morada ja tem campos separados no servico (`service_address`, `service_postal_code`, `service_city`), mas o telefone, email e NIF nao.

## Solucao

Adicionar campos de contacto ao nivel do servico que funcionam como "override" — se preenchidos, sao usados em vez dos dados do perfil do cliente. Se vazios, usa-se o perfil do cliente como fallback.

## 1. Migracao SQL

Adicionar 3 novas colunas a tabela `services`:

```sql
ALTER TABLE public.services
  ADD COLUMN contact_phone text DEFAULT NULL,
  ADD COLUMN contact_email text DEFAULT NULL,
  ADD COLUMN contact_name text DEFAULT NULL;
```

Nota: `service_address`, `service_postal_code` e `service_city` ja existem. O NIF nao precisa de override pois e um identificador fiscal fixo do cliente.

## 2. Pre-preenchimento na Criacao

No `CreateServiceModal.tsx`, ao criar o servico, copiar os dados do cliente para os novos campos:

```ts
contact_name: values.customer_name,
contact_phone: values.customer_phone,
contact_email: values.customer_email || null,
```

Isto garante que cada ficha tem uma "fotografia" dos dados de contacto no momento da criacao.

## 3. Edicao dos Dados de Contacto na Ficha

Expandir o `EditServiceDetailsModal` (ou criar uma seccao separada) para incluir os campos de contacto da ficha:

- Nome de contacto
- Telefone de contacto
- Email de contacto
- Morada do servico (ja existe: `service_address`)
- Codigo postal (ja existe: `service_postal_code`)
- Cidade (ja existe: `service_city`)

O modal tera duas seccoes:
1. **Contacto nesta ficha** — nome, telefone, email, morada
2. **Equipamento** — tipo, marca, modelo, serie, avaria, notas (ja existente)

A permissao de edicao segue a regra actual: apenas `dono` pode editar (e `secretaria` via aprovacao do plano anterior).

## 4. Exibicao com Fallback

Criar uma funcao helper reutilizavel:

```ts
// Em cada ponto de exibicao:
const contactName = service.contact_name || service.customer?.name || 'N/A';
const contactPhone = service.contact_phone || service.customer?.phone || 'N/A';
const contactEmail = service.contact_email || service.customer?.email || '';
const contactAddress = service.service_address || service.customer?.address || '';
```

Actualizar os seguintes ficheiros para usar este padrao:

| Ficheiro | O que muda |
|---|---|
| `ServiceDetailSheet.tsx` | Seccao "Cliente" usa campos do servico com fallback |
| `ServiceDetailPage.tsx` | Idem |
| `ServicePrintPage.tsx` | Ficha impressa usa dados do servico |
| `TechnicianServiceSheet.tsx` | Vista do tecnico |

Quando os dados do servico diferem dos do cliente, mostrar um indicador subtil (ex: icone ou tooltip "Dados especificos desta ficha").

## 5. Integridade e Regras

- O campo `customer_id` continua a existir e a associar o servico ao perfil do cliente
- Os campos de contacto do servico sao independentes — alterar o telefone na ficha NAO altera o perfil do cliente
- Ao criar um novo servico para o mesmo cliente, os dados sao copiados novamente do perfil (dados frescos)
- O perfil do cliente so e editado na pagina de clientes

## Resumo de Ficheiros a Alterar

| Ficheiro | Alteracao |
|---|---|
| **Migracao SQL** | Adicionar `contact_phone`, `contact_email`, `contact_name` |
| `CreateServiceModal.tsx` | Pre-preencher campos de contacto ao criar servico |
| `EditServiceDetailsModal.tsx` | Adicionar seccao de contacto (nome, telefone, email, morada) |
| `ServiceDetailSheet.tsx` | Usar dados do servico com fallback para cliente |
| `ServiceDetailPage.tsx` | Idem |
| `ServicePrintPage.tsx` | Idem |
| `TechnicianServiceSheet.tsx` | Idem |
| `CreateInstallationModal.tsx` | Pre-preencher campos de contacto |
| `CreateDeliveryModal.tsx` | Pre-preencher campos de contacto |

