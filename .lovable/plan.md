
# Plano: Corrigir Impressão de Fichas e Etiquetas + Ajustar Tamanho da Etiqueta para 4x6 + Fluxo de Orçamentos

## Resumo dos Problemas e Soluções

| Problema | Causa | Solução |
|----------|-------|---------|
| Preview de impressão em branco (ficha e etiqueta) | CSS na linha 512 esconde conteúdo porque falta exclusão para `.print-tag-page` | Corrigir selector CSS para incluir `:not(:has(.print-tag-page))` |
| Tamanho da etiqueta errado (80x170mm) | Configuração inicial incorreta | Alterar para **4x6 polegadas** (102mm x 152mm) |
| Serviços de orçamento criados como "visita" | Lógica de conversão define `service_type: 'reparacao'` fixo | Alterar para permitir escolha do tipo antes de converter |

---

## Problema 1: CSS de Impressão (CRÍTICO)

### Causa Raiz
No ficheiro `src/index.css`, linha 512:

```css
/* ANTES - PROBLEMA */
body:not(:has(.print-page)) > *:not([data-radix-portal]):not(.print-portal) {
  display: none !important;
}
```

Esta regra esconde TODOS os elementos do `body` excepto portais Radix. O problema é que a página de etiqueta (`.print-tag-page`) **não está excluída** deste selector, então o conteúdo é escondido durante a impressão.

A linha 506 protege o `#root` correctamente com `.print-tag-page`, mas a linha 512 anula isso.

### Correção
Adicionar `:not(:has(.print-tag-page))` ao selector:

```css
/* DEPOIS - CORRIGIDO */
body:not(:has(.print-page)):not(:has(.print-tag-page)) > *:not([data-radix-portal]):not(.print-portal) {
  display: none !important;
}
```

Isto garante que quando existe `.print-tag-page` (ou `.print-page`) no body, o conteúdo NÃO é escondido.

---

## Problema 2: Tamanho da Etiqueta (4x6 polegadas)

### Conversão de Medidas
- **4 polegadas** = 101.6mm ≈ **102mm**
- **6 polegadas** = 152.4mm ≈ **152mm**

### Ficheiros a Alterar

**1. `src/index.css`** - Alterar todas as referências de 80x170mm para 102x152mm:

```css
/* De */
.print-tag-page .print-tag-container {
  width: 80mm !important;
  height: 170mm !important;
  min-height: 170mm !important;
}

/* Para */
.print-tag-page .print-tag-container {
  width: 102mm !important;
  height: 152mm !important;
  min-height: 152mm !important;
}
```

**2. `src/pages/ServiceTagPage.tsx`** - Alterar geração de PDF:

```typescript
// De
await generatePDF({ 
  element: tagRef.current, 
  filename: `Etiqueta-${service.code}`,
  format: [80, 170], // 80mm x 170mm
});

// Para
await generatePDF({ 
  element: tagRef.current, 
  filename: `Etiqueta-${service.code}`,
  format: [102, 152], // 4x6 polegadas (102mm x 152mm)
});
```

**3. `src/utils/printUtils.ts`** - Alterar configuração de @page:

```typescript
// De
tag: '@page { size: 80mm 170mm; margin: 0; }',

// Para
tag: '@page { size: 102mm 152mm; margin: 0; }', // 4x6 polegadas
```

---

## Problema 3: Conversão de Orçamento em Serviço

### Problema Atual
Quando um orçamento é convertido em serviço, o tipo é definido automaticamente como `'reparacao'`:

```typescript
// OrcamentosPage.tsx linha 117 e BudgetDetailPanel.tsx linha 97
service_type: 'reparacao',
```

### Solução
Antes de converter, perguntar ao utilizador qual o tipo de serviço:
- Instalação
- Reparação
- Entrega

Isto pode ser feito com um modal de selecção ou um dialog simples.

### Implementação

**Criar modal `ConvertBudgetModal.tsx`**:

```typescript
// Opções de tipo de serviço
const SERVICE_TYPES = [
  { value: 'instalacao', label: 'Instalação' },
  { value: 'reparacao', label: 'Reparação' },
  { value: 'entrega', label: 'Entrega' },
];
```

