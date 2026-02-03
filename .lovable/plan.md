
# Plano: Correções e Melhorias no Sistema de Fichas, Etiquetas e Débitos

## Resumo dos Problemas e Soluções

| Problema | Solução |
|----------|---------|
| 1. Clique no serviço em débito não abre ficha lateral | Adicionar `ServiceDetailSheet` à página de débitos com handler de clique |
| 2. "Ver Ficha" abre página em branco | Verificar/corrigir a query e adicionar fallbacks robustos |
| 3. "Ver Etiqueta" usa modal em vez de página dedicada | Criar página `/print/tag/:serviceId` com tamanho 80mm x 170mm |
| 4. Forçar estado apenas para admin | Verificar role no modal e adicionar aviso de impacto detalhado |
| 5. QR Code da etiqueta precisa mostrar link texto | Adicionar link clicável abaixo do QR Code |
| 6. Todos colaboradores devem acessar ficha/histórico via QR | Confirmar que rota `/service/:serviceId` está acessível a todos |

---

## Ficheiros a Alterar

| Ficheiro | Ação | Descrição |
|----------|------|-----------|
| `src/pages/secretary/SecretaryDebitoPage.tsx` | Alterar | Adicionar `ServiceDetailSheet` e handler de clique nas linhas |
| `src/pages/ServiceTagPage.tsx` | **Criar** | Página dedicada para impressão de etiqueta (80mm x 170mm) |
| `src/App.tsx` | Alterar | Adicionar rota `/print/tag/:serviceId` |
| `src/components/services/ServiceDetailSheet.tsx` | Alterar | Mudar botão "Ver Etiqueta" para abrir página em nova aba |
| `src/components/modals/ForceStateModal.tsx` | Alterar | Adicionar verificação de role e aviso detalhado de impactos |
| `src/pages/ServiceConsultPage.tsx` | Alterar | Adicionar link texto abaixo do QR Code |
| `src/index.css` | Alterar | Adicionar estilos para página de etiqueta dedicada |

---

## Detalhes por Ficheiro

### 1. SecretaryDebitoPage.tsx - Adicionar Ficha de Detalhes

**Problema**: Ao clicar num serviço na página "Em Débito", não abre a ficha lateral como acontece na página Geral.

**Solução**: 
- Importar e adicionar `ServiceDetailSheet`
- Adicionar estado `selectedService` e `showDetailSheet`
- Tornar as linhas da tabela clicáveis

```typescript
// Adicionar imports
import { ServiceDetailSheet } from '@/components/services/ServiceDetailSheet';

// Adicionar estados
const [selectedService, setSelectedService] = useState<Service | null>(null);
const [showDetailSheet, setShowDetailSheet] = useState(false);

// Handler para clique na linha
const handleServiceClick = (service: Service) => {
  setSelectedService(service);
  setShowDetailSheet(true);
};

// Adicionar cursor-pointer e onClick na TableRow
<TableRow 
  key={service.id} 
  className="cursor-pointer hover:bg-muted/50"
  onClick={() => handleServiceClick(service)}
>

// Adicionar ServiceDetailSheet no final
<ServiceDetailSheet
  service={selectedService}
  open={showDetailSheet}
  onOpenChange={setShowDetailSheet}
/>
```

---

### 2. ServiceTagPage.tsx - Nova Página de Etiqueta (80mm x 170mm)

Criar página dedicada similar à `ServicePrintPage.tsx` mas para etiquetas:

**Características**:
- Tamanho físico: **80mm largura x 170mm altura** (17cm)
- Controlos: Voltar, Imprimir, Baixar PDF
- Layout centrado na página
- QR Code aponta para `/service/:serviceId`
- **Link texto visível** abaixo do QR Code para acesso fácil

