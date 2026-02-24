

# Plano: Ordenacao por Criacao e Pesquisa Completa nos Servicos

## Problema Atual

1. **Ordenacao**: Os servicos sao ordenados por `scheduled_date ASC` (data agendada), o que coloca servicos antigos no topo. Servicos recem-criados ficam perdidos no meio ou no final da lista.

2. **Pesquisa incompleta**: A pesquisa atual cobre `codigo, aparelho, marca, avaria, nome/telefone/email do cliente`, mas **nao pesquisa por nome do tecnico** nem por outros campos como modelo, numero de serie ou descricao do trabalho.

## Solucao

### 1. `src/hooks/useServices.ts` -- Alterar ordenacao e pesquisa

**Ordenacao (3 locais):**

Substituir a ordem atual:
```text
.order('scheduled_date', { ascending: true })
.order('scheduled_shift', { ascending: true })
.order('created_at', { ascending: false })
```

Por ordem por criacao descendente (mais recentes primeiro):
```text
.order('created_at', { ascending: false })
```

Isto aplica-se a:
- `useServices()` (linha 40-42) -- usado pela OficinaPage
- `usePaginatedServices()` sem searchTerm (linhas 320-322) -- usado pela GeralPage
- `usePaginatedServices()` com searchTerm, no sort manual (linhas 280-301)

**Pesquisa (1 local):**

Expandir o filtro `.or()` na pesquisa de servicos (linha 253) para incluir mais campos:
```text
code, appliance_type, brand, model, serial_number, fault_description, detected_fault, work_performed
```

Adicionar pesquisa por tecnico: buscar `technicians` -> `profiles` com `full_name.ilike` e incluir os `technician_id` correspondentes na pesquisa combinada (mesmo padrao ja usado para clientes).

### 2. `src/pages/OficinaPage.tsx` -- Adicionar barra de pesquisa

A pagina Oficina nao tem pesquisa. Adicionar:
- Campo de pesquisa com filtro local por `code`, `customer.name`, `appliance_type`, `brand`, `fault_description` e `technician.profile.full_name`

### Resumo de Alteracoes

| Ficheiro | Alteracao |
|---|---|
| `src/hooks/useServices.ts` | Ordenar por `created_at DESC`; expandir campos de pesquisa; adicionar pesquisa por tecnico |
| `src/pages/OficinaPage.tsx` | Adicionar barra de pesquisa local com filtro por palavra-chave |

### Resultado

- Servicos recem-criados aparecem **sempre no topo** de todas as listas
- Pesquisa funciona por: codigo, cliente, aparelho, marca, modelo, numero de serie, avaria, diagnostico, trabalho realizado e **nome do tecnico**
- A pagina Oficina ganha uma barra de pesquisa identica as outras paginas

