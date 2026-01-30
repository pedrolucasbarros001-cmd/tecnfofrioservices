
# Plano: PDF Download + QR Code Universal + Remover QR da Ficha

## Objectivos

1. **Adicionar "Baixar PDF"** e remover botão "Imprimir"
2. **Corrigir rota QR Code** para funcionar com qualquer colaborador autenticado
3. **Remover todos os QR Codes** da ficha de serviço (tanto na visualização como no PDF)

## Parte 1: Download PDF

### Ficheiros a Criar

**1. `src/types/html2pdf.d.ts`**
```typescript
declare module 'html2pdf.js' {
  interface Html2PdfOptions {
    margin?: number | number[];
    filename?: string;
    image?: { type?: string; quality?: number };
    html2canvas?: object;
    jsPDF?: { unit?: string; format?: string; orientation?: string };
  }

  interface Html2Pdf {
    set(options: Html2PdfOptions): Html2Pdf;
    from(element: HTMLElement): Html2Pdf;
    save(): Promise<void>;
  }

  export default function html2pdf(): Html2Pdf;
}
```

**2. `src/utils/pdfUtils.ts`**
```typescript
import html2pdf from 'html2pdf.js';

export async function generatePDF({ element, filename }) {
  const options = {
    margin: 10,
    filename: `${filename}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  await html2pdf().set(options).from(element).save();
}
```

### Ficheiros a Modificar

**3. `package.json`** - Adicionar `html2pdf.js`

**4. `src/components/modals/ServicePrintModal.tsx`**
- Substituir `Printer` por `Download` no import
- Adicionar `useRef` e `generatePDF`
- Criar função `handleDownloadPDF`
- Substituir botão "Imprimir" por "Baixar PDF"

## Parte 2: Remover QR Codes da Ficha

Existem **4 locais** com QR Codes no `ServicePrintModal.tsx`:

| Linha | Local | Acção |
|-------|-------|-------|
| 137 | Header desktop (ao lado do código) | Remover |
| 438 | Termos de guarda desktop | Remover |
| 499 | Header móvel (ao lado do código) | Remover |
| 800 | Termos de guarda móvel | Remover |

### Mudanças Específicas

**Linha 133-138** - Header desktop:
```tsx
// Antes:
<div className="flex justify-between items-center mb-3">
  <div>...</div>
  <QRCodeSVG value={qrData} size={60} level="M" />
</div>

// Depois:
<div className="mb-3">
  <div>...</div>
</div>
```

**Linhas 423-441** - Termos desktop:
```tsx
// Antes:
<section style={{ ... }}>
  <div style={{ display: 'flex', gap: '12px' }}>
    <div style={{ flex: 1 }}>...termos...</div>
    <div style={{ flexShrink: 0 }}>
      <QRCodeSVG value={qrData} size={50} level="M" />
    </div>
  </div>
</section>

// Depois:
<section style={{ ... }}>
  <div>...termos (sem flex layout)...</div>
</section>
```

**Linha 492-500** - Header móvel:
```tsx
// Remover QRCodeSVG da estrutura
```

**Linhas 785-802** - Termos móvel:
```tsx
// Remover QRCodeSVG e simplificar layout
```

**Limpeza adicional:**
- Remover import `QRCodeSVG` se não for usado em mais nenhum lugar
- Remover variável `qrData` se não for mais necessária

## Parte 3: Rota QR Code Universal

### Ficheiro a Criar

**5. `src/pages/ServiceConsultPage.tsx`**

Uma página que:
- Recebe o `serviceId` da URL
- Busca os dados do serviço
- Mostra informações da ficha
- Funciona para qualquer utilizador autenticado (dono, secretária, técnico)

### Ficheiros a Modificar

**6. `src/App.tsx`**
- Adicionar rota `/service/:serviceId` sem restrição de role:
```tsx
<Route path="/service/:serviceId" element={
  <ProtectedRoute>
    <ServiceConsultPage />
  </ProtectedRoute>
} />
```

**7. `src/components/modals/ServiceTagModal.tsx`**
- Actualizar URL do QR (linha 31):
```typescript
// De:
const qrData = `${window.location.origin}/technician/service/${service.id}`;

// Para:
const qrData = `${window.location.origin}/service/${service.id}`;
```

## Resumo de Ficheiros

| Ficheiro | Acção |
|----------|-------|
| `package.json` | Adicionar `html2pdf.js` |
| `src/types/html2pdf.d.ts` | **Criar** |
| `src/utils/pdfUtils.ts` | **Criar** |
| `src/pages/ServiceConsultPage.tsx` | **Criar** |
| `src/components/modals/ServicePrintModal.tsx` | Remover QR Codes + Adicionar PDF |
| `src/components/modals/ServiceTagModal.tsx` | Actualizar URL do QR |
| `src/App.tsx` | Adicionar nova rota |

## Resultado Final

- **Ficha de Serviço**: Sem QR Codes, com botão "Baixar PDF"
- **Etiqueta (Tag)**: Mantém QR Code que funciona para qualquer colaborador
- **Rota QR**: `/service/:serviceId` acessível por qualquer utilizador autenticado
