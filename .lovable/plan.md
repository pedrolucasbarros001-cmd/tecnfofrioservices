
# Plano: Ficha Ocupar 100% da Viewport no Print

## Problema Identificado
A ficha de serviço está aparecendo pequena no preview de impressão do iOS porque:

1. O `.print-content` não está expandindo para ocupar toda a área disponível
2. O portal não está forçando a página a ter apenas o conteúdo de impressão visível
3. Os elementos do ambiente Lovable aparecem porque há "espaço livre" na página

## Análise da Screenshot
- A página A4 mostra a ficha pequena no centro
- Elementos do Lovable ("/geral?status=finalizado", "Chat", "Preview") aparecem na parte inferior
- "Página 1 de 1" confirma que é apenas 1 página

## Solução: Forçar Ocupação Total

### Estratégia 1: Print-Content como Bloco de Página Inteira
Fazer o `.print-content` usar `height: 100vh` para garantir que ocupe toda a altura visível:

```css
.print-content {
  display: block !important;
  visibility: visible !important;
  position: absolute !important;    /* MUDAR de relative para absolute */
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  max-width: none !important;       /* REMOVER limite de 190mm */
  height: 100vh !important;         /* OCUPAR TODA A ALTURA */
  min-height: 297mm !important;     /* A4 completo */
  margin: 0 !important;
  padding: 10mm !important;         /* Padding interno para margens */
  background: white !important;
  ...
}
```

### Estratégia 2: Portal como Única Coisa Visível
Garantir que o portal cubra absolutamente tudo:

```css
body > .print-portal {
  display: block !important;
  visibility: visible !important;
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  width: 100vw !important;          /* VIEWPORT WIDTH */
  height: 100vh !important;         /* VIEWPORT HEIGHT */
  background: white !important;
  z-index: 2147483647 !important;   /* MÁXIMO z-index possível */
  overflow: hidden !important;      /* Esconder overflow */
}
```

### Estratégia 3: Esconder Root do App
Esconder o elemento root do React para garantir que nada apareça atrás:

```css
@media print {
  #root {
    display: none !important;
    visibility: hidden !important;
  }
}
```

---

## Alterações Detalhadas

### Arquivo: `src/index.css`

Modificar a seção `@media print`:

```css
@media print {
  @page {
    size: A4 portrait;
    margin: 0;  /* SEM MARGENS na página - padding no conteúdo */
  }

  html, body {
    margin: 0 !important;
    padding: 0 !important;
    width: 100% !important;
    height: 100% !important;
    overflow: hidden !important;
    background: white !important;
  }

  /* Esconder #root explicitamente */
  #root {
    display: none !important;
    visibility: hidden !important;
    height: 0 !important;
    overflow: hidden !important;
  }

  /* Portal cobre TUDO */
  body > .print-portal {
    display: block !important;
    visibility: visible !important;
    position: fixed !important;
    inset: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    background: white !important;
    z-index: 2147483647 !important;
    overflow: visible !important;
  }

  /* Print content ocupa página inteira */
  .print-content {
    position: absolute !important;
    inset: 0 !important;
    width: 100% !important;
    height: 100% !important;
    min-height: 297mm !important;
    max-width: none !important;
    margin: 0 !important;
    padding: 10mm !important;
    background: white !important;
    box-sizing: border-box !important;
  }
}
```

---

## Resultado Esperado

| Elemento | Antes | Depois |
|----------|-------|--------|
| .print-portal | Não cobre tudo | Cobre 100vw x 100vh |
| .print-content | Pequeno no centro | Ocupa toda a página |
| #root (app) | Visível atrás | Escondido explicitamente |
| Elementos Lovable | Aparecem em baixo | Cortados/invisíveis |

---

## Por que isso resolve?

1. **z-index máximo**: `2147483647` é o valor máximo de z-index, garantindo que o portal fique acima de QUALQUER elemento
2. **inset: 0**: Atalho para `top: 0; right: 0; bottom: 0; left: 0;` - cobre toda a área
3. **100vw/100vh**: Usa unidades de viewport para garantir cobertura total
4. **#root escondido**: O React root é explicitamente escondido, removendo qualquer conteúdo da app
5. **margin: 0 no @page**: Remove margens do navegador, deixando todo o controle de padding no conteúdo

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/index.css` | Reescrever @media print com estratégia de ocupação total |
