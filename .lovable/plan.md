

# Plano: Corrigir Bugs nos Modais de Fluxo do Tecnico

## Problema Raiz Identificado

O problema central e a **falta de guardas consistentes nas condicoes `open` dos dialogos**. Quando um sub-modal (camera, pagamento, assinatura, pecas) abre, o dialogo do passo atual deveria fechar-se temporariamente. Mas em muitos passos, as condicoes `open` nao verificam todos os estados de sub-modais, causando:

- **Dois dialogos abertos simultaneamente** (sobreposicao visual)
- **Clique fora fecha o dialogo errado** (fecha o passo em vez do sub-modal)
- **Fluxo "salta" passos** ou parece fechar inesperadamente
- **Experiencia fragmentada** em vez de sequencial e fluida

## Analise Detalhada por Ficheiro

### 1. `VisitFlowModals.tsx` (1426 linhas) -- MAIS CRITICO

Tres estados de sub-modais: `showCamera`, `showSignature`, `showPayment`

**Dialogos com guardas incompletas:**

| Passo | Linha | Verifica Camera | Verifica Signature | Verifica Payment |
|---|---|---|---|---|
| resumo | 663 | Sim | Sim | **NAO** |
| deslocacao | 733 | Sim | **NAO** | **NAO** |
| foto (legacy) | 947 | Sim | **NAO** | **NAO** |
| produto | 995 | Sim | **NAO** | **NAO** |
| diagnostico | 1071 | Sim | **NAO** | **NAO** |
| decisao | 1108 | Sim | **NAO** | **NAO** |
| pecas_usadas | 1179 | Sim | **NAO** | **NAO** |

**Resultado:** Quando o pagamento ou assinatura abre, o dialogo do passo atual fica visivel por baixo, criando sobreposicao e comportamento erratico.

### 2. `DeliveryFlowModals.tsx` (404 linhas)

Tres estados de sub-modais: `showCamera`, `showSignature`, `showPayment`

**Dialogos com guardas incompletas:**

| Passo | Linha | Verifica Camera | Verifica Signature | Verifica Payment |
|---|---|---|---|---|
| resumo | 218 | Sim | Sim | **NAO** |
| deslocacao | 279 | Sim | Sim | **NAO** |
| foto | 321 | Sim | Sim | **NAO** |

**Resultado:** Quando o passo de pagamento abre a partir da foto (linha 364), o dialogo de foto permanece aberto por baixo.

### 3. `InstallationFlowModals.tsx` (654 linhas)

Quatro estados de sub-modais: `showCamera`, `showSignature`, `showMaterialsModal`, `showPayment`

**Dialogos com guardas incompletas:**

| Passo | Linha | Verifica Camera | Verifica Signature | Verifica Materials | Verifica Payment |
|---|---|---|---|---|---|
| resumo | 284 | Sim | Sim | Sim | **NAO** |
| deslocacao | 349 | Sim | Sim | Sim | **NAO** |
| foto_antes | 391 | Sim | Sim | Sim | **NAO** |
| materiais | 444 | Sim | Sim | Sim | **NAO** |
| foto_depois | ~530 | Sim | Sim | Sim | **NAO** |
| finalizacao | ~580 | Sim | Sim | Sim | **NAO** |

### 4. `WorkshopFlowModals.tsx` (1020 linhas)

Dois estados de sub-modais: `showCamera`, `showPartsModal` (sem pagamento/assinatura neste fluxo)

Este ficheiro esta correto -- todos os dialogos verificam ambos `!showCamera && !showPartsModal`.

## Solucao

### Regra Universal

Cada `Dialog open={...}` deve incluir **TODOS** os estados de sub-modais do componente como guardas negativas:

```text
open={currentStep === "X" && !showCamera && !showSignature && !showPayment}
```

### Alteracoes Especificas

**Ficheiro 1: `VisitFlowModals.tsx`**
- 7 dialogos a corrigir (linhas 663, 733, 947, 995, 1071, 1108, 1179)
- Adicionar `&& !showPayment` a todos
- Adicionar `&& !showSignature` aos 6 que nao verificam

**Ficheiro 2: `DeliveryFlowModals.tsx`**
- 3 dialogos a corrigir (linhas 218, 279, 321)
- Adicionar `&& !showPayment` a todos

**Ficheiro 3: `InstallationFlowModals.tsx`**
- 6 dialogos a corrigir (linhas 284, 349, 391, 444, e os de foto_depois e finalizacao)
- Adicionar `&& !showPayment` a todos

**Ficheiro 4: `WorkshopFlowModals.tsx`**
- Sem alteracoes necessarias (ja esta correto)

### Total: ~16 linhas de codigo a modificar em 3 ficheiros

## Impacto

Apos estas correcoes:
- Apenas **um unico dialogo** estara visivel em qualquer momento
- Os sub-modais (camera, pagamento, assinatura) abrem sobre o passo atual sem sobreposicao
- O fluxo sera verdadeiramente sequencial e sem saltos
- Aplicavel a **todas as contas** com nivel tecnico, nao apenas ao Carlos Amotino

