

# Plano: Carregamento Rapido de Imagens e Detalhes na Ficha de Servico

## Problema

1. **OficinaPage nao faz prefetch**: Ao clicar num card da oficina, o sistema so começa a carregar fotos, pecas, assinaturas e pagamentos DEPOIS de abrir o painel lateral. Nas paginas do tecnico (`ServicosPage`, `TechnicianOfficePage`) ja existe prefetch ao passar o rato/tocar -- mas na Oficina nao.

2. **Imagens carregam lentamente**: As fotos do Supabase Storage sao carregadas uma a uma pelo browser sem qualquer otimizacao. Nao ha `loading="lazy"` (para as que estao fora da vista) nem indicacao visual de carregamento.

3. **A ficha ja mostra os detalhes tecnicos (diagnostico, trabalho realizado)** -- estes campos (`detected_fault`, `work_performed`) estao presentes e visíveis. O que falta e os dados complementares (fotos, pecas) carregarem mais rapido.

## Solucao

### 1. Adicionar prefetch na OficinaPage (como ja existe nas paginas do tecnico)

Ao passar o rato ou tocar num card de servico na oficina, o sistema comeca a carregar os dados completos em background. Quando o utilizador clica, os dados ja estao prontos.

**Ficheiro: `src/pages/OficinaPage.tsx`**
- Importar `prefetchFullServiceData` e `useQueryClient`
- Adicionar `onMouseEnter` e `onTouchStart` nos cards de servico

### 2. Adicionar skeleton/placeholder de carregamento nas fotos da ServiceDetailSheet

Enquanto as fotos carregam, mostrar placeholders visuais (skeletons) em vez de espaco vazio. Isto da feedback imediato ao utilizador.

**Ficheiro: `src/components/services/ServiceDetailSheet.tsx`**
- Mostrar skeleton grid enquanto `isLoadingFull` esta ativo na seccao de fotos
- Adicionar `loading="lazy"` nas imagens de fotos e assinaturas que estao mais abaixo no scroll

### 3. Adicionar loading state visual nas imagens individuais

Cada imagem mostra um skeleton ate carregar completamente, evitando o efeito de "imagens a aparecer de repente".

**Ficheiro: `src/components/services/ServiceDetailSheet.tsx`**
- Componente interno `LazyImage` com estado `loaded` e skeleton enquanto carrega
- Aplica-se a fotos e miniaturas de assinatura

## Ficheiros Alterados

| Ficheiro | Alteracao |
|---|---|
| `src/pages/OficinaPage.tsx` | Adicionar prefetch nos cards (onMouseEnter/onTouchStart) |
| `src/components/services/ServiceDetailSheet.tsx` | Skeletons de carregamento nas fotos; LazyImage com fade-in |

## Resultado

- Ao clicar num servico na Oficina, os dados ja estao carregados (prefetch)
- As fotos mostram um placeholder enquanto carregam, sem layout shifts
- A percepcao de velocidade melhora drasticamente
- Zero impacto na carga da base de dados (prefetch usa o cache existente)

