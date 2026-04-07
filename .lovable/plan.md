

## Plano: Redimensionar etiqueta para 62mm x 100mm

O conteúdo está a ser cortado porque 29mm é demasiado estreito. O utilizador quer voltar ao tamanho **62mm x 100mm** com o layout original (fontes maiores, QR maior, informações legíveis).

### Alterações

**1. `src/components/modals/ServiceTagModal.tsx`**
- Largura: `29mm` → `62mm`, altura: `90mm` → `100mm`
- PDF format: `[29, 90]` → `[62, 100]`
- `canvasHeight` ratio: usar `62` em vez de `29`
- QR code: `50px` → `110px`
- Logo: `4mm` → `8mm`
- Barras: topo `3mm` → `4mm`, fundo `2.5mm` → `3mm`
- Código serviço: `7px` → `11px`
- Labels: `5px` → `8px`, valores: `5px` → `8px`
- Padding interno: `1mm` → `2mm`
- Line height: `1.15` → `1.3`

**2. `src/pages/ServiceTagPage.tsx`**
- Mesmas alterações de dimensão e layout que o modal
- `@page` CSS: `29mm 90mm` → `62mm 100mm`
- `.print-tag-container`: largura `29mm` → `62mm`, altura `90mm` → `100mm`

**3. `src/utils/printUtils.ts`**
- Tag `@page`: `29mm 90mm` → `62mm 100mm`

### Ficheiros alterados
- `src/components/modals/ServiceTagModal.tsx`
- `src/pages/ServiceTagPage.tsx`
- `src/utils/printUtils.ts`

