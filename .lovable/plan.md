
# Plano: Fotos Estruturadas nas Visitas de Reparação + Acesso a Fotos Anteriores na Oficina

## Resumo

Implementar um fluxo de **fotos obrigatórias e estruturadas** para visitas de reparação, substituindo a foto única atual por um sistema de 3 etapas. Também permitir que técnicos na oficina visualizem as fotos tiradas durante o diagnóstico inicial.

---

## Requisitos do Utilizador

1. **Visitas de Reparação**: Captura estruturada de fotos
   - Fotografia do aparelho (obrigatória)
   - Fotografia da etiqueta do aparelho (obrigatória)
   - Foto do estado do aparelho - amassados, danos etc. (opcional, com opção de anexar mais)

2. **Oficina**: Não precisa de tirar novas fotos
   - Mas o técnico deve poder ver as fotos do diagnóstico anterior

3. **Apenas para serviços de reparação** (`service_type === 'reparacao'`)

---

## Ficheiros a Alterar

| Ficheiro | Ação | Descrição |
|----------|------|-----------|
| `src/types/database.ts` | Alterar | Adicionar novos tipos de foto |
| `src/components/technician/VisitFlowModals.tsx` | Reformular | Substituir passo 'foto' por fluxo multi-etapas |
| `src/components/technician/WorkshopFlowModals.tsx` | Alterar | Adicionar visualização de fotos anteriores |
| `src/components/technician/ServicePreviousSummary.tsx` | Alterar | Mostrar fotos categorizadas por tipo |

---

## Detalhes por Ficheiro

### 1. database.ts - Novos Tipos de Foto

Atualizar o tipo `PhotoType` para incluir as novas categorias:

```typescript
export type PhotoType = 
  | 'visita'           // Genérica (legado)
  | 'aparelho'         // Foto geral do aparelho
  | 'etiqueta'         // Etiqueta/placa do aparelho
  | 'estado'           // Estado físico (amassados, danos)
  | 'oficina'          // Foto tirada na oficina
  | 'entrega' 
  | 'instalacao' 
  | 'antes' 
  | 'depois';
```

### 2. VisitFlowModals.tsx - Novo Fluxo Multi-Fotos

**Estrutura Atual**:
```
resumo → deslocacao → foto → diagnostico → decisao → ...
```

**Nova Estrutura**:
```
resumo → deslocacao → foto_aparelho → foto_etiqueta → foto_estado → diagnostico → decisao → ...
```

**Novos Estados no FormData**:
```typescript
interface VisitFormData {
  // ... existing fields
  photoAparelho: string | null;    // Obrigatório
  photoEtiqueta: string | null;    // Obrigatório
  photosEstado: string[];          // Opcional, pode ter múltiplas
  // Remove: photoFile (obsoleto)
}
```

**Fluxo de Fotos**:

**Passo 3 - Foto do Aparelho** (Obrigatória):
```text
┌────────────────────────────────────────────────────────┐
│  📷 Fotografia do Aparelho                              │
│                                                        │
│  Tire uma foto geral do aparelho                    │
│                                                        │
│  ┌─────────────────────────────────────────┐           │
│  │                                         │           │
│  │         [Área de preview da foto]       │           │
│  │                                         │           │
│  └─────────────────────────────────────────┘           │
│                                                        │
│  [Tirar Foto]                                          │
│                                                        │
│  [← Anterior]                    [Continuar →]         │
│                          (só ativa com foto)           │
└────────────────────────────────────────────────────────┘
```

**Passo 4 - Foto da Etiqueta** (Obrigatória):
```text
┌────────────────────────────────────────────────────────┐
│  🏷️ Fotografia da Etiqueta                             │
│                                                        │
│  Tire uma foto da etiqueta do aparelho           │
│  (número de série, modelo, etc.)                       │
│                                                        │
│  ┌─────────────────────────────────────────┐           │
│  │                                         │           │
│  │         [Área de preview da foto]       │           │
│  │                                         │           │
│  └─────────────────────────────────────────┘           │
│                                                        │
│  [Tirar Foto]                                          │
│                                                        │
│  [← Anterior]                    [Continuar →]         │
│                          (só ativa com foto)           │
└────────────────────────────────────────────────────────┘
```

**Passo 5 - Foto do Estado** (obrigatório):
```text
┌────────────────────────────────────────────────────────┐
│  📋 Estado do Aparelho                                  │
│                                                        │
│  Registe o estado físico do aparelho               │
│  (amassados, riscos, danos visíveis)                  │
│                                                        │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                       │
│  │foto1│ │foto2│ │ + │ │     │                        │
│  └─────┘ └─────┘ └─────┘ └─────┘                       │
│                                                        │
│  [📷 Adicionar Foto]  [📎 Anexar da Galeria]           │
│                                                        │
│  ℹ️ Opcional - pode avançar sem fotos                  │
│                                                        │
│  [← Anterior]                    [Continuar →]         │
└────────────────────────────────────────────────────────┘
```

