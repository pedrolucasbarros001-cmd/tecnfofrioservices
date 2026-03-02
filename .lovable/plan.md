

## Plano: Redesign do Modal "Registo de Artigos" + "Resumo da Reparação"

### Layout Proposto

**Modal "Registo de Artigos"** — estilo tabela como na imagem:

```text
┌─────────────────────────────────────────────────────┐
│  Registo de Artigos                      Passo X    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────┬──────────────┬──────┬─────────┐       │
│  │ Artigo   │ Descrição    │ Qtd  │ Valor   │       │
│  ├──────────┼──────────────┼──────┼─────────┤       │
│  │[Referên] │[Descrição  ] │[ 1 ] │[Valor ] │ 🗑    │
│  │          │              │Unid. │         │       │
│  ├──────────┼──────────────┼──────┼─────────┤       │
│  │[Referên] │[Descrição  ] │[ 2 ] │[Valor ] │ 🗑    │
│  │          │              │Unid. │         │       │
│  └──────────┴──────────────┴──────┴─────────┘       │
│                                                     │
│  [+ Adicionar Artigo]                               │
│                                                     │
├─────────────────────────────────────────────────────┤
│  [← Anterior]              [Continuar →]            │
└─────────────────────────────────────────────────────┘
```

- Header de tabela com fundo `bg-muted` e texto `text-muted-foreground` uppercase
- Campos: Referência (textarea compacto), Descrição (textarea compacto), Qtd (number), Valor (number)
- Subtexto "Unidade" abaixo do campo Qtd
- Sem campo "Total" por linha — total aparece **só no Resumo**
- Botão remover (🗑) alinhado à direita de cada linha

**Modal "Resumo da Reparação"** — mantém a estrutura actual mas:
- Lista read-only dos artigos com total por linha
- Subtotal, Desconto (€/%), IVA (dropdown 0/6/13/23%), Total Final
- Sem alterações de lógica

### Ficheiros afectados

1. **`src/components/technician/VisitFlowModals.tsx`** — redesign do bloco `registo_artigos` (linhas 1295-1361): substituir cards individuais por layout de tabela com header+inputs em grid, usar Textarea compacto para Referência e Descrição, remover campo Total por linha.

2. **`src/components/technician/WorkshopFlowModals.tsx`** — mesmo redesign no bloco `registo_artigos` (linhas 787-841): idêntico ao Visit para consistência visual.

### Detalhes de implementação

- Grid `grid-cols-[1fr_1.5fr_80px_100px_40px]` para alinhar colunas com o header
- Referência e Descrição usam `Textarea` com `rows={2}` e `min-h-0 resize-y` para compactação
- Label "Unidade" como `text-xs text-muted-foreground` abaixo do campo Qtd
- Header fixo com `bg-muted/50 rounded-t-lg px-3 py-2` e colunas uppercase `text-xs font-medium`

