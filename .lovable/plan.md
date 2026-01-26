

# Plano: Ajustar Ficha de Impressao para A4 sem Fotos

## Resumo das Alteracoes

1. Remover a seccao de fotos da ficha de impressao
2. Manter assinaturas com descricoes
3. Formatar o documento para caber numa folha A4
4. A etiqueta (ServiceTagModal) permanece inalterada

---

## 1. Remover Seccao de Fotos

**Ficheiro:** `src/components/modals/ServicePrintModal.tsx`

**Remover linhas 423-448:**
```tsx
{/* Service Photos */}
{photos.length > 0 && (
  <>
    <Separator className="my-4" />
    <section className="mb-6">
      <h2 className="...">Evidências Fotográficas</h2>
      ...
    </section>
  </>
)}
```

**Tambem remover:**
- Import do icone `Camera` (linha 4)
- Query `service-photos-print` (linhas 87-100)
- Helper `getPhotoTypeLabel` (linhas 40-51) - ja nao e necessario

---

## 2. Adicionar Estilos CSS para Impressao A4

**Ficheiro:** `src/index.css`

Adicionar media query `@media print` com estilos optimizados para A4:

```css
@media print {
  /* Configurar pagina A4 */
  @page {
    size: A4;
    margin: 10mm;
  }

  /* Esconder elementos que nao devem ser impressos */
  body * {
    visibility: hidden;
  }

  .print-content,
  .print-content * {
    visibility: visible;
  }

  .print-content {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
  }

  /* Ajustar tamanhos de fonte para caber em A4 */
  .print-content {
    font-size: 11px !important;
  }

  .print-content h1 {
    font-size: 16px !important;
  }

  .print-content h2 {
    font-size: 13px !important;
    margin-bottom: 6px !important;
    padding-bottom: 4px !important;
  }

  .print-content section {
    margin-bottom: 8px !important;
  }

  .print-content .separator {
    margin: 6px 0 !important;
  }

  /* Compactar espacamentos */
  .print-content .grid {
    gap: 4px 16px !important;
  }

  /* Evitar quebras de pagina indesejaveis */
  .print-content section {
    break-inside: avoid;
  }

  /* Esconder botoes e header do modal */
  [role="dialog"] > div:first-child,
  .no-print {
    display: none !important;
  }
}
```

---

## 3. Ajustar Estrutura do Modal para Impressao

**Ficheiro:** `src/components/modals/ServicePrintModal.tsx`

### 3.1 Adicionar classe `print-content` ao container principal

**Alterar linha 143:**
```tsx
// De:
<div className="border rounded-lg p-6 bg-white print:border-0 print:p-0">

// Para:
<div className="print-content border rounded-lg p-6 bg-white print:border-0 print:p-0">
```

### 3.2 Reduzir tamanhos para caber em A4

**Ajustar espacamentos e margens:**
- Reduzir `mb-6` para `mb-4` nas seccoes
- Reduzir `my-4` para `my-2` nos separadores
- Usar fonte menor para texto (`text-xs` em vez de `text-sm`)

### 3.3 Compactar seccao de assinaturas

**Alterar layout das assinaturas (linhas 459-477):**
```tsx
<div className="grid grid-cols-2 gap-2">
  {signatures.map((sig) => (
    <div key={sig.id} className="flex items-center gap-2 p-2 border rounded bg-gray-50">
      <img 
        src={sig.file_url} 
        alt="Assinatura" 
        className="w-20 h-10 object-contain border bg-white rounded"
      />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-xs truncate">{sig.signer_name || 'Cliente'}</p>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {getSignatureDescription(sig.signature_type)}
        </p>
        <p className="text-xs text-muted-foreground">
          {format(new Date(sig.signed_at), "dd/MM/yy HH:mm")}
        </p>
      </div>
    </div>
  ))}
</div>
```

### 3.4 Compactar termos de guarda

**Reduzir padding e texto:**
```tsx
<section className="bg-amber-50 border border-amber-200 rounded p-2 text-xs">
  ...
</section>
```

---

## 4. Estrutura Final da Ficha A4

