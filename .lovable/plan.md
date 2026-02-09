
# Plano: Galeria de Fotos com Swipe no Resumo do Atendimento Anterior

## Contexto

O utilizador quer que quando um técnico começar um serviço que já teve diagnóstico anterior (como na imagem enviada), as fotos tiradas anteriormente apareçam no "Resumo do atendimento anterior" com capacidade de:
1. Ver as miniaturas das fotos
2. Clicar para abrir em ecrã cheio com melhor qualidade
3. Arrastar (swipe) para navegar entre as fotos

## Solução

Criar um componente de galeria de fotos reutilizável com carousel/swipe que será integrado no `ServicePreviousSummary.tsx`.

---

## Ficheiros a Alterar

### 1. Criar novo componente `PhotoGalleryModal.tsx`

| Aspecto | Detalhe |
|---------|---------|
| Localização | `src/components/shared/PhotoGalleryModal.tsx` |
| Descrição | Modal de ecrã cheio com carousel usando Embla para swipe |

**Funcionalidades:**
- Ecrã cheio com fundo escuro
- Carousel horizontal com swipe/drag nativo
- Indicador de posição (1/5, 2/5, etc.)
- Botões de navegação (anterior/próximo)
- Badge com tipo da foto
- Botão de fechar

### 2. Atualizar `ServicePreviousSummary.tsx`

| Alteração | Descrição |
|-----------|-----------|
| Integrar galeria | Adicionar secção de fotos com miniaturas clicáveis |
| Estado | Controlar foto selecionada e índice inicial |
| Modal | Abrir `PhotoGalleryModal` ao clicar numa miniatura |

**Layout das fotos:**
- Grid de miniaturas (4 colunas em mobile)
- Ícone de zoom ao hover
- Badge com tipo (Aparelho, Etiqueta, Estado)
- Contador se houver mais de 4 fotos

---

## Componente `PhotoGalleryModal`

```text
┌──────────────────────────────────────────┐
│  [X]                              1 / 5  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │                                    │  │
│  │        [FOTO EM ECRÃ CHEIO]        │  │
│  │                                    │  │
│  │  <                            >    │  │
│  │                                    │  │
│  └────────────────────────────────────┘  │
│                                          │
│         [Aparelho]                       │
│                                          │
│     ●  ○  ○  ○  ○  (indicadores)         │
└──────────────────────────────────────────┘
```

**Interação:**
- Swipe esquerda/direita para navegar
- Tap no lado esquerdo/direito também navega
- Botões de seta para desktop
- Pinch-to-zoom (opcional, via CSS touch-action)

---

## Fluxo de Utilização

1. Técnico abre serviço na oficina que já teve visita anterior
2. Aparece o "Resumo do atendimento anterior" expandido
3. Dentro do resumo, secção "Fotos" mostra miniaturas
4. Técnico clica numa foto
5. Abre modal de ecrã cheio com a foto selecionada
6. Técnico pode arrastar para ver outras fotos
7. Fecha e continua a execução

---

## Dependências

O projeto já tem:
- `embla-carousel-react` instalado
- Componentes `Carousel`, `CarouselContent`, `CarouselItem` disponíveis
- `Dialog` para o modal

---

## Código Exemplo do Modal

```tsx
<Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent className="max-w-full w-full h-full p-0 bg-black/95">
    <Carousel opts={{ startIndex: initialIndex }}>
      <CarouselContent>
        {photos.map((photo) => (
          <CarouselItem key={photo.id}>
            <img 
              src={photo.file_url} 
              className="w-full h-[80vh] object-contain"
            />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
    
    {/* Indicadores de posição */}
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
      <span className="text-white">{currentIndex + 1} / {photos.length}</span>
    </div>
  </DialogContent>
</Dialog>
```

---

## Resumo de Ficheiros

| Ficheiro | Operação |
|----------|----------|
| `src/components/shared/PhotoGalleryModal.tsx` | Criar |
| `src/components/technician/ServicePreviousSummary.tsx` | Alterar |

---

## Resultado Esperado

- Fotos do diagnóstico anterior visíveis no resumo
- Clique abre galeria de ecrã cheio
- Swipe horizontal para navegar
- Melhor qualidade de imagem na visualização ampliada
- Indicador de posição e tipo de foto
