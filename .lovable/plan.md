

# Plano: Modal A4 para Impressão de Ficha de Serviço

## Problema Identificado

O modal actual (`sm:max-w-[700px]`) não corresponde às proporções A4. Quando se imprime:
- O browser tenta ajustar o conteúdo às dimensões da página
- O CSS `@media print` com Portal pode não funcionar consistentemente
- O preview no ecrã não corresponde ao resultado impresso

## Solução Proposta

Criar um modal com **dimensões exactas de A4** (210mm × 297mm), de forma que:
1. O utilizador vê exactamente o que vai ser impresso
2. O browser imprime o conteúdo 1:1
3. Não há surpresas no preview de impressão

## Alterações Necessárias

### 1. Modificar ServicePrintModal.tsx

**Alteração no DialogContent (linha ~455):**

De:
```typescript
<DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
```

Para:
```typescript
<DialogContent className="print-modal-a4 w-[210mm] h-[297mm] max-w-[210mm] max-h-[297mm] overflow-hidden p-0">
```

O conteúdo interno ficará com scroll se necessário, mas ao imprimir ocupará a página A4 completa.

### 2. Actualizar index.css

Adicionar estilos específicos para o modal de impressão A4:

```css
/* Modal A4 para impressão */
.print-modal-a4 {
  width: 210mm !important;
  max-width: 210mm !important;
  height: 297mm !important;
  max-height: 297mm !important;
  padding: 0 !important;
  overflow: hidden !important;
}

/* Conteúdo com scroll no ecrã, mas completo na impressão */
.print-modal-a4 .print-sheet {
  width: 210mm;
  min-height: 297mm;
  padding: 10mm;
  background: white;
  overflow-y: auto;
  max-height: 297mm;
}

@media print {
  /* Esconder tudo excepto o modal A4 */
  body > *:not([role="dialog"]) {
    display: none !important;
  }
  
  /* Modal ocupa toda a página */
  .print-modal-a4 {
    position: fixed !important;
    inset: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    height: 100% !important;
    max-height: 100% !important;
    margin: 0 !important;
    border: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    transform: none !important;
    left: 0 !important;
    top: 0 !important;
  }
  
  /* Esconder overlay e botões do dialog */
  [data-radix-dialog-overlay] {
    display: none !important;
  }
  
  .print-modal-a4 .no-print {
    display: none !important;
  }
  
  /* Conteúdo sem scroll na impressão */
  .print-modal-a4 .print-sheet {
    overflow: visible !important;
    max-height: none !important;
    height: auto !important;
  }
}
```

### 3. Estrutura do Modal Actualizada

```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="print-modal-a4">
    {/* Header com botões - escondido na impressão */}
    <div className="no-print flex items-center justify-between p-3 border-b bg-muted/30">
      <h2 className="font-semibold">Pré-visualização da Ficha</h2>
      <div className="flex gap-2">
        <Button onClick={handlePrint} size="sm">
          <Printer className="h-4 w-4 mr-2" />
          Imprimir
        </Button>
        <DialogClose asChild>
          <Button variant="ghost" size="icon">
            <X className="h-4 w-4" />
          </Button>
        </DialogClose>
      </div>
    </div>
    
    {/* Conteúdo A4 - isto é o que será impresso */}
    <div className="print-sheet">
      {/* Watermark, Header, Dados do Cliente, etc... */}
      {/* Todo o conteúdo existente */}
    </div>
  </DialogContent>
</Dialog>
```

### 4. Remover Portal

O `createPortal` no final do componente já não será necessário:

```tsx
// REMOVER esta linha (808):
{open && createPortal(<PrintContent />, document.body)}
```

## Fluxo Visual

```text
┌─────────────────────────────────────────────────────────────┐
│                    MODAL A4 (210mm × 297mm)                 │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Pré-visualização da Ficha              [Imprimir] [X]  │ │ ← Escondido na impressão
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                                                         │ │
│ │  TECNOFRIO Logo              FICHA DE SERVIÇO           │ │
│ │                                                         │ │
│ │  Código: TF-00001                        [QR]           │ │
│ │  Data: 30/01/2026                                       │ │
│ │                                                         │ │
│ │  ─────────────────────────────────────────────────────  │ │
│ │  DADOS DO CLIENTE                                       │ │
│ │  Nome: João Silva         NIF: 123456789                │ │
│ │  ...                                                    │ │
│ │                                                         │ │
│ │  ─────────────────────────────────────────────────────  │ │
│ │  DETALHES DO SERVIÇO                                    │ │
│ │  ...                                                    │ │
│ │                                                         │ │
│ │  ─────────────────────────────────────────────────────  │ │
│ │  TERMOS DE GUARDA                                       │ │
│ │  Os equipamentos só podem permanecer...                 │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                        Ctrl+P / Imprimir
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     IMPRESSÃO A4                            │
│                                                             │
│  O conteúdo é impresso exactamente como mostrado no modal   │
│  sem header de botões, ocupando a página inteira            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/modals/ServicePrintModal.tsx` | Reestruturar com classes A4, remover Portal |
| `src/index.css` | Adicionar estilos `.print-modal-a4` |

## Benefícios

1. **WYSIWYG**: O utilizador vê exactamente o que vai ser impresso
2. **Simplicidade**: Sem Portal, sem duplicação de conteúdo
3. **Fiabilidade**: Funciona em todos os browsers
4. **Manutenção**: Um único lugar para o conteúdo da ficha

## Considerações

- O modal será bastante grande no ecrã (A4), mas isso é intencional para mostrar exactamente o resultado
- Em ecrãs pequenos, o modal pode precisar de scroll horizontal (mas isso é aceitável dado o caso de uso)
- O botão X do Radix Dialog será escondido na impressão junto com o header

