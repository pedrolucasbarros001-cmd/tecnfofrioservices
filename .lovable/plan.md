
# Plano de Correções — 8 Problemas Identificados

## Visão Geral

| # | Problema | Ficheiros Afetados |
|---|---|---|
| 1 | Cliente não desaparece após eliminação | `ClientesPage.tsx`, `useCustomers.ts` |
| 2 | "Quem fez o quê" em cada secção da ficha | `ServiceDetailSheet.tsx` |
| 3 | Botão X para fechar ficha do histórico do técnico | `TechnicianHistoryPage.tsx`, `TechnicianServiceSheet.tsx` |
| 4 | PDF da ficha com dados censurados | `pdfUtils.ts`, `ServicePrintPage.tsx` |
| 5 | Abreviações na etiqueta → palavras completas | `ServiceTagModal.tsx`, `ServiceTagPage.tsx` |
| 6 | Visita concluída no local → status "concluidos" | `VisitFlowModals.tsx` |
| 7 | Secretaria pode definir preço + nova página Precificar | `SecretarySidebar.tsx`, `ServiceDetailSheet.tsx`, `App.tsx` |
| 8 | Erros de build (TypeScript) | `ServiceDetailSheet.tsx`, `CustomerDetailSheet.tsx` |

---

## 1. Cliente Não Desaparece Após Eliminação

**Causa raiz**: O `ClientesPage` tem dois `<CreateCustomerModal>` renderizados (duplicado — veja linhas 90-95 e 214-219). Além disso, a lista exibida é a `customers` do resultado de `usePaginatedCustomers`, mas o `onUpdate` no `CustomerDetailSheet` está ligado a `deleteCustomer.reset()` em vez de uma re-fetch da query paginada. A deleção executa (o hook invalida `['customers']` e `['customers-paginated']`), mas o componente pode não re-renderizar corretamente por causa do modal duplicado.

**Solução**:
- Remover o `<CreateCustomerModal>` duplicado do topo da lista (linhas 90-95 do `ClientesPage`)
- Corrigir o `onUpdate` do `CustomerDetailSheet` para ser uma função que invalida a query paginada
- No `useDeleteCustomer`, garantir que o `toast` e o `invalidateQueries` são chamados após um pequeno delay (ou usar `await queryClient.refetchQueries`) para forçar re-render

**Ficheiro**: `src/pages/ClientesPage.tsx` — remover duplicado do CreateCustomerModal, corrigir prop `onUpdate`

---

## 2. "Quem Fez o Quê" Acima de Cada Detalhe na Ficha

**Causa**: O `ServiceDetailSheet` já busca `activityLogs` com JOIN ao `profiles` (linha 252-258) e mostra no `ActivityLogItem`. Mas os outros dados (pagamentos, fotos) já têm `receiver.full_name` e `creator.full_name` — estão a ser exibidos mas de forma discreta (texto pequeno abaixo ou acima do item). O problema de build TS (linhas 208 e 224 de `ServiceDetailSheet.tsx`) está relacionado com o JOIN Supabase nos tipos.

**Solução do bug de build**:

As queries que usam `!fkey` com JOIN estão a retornar `SelectQueryError` porque a coluna de foreign key (`received_by` em `service_payments`, `uploaded_by` em `service_photos`) não tem uma relação definida no schema do Supabase com o nome exacto `service_payments_received_by_fkey`.

Corrigir usando cast `as unknown as ...`:
```ts
return data as unknown as (ServicePayment & { receiver: { full_name: string | null } | null })[];
```

**Melhoria visual**: Adicionar um cabeçalho discreto "Por: [Nome]" acima de cada secção de pagamento, foto e assinatura — de forma consistente. O `activityLogs` já mostra o actor. Para outros dados, os nomes já existem mas devem ser posicionados como um "header" antes de cada item para clareza.

**Ficheiro**: `src/components/services/ServiceDetailSheet.tsx`

---

## 3. Botão X para Fechar a Ficha do Histórico do Técnico

**Causa**: O `TechnicianHistoryPage` abre o `TechnicianServiceSheet`. O `TechnicianServiceSheet` é um `Sheet` do Radix que já tem um botão de fechar (o `X` padrão do Radix). Mas o utilizador reporta que não consegue fechar — a imagem mostra que a vista está a abrir num contexto diferente.

