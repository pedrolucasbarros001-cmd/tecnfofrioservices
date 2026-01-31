
# Plano: Página Dedicada para Etiqueta + Acesso Universal via QR Code

## Objectivo

1. Criar página dedicada `/print/tag/:serviceId` para impressão da etiqueta (igual ao que foi feito para a ficha)
2. Garantir que **todos os colaboradores autenticados** podem consultar **qualquer serviço** via QR Code

---

## Problema Actual - Acesso via QR Code

O QR Code das etiquetas aponta para `/service/:serviceId`, que usa a função `can_access_service` para validar acesso. Esta função **só permite técnicos verem serviços que lhes estão atribuídos**.

```sql
-- Actual: Técnico só vê serviços onde technician_id = o dele
EXISTS (
  SELECT 1 FROM public.services s
  JOIN public.technicians t ON s.technician_id = t.id
  WHERE s.id = _service_id 
    AND t.profile_id = public.get_technician_profile_id(_user_id)
)
```

**Resultado**: Se um técnico escanear o QR de um serviço de outro técnico, recebe "Serviço não encontrado".

---

## Solução

### Parte 1: Página Dedicada para Etiqueta

Criar `/print/tag/:serviceId` com a mesma abordagem da ficha:
- Página limpa sem AppLayout
- Botões "Imprimir" e "Baixar PDF"
- Formato 80mm x 170mm para impressão

### Parte 2: Acesso Universal para Colaboradores

Modificar a função `can_access_service` para permitir que **qualquer colaborador autenticado** (dono, secretária ou técnico) possa ver **qualquer serviço**:

```sql
-- Proposta: Qualquer colaborador vê qualquer serviço
SELECT 
  public.is_dono(_user_id) OR 
  public.is_secretaria(_user_id) OR 
  public.is_tecnico(_user_id)  -- Apenas validar que é técnico, não precisa ser atribuído
```

Isto é seguro porque:
- Apenas utilizadores autenticados com role válido acedem
- Os técnicos já trabalham na mesma empresa
- O objectivo do QR Code é permitir consulta rápida de qualquer aparelho na oficina

---

## Ficheiros a Criar/Alterar

### 1. Criar: `src/pages/TagPrintPage.tsx`

Nova página dedicada à impressão da etiqueta:

```
Layout:
┌──────────────────────────────────────────┐
│ [← Voltar]         [Imprimir] [PDF]      │  ← Barra no-print
├──────────────────────────────────────────┤
│                                          │
│     ┌─────────────────────┐              │
│     │   ═════════════     │ ← Separador  │
│     │                     │              │
│     │   [Logo TECNOFRIO]  │              │
│     │                     │              │
│     │   ┌─────────────┐   │              │
│     │   │   QR CODE   │   │              │
│     │   └─────────────┘   │              │
│     │                     │              │
│     │   TF-00XXX          │              │
│     │                     │              │
│     │   Cliente: ...      │              │
│     │   Equipamento: ...  │              │
│     │   Telefone: ...     │              │
│     │                     │              │
│     │   [Texto QR Code]   │              │
│     └─────────────────────┘              │
│                                          │
└──────────────────────────────────────────┘
```

Características:
- Carrega serviço via `serviceId` da URL
- Gera QR Code apontando para `/service/{id}`
- Formato 80mm x 170mm
- CSS específico para impressão

### 2. Actualizar: `src/App.tsx`

Adicionar rota `/print/tag/:serviceId` fora do AppLayout:

```tsx
<Route path="/print/tag/:serviceId" element={
  <ProtectedRoute>
    <TagPrintPage />
  </ProtectedRoute>
} />
```

### 3. Actualizar: `src/components/services/ServiceDetailSheet.tsx`

Alterar botão "Ver Etiqueta" para abrir nova aba:

```tsx
// Antes: abre modal
onClick={() => setShowTagModal(true)}

// Depois: abre nova aba
onClick={() => window.open(`/print/tag/${service.id}`, '_blank')}
```

Remover o `ServiceTagModal` deste componente.

### 4. Actualizar: `src/index.css`

Adicionar estilos para a página da etiqueta:

