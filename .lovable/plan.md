

# Plano: Corrigir Formatação do PDF e Botões de Impressão

## Problemas Identificados

### 1. Assinaturas Ilegíveis no PDF
- A imagem da assinatura está com dimensões muito pequenas: `w-16 h-8` (64x32px)
- A descrição está cortada com `line-clamp-2`
- O layout está comprimido num grid de 2 colunas que não dá espaço suficiente

### 2. Botões "Imprimir" ainda existem
- **ServiceDetailSheet.tsx** (linhas 325-331): Botões "Imprimir Ficha" e "Imprimir Tag"
- **ServiceTagModal.tsx** (linha 160-163): Botão "Imprimir Etiqueta" que ainda usa `window.print()`

## Solução Proposta

### Parte 1: Corrigir Assinaturas na Ficha PDF

**Ficheiro:** `src/components/modals/ServicePrintModal.tsx`

Alterações na secção de assinaturas (linhas 755-773):
- Aumentar tamanho da imagem de `w-16 h-8` para `w-24 h-16` (96x64px)
- Mudar de grid 2 colunas para 1 coluna para dar mais espaço
- Remover `line-clamp-2` para mostrar descrição completa
- Usar layout vertical em vez de horizontal

**Antes:**
```tsx
<div className="grid grid-cols-2 gap-2">
  {signatures.map((sig) => (
    <div className="flex items-center gap-2 p-2 border rounded bg-gray-50">
      <img src={sig.file_url} className="w-16 h-8 object-contain" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-xs truncate">{sig.signer_name}</p>
        <p className="text-xs text-muted-foreground line-clamp-2">...</p>
      </div>
    </div>
  ))}
</div>
```

**Depois:**
```tsx
<div className="space-y-3">
  {signatures.map((sig) => (
    <div className="flex gap-3 p-3 border rounded bg-gray-50">
      <img src={sig.file_url} className="w-24 h-16 object-contain border bg-white" />
      <div className="flex-1">
        <p className="font-medium text-sm">{sig.signer_name}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
        <p className="text-xs text-muted-foreground">{date}</p>
      </div>
    </div>
  ))}
</div>
```

### Parte 2: Actualizar Botões no ServiceDetailSheet

**Ficheiro:** `src/components/services/ServiceDetailSheet.tsx`

Alterações (linhas 325-332):
- Mudar "Imprimir Ficha" para "Ver Ficha" (abre modal com PDF)
- Mudar "Imprimir Tag" para "Ver Etiqueta" (abre modal da etiqueta)
- Manter os ícones actuais (o modal ServicePrintModal já tem botão "Baixar PDF")

```tsx
// Antes:
<Button variant="outline" size="sm" onClick={() => setShowPrintModal(true)}>
  <Printer className="h-4 w-4 mr-1" />
  Imprimir Ficha
</Button>
<Button variant="outline" size="sm" onClick={() => setShowTagModal(true)}>
  <Tag className="h-4 w-4 mr-1" />
  Imprimir Tag
</Button>

// Depois:
<Button variant="outline" size="sm" onClick={() => setShowPrintModal(true)}>
  <FileText className="h-4 w-4 mr-1" />
  Ver Ficha
</Button>
<Button variant="outline" size="sm" onClick={() => setShowTagModal(true)}>
  <Tag className="h-4 w-4 mr-1" />
  Ver Etiqueta
</Button>
```

### Parte 3: Actualizar ServiceTagModal para PDF

**Ficheiro:** `src/components/modals/ServiceTagModal.tsx`

A etiqueta deve também usar PDF em vez de `window.print()`:
- Importar `generatePDF` e `useRef`
- Adicionar ref ao container da etiqueta
- Criar função `handleDownloadPDF`
- Mudar botão "Imprimir Etiqueta" para "Baixar Etiqueta" com ícone Download

```tsx
// Antes:
const handlePrint = () => {
  printServiceTag();
};

<Button onClick={handlePrint}>
  <Printer className="h-4 w-4 mr-2" />
  Imprimir Etiqueta
</Button>

// Depois:
const tagRef = useRef<HTMLDivElement>(null);
const [isGenerating, setIsGenerating] = useState(false);

const handleDownloadPDF = async () => {
  if (!tagRef.current || !service) return;
  setIsGenerating(true);
  try {
    await generatePDF({ 
      element: tagRef.current, 
      filename: `Etiqueta-${service.code}` 
    });
  } finally {
    setIsGenerating(false);
  }
};

<Button onClick={handleDownloadPDF} disabled={isGenerating}>
  {isGenerating ? <Loader2 className="animate-spin" /> : <Download />}
  {isGenerating ? 'A gerar...' : 'Baixar Etiqueta'}
</Button>
```

## Resumo de Ficheiros

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/modals/ServicePrintModal.tsx` | Aumentar tamanho assinaturas, melhorar layout |
| `src/components/services/ServiceDetailSheet.tsx` | Renomear botões para "Ver Ficha" e "Ver Etiqueta" |
| `src/components/modals/ServiceTagModal.tsx` | Substituir window.print() por PDF download |

## Resultado Esperado

1. **PDF da Ficha**: Assinaturas legíveis com tamanho adequado e descrição completa
2. **Botões ServiceDetailSheet**: "Ver Ficha" e "Ver Etiqueta" (abrem modais com opção de baixar)
3. **Modal Etiqueta**: Botão "Baixar Etiqueta" gera PDF `Etiqueta-TF-00005.pdf`

