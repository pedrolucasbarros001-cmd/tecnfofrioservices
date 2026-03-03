

## Plano: Mostrar Artigos/Preço Definidos pela Administração nos Fluxos do Técnico

### Contexto

Quando a administração ou secretária define um preço no `SetPriceModal`, os artigos adicionais, descontos e IVA são salvos em `pricing_description` (JSON) na tabela `services`. Atualmente, o técnico não vê esses dados nas suas etapas de registo de artigos nem no resumo. O objectivo é mostrar esses dados como read-only em ambos os fluxos (Visita e Oficina).

### O que mostrar

Quando `service.pricing_description` contém dados JSON válidos com artigos (`items`), desconto (`discount`) e ajuste (`adjustment`):
- **Etapa "registo_artigos"**: Mostrar uma secção read-only "Artigos Definidos pela Administração" acima da tabela editável do técnico (opacity-60, não editável)
- **Etapa "resumo_reparacao"**: Mostrar a mesma secção read-only antes dos artigos do técnico, com subtotal, desconto e IVA administrativos incluídos no cálculo do total final

### Ficheiros afectados

#### 1. `src/components/technician/WorkshopFlowModals.tsx`

- Extrair e parsear `service.pricing_description` no `useEffect` de inicialização
- Guardar num estado `adminPricing` com: `items[]`, `discount`, `adjustment`, `subtotal`
- Na etapa `registo_artigos`: renderizar secção read-only "Artigos Adm." (similar ao bloco de `previousArticles` da visita) acima da tabela editável
- Na etapa `resumo_reparacao`: incluir secção read-only "Artigos Adm." e somar o subtotal administrativo ao cálculo final

#### 2. `src/components/technician/VisitFlowModals.tsx`

- Mesma lógica: parsear `service.pricing_description` e guardar em `adminPricing`
- Na etapa `registo_artigos`: mostrar secção read-only acima da tabela editável
- Na etapa `resumo_reparacao`: incluir no cálculo do total final

#### 3. Lógica de parsing (reutilizável)

Criar uma função utilitária ou inline que parseia `pricing_description`:
```ts
interface AdminPricingData {
  items: { ref: string; desc: string; qty: number; price: number; tax: number }[];
  discount?: { type: 'euro' | 'percent'; value: number };
  adjustment?: number;
  historySubtotal?: number;
}
```

### Regras de exibição

- O técnico vê os artigos administrativos mas **não pode alterar nem apagar**
- Opacity-60, borda tracejada, label "Definido pela Administração"
- Os subtotais administrativos são somados ao total final no resumo
- Se não existir `pricing_description` ou estiver vazio, nada muda — comportamento actual mantido

### Impacto no cálculo

No `resumo_reparacao`, o total final passa a ser:
```
(previousArticlesSubtotal + adminPricingSubtotal + articlesSubtotal - discount + tax)
```

Onde `adminPricingSubtotal` vem dos artigos definidos no `SetPriceModal`.

