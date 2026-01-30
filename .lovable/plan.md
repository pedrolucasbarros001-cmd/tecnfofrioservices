
# Plano: Corrigir Scroll e Visibilidade dos Botões no Modal A4

## Problema Identificado

O modal A4 actual tem:
1. `overflow: hidden` no container principal - corta o conteúdo
2. O header com botões fica dentro do modal com altura fixa, mas pode ficar invisível
3. A estrutura não permite scroll adequado do conteúdo enquanto mantém os botões visíveis

## Solução

Reestruturar o CSS para:
1. O modal ter `overflow: visible` para os filhos
2. Usar `flex` para separar o header (fixo) do conteúdo (scroll)
3. O header com botões fica sempre visível no topo
4. O conteúdo da ficha (print-sheet) tem scroll próprio

## Alterações

### 1. Actualizar index.css

**De:**
```css
.print-modal-a4 {
  width: 210mm !important;
  max-width: 210mm !important;
  height: 297mm !important;
  max-height: 297mm !important;
  padding: 0 !important;
  overflow: hidden !important;
  border-radius: 8px !important;
}

.print-modal-a4 .print-sheet {
  width: 100%;
  height: calc(297mm - 50px);
  padding: 10mm;
  background: white;
  overflow-y: auto;
  box-sizing: border-box;
}
```

**Para:**
```css
.print-modal-a4 {
  width: 210mm !important;
  max-width: 210mm !important;
  height: 297mm !important;
  max-height: 90vh !important; /* Limitar à altura do viewport */
  padding: 0 !important;
  overflow: hidden !important;
  border-radius: 8px !important;
  display: flex !important;
  flex-direction: column !important;
}

.print-modal-a4 .print-sheet {
  flex: 1;
  width: 100%;
  padding: 10mm;
  background: white;
  overflow-y: auto;
  box-sizing: border-box;
}
```

A chave é:
- `display: flex` + `flex-direction: column` no modal
- O header (`.no-print`) fica com altura automática
- O conteúdo (`.print-sheet`) usa `flex: 1` para ocupar o resto e ter scroll

### 2. Garantir estrutura correcta no ServicePrintModal.tsx

O componente já tem a estrutura correcta:
```tsx
<DialogContent className="print-modal-a4">
  {/* Header - fica fixo no topo */}
  <div className="no-print flex items-center justify-between p-3 border-b bg-muted/30">
    ...botões...
  </div>
  
  {/* Conteúdo - tem scroll */}
  <div className="print-sheet relative bg-white">
    ...ficha...
  </div>
</DialogContent>
```

Apenas precisa de garantir que o header não seja afectado pelo `overflow: hidden`.

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/index.css` | Ajustar `.print-modal-a4` para usar flexbox e limitar altura ao viewport |

## Resultado Esperado

```text
┌─────────────────────────────────────────────────────────────┐
│ Pré-visualização da Ficha    [Imprimir] [X] ← SEMPRE VISÍVEL│
├─────────────────────────────────────────────────────────────┤
│                                                   ▲         │
│  TECNOFRIO Logo              FICHA DE SERVIÇO     │         │
│                                                   │ SCROLL  │
│  Código: TF-00001                        [QR]     │         │
│  Data: 30/01/2026                                 │         │
│                                                   │         │
│  ─────────────────────────────────────────────    │         │
│  DADOS DO CLIENTE                                 │         │
│  ...                                              │         │
│                                                   │         │
│  ─────────────────────────────────────────────    │         │
│  DETALHES DO SERVIÇO                              │         │
│  ...                                              │         │
│                                                   │         │
│  ─────────────────────────────────────────────    │         │
│  TERMOS DE GUARDA                                 ▼         │
└─────────────────────────────────────────────────────────────┘
```

## Detalhes Técnicos

A utilização de `max-height: 90vh` garante que o modal nunca é maior que 90% da altura do ecrã, permitindo que o utilizador veja sempre os botões e possa fazer scroll no conteúdo. O `flex: 1` no `.print-sheet` faz com que este elemento preencha todo o espaço restante após o header.

Na impressão, os estilos `@media print` já removem estas limitações para que o conteúdo completo seja impresso.