**Estrutura**:
```text
┌──────────────────────────────────────────────────────────┐
│  [← Voltar]                  [Imprimir]  [Baixar PDF]    │
└──────────────────────────────────────────────────────────┘

        ┌────────────────────────┐
        │  ━━━━━━━━━━━━━━━━━━━━  │  ← Barra azul
        │                        │
        │    [LOGO TECNOFRIO]    │
        │                        │
        │    ┌──────────────┐    │
        │    │   QR CODE    │    │
        │    └──────────────┘    │
        │                        │
        │     TF-00123           │  ← Código grande
        │                        │
        │  Cliente: João Silva   │
        │  Equip: Frigorífico    │
        │  Samsung RT38K         │
        │  Tel: 912 345 678      │
        │                        │
        │  ───────────────────   │
        │  Leia o QR ou aceda:   │
        │  tecnofrio.app/s/abc   │  ← Link curto
        └────────────────────────┘
              80mm x 170mm
```

**Código Principal**:
```typescript
export default function ServiceTagPage() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const tagRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Fetch service with customer
  const { data: service, isLoading, error } = useQuery({
    queryKey: ['service-tag-print', serviceId],
    queryFn: async () => {
      if (!serviceId) throw new Error('ID não fornecido');
      const { data, error } = await supabase
        .from('services')
        .select('*, customer:customers(*)')
        .eq('id', serviceId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!serviceId,
  });

  const qrData = `${window.location.origin}/service/${serviceId}`;
  
  // ... handlers para print e PDF
}
```

---

### 3. App.tsx - Adicionar Rota da Etiqueta

```typescript
// Após a rota /print/service/:serviceId, adicionar:
<Route path="/print/tag/:serviceId" element={
  <ProtectedRoute>
    <ServiceTagPage />
  </ProtectedRoute>
} />
```

---

### 4. ServiceDetailSheet.tsx - Mudar Botão "Ver Etiqueta"

**Antes** (abre modal):
```typescript
<Button variant="outline" size="sm" onClick={() => setShowTagModal(true)}>
  <Tag className="h-4 w-4 mr-1" />
  Ver Etiqueta
</Button>
```

**Depois** (abre página em nova aba):
```typescript
<Button 
  variant="outline" 
  size="sm" 
  onClick={() => window.open(`/print/tag/${service.id}`, '_blank')}
>
  <Tag className="h-4 w-4 mr-1" />
  Ver Etiqueta
</Button>
```

**Também remover**:
- Estado `showTagModal`
- Import do `ServiceTagModal`
- Componente `<ServiceTagModal />` no JSX

---

### 5. ForceStateModal.tsx - Restringir a Admin + Aviso Detalhado

**Adicionar verificação de role**:
```typescript
import { useAuth } from '@/contexts/AuthContext';

const { role } = useAuth();
const isAdmin = role === 'dono';

// Se não for admin, não permitir abrir o modal
if (!isAdmin) {
  return null; // Ou mostrar mensagem de acesso negado
}
```

**Adicionar aviso de impacto detalhado**:
```typescript
// Mapear impactos por transição
const getImpactWarning = (fromStatus: ServiceStatus, toStatus: ServiceStatus) => {
  const warnings: string[] = [];
  
  // Se voltar para estados anteriores
  if (['por_fazer', 'em_execucao'].includes(toStatus) && 
      ['concluidos', 'finalizado'].includes(fromStatus)) {
    warnings.push('O serviço será reaberto e poderá requerer novo agendamento.');
  }
  
  // Se saltar para finalizado
  if (toStatus === 'finalizado') {
    warnings.push('O serviço será marcado como entregue ao cliente.');
    warnings.push('Valores financeiros serão considerados liquidados.');
  }
  
  // Se mudar de/para estados de peça
  if (['para_pedir_peca', 'em_espera_de_peca'].includes(toStatus) ||
      ['para_pedir_peca', 'em_espera_de_peca'].includes(fromStatus)) {
    warnings.push('O fluxo de peças pode ficar inconsistente.');
  }
  
  return warnings;
};
```

