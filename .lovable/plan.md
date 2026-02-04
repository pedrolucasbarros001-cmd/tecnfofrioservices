
# Plano: Ajustar Ficha A4 para Caber Tudo numa Única Página

## Problema Identificado

O conteúdo da ficha A4 excede 297mm de altura, causando overflow para uma segunda página. O aviso de 30 dias (secção final) acaba por aparecer isolado numa segunda folha.

**Causas:**
- Espaçamentos (`mb-3`, `my-2`) demasiado generosos
- Assinaturas ocupam muito espaço vertical (`w-32 h-20` = 80px de altura cada)
- Separadores (`<Separator>`) adicionam altura extra
- Tamanhos de fonte em alguns títulos (`text-sm`) podem ser reduzidos

---

## Estratégia de Solução

### Abordagem: Layout Compacto para A4

Vou reduzir espaçamentos e tamanhos para que todo o conteúdo caiba em ~277mm de altura útil (297mm - 2×10mm de padding).

| Elemento | Antes | Depois |
|----------|-------|--------|
| Margem entre secções | `mb-3` (12px) | `mb-2` (8px) |
| Separadores | `my-2` (8px cada) | `my-1` (4px cada) |
| Padding de secções | `p-2`, `p-3` | `p-1.5` |
| Assinaturas (imagem) | `w-32 h-20` (128×80px) | `w-24 h-16` (96×64px) |
| Assinaturas (container) | `gap-4 p-3` | `gap-2 p-2` |
| Títulos secção | `text-sm` | `text-xs font-semibold` |
| Espaço pós-header | `mb-2` | `mb-1.5` |

---

## Alterações no Ficheiro

### `src/pages/ServicePrintPage.tsx`

**1. Header (linhas 262-288)**
- Reduzir `mb-2` → `mb-1.5` no header
- Reduzir padding do contact info `py-1.5` → `py-1`

**2. Todas as secções (linhas 298-575)**
- Alterar `mb-3` → `mb-2` em todas as `<section>`
- Alterar `my-2` → `my-1` em todos os `<Separator>`
- Alterar títulos `text-sm` → `text-xs` (mantendo `font-semibold`)

**3. Secção de Assinaturas (linhas 543-573)**
- Reduzir container: `gap-4 p-3` → `gap-2 p-1.5`
- Reduzir imagem: `w-32 h-20` → `w-24 h-14`
- Reduzir espaçamento: `space-y-3` → `space-y-2`

**4. Secção Termos/30 dias (linhas 578-589)**
- Reduzir padding: `p-2` → `p-1.5`
- Já está `text-xs`, manter

**5. Garantia (linhas 399-416)**
- Reduzir padding: `p-2` → `p-1.5`

---

## Resumo das Alterações

```text
Ficheiro: src/pages/ServicePrintPage.tsx

┌─────────────────────────────────────────────────────────────┐
│  ANTES                           │  DEPOIS                  │
├─────────────────────────────────────────────────────────────┤
│  mb-3 (todas secções)            │  mb-2                    │
│  my-2 (separadores)              │  my-1                    │
│  text-sm (títulos secção)        │  text-xs font-semibold   │
│  gap-4 p-3 (assinaturas)         │  gap-2 p-1.5             │
│  w-32 h-20 (imagem assinatura)   │  w-24 h-14               │
│  space-y-3 (lista assinaturas)   │  space-y-2               │
│  py-1.5 (contact info)           │  py-1                    │
│  p-2 (garantia, termos)          │  p-1.5                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Impacto Visual

- A ficha mantém a mesma estrutura e legibilidade
- Todo o conteúdo (incluindo assinaturas e aviso de 30 dias) cabe numa única página A4
- O aspecto profissional é preservado (apenas mais compacto)
- Funciona tanto para impressão directa quanto para PDF

---

## Ficheiros a Alterar

| Ficheiro | Acção | Descrição |
|----------|-------|-----------|
| `src/pages/ServicePrintPage.tsx` | Alterar | Reduzir espaçamentos e tamanhos para layout compacto |

---

## Resultado Esperado

1. ✅ Ficha A4 com TODO o conteúdo numa única página
2. ✅ Aviso de 30 dias visível na mesma página (não em página separada)
3. ✅ Assinaturas legíveis mas mais compactas
4. ✅ PDF gerado também com página única
5. ✅ Impressão directa sem segunda página em branco