**Fluxo**:
1. Utilizador clica em "Converter em Serviço"
2. Abre modal perguntando o tipo
3. Utilizador selecciona (instalação/reparação/entrega)
4. Serviço é criado com o tipo seleccionado
5. Orçamento é marcado como "convertido"

---

## Ficheiros a Alterar

| Ficheiro | Ação | Descrição |
|----------|------|-----------|
| `src/index.css` | Alterar | Corrigir selector linha 512 + tamanho 4x6 |
| `src/pages/ServiceTagPage.tsx` | Alterar | Tamanho PDF 102x152mm |
| `src/utils/printUtils.ts` | Alterar | @page size 102x152mm |
| `src/components/modals/ConvertBudgetModal.tsx` | **Criar** | Modal para seleccionar tipo de serviço |
| `src/pages/OrcamentosPage.tsx` | Alterar | Usar novo modal em vez de confirm() |
| `src/components/shared/BudgetDetailPanel.tsx` | Alterar | Usar novo modal em vez de conversão directa |

---

## Detalhes Técnicos

### CSS Corrigido (index.css linhas 505-515)

```css
/* For modal-based printing: hide React app */
body:not(:has(.print-page)):not(:has(.print-tag-page)) #root {
  display: none !important;
  visibility: hidden !important;
}

/* Esconder todos os elementos do body que não são portais */
/* CRITICAL: Exclude BOTH .print-page AND .print-tag-page */
body:not(:has(.print-page)):not(:has(.print-tag-page)) > *:not([data-radix-portal]):not(.print-portal) {
  display: none !important;
}
```

### Tamanho da Etiqueta 4x6 (CSS)

```css
/* ========== TAG PRINT PAGE (4x6 inches = 102mm x 152mm) ========== */
.print-tag-page .print-tag-container {
  width: 102mm !important;
  height: 152mm !important;
  min-height: 152mm !important;
  /* ... resto igual */
}

/* Na secção .print-tag (modal) também */
.print-tag {
  width: 102mm !important;
  height: 152mm !important;
  /* ... resto igual */
}
```

### ConvertBudgetModal

```text
┌─────────────────────────────────────────────────────────────┐
│  Converter Orçamento em Serviço                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Seleccione o tipo de serviço a criar:                      │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  ○ Instalação                                          │  │
│  │    Montagem de equipamento novo                        │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │  ○ Reparação                                           │  │
│  │    Diagnóstico e reparação de avaria                   │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │  ○ Entrega                                             │  │
│  │    Entrega de equipamento ao cliente                   │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  Local do serviço:                                          │
│  ○ Cliente (Visita)    ○ Oficina                            │
│                                                             │
│                            [Cancelar]  [Criar Serviço]      │
└─────────────────────────────────────────────────────────────┘
```

---

## Resumo de Alterações

| Ficheiro | Tipo | Linhas |
|----------|------|--------|
| `src/index.css` | Alterar | ~15 linhas (selector + tamanhos) |
| `src/pages/ServiceTagPage.tsx` | Alterar | ~5 linhas (dimensões) |
| `src/utils/printUtils.ts` | Alterar | ~2 linhas (@page size) |
| `src/components/modals/ConvertBudgetModal.tsx` | **Criar** | ~150 linhas |
| `src/pages/OrcamentosPage.tsx` | Alterar | ~20 linhas (usar modal) |
| `src/components/shared/BudgetDetailPanel.tsx` | Alterar | ~15 linhas (usar modal) |

**Total: 6 ficheiros (1 novo, 5 alterados)**

---

## Resultado Esperado

1. **Impressão de Fichas**: Preview mostra conteúdo A4 completo
2. **Impressão de Etiquetas**: Preview mostra conteúdo 4x6" (102x152mm)
3. **Conversão de Orçamentos**: Utilizador escolhe tipo (instalação/reparação/entrega) e local (cliente/oficina) antes de converter
4. **Nenhuma página em branco**: CSS corrigido previne este problema permanentemente