A ficha impressa tera as seguintes seccoes (todas compactadas):

```text
┌─────────────────────────────────────────────────────┐
│ TECNOFRIO              Ficha de Servico            │
│ Codigo: SV-2026-0001   QR [■■]                     │
├─────────────────────────────────────────────────────┤
│ DADOS DO CLIENTE                                    │
│ Nome: ...  NIF: ...  Telefone: ...  Email: ...     │
│ Morada: ...                                         │
├─────────────────────────────────────────────────────┤
│ DETALHES DO SERVICO                                 │
│ Categoria: ...  Tipo: ...  Estado: ...  Prioridade │
├─────────────────────────────────────────────────────┤
│ DETALHES DO EQUIPAMENTO                             │
│ Tipo: ...  Marca: ...  Modelo: ...  Serie: ...     │
│ Avaria: ...                                         │
├─────────────────────────────────────────────────────┤
│ GARANTIA (se aplicavel)                             │
├─────────────────────────────────────────────────────┤
│ TRABALHO REALIZADO (se aplicavel)                   │
├─────────────────────────────────────────────────────┤
│ PECAS UTILIZADAS (tabela compacta)                  │
├─────────────────────────────────────────────────────┤
│ RESUMO FINANCEIRO                                   │
│ Mao de Obra / Pecas / Desconto / TOTAL             │
│ Valor Pago / Em Debito / Falta Pagar               │
├─────────────────────────────────────────────────────┤
│ HISTORICO DE PAGAMENTOS (tabela compacta)           │
├─────────────────────────────────────────────────────┤
│ ASSINATURAS (grid 2 colunas, compacto)              │
│ ┌──────────────────┐ ┌──────────────────┐          │
│ │ [Assin] Nome     │ │ [Assin] Nome     │          │
│ │ Descricao breve  │ │ Descricao breve  │          │
│ └──────────────────┘ └──────────────────┘          │
├─────────────────────────────────────────────────────┤
│ ⚠ IMPORTANTE - Termos de Guarda (30 dias)    [QR] │
├─────────────────────────────────────────────────────┤
│ _____________          _____________               │
│ Assin. Cliente         Assin. Funcionario          │
└─────────────────────────────────────────────────────┘
```

---

## 5. Ficheiros a Modificar

| Ficheiro | Alteracao |
|----------|-----------|
| `src/components/modals/ServicePrintModal.tsx` | Remover seccao de fotos; Adicionar classe `print-content`; Compactar espacamentos |
| `src/index.css` | Adicionar media query `@media print` com estilos A4 |

---

## 6. Seccao Tecnica

### 6.1 Media Query para A4

```css
@media print {
  @page {
    size: A4 portrait;
    margin: 8mm 10mm;
  }

  /* Esconder tudo exceto conteudo de impressao */
  body > *:not(.print-area) {
    display: none !important;
  }

  /* Estilos compactos para A4 */
  .print-content {
    width: 190mm;
    max-height: 277mm;
    font-size: 10px;
    line-height: 1.3;
  }

  .print-content h2 {
    font-size: 12px;
    margin-bottom: 4px;
  }

  .print-content section {
    margin-bottom: 6px;
    page-break-inside: avoid;
  }

  .print-content table {
    font-size: 9px;
  }

  .print-content table th,
  .print-content table td {
    padding: 2px 4px;
  }
}
```

### 6.2 Calculos de Espaco A4

- Dimensoes A4: 210mm x 297mm
- Margens: 10mm (deixa 190mm x 277mm utilizaveis)
- Cabecalho + QR: ~25mm
- Cada seccao: ~20-25mm
- Assinaturas: ~30mm
- Termos: ~25mm

**Total estimado: ~200-250mm** - cabe numa folha A4

---

## 7. Resultado Esperado

1. Ficha de impressao SEM fotos (apenas assinaturas)
2. Documento formatado para A4 que imprime correctamente numa unica pagina
3. Assinaturas mantidas com descricao do proposito
4. Etiqueta (ServiceTagModal) inalterada
5. Espacamentos e fontes optimizados para impressao