**Lógica de Salvamento**:
```typescript
// Ao capturar cada foto, salvar imediatamente na BD
const handlePhotoCaptureAparelho = async (imageData: string) => {
  await supabase.from('service_photos').insert({
    service_id: service.id,
    photo_type: 'aparelho',  // Novo tipo
    file_url: imageData,
    description: 'Fotografia do aparelho',
  });
  setFormData(prev => ({ ...prev, photoAparelho: imageData }));
};

const handlePhotoCaptureEtiqueta = async (imageData: string) => {
  await supabase.from('service_photos').insert({
    service_id: service.id,
    photo_type: 'etiqueta',  // Novo tipo
    file_url: imageData,
    description: 'Fotografia da etiqueta do aparelho',
  });
  setFormData(prev => ({ ...prev, photoEtiqueta: imageData }));
};

const handlePhotoCaptureEstado = async (imageData: string) => {
  await supabase.from('service_photos').insert({
    service_id: service.id,
    photo_type: 'estado',  // Novo tipo
    file_url: imageData,
    description: 'Estado do aparelho',
  });
  setFormData(prev => ({ 
    ...prev, 
    photosEstado: [...prev.photosEstado, imageData] 
  }));
};
```

**Atualização de Passos**:
```typescript
type ModalStep = 
  | 'resumo' 
  | 'deslocacao' 
  | 'foto_aparelho'    // Novo
  | 'foto_etiqueta'    // Novo
  | 'foto_estado'      // Novo
  | 'diagnostico' 
  | 'decisao' 
  | 'pecas_usadas' 
  | 'pedir_peca';
```

### 3. WorkshopFlowModals.tsx - Acesso a Fotos Anteriores

No modal de resumo da oficina, adicionar secção para visualizar as fotos tiradas na visita:

```typescript
// Buscar fotos do diagnóstico (visita)
const { data: diagnosisPhotos } = useQuery({
  queryKey: ['service-diagnosis-photos', service.id],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('service_photos')
      .select('*')
      .eq('service_id', service.id)
      .in('photo_type', ['aparelho', 'etiqueta', 'estado', 'visita'])
      .order('uploaded_at', { ascending: true });
    
    if (error) throw error;
    return data;
  },
  enabled: !!service.id,
});
```

**UI no Modal de Resumo**:
```text
┌────────────────────────────────────────────────────────┐
│  🔧 Oficina - TF-00123                                 │
├────────────────────────────────────────────────────────┤
│                                                        │
│  [Resumo do atendimento anterior - já existente]       │
│                                                        │
│  📷 Fotos do Diagnóstico                               │
│  ┌──────────────────────────────────────────────────┐  │
│  │  [Aparelho]  [Etiqueta]  [Estado x2]             │  │
│  │  ┌─────┐     ┌─────┐     ┌─────┐ ┌─────┐         │  │
│  │  │     │     │     │     │     │ │     │         │  │
│  │  │ 📷  │     │ 🏷️  │     │ 📋  │ │ 📋  │         │  │
│  │  │     │     │     │     │     │ │     │         │  │
│  │  └─────┘     └─────┘     └─────┘ └─────┘         │  │
│  │                                                  │  │
│  │  Clique para ampliar                             │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  [Iniciar Reparação]                                   │
└────────────────────────────────────────────────────────┘
```

### 4. ServicePreviousSummary.tsx - Fotos Categorizadas

Atualizar o componente para mostrar fotos agrupadas por tipo:

```typescript
// Agrupar fotos por tipo
const groupedPhotos = photos?.reduce((acc, photo) => {
  const type = photo.photo_type || 'visita';
  if (!acc[type]) acc[type] = [];
  acc[type].push(photo);
  return acc;
}, {} as Record<string, typeof photos>);

// Renderização com labels
const PHOTO_TYPE_LABELS = {
  aparelho: 'Aparelho',
  etiqueta: 'Etiqueta',
  estado: 'Estado',
  visita: 'Visita',
  oficina: 'Oficina',
};
```

---

## Validação por Tipo de Serviço

Este fluxo multi-fotos **só se aplica a serviços de reparação**:

```typescript
// No VisitFlowModals
const isReparacao = service.service_type === 'reparacao';

// Se não for reparação, manter fluxo simples (foto única opcional)
const getStepsForService = () => {
  if (isReparacao) {
    return ['resumo', 'deslocacao', 'foto_aparelho', 'foto_etiqueta', 'foto_estado', 'diagnostico', 'decisao', ...];
  }
  return ['resumo', 'deslocacao', 'foto', 'diagnostico', 'decisao', ...]; // Fluxo original
};
```

---

## Resumo de Alterações

| Ficheiro | Tipo | Descrição |
|----------|------|-----------|
| `src/types/database.ts` | Alterar | +3 tipos de foto |
| `src/components/technician/VisitFlowModals.tsx` | Reformular | Substituir passo único por 3 etapas |
| `src/components/technician/WorkshopFlowModals.tsx` | Alterar | Adicionar galeria de fotos anteriores |
| `src/components/technician/ServicePreviousSummary.tsx` | Alterar | Fotos agrupadas por tipo |

**Total: 4 ficheiros**

---

## Resultado Esperado

1. **Visitas de Reparação**: 3 etapas de foto estruturadas (aparelho, etiqueta, estado)
2. **Oficina**: Técnico visualiza fotos do diagnóstico sem precisar tirar novas
3. **Outros tipos de serviço**: Mantém o fluxo de foto única opcional
4. **Evita duplicação**: Fotos tiradas na visita ficam disponíveis na oficina
