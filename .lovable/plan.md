

# Plano: Criacao Rapida de Servico pelo Tecnico em Campo

## Resumo

O tecnico em campo precisa criar servicos rapidos sem ligar para a secretaria. A solucao usa uma RPC `SECURITY DEFINER` (porque RLS bloqueia INSERT de tecnicos em `services` e `customers`) e um modal simplificado mas completo.

## Campos do formulario

Campos obrigatorios:
- Nome do cliente *
- Telefone do cliente *
- Tipo de aparelho *
- Descricao da avaria *

Campos opcionais (pedidos pelo utilizador):
- Morada (rua, codigo postal, cidade) — guardados no cliente
- Garantia (toggle) + Marca da garantia + Numero de processo
- Urgente (toggle)
- Notas

Auto-deteccao de cliente existente por telefone (reutiliza logica do CreateServiceModal).

## Arquitectura

```text
ServicosPage (Agenda)
  └── FAB "+" (canto inferior direito)
        └── TechQuickServiceModal
              ├── Campos de cliente (nome, telefone, morada)
              ├── Campos de equipamento (aparelho, avaria)
              ├── Garantia toggle + campos condicionais
              ├── Urgente toggle
              └── Botao "Criar Servico"
                    └── RPC: technician_create_service (SECURITY DEFINER)
                          1. Valida is_tecnico(auth.uid())
                          2. Busca technician_id do caller
                          3. INSERT OR SELECT cliente por telefone
                          4. INSERT servico com:
                             - technician_id = tecnico do caller
                             - service_location = 'cliente'
                             - status = 'por_fazer'
                             - scheduled_date = hoje
                             - pending_pricing = true
                             - service_type = 'reparacao'
                          5. Retorna id + code
```

## Detalhes tecnicos

### 1. Migracao SQL — RPC `technician_create_service`

Funcao `SECURITY DEFINER` com `search_path = public`:

Parametros de entrada:

| Parametro | Tipo | Obrigatorio |
|---|---|---|
| `_customer_name` | text | Sim |
| `_customer_phone` | text | Sim |
| `_appliance_type` | text | Sim |
| `_fault_description` | text | Sim |
| `_is_urgent` | boolean | Nao (default false) |
| `_is_warranty` | boolean | Nao (default false) |
| `_warranty_brand` | text | Nao |
| `_warranty_process_number` | text | Nao |
| `_customer_address` | text | Nao |
| `_customer_postal_code` | text | Nao |
| `_customer_city` | text | Nao |
| `_notes` | text | Nao |

Retorna `TABLE(service_id uuid, service_code text)`.

Logica:
- Verifica `is_tecnico(auth.uid())`; se nao, RAISE EXCEPTION
- Busca `technician_id` via `technicians.profile_id = profiles.id WHERE profiles.user_id = auth.uid()`
- Busca cliente existente por telefone (`SELECT id FROM customers WHERE phone = _customer_phone LIMIT 1`). Se nao existe, INSERT novo cliente com os dados fornecidos
- INSERT em `services` — o trigger `generate_service_code()` gera o codigo TF-XXXXX automaticamente
- INSERT em `activity_logs` com `action_type = 'criacao'` e descricao adequada
- RETURN service id e code

### 2. Componente `TechQuickServiceModal`

Ficheiro: `src/components/technician/TechQuickServiceModal.tsx`

- Modal com `Dialog` + `ScrollArea` optimizado para mobile
- Formulario com `react-hook-form` + `zod` validation
- Auto-deteccao de cliente por telefone (debounce 500ms, mesma logica do CreateServiceModal)
- Toggle "Garantia?" que revela campos `warranty_brand` e `warranty_process_number`
- Toggle "Urgente?"
- Seccao de morada (rua + codigo postal + cidade)
- Chama `supabase.rpc('technician_create_service', {...})`
- Toast de sucesso com codigo: "Servico TF-00045 criado!"
- Invalida queries: `technician-services`, `services`, `services-paginated`, `customers`

### 3. Botao FAB na `ServicosPage`

Ficheiro: `src/pages/ServicosPage.tsx`

- Botao flutuante `+` no canto inferior direito (`fixed bottom-6 right-6`)
- Cor primaria, circular, com sombra
- Ao clicar abre `TechQuickServiceModal`

## Ficheiros a criar/alterar

| Ficheiro | Accao |
|---|---|
| `supabase/migrations/[timestamp]_technician_create_service.sql` | Nova RPC |
| `src/components/technician/TechQuickServiceModal.tsx` | Novo componente |
| `src/pages/ServicosPage.tsx` | Adicionar FAB + importar modal |

## O que NAO muda

- `CreateServiceModal` do dono/secretaria inalterado
- RLS policies existentes inalteradas
- Fluxos de execucao do tecnico inalterados
- O servico criado aparece automaticamente nas listagens do dono e secretaria (RLS SELECT ja permite)
- Codigo TF-XXXXX gerado pelo mesmo trigger existente