**Solução**: O `TechnicianServiceSheet` usa `Sheet` + `SheetContent`, que por padrão tem um `SheetClose` incluído pelo Radix UI. Se não está a aparecer, é porque o `SheetContent` está customizado sem o botão de fechar padrão.

Adicionar explicitamente um botão de fechar no `SheetHeader` do `TechnicianServiceSheet`:
```tsx
<Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
  <X className="h-5 w-5" />
</Button>
```

**Ficheiro**: `src/components/technician/TechnicianServiceSheet.tsx`

---

## 4. PDF da Ficha com Dados Censurados

**Causa**: O `pdfUtils.ts` usa `html2pdf.js` que clona o elemento offscreen. As CSS variables (`hsl(var(--foreground))`, `hsl(var(--primary))`) não resolvem no clone offscreen porque as custom properties CSS só estão definidas no `:root` do documento principal. O clone recebe a estrutura HTML mas não herda os valores computados das variáveis.

**Solução em `pdfUtils.ts`**: Após clonar o elemento e antes de chamar `html2pdf`, iterar todos os descendentes do clone e forçar `color: rgb(0,0,0)` em elementos de texto (exceto os que têm cores de fundo coloridas intencionais). Adicionalmente, forçar `background-color: white` no container root do clone.

```ts
// Após clonar:
const textElements = clone.querySelectorAll('p, span, h1, h2, h3, h4, td, th, div');
textElements.forEach((el) => {
  if (el instanceof HTMLElement) {
    const computed = window.getComputedStyle(el);
    // Se a cor tem var() não resolvido (alpha = 0 ou color computado errado)
    el.style.color = '#000000'; // forçar preto
  }
});
```

Mas a abordagem mais robusta é usar `html2canvas` diretamente (como no `ServiceTagModal`) em vez de `html2pdf.js`:
- `html2canvas` captura os estilos **computados** pelo browser
- Não há problema de CSS variables não resolvidas
- Para A4, usar `jsPDF` com `format: 'a4'`

**Ficheiro**: `src/utils/pdfUtils.ts` — substituir `html2pdf.js` por `html2canvas + jsPDF` para capturar estilos computados reais

---

## 5. Abreviações na Etiqueta → Palavras Completas

**Causa**: As abreviações "Cl:", "Tel:", "Av:" existem na `ServiceTagPage.tsx`. No `ServiceTagModal.tsx` (versão modal), já foram substituídas por palavras completas na última iteração. Mas a `ServiceTagPage` (usada ao imprimir) ainda tem as abreviações antigas.

**Verificação do `ServiceTagModal.tsx`** (já correto):
```ts
{ label: 'Cliente', value: ... }
{ label: 'Telefone', value: ... }
{ label: 'Descrição', value: service.detected_fault || service.fault_description }
```

**Correção na `ServiceTagPage.tsx`**: Substituir abreviações:
- `Cl:` → `Cliente:`
- `Tel:` → `Telefone:`
- `Av:` → `Descrição:`
- Adicionar `Av` → `service.detected_fault || service.fault_description`

**Ficheiro**: `src/pages/ServiceTagPage.tsx`

---

## 6. Visita Concluída no Local → Status "concluidos" + Coexistência Financeira

**Requisito**: Quando o técnico finaliza a reparação no local do cliente e assina, o serviço deve ir para `status: 'concluidos'` (em vez do atual `status: 'a_precificar'`). Mas deve manter `pending_pricing: true` para continuar a aparecer na lista "Precificar". Se já tiver preço definido e dívida pendente, deve coexistir em "Em Débito". O estado `a_precificar` deixa de ser o destino — `concluidos` passa a ser o estado operacional final para reparações no local.

**Causa atual**: Na linha 314-321 do `VisitFlowModals.tsx`:
```ts
await updateService.mutateAsync({
  id: service.id,
  status: "a_precificar",   // ← isto precisa mudar para "concluidos"
  pending_pricing: true,
  ...
});
```

**Solução**: Mudar `status: "a_precificar"` para `status: "concluidos"` ao concluir reparação no local. O campo `pending_pricing: true` garante que aparece na lista "Precificar" do dono/secretária. A coexistência com "Em Débito" já funciona (é calculada em runtime pela lógica `final_price > amount_paid`). A coexistência com "Precificar" já funciona (é `pending_pricing === true`).

