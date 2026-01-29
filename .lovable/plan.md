
# Plano: Ficha Ocupar Toda a Página A4

## Problema Atual
A ficha está aparecendo corretamente, mas:
1. Ocupa apenas uma parte da página no preview
2. Elementos do ambiente Lovable (barra inferior) aparecem porque há "espaço" ao redor da ficha

## Solução
Fazer a ficha (`print-content`) e a tag (`print-tag`) ocuparem **100% da área disponível**, forçando qualquer outro elemento a ficar fora da área de impressão visível.

---

## Alterações em `src/index.css`

### 1. Print Portal ocupa toda a área
```css
body > .print-portal {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;           /* ADICIONAR */
  width: 100% !important;
  height: 100% !important;        /* MUDAR de auto para 100% */
  min-height: 100vh !important;   /* ADICIONAR */
  background: white !important;
  z-index: 999999 !important;
  overflow: visible !important;
}
```

### 2. Print Content (ficha A4) ocupa toda a página
```css
.print-content {
  display: block !important;
  visibility: visible !important;
  position: relative !important;
  width: 100% !important;
  max-width: 190mm !important;
  min-height: 277mm !important;   /* ADICIONAR - altura A4 menos margens */
  margin: 0 auto !important;
  padding: 5mm !important;
  background: white !important;
  color: black !important;
  font-size: 11px !important;
  line-height: 1.4 !important;
  border: none !important;
  box-shadow: none !important;
  box-sizing: border-box !important;  /* ADICIONAR */
}
```

### 3. Print Tag (80mm) - formato específico
A tag já está correta para ocupar 80mm de largura.

---

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| Ficha aparece pequena no centro | Ficha ocupa toda a página A4 |
| Elementos do Lovable visíveis | Elementos cortados (fora da área) |

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/index.css` | Atualizar `.print-portal` e `.print-content` para ocupar 100% da área |

---

## Por que isso resolve?
Quando a ficha ocupa **toda a área visível** (100vh/100%), qualquer elemento fora do portal fica:
1. Atrás da ficha (z-index mais baixo)
2. Fora da área de corte da impressão

O navegador imprime apenas o que está visível na primeira "página" A4, cortando naturalmente qualquer barra de ferramentas ou elemento de navegação.
