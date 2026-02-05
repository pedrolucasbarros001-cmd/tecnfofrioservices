

# Plano: Redesenhar Etiqueta + Garantir Persistência de Dados

## Objectivo
1. Redesenhar a etiqueta de impressão para corresponder exactamente à imagem de referência
2. Garantir que nenhum conteúdo desaparece ao navegar entre páginas (colaboradores, etc.)

---

## Parte 1: Redesenho da Etiqueta (Baseado na Imagem)

### Design Pretendido (Análise da Imagem)

```text
┌─────────────────────────────────┐
│ ████████████████████████████████│  <- Barra azul grossa no topo
│                                 │
│         [LOGO TECNOFRIO]        │  <- Logo centralizado
│                                 │
│         ┌───────────────┐       │
│         │               │       │  <- QR Code grande (140px)
│         │    QR CODE    │       │     com borda arredondada
│         │               │       │
│         └───────────────┘       │
│                                 │
│          TF-00007               │  <- Código grande, bold, mono
│                                 │
│  Cliente: Pedro                 │  <- Campos inline (label + valor)
│  Equipamento: Frigo             │
│  Telefone: 913460132            │
│                                 │
│  Leia o QR Code para ver        │  <- Texto rodapé simples
│  detalhes e histórico online    │     (sem URL, sem empresa)
│                                 │
│ ─────────────────────────────── │  <- Linha fina no final
└─────────────────────────────────┘
```

### Diferenças a Corrigir

| Elemento | Actual | Pretendido |
|----------|--------|------------|
| Barra azul | `h-2` (8px) | `h-3` (12px) |
| QR Code | `size={100}` | `size={140}` |
| Separador entre QR e código | Existe | Remover |
| Campo Marca/Modelo | Existe | Remover |
| Campos | Separados (label + p) | Inline (label: valor) |
| Secção URL + Empresa | Existe | Remover |
| Texto rodapé | "Leia o QR ou aceda:" | "Leia o QR Code para ver detalhes e histórico online" |
| Linha final | Não existe | Adicionar |

### Ficheiros a Alterar

1. **`src/pages/ServiceTagPage.tsx`** - Página dedicada de impressão
2. **`src/components/modals/ServiceTagModal.tsx`** - Modal de pré-visualização

---

## Parte 2: Garantir Persistência de Dados

### Problema Identificado

O utilizador reportou que a página "Colaboradores" mostrava "nenhum colaborador" momentaneamente. Isto pode ocorrer por:

1. **Estado de loading** - A query ainda não terminou
2. **Hot Module Replacement (HMR)** - React reinicia componentes durante desenvolvimento
3. **Sessão não estabelecida** - RLS bloqueia dados antes da autenticação

### Dados Confirmados

A base de dados contém **4 colaboradores** registados:
- Renata Goulart
- Lucas Barros  
- Pedro Lucas
- nloatelli

### Soluções

1. **Melhorar UX durante loading** - Mostrar skeleton/spinner claro
2. **Adicionar `staleTime`** - Manter dados em cache por mais tempo
3. **Evitar flash "vazio"** - Só mostrar "nenhum encontrado" após loading terminar

### Ficheiros a Alterar

1. **`src/pages/ColaboradoresPage.tsx`** - Adicionar `staleTime` e melhorar loading

---

## Implementação Detalhada

### 1. ServiceTagPage.tsx - Novo Layout

```tsx
{/* Tag Content - Matching Reference Image */}
<div ref={tagRef} className="print-tag-container">
  {/* Top accent bar - THICKER */}
  <div className="h-3 bg-primary -mx-[4mm] -mt-[4mm]" />
  
  {/* Logo */}
  <div className="flex justify-center mt-6 mb-6">
    <img src={tecnofrioLogoFull} alt="TECNOFRIO" className="h-12 object-contain"/>
  </div>

  {/* QR Code - LARGER */}
  <div className="flex justify-center mb-6">
    <div className="p-3 bg-white border border-gray-200 rounded-lg">
      <QRCodeSVG value={qrUrl} size={140} level="H" />
    </div>
  </div>

  {/* Service Code - Large */}
  <div className="text-center mb-6">
    <p className="text-3xl font-bold font-mono tracking-wide">
      {service.code}
    </p>
  </div>

  {/* Customer Info - INLINE format */}
  <div className="space-y-2 text-base px-2">
    <p>
      <span className="text-gray-500 italic">Cliente:</span>{' '}
      <span className="font-medium">{service.customer?.name || 'N/A'}</span>
    </p>
    <p>
      <span className="text-gray-500 italic">Equipamento:</span>{' '}
      <span className="font-medium">{service.appliance_type || 'N/A'}</span>
    </p>
    <p>
      <span className="text-gray-500 italic">Telefone:</span>{' '}
      <span className="font-medium">{service.customer?.phone || 'N/A'}</span>
    </p>
  </div>

  {/* Footer text - SIMPLE */}
  <div className="mt-6 text-center">
    <p className="text-sm text-gray-500">
      Leia o QR Code para ver detalhes e histórico online
    </p>
  </div>

  {/* Bottom line */}
  <div className="mt-4 border-t border-gray-200" />
</div>
```

### 2. ServiceTagModal.tsx - Mesmo Layout (Consistência)

Aplicar o mesmo design para manter consistência entre modal e página dedicada.

### 3. ColaboradoresPage.tsx - Melhorar Query

```tsx
const { data: users = [], isLoading, refetch } = useQuery({
  queryKey: ['collaborators'],
  queryFn: async () => { /* ... */ },
  staleTime: 1000 * 60 * 5, // 5 minutos - evita refetch desnecessário
  refetchOnWindowFocus: false, // Não refetch ao voltar à janela
});
```

---

## Resumo de Alterações

| Ficheiro | Acção |
|----------|-------|
| `src/pages/ServiceTagPage.tsx` | Redesenhar layout conforme imagem |
| `src/components/modals/ServiceTagModal.tsx` | Aplicar mesmo design |
| `src/pages/ColaboradoresPage.tsx` | Adicionar `staleTime` e melhorar loading |

---

## Resultado Esperado

1. Etiqueta com layout exactamente igual à imagem de referência
2. QR Code maior e mais legível
3. Informações simplificadas (sem marca/modelo, sem URL escrita)
4. Colaboradores nunca "desaparecem" - dados persistem em cache
5. Loading claro enquanto dados carregam