**Impacto**: O status operacional `concluidos` indica que o trabalho está feito. As vistas financeiras (`pending_pricing`, `em_debito`) são calculadas dinamicamente e não são afetadas pelo status operacional — estão em coexistência por design.

**Ficheiro**: `src/components/technician/VisitFlowModals.tsx` — linha ~315, mudar `status: "a_precificar"` para `status: "concluidos"`

---

## 7. Secretaria Pode Definir Preço + Nova Página "Precificar"

### 7a — Permissão de Definir Preço para Secretaria

**Causa**: No `ServiceDetailSheet.tsx` linha 877:
```ts
onSetPrice={role === 'dono' ? () => setShowSetPriceModal(true) : undefined}
```
Apenas `dono` tem acesso ao `SetPriceModal`.

**Solução**: Mudar para:
```ts
onSetPrice={(role === 'dono' || role === 'secretaria') ? () => setShowSetPriceModal(true) : undefined}
```

Também verificar o `StateActionButtons` para garantir que o botão "Definir Preço" aparece para secretaria.

### 7b — Nova Página "Precificar" na Sidebar da Secretaria

**Solução**:
1. **Criar** `src/pages/secretary/SecretaryPrecificarPage.tsx` — lista de serviços com `pending_pricing = true`, com colunas: código, cliente, aparelho, estado operacional, data. Ao clicar, abre `ServiceDetailSheet` com opção de definir preço.
2. **Adicionar** à `SecretarySidebar.tsx`: inserir `{ title: 'Precificar', url: '/precificar', icon: DollarSign }` acima de `{ title: 'Em Débito', ... }`
3. **Adicionar rota** em `App.tsx`: `<Route path="/precificar" element={<ProtectedRoute allowedRoles={['dono', 'secretaria']}><SecretaryPrecificarPage /></ProtectedRoute>} />`
4. **Reaproveitar**: A página reutiliza o hook `useServices` com filtro `pending_pricing: true`, mesmo padrão das outras páginas da secretaria.

**Garantia de coexistência**: A definição de preço pela secretaria não muda o `status` operacional — apenas define `final_price`, `labor_cost`, `discount`, e define `pending_pricing: false`. Se o valor pago for menor que o preço definido, o serviço aparece automaticamente em "Em Débito" (calculado em runtime).

---

## 8. Corrigir Erros de Build TypeScript

### Erro 1 e 2 — `SelectQueryError` nos joins de `service_payments` e `service_photos`

O Supabase não consegue resolver a relação pelo nome do fkey explícito. Mudar as queries para:

```ts
// service_payments — sem especificar fkey pelo nome
.select('*, receiver:profiles(full_name)')
```

Mas se houver ambiguidade (múltiplas FK para `profiles`), usar cast para silenciar o erro de TypeScript:
```ts
return data as unknown as (ServicePayment & { receiver: ... })[];
```

### Erro 3 — `CustomerDetailSheet.tsx` linha 427

```ts
onUpdate={() => deleteCustomer.reset()}
```

O tipo esperado é `MouseEventHandler<HTMLButtonElement>` mas `refetch` retorna uma Promise. Trocar para uma função anónima que não retorna nada ou para uma prop tipada corretamente.

**Ficheiro**: `src/components/services/ServiceDetailSheet.tsx` e `src/pages/ClientesPage.tsx`

---

## Ordem de Implementação

1. **Erros de build** — corrigir TypeScript primeiro para garantir compilação (`ServiceDetailSheet.tsx`, `ClientesPage.tsx`)
2. **Cliente não desaparece** — remover modal duplicado em `ClientesPage.tsx`, corrigir prop `onUpdate`
3. **Abreviações na etiqueta** — ajuste simples em `ServiceTagPage.tsx`
4. **X para fechar ficha do técnico** — adicionar botão em `TechnicianServiceSheet.tsx`
5. **Quem fez o quê na ficha** — melhorar layout de "actor" em `ServiceDetailSheet.tsx`
6. **PDF da ficha sem censura** — corrigir `pdfUtils.ts` forçando cores explícitas
7. **Visita concluída → status "concluidos"** — 1 linha em `VisitFlowModals.tsx`
8. **Secretaria define preço + página Precificar** — nova página, sidebar, rota, permissão no `ServiceDetailSheet`
