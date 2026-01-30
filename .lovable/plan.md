

# Plano: Corrigir Assinaturas no PDF e Adicionar à Página de Consulta

## Problemas Identificados

### 1. Assinatura no PDF com texto cortado
Olhando para o PDF gerado, vejo que:
- A descrição da assinatura está cortada ("para reparação em oficina" fica "para reparação em ofici...")  
- Isto acontece porque o texto está a ser truncado devido ao espaço limitado

### 2. Tamanho da assinatura pequeno
- A assinatura está visível mas muito comprimida (96x64px)
- Deveria ser maior para ser legível

### 3. Página de Consulta sem assinaturas
- A `ServiceConsultPage` (acessada via QR Code) não busca nem exibe assinaturas
- O utilizador quer ver as assinaturas tanto na ficha para baixar quanto na ficha de consulta

## Solucao Proposta

### Parte 1: Melhorar Assinaturas no ServicePrintModal

**Ficheiro:** `src/components/modals/ServicePrintModal.tsx`

Alteracoes nas linhas 406-424 (PrintContent) e 754-773 (versao desktop):

1. **Aumentar tamanho da imagem** de 96x64px para 120x80px
2. **Garantir que a descricao nao corta** - usar `white-space: normal` e `word-break: break-word`
3. **Melhorar espacamento** para acomodar o texto completo

**Codigo actual (linhas 408-423):**
```tsx
<div style={{ display: 'flex', gap: '12px', padding: '12px', ... }}>
  <img style={{ width: '96px', height: '64px', ... }} />
  <div style={{ flex: 1 }}>
    <p style={{ fontSize: '11px', ... }}>
      {getSignatureDescription(sig.signature_type)}
    </p>
  </div>
</div>
```

**Codigo corrigido:**
```tsx
<div style={{ display: 'flex', gap: '16px', padding: '12px', ... }}>
  <img style={{ width: '120px', height: '80px', ... }} />
  <div style={{ flex: 1, minWidth: 0 }}>
    <p style={{ fontSize: '11px', lineHeight: '1.4', wordBreak: 'break-word' }}>
      {getSignatureDescription(sig.signature_type)}
    </p>
  </div>
</div>
```

**Mesma alteracao para a versao desktop (linhas 756-772):**
- Mudar classe de `w-24 h-16` para `w-32 h-20` (128x80px)
- Adicionar `break-words` ao paragrafo da descricao

### Parte 2: Adicionar Assinaturas a ServiceConsultPage

**Ficheiro:** `src/pages/ServiceConsultPage.tsx`

Esta pagina e acessada quando alguem escaneia o QR Code. Actualmente nao mostra assinaturas.

**Alteracoes necessarias:**

1. Adicionar query para buscar assinaturas (similar ao ServicePrintModal)
2. Adicionar query para buscar fotos
3. Adicionar seccao visual para exibir assinaturas
4. Adicionar import do icone PenTool

**Novo codigo a adicionar:**

```tsx
// Importar
import { PenTool } from 'lucide-react';
import type { ServiceSignature, ServicePhoto } from '@/types/database';

// Helper para descricao de assinatura
const getSignatureDescription = (type: string | null): string => {
  switch (type) {
    case 'recolha': return 'Autorizacao de levantamento do aparelho';
    case 'entrega': return 'Confirmacao da entrega do aparelho';
    case 'visita': return 'Confirmacao da execucao do servico no local';
    case 'pedido_peca': return 'Autorizacao para encomenda de peca';
    default: return 'Assinatura do cliente';
  }
};

// Query para buscar assinaturas
const { data: signatures = [] } = useQuery({
  queryKey: ['service-consult-signatures', serviceId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('service_signatures')
      .select('*')
      .eq('service_id', serviceId)
      .order('signed_at', { ascending: true });
    if (error) throw error;
    return data as ServiceSignature[];
  },
  enabled: !!serviceId,
});

// Card de Assinaturas (adicionar apos o Card de Valor)
{signatures.length > 0 && (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm flex items-center gap-2">
        <PenTool className="h-4 w-4" />
        Assinaturas Recolhidas
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      {signatures.map((sig) => (
        <div key={sig.id} className="flex gap-3 p-3 border rounded-lg bg-muted/30">
          <img 
            src={sig.file_url} 
            alt="Assinatura" 
            className="w-28 h-20 object-contain border bg-white rounded"
          />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{sig.signer_name || 'Cliente'}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {getSignatureDescription(sig.signature_type)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(sig.signed_at), "dd/MM/yyyy 'as' HH:mm", { locale: pt })}
            </p>
          </div>
        </div>
      ))}
    </CardContent>
  </Card>
)}
```

## Resumo de Ficheiros

| Ficheiro | Alteracao |
|----------|-----------|
| `src/components/modals/ServicePrintModal.tsx` | Aumentar tamanho assinatura, corrigir texto cortado |
| `src/pages/ServiceConsultPage.tsx` | Adicionar busca e exibicao de assinaturas |

## Resultado Esperado

1. **PDF da Ficha**: Assinaturas maiores (120x80px) com descricao completa sem cortes
2. **Pagina de Consulta**: Card de "Assinaturas Recolhidas" com imagem legivel e descricao completa
3. **Formato A4**: Mantido - o conteudo ajusta-se ao espaco disponivel

