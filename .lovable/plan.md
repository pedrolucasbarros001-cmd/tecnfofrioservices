

# Importacao de Dados CSV + Paginacao Server-Side

## Contexto

A base de dados esta actualmente vazia (0 clientes, 0 servicos). Os CSVs contem:
- **Clientes.csv**: 3.369 clientes
- **Visitas.csv**: 6.887 servicos

O Supabase tem um limite de 1.000 linhas por query, o que significa que mesmo apos importar tudo, so 1.000 registos seriam vistos sem paginacao server-side.

---

## Parte 1: Importacao dos Dados via Edge Function

### Mapeamento de Campos

**Clientes.csv para tabela `customers`:**

| CSV | customers |
|-----|-----------|
| Empresa | name |
| Contacto Principal | (ignorado - duplica nome) |
| E-mail Principal | email |
| Telefone | phone |
| Grupos | notes |
| Data de Criacao | created_at |
| customer_type | "empresa" se nome contem Lda, Hotel, Restaur, Imobili, Agrupamento, Centro, Junta, Igreja, Paroquial, EPM, GNR etc; senao "particular" |

**Visitas.csv para tabela `services`:**

| CSV | services | Logica |
|-----|----------|--------|
| Visita # | code | VIS-006953 vira TF-06953 (manter numeracao) |
| Assunto | fault_description + appliance_type | Extrair tipo de aparelho do texto (MLR, MLL, Caldeira, Frigorifico, etc) |
| Para | customer_id | Ligar pelo nome ao cliente importado |
| Total | final_price | Converter "1.234,56eur" para numero |
| Data | scheduled_date | |
| Data de Criacao | created_at | |
| Estado | status | Mapeamento abaixo |
| Estado de Pagamento | amount_paid / status | Mapeamento abaixo |

### Mapeamento de Estados (CSV para sistema)

```text
CSV "Estado"         + CSV "Pagamento"           -> status sistema
---------------------------------------------------------------
"Aberta"            + qualquer                   -> por_fazer
"Aceite"            + qualquer                   -> em_execucao
"Oficina"           + qualquer                   -> na_oficina (location=oficina)
"Pendente de Peca"  + qualquer                   -> em_espera_de_peca
"Concluida"         + "Pago"                     -> finalizado (amount_paid = final_price)
"Concluida"         + "Nao Pago"                 -> em_debito
"Concluida"         + "Nao Gerou Pagamento"      -> finalizado (final_price = 0)
"Recusada"          + qualquer                   -> finalizado
```

### Mapeamento de Tipo de Aparelho (extraido do Assunto)

Abreviaturas comuns detectadas no CSV:
- **MLR** = Maquina Lavar Roupa
- **MLL** = Maquina Lavar Loica
- **MSR** = Maquina Secar Roupa
- **AC/ACs** = Ar Condicionado
- Caldeira, Esquentador, Frigorifico, Forno, Placa, Microondas, Arca -- usados directamente

### Implementacao

Criar uma **edge function `import-csv-data`** que:
1. Recebe os dados dos dois CSVs (enviados como JSON ja parseado pelo frontend)
2. Primeiro insere todos os clientes em batch (usando upsert por nome para evitar duplicados)
3. Depois insere todos os servicos, ligando cada um ao customer_id correcto pelo nome
4. Processa em lotes de 500 para evitar timeouts
5. Retorna relatorio com totais importados e erros

Criar uma **pagina de importacao temporaria** ou botao no dashboard que:
1. Le os ficheiros CSV copiados para o projecto
2. Parseia localmente (no browser)
3. Envia para a edge function em lotes

---

## Parte 2: Paginacao Server-Side

### Hook `useCustomers` - Alteracoes

- Adicionar parametros `page` e `pageSize` (default 50)
- Usar `.range(from, to)` do Supabase para paginar
- Fazer query separada com `count: 'exact'` para saber o total de registos
- Retornar `{ data, totalCount, totalPages }`

### Hook `useServices` - Alteracoes

- Mesmo padrao: `page`, `pageSize`, `.range()`
- Count exacto para total
- Manter os filtros existentes (status, location, technicianId)

### Pagina `ClientesPage` - Alteracoes

- Adicionar estado `currentPage`
- Debounce na pesquisa (server-side search via Supabase `.or()`)
- Componente de paginacao no fundo da tabela (Anterior / Proxima / numeros de pagina)
- Badge de contagem mostra "X de Y clientes"

### Pagina `GeralPage` - Alteracoes

- Mesmo padrao de paginacao
- Manter filtros de status existentes
- Paginacao no fundo da tabela

### Pagina `OficinaPage` - Alteracoes

- Mesmo padrao (actualmente carrega todos os servicos com location=oficina)

---

## Detalhes Tecnicos

### Edge Function `import-csv-data`

```text
POST /import-csv-data
Body: { customers: [...], services: [...] }
Auth: Apenas dono

Processo:
1. Validar que o utilizador e "dono"
2. Inserir clientes em batches de 500 (upsert por nome)
3. Buscar mapa nome->id de todos os clientes
4. Processar servicos: mapear estados, extrair aparelho, converter precos
5. Inserir servicos em batches de 500
6. Retornar { customersImported, servicesImported, errors }
```

### Paginacao nos Hooks

A query Supabase mudara de:
```
supabase.from('customers').select('*').order(...)
```
Para:
```
supabase.from('customers').select('*', { count: 'exact' }).order(...).range(from, to)
```

Isto retorna o count total no header sem precisar de query extra.

### Componente de Paginacao

Reutilizar o componente `Pagination` ja existente em `src/components/ui/pagination.tsx`, adaptando-o com logica de paginas (mostra max 5 botoes de pagina com ellipsis).

---

## Sequencia de Implementacao

1. Copiar CSVs para o projecto
2. Criar edge function `import-csv-data` com toda a logica de mapeamento
3. Criar pagina/componente de importacao para disparar o processo
4. Alterar `useCustomers` com paginacao server-side
5. Alterar `useServices` com paginacao server-side
6. Actualizar `ClientesPage` com controlos de paginacao
7. Actualizar `GeralPage` com controlos de paginacao
8. Actualizar `OficinaPage` com controlos de paginacao
9. Testar importacao e paginacao end-to-end

