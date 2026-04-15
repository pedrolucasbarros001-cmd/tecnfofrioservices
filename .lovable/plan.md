

## Plano: Badge "Pagamento Pendente" + Pesquisa por nome no TechQuickServiceModal

Duas funcionalidades independentes.

---

### 1. Badge amarelo "Pagamento Pendente" para serviços pagos mas não confirmados pelo dono

**Lógica**: Quando `amount_paid >= final_price` (sem débito), `final_price > 0`, e `owner_confirmed = false` → mostrar badge amarelo "Pgto. Pendente" (pagamento registado mas dono ainda não confirmou no menu de 3 pontos).

**Alterações:**

**`src/components/shared/ServiceStatusBadge.tsx`**
- Adicionar `owner_confirmed` ao Pick do service na interface
- Adicionar lógica: se `final_price > 0 && amount_paid >= final_price && !owner_confirmed && status !== 'cancelado'` → badge amarelo "Pgto. Pendente"
- Exportar helper `computePendingConfirmation` para uso externo

**`src/pages/GeralPage.tsx`** / **`src/pages/secretary/SecretaryConcluidosPage.tsx`**
- Garantir que `owner_confirmed` é incluído no select dos serviços (já está via `*`)
- Passar o campo ao `ServiceStatusBadge`

**`src/components/services/ServiceDetailSheet.tsx`**
- Passar `owner_confirmed` ao badge

---

### 2. Pesquisa por nome no TechQuickServiceModal (além de telefone)

Actualmente o modal só pesquisa clientes por telefone. O técnico deve poder escrever o nome e ver sugestões.

**Alterações:**

**`src/components/technician/TechQuickServiceModal.tsx`**
- Adicionar state `nameSuggestions: Customer[]` e `lookingUpName: boolean`
- Adicionar `useEffect` debounced no campo `customer_name` (min 3 chars) que faz `.ilike('name', '%term%').limit(5)`
- Quando há resultados, mostrar lista dropdown abaixo do campo nome com os clientes encontrados
- Ao clicar num cliente sugerido: preencher telefone, morada, nome
- Se não houver dados (cliente sem telefone), continuar normalmente — o RPC `technician_create_service` já cria cliente só com nome

---

### Ficheiros alterados
- `src/components/shared/ServiceStatusBadge.tsx`
- `src/components/technician/TechQuickServiceModal.tsx`
- `src/pages/GeralPage.tsx` (minor — garantir prop)
- `src/components/services/ServiceDetailSheet.tsx` (minor — garantir prop)

