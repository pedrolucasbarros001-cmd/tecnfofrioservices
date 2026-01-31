
# Plano: Página Dedicada para Impressão da Ficha

## Solução Proposta

Criar uma **rota pública** `/print/service/:serviceId` que abre numa nova aba com o conteúdo da ficha formatado para A4, pronto para impressão. Sem sidebar, sem header, sem modal - apenas a ficha limpa.

---

## Como Vai Funcionar

1. Utilizador clica em **"Ver Ficha"** → Abre nova aba com `/print/service/{id}`
2. A nova página carrega a ficha em formato A4, optimizada para impressão
3. Utilizador pode usar `Cmd+P` / `Ctrl+P` para imprimir directamente
4. Opção de "Baixar PDF" também disponível na página

---

## Ficheiros a Criar/Alterar

### 1. Nova Página: `src/pages/ServicePrintPage.tsx`

Página dedicada à impressão que:
- Não usa `AppLayout` (sem sidebar, sem header)
- Carrega os dados do serviço via `serviceId` da URL
- Renderiza a ficha A4 em tamanho real
- Inclui botões flutuantes no topo: "Imprimir" e "Baixar PDF"
- CSS específico para esconder os botões na hora de imprimir

```
/print/service/:serviceId → ServicePrintPage

Layout da Página:
┌──────────────────────────────────────────┐
│ [← Voltar]         [Imprimir] [PDF]      │  ← Barra no-print
├──────────────────────────────────────────┤
│                                          │
│     ┌────────────────────────────┐       │
│     │                            │       │
│     │     FICHA DE SERVIÇO       │       │
│     │        (formato A4)        │       │
│     │                            │       │
│     │     [todo o conteúdo]      │       │
│     │                            │       │
│     └────────────────────────────┘       │
│                                          │
└──────────────────────────────────────────┘
```

### 2. Actualizar: `src/App.tsx`

Adicionar nova rota **fora do `AppLayout`** (como TVMonitorPage):

```tsx
{/* Public print routes - no layout */}
<Route path="/print/service/:serviceId" element={
  <ProtectedRoute>
    <ServicePrintPage />
  </ProtectedRoute>
} />
```

### 3. Actualizar: `src/components/services/ServiceDetailSheet.tsx`

Alterar o botão "Ver Ficha" para abrir numa nova aba:

```tsx
// Antes: abre modal
onClick={() => setShowPrintModal(true)}

// Depois: abre nova aba
onClick={() => window.open(`/print/service/${service.id}`, '_blank')}
```

Remover o `ServicePrintModal` deste componente (já não é necessário).

### 4. Actualizar: `src/index.css`

Adicionar regras CSS específicas para a página de impressão:

```css
/* ========== PRINT PAGE STYLES ========== */
.print-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.print-page .print-controls {
  position: sticky;
  top: 0;
  z-index: 50;
  background: white;
  padding: 1rem;
  border-radius: 0.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 1.5rem;
  width: 100%;
  max-width: 210mm;
}

.print-page .print-sheet {
  width: 210mm;
  min-height: 297mm;
  background: white;
  padding: 10mm;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
}

@media print {
  .print-page {
    background: white;
    padding: 0;
  }
  
  .print-page .print-controls {
    display: none !important;
  }
  
  .print-page .print-sheet {
    width: 100%;
    min-height: auto;
    box-shadow: none;
    margin: 0;
    padding: 10mm;
  }
}
```

---

## Conteúdo da Página de Impressão

Reutilizar o mesmo layout da ficha que já existe no `ServicePrintModal`, mas agora como componente standalone:

- Logo Tecnofrio
- Código do serviço e data
- Dados do cliente
- Detalhes do serviço
- Detalhes do equipamento
- Diagnóstico (se houver)
- Trabalho realizado (se houver)
- Peças utilizadas (se houver)
- Histórico de pagamentos (se houver)
- Assinaturas (se houver)
- Termos e condições
- Watermark

---

## Fluxo do Utilizador

```
ServiceDetailSheet
       │
       ▼ clica "Ver Ficha"
       │
   window.open('/print/service/{id}', '_blank')
       │
       ▼
┌─────────────────────────────────┐
│   Nova Aba - ServicePrintPage   │
│                                 │
│   [← Voltar] [Imprimir] [PDF]   │
│                                 │
│   ┌─────────────────────────┐   │
│   │    FICHA DE SERVIÇO     │   │
│   │      (A4 completo)      │   │
│   └─────────────────────────┘   │
│                                 │
└─────────────────────────────────┘
       │
       ▼ clica "Imprimir"
       │
   window.print() → Preview correcto!
```

---

## Vantagens desta Abordagem

1. **Sem interferência de overlays**: Não há modal, não há overlay Radix
2. **Página limpa**: Só existe a ficha, nada mais para esconder
3. **Print nativo funciona**: `Cmd+P` mostra exactamente o que está no ecrã
4. **Compatível com todos os browsers**: Safari, Chrome, Firefox
5. **Mantém PDF**: O botão "Baixar PDF" continua disponível
6. **UX familiar**: Semelhante a como outras plataformas fazem (ex: facturas)

---

## Ficheiros Afectados

| Ficheiro | Acção |
|----------|-------|
| `src/pages/ServicePrintPage.tsx` | **Criar** - Nova página dedicada |
| `src/App.tsx` | **Editar** - Adicionar rota `/print/service/:serviceId` |
| `src/components/services/ServiceDetailSheet.tsx` | **Editar** - Alterar botão para abrir nova aba |
| `src/index.css` | **Editar** - Adicionar estilos `.print-page` |

---

## Resultado Esperado

1. **Ver Ficha**: Abre nova aba com ficha A4 pronta para imprimir
2. **Imprimir**: Preview mostra exactamente 1 página A4 (ou mais se necessário)
3. **PDF**: Continua a funcionar via botão na página
4. **Sem bugs Safari**: A página limpa não tem overlays nem modais

---

## Secção Técnica

### Estrutura do Componente ServicePrintPage

```tsx
export default function ServicePrintPage() {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  
  // Fetch service data
  const { data: service, isLoading } = useQuery({...});
  const { data: parts } = useQuery({...});
  const { data: payments } = useQuery({...});
  const { data: signatures } = useQuery({...});
  
  const handlePrint = () => window.print();
  const handleDownloadPDF = async () => {...};
  
  if (isLoading) return <Loading />;
  
  return (
    <div className="print-page">
      {/* Controls - hidden in print */}
      <div className="print-controls no-print">
        <Button onClick={() => navigate(-1)}>← Voltar</Button>
        <Button onClick={handlePrint}>Imprimir</Button>
        <Button onClick={handleDownloadPDF}>Baixar PDF</Button>
      </div>
      
      {/* A4 Sheet - this is what prints */}
      <div ref={printRef} className="print-sheet">
        {/* Full service sheet content */}
      </div>
    </div>
  );
}
```

### Rota sem Layout

A rota `/print/service/:serviceId` fica **fora** do `<Route element={<AppLayout />}>`, assim como a rota `/tv-monitor`. Isto garante que não há sidebar nem header.