**Nova UI com avisos**:
```text
┌────────────────────────────────────────────────────────────┐
│  ⚠️ Forçar Mudança de Estado                               │
│                                                            │
│  TF-00123                                                  │
│  Estado atual: Em Execução                                 │
│                                                            │
│  Novo Estado: [Dropdown]                                   │
│                                                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │ ⚠️ IMPACTOS DESTA MUDANÇA:                         │    │
│  │                                                     │    │
│  │ • O serviço será reaberto e poderá requerer         │    │
│  │   novo agendamento.                                 │    │
│  │ • O técnico verá este serviço novamente na         │    │
│  │   sua agenda.                                       │    │
│  └────────────────────────────────────────────────────┘    │
│                                                            │
│  Esta operação ignora as regras normais de transição e     │
│  pode causar inconsistências nos dados.                    │
│                                                            │
│                        [Cancelar]  [Confirmar Mudança]     │
└────────────────────────────────────────────────────────────┘
```

---

### 6. ServiceConsultPage.tsx - Adicionar Link Texto

Adicionar link clicável abaixo da informação do status para facilitar acesso pelo cliente que não tem QR reader:

```typescript
// Após o card de status, adicionar link
<div className="text-center text-sm text-muted-foreground">
  <p>Link de acesso:</p>
  <a 
    href={window.location.href} 
    className="text-primary underline break-all"
  >
    {window.location.href}
  </a>
</div>
```

---

### 7. index.css - Estilos para Página de Etiqueta

Adicionar estilos específicos para a página dedicada de etiqueta:

```css
/* ========== PRINT TAG PAGE (80mm x 170mm) ========== */
.print-tag-page {
  min-height: 100vh;
  background: hsl(var(--muted));
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.print-tag-page .print-controls {
  position: sticky;
  top: 0;
  z-index: 50;
  background: hsl(var(--card));
  padding: 1rem;
  border-radius: 0.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 1.5rem;
  width: 100%;
  max-width: 300px;
}

.print-tag-page .print-tag-container {
  width: 80mm;
  min-height: 170mm;
  background: white;
  padding: 4mm;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  border-radius: 0.25rem;
  box-sizing: border-box;
}

@media print {
  .print-tag-page {
    background: white !important;
    padding: 0 !important;
  }

  .print-tag-page .print-controls {
    display: none !important;
  }

  .print-tag-page .print-tag-container {
    width: 80mm !important;
    height: 170mm !important;
    box-shadow: none !important;
    margin: 0 !important;
    padding: 4mm !important;
    border-radius: 0 !important;
  }

  @page {
    size: 80mm 170mm;
    margin: 0;
  }
}
```

---

## Verificação de Acesso Universal ao QR Code

A rota `/service/:serviceId` já está dentro do layout protegido mas sem restrição de role específica:

```typescript
// Em App.tsx, linha 154:
<Route path="/service/:serviceId" element={<ServiceConsultPage />} />
```

Isto significa que qualquer utilizador autenticado (dono, secretária, técnico) pode aceder. O `can_access_service` function na base de dados também permite acesso universal para colaboradores.

**Confirmado**: Todos os colaboradores já podem aceder às fichas via QR Code.

---

## Resumo de Alterações

| Ficheiro | Tipo | Descrição |
|----------|------|-----------|
| `src/pages/secretary/SecretaryDebitoPage.tsx` | Alterar | +30 linhas (DetailSheet) |
| `src/pages/ServiceTagPage.tsx` | **Criar** | ~180 linhas |
| `src/App.tsx` | Alterar | +6 linhas (rota) |
| `src/components/services/ServiceDetailSheet.tsx` | Alterar | -10 linhas (remover modal) |
| `src/components/modals/ForceStateModal.tsx` | Alterar | +40 linhas (impactos) |
| `src/pages/ServiceConsultPage.tsx` | Alterar | +10 linhas (link) |
| `src/index.css` | Alterar | +40 linhas (estilos) |

**Total: 7 ficheiros (1 novo, 6 alterados)**

---

## Resultado Esperado

1. **Débitos**: Clique no serviço abre ficha lateral completa
2. **Ficha**: Página dedicada funcional (corrigida se necessário)
3. **Etiqueta**: Página dedicada 80x170mm com impressão profissional
4. **Forçar Estado**: Apenas admin pode usar + avisos de impacto detalhados
5. **QR Code**: Link texto visível para acesso fácil pelo cliente
6. **Acesso Universal**: Confirmado que todos colaboradores acedem via QR