```css
/* Tag Print Page */
.print-tag-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.print-tag-page .print-tag-sheet {
  width: 80mm;
  min-height: 170mm;
  background: white;
  padding: 4mm;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
}

@media print {
  .print-tag-page {
    background: white;
    padding: 0;
  }
  
  .print-tag-page .print-controls {
    display: none !important;
  }
  
  .print-tag-page .print-tag-sheet {
    width: 80mm;
    min-height: 170mm;
    box-shadow: none;
    margin: 0;
  }
}
```

### 5. Migração SQL: Actualizar `can_access_service`

Modificar a função para permitir qualquer técnico (não apenas o atribuído) ver serviços:

```sql
CREATE OR REPLACE FUNCTION public.can_access_service(_service_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.is_dono(_user_id) OR 
    public.is_secretaria(_user_id) OR 
    public.is_tecnico(_user_id)
$$;
```

**Nota**: Esta alteração permite que qualquer colaborador autenticado consulte qualquer serviço. Isto é necessário para o QR Code funcionar universalmente.

---

## Fluxo do QR Code (Após Alterações)

```
Técnico escaneia QR Code de qualquer serviço
       │
       ▼
   /service/{id}
       │
       ▼ can_access_service verifica:
       │  - É dono? ✓
       │  - É secretária? ✓  
       │  - É técnico? ✓ (qualquer técnico)
       │
       ▼
   ServiceConsultPage
       │
       ▼
   Mostra ficha completa do serviço
```

---

## Ficheiros Afectados

| Ficheiro | Acção | Descrição |
|----------|-------|-----------|
| `src/pages/TagPrintPage.tsx` | **Criar** | Página dedicada para impressão da etiqueta |
| `src/App.tsx` | **Editar** | Adicionar rota `/print/tag/:serviceId` |
| `src/components/services/ServiceDetailSheet.tsx` | **Editar** | Alterar botão para abrir nova aba, remover ServiceTagModal |
| `src/index.css` | **Editar** | Adicionar estilos `.print-tag-page` |
| **Migração SQL** | **Criar** | Actualizar função `can_access_service` |

---

## Resultado Esperado

1. **"Ver Etiqueta"**: Abre nova aba com etiqueta 80x170mm pronta para imprimir
2. **Impressão**: Preview mostra exactamente a etiqueta no tamanho correcto
3. **PDF**: Botão "Baixar PDF" gera etiqueta em PDF
4. **QR Code Universal**: Qualquer técnico pode escanear qualquer etiqueta e ver os detalhes do serviço
5. **Compatibilidade**: Funciona em Safari, Chrome e Firefox

---

## Secção Técnica

### Estrutura do TagPrintPage

```tsx
export default function TagPrintPage() {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  
  const { data: service, isLoading } = useQuery({...});
  
  const handlePrint = () => window.print();
  const handleDownloadPDF = async () => {
    await generatePDF({ 
      element: printRef.current, 
      filename: `Etiqueta-${service.code}`,
      format: [80, 170],
      margin: 0
    });
  };
  
  const qrData = `${window.location.origin}/service/${service.id}`;
  
  return (
    <div className="print-tag-page">
      <div className="print-controls no-print">...</div>
      
      <div ref={printRef} className="print-tag-sheet">
        <Separator className="bg-primary h-1 mb-4" />
        <img src={logo} alt="TECNOFRIO" />
        <QRCodeSVG value={qrData} size={140} level="H" />
        <p className="font-mono font-bold">{service.code}</p>
        <div>
          <p>Cliente: {service.customer?.name}</p>
          <p>Equipamento: {service.appliance_type} {service.brand}</p>
          <p>Telefone: {service.customer?.phone}</p>
        </div>
        <p className="text-xs">Leia o QR Code para ver detalhes...</p>
      </div>
    </div>
  );
}
```

### Justificação da Alteração RLS

A alteração na função `can_access_service` é segura porque:

1. **Autenticação obrigatória**: Apenas utilizadores logados
2. **Roles validados**: Só dono, secretária ou técnico
3. **Mesmo contexto empresarial**: Todos trabalham na mesma oficina
4. **Caso de uso**: Técnicos precisam consultar aparelhos que não lhes estão atribuídos (ex: aparelho na bancada de outro colega)
5. **Sem dados sensíveis expostos**: A ficha de consulta não mostra dados financeiros detalhados que não sejam já visíveis

### Rota da Etiqueta

A rota `/print/tag/:serviceId` fica **fora** do `<Route element={<AppLayout />}>`, garantindo que não há sidebar nem header.
