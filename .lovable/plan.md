
# Plano de Correções — Etiqueta, Impressão e Criação de Serviço

## Problemas Identificados e Raiz de Cada Um

### Problema 1 — Etiqueta com dados censurados no PDF

**Causa identificada**: O `ServiceTagModal` tem layout portrait (62mm × 90mm) correto, usa `html2canvas` + `jsPDF` corretamente, e as cores são todas hex fixas (`#000000`, `#2B4F84`). O layout está bem. O problema é que ao renderizar o `ref={tagRef}` (que está dentro do `Dialog`), o `html2canvas` captura o elemento "tal como aparece" — se o Dialog tiver overflow ou clip, o conteúdo pode aparecer cortado ou os elementos com `overflow: hidden` ficam em branco.

**Solução**: Usar o `onclone` callback do `html2canvas` para ajustar o clone antes da captura:
- Remover qualquer `overflow: hidden` do clone
- Garantir que o clone está posicionado fora do viewport com largura/altura explícitas
- Usar `windowWidth` e `windowHeight` para dar contexto correto ao renderizador

### Problema 2 — Brother QL-700 gera múltiplas folhas

**Causa identificada**: O `printServiceTag()` em `printUtils.ts` injeta `@page { size: 62mm 90mm }` (correto), mas quando o utilizador clica "Imprimir" no modal, o `print()` imprime **toda a página**, não apenas a etiqueta. A CSS em `index.css` tem regras para esconder `#root` e mostrar apenas portais Radix, mas o elemento `.print-tag` está dentro do portal do Dialog. O problema é que o Dialog do Radix tem containers adicionais com padding/margin que fazem o conteúdo ultrapassar os 90mm e o driver da impressora divide em múltiplas folhas.

**Solução**:
- Criar um portal de impressão dedicado: quando o utilizador clica "Imprimir", clonar o elemento da etiqueta para um `div.print-portal` fora do Dialog, fazer `window.print()`, e limpar depois
- Ou simplificar: abrir a página dedicada `/print/tag/:id` numa nova aba ao clicar "Imprimir" (essa página tem o CSS de impressão correto e isolado)

**Decisão**: A abordagem mais robusta e simples é mudar o botão "Imprimir" para abrir a `ServiceTagPage` numa nova aba via `window.open('/print/tag/:id', '_blank')`. Esta página já tem o CSS `@page { size: 62mm 90mm }` inline e o conteúdo completamente isolado.

### Problema 3 — "+ Novo Serviço" no perfil de cliente não oferece tipo de serviço

**Causa identificada**: Em `CustomerDetailSheet.tsx` (linha 446), o estado inicial é `step: 'location'` e o formulário vai direto para "Visita ou Oficina" (que são apenas para Reparação). O `service_type` está hardcoded como `'reparacao'` na linha 490. Não existe um step inicial para selecionar Reparação vs. Instalação vs. Entrega.

**Solução**: Adicionar step `'type'` antes do `'location'`:
- Mostrar 3 opções: **Reparação** (icon Wrench), **Instalação** (icon Settings), **Entrega Direta** (icon Package)
- Se **Reparação**: vai para step `'location'` (Visita/Oficina) como hoje
- Se **Instalação** ou **Entrega**: vai direto para `'form'` com `service_type` definido, e adiciona campos de morada (`service_address`, `service_postal_code`, `service_city`) editáveis (não herdados automaticamente do cliente)

O step inicial `setStep('location')` passa a `setStep('type')`.

### Problema 4 — Erro ao criar serviço

**Causas identificadas no código**:
1. `warranty_covered: z.boolean()` está no schema Zod (linha 429) e é renderizado no formulário (linha 688-704), mas **não existe como coluna na tabela `services`**. Está a ser passado implicitamente no objeto dos `values` mas o Supabase ignora colunas desconhecidas... no entanto pode causar erro de tipo.
2. `scheduled_shift: z.enum(['manha', 'tarde', 'noite'])` ainda usa o enum antigo enquanto a aplicação migrou para hora livre (`HH:MM`). Se o valor for vazio ou não corresponder ao enum, causa falha de validação.
3. O `handleSubmit` não exibe o erro real — usa `console.error` mas não mostra toast com a mensagem de erro.
4. O `useCreateService` hook mostra toast genérico "Erro ao criar serviço" sem detalhes.

**Soluções**:
- Remover `warranty_covered` do schema Zod e do payload enviado ao Supabase (usar a lógica existente de `pending_pricing` e `final_price` que já funciona)
- Mudar `scheduled_shift` de `z.enum(['manha', 'tarde', 'noite'])` para `z.string().optional()`
- Substituir o Select de turno por `<Input type="time" />` (consistente com o resto da aplicação)
- Adicionar `toast.error(error instanceof Error ? error.message : 'Erro ao criar serviço')` no catch do `handleSubmit`

---

## Ficheiros a Alterar

| Ficheiro | O que muda |
|---|---|
| `src/components/modals/ServiceTagModal.tsx` | Botão "Imprimir" abre nova aba em `/print/tag/:id`; fix `html2canvas` com `onclone` |
| `src/components/shared/CustomerDetailSheet.tsx` | Adicionar step `'type'` (Reparação / Instalação / Entrega); fix schema Zod; fix `scheduled_shift`; fix payload; add toast de erro |

---

## Detalhe Técnico — Step de Tipo de Serviço

```text
Step 1: 'type'
┌────────────┐  ┌────────────┐  ┌────────────┐
│ Reparação  │  │ Instalação │  │  Entrega   │
│   Wrench   │  │  Settings  │  │  Package   │
└────────────┘  └────────────┘  └────────────┘
      ↓                ↓               ↓
Step 2: 'location'   Step 2: 'form'  Step 2: 'form'
(Visita/Oficina)    (com morada)    (com morada)
      ↓                ↓               ↓
Step 3: 'form'      Criar serviço   Criar serviço
```

Para instalação/entrega, os campos de morada (`service_address`, `service_postal_code`, `service_city`) são editáveis e podem ser pré-preenchidos com os dados do cliente mas modificáveis. O campo `fault_description` muda o label para "Observações" em entregas.

## Detalhe Técnico — Fix do Botão Imprimir na Etiqueta

Mudar de `printServiceTag()` (imprime toda a página com o Dialog aberto) para:

```
window.open(`/print/tag/${service.id}`, '_blank');
```

Isto aproveita a `ServiceTagPage` que já tem o CSS `@page { size: 62mm 90mm }` inline correto, o conteúdo completamente isolado, e funciona com a Brother QL-700.

## Detalhe Técnico — Fix do html2canvas no Modal

Adicionar `onclone` ao `html2canvas`:

```ts
const canvas = await html2canvas(tagRef.current, {
  scale: 4,
  useCORS: true,
  backgroundColor: '#ffffff',
  logging: false,
  onclone: (_doc, el) => {
    el.style.overflow = 'visible';
    el.style.position = 'relative';
  },
});
```

Isto garante que o clone não tem clipping que tornaria o texto invisível.
