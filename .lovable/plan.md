
# Plano de Implementação — Fluxos de Execução Técnica (Mega-revisão)

## Visão Geral dos 8 Requisitos

| # | Requisito | Complexidade |
|---|---|---|
| 1 | Fotos visíveis na ficha de consulta (ServiceDetailSheet) | Baixa — já existe, precisa garantir que visita também mostra |
| 2 | Observações e fotos do histórico técnico visíveis na ficha | Baixa — as fotos já são guardadas em `service_photos`, já aparecem |
| 3 | Etapa de marca/modelo/série no fluxo de Visita (sempre) | Média — tornar etapa OBRIGATÓRIA em vez de condicional |
| 4 | Etapa de marca/modelo/série na Oficina (só se não preenchido antes) | Baixa — lógica já existe com `needsProductStep` |
| 5 | Pagamento em TODOS os fluxos de campo (exceto Oficina pura) | Média — instalar `FieldPaymentStep` em Instalação e Entrega |
| 6 | Bloqueio de serviço aguardando peça — visita (no cliente) | Alta — novo fluxo "continuar após peça" |
| 7 | Bloqueio de serviço aguardando peça — oficina | Alta — mesmo conceito, adaptado para oficina |
| 8 | Correção do bug de build no `VisitFlowModals.tsx` | Urgente — `handleClose` não inicializa campos do tipo VisitFormData |

---

## Diagnóstico do Bug de Build

O erro atual em `VisitFlowModals.tsx` linha 412:
```
Type '{ ... }' is missing: productBrand, productModel, productSerial, productPNC, productType
```

O `handleClose` faz `setFormData({ ... })` sem os campos de produto. Corrigir adicionando os 5 campos em falta.

---

## 1. Fotos na Ficha de Consulta (ServiceDetailSheet)

**Estado atual**: A secção "Fotos do Serviço" JÁ EXISTE (linhas 776-800 do `ServiceDetailSheet.tsx`) e já mostra TODAS as fotos de TODOS os tipos. As fotos gravadas durante a execução (visita, oficina, aparelho, etiqueta, estado, entrega, instalação) já aparecem.

**O que falta**: Confirmar que as fotos adicionadas no "Histórico do Técnico" (`TechnicianServiceSheet`) também aparecem — e já aparecem, porque são inseridas na tabela `service_photos` com `photo_type: 'visita'`.

**Acção**: Nenhuma mudança necessária no `ServiceDetailSheet` para este ponto — já funciona. Apenas garantir que não há regressão.

---

## 2. Etapa Obrigatória de Produto no Fluxo de Visita

**Estado atual**: A etapa `produto` só aparece `se (!service.brand && !service.model)` — `needsProductStep`. Ou seja, se o serviço já tem marca/modelo, o técnico nunca preenche esta informação.

**Novo requisito**: Em serviços de Visita (no cliente), o técnico SEMPRE deve passar pela etapa de verificação/preenchimento de marca, modelo e número de série, independentemente de já estarem preenchidos. O técnico pode confirmar ou corrigir.

**Implementação em `VisitFlowModals.tsx`**:
- Remover a flag `needsProductStep` 
- A etapa `produto` torna-se parte FIXA do fluxo para TODOS os serviços de visita (`isReparacao` ou não)
- Sequência: `deslocacao` → `foto_aparelho/foto_etiqueta/foto_estado` (reparação) OU `foto` (outros) → **`produto`** → `diagnostico` → `decisao` → ...
- O passo de produto pré-preenche com os valores actuais do serviço e o técnico confirma/corrige
- O step `needsProductStep` nas navegações (`goToPreviousPhotoStep`, `goToNextPhotoStep`) deve ser removido — o produto é sempre o próximo depois das fotos

---

## 3. Etapa de Produto na Oficina — Condicional (sem alteração)

Na `WorkshopFlowModals.tsx`, a lógica actual de `needsProductStep` mantém-se:
- Se os dados já foram preenchidos na visita → técnico da oficina **NÃO** vê a etapa
- Se o serviço foi criado directamente na oficina (sem visita anterior) → técnico **VÊ** a etapa

Esta lógica está correcta e não precisa de alteração.

---

## 4. Pagamento em TODOS os Fluxos de Campo (exceto Oficina pura)

**Estado actual**:
- `VisitFlowModals`: ✅ `FieldPaymentStep` já integrado
- `InstallationFlowModals`: ✅ `FieldPaymentStep` já integrado (vendo o código linha 71)
- `DeliveryFlowModals`: ✅ `FieldPaymentStep` já integrado (vendo o código linha 59)
- Oficina (`WorkshopFlowModals`): ❌ SEM pagamento — correcto, cliente não está lá

**Confirmação**: Os 3 fluxos de campo já têm pagamento. Confirmar que na Instalação e Entrega, o step de pagamento aparece ANTES da assinatura (verificar o fluxo completo de cada um).

**Verificação do `InstallationFlowModals` após linha 100**: A leitura mostra que `showPayment` existe (linha 71). Preciso confirmar que é chamado antes da assinatura.

**Verificação do `DeliveryFlowModals` após linha 100**: O `showPayment` existe (linha 59). Confirmar fluxo.

Estes fluxos já têm o pagamento integrado — a revisão é só de confirmação.

---

## 5. Bloqueio de Serviço Aguardando Peça — Visita no Cliente (NOVO FLUXO)

Esta é a mudança mais complexa. Quando um técnico no cliente solicita uma peça:
- Estado actual: `para_pedir_peca` → depois `em_espera_de_peca`
- O serviço aparece na lista de serviços do técnico (página de serviços)
- O botão DEVE mostrar "Espera de Peça" e ser **não clicável** (bloqueado)
- Quando a peça chega (registada por admin), estado muda para o `last_status_before_part_request`
- Aparece botão "**Continuar**" 

### 5a — Novo Fluxo "Continuar após Peça" para Visita no Cliente

**Detecção**: O serviço tem `status: 'em_espera_de_peca'` E `service_location: 'cliente'` E tem técnico atribuído.

**Novo tipo de fluxo** no `VisitFlowModals.tsx` — modo `continuacao_peca`:

Steps do novo fluxo:
1. `resumo_continuacao` — Mostra resumo anterior (diagnóstico, fotos, decisão anterior)
2. `deslocacao` — Mapa, ir até ao cliente
3. `confirmacao_peca` — "A peça foi instalada?" (Sim/Não)
4. `pagamento` — Pergunta de pagamento (FieldPaymentStep)
5. `assinatura` — Assinatura de conclusão → status `concluidos` + `pending_pricing: true`

**Detecção na `ServicosPage` / card do técnico**: Quando `status === 'em_espera_de_peca'` → botão "Espera de Peça" desabilitado. Quando `status === last_status_before_part_request` (voltou ao estado anterior após chegada da peça) → botão "Continuar" habilitado que abre o novo fluxo.

**Nota sobre detecção**: O status `em_espera_de_peca` já existe. Quando a peça chega, o admin regista com `PartArrivedModal` que deveria restaurar o status para `last_status_before_part_request`. Esta lógica precisa de ser verificada para garantir que o status volta para `por_fazer` ou `na_oficina` corretamente.

### 5b — Localização das mudanças

**`TechnicianVisitFlow.tsx` e `ServicosPage.tsx`**: Adicionar lógica ao card de serviço:
- Se `status === 'para_pedir_peca' || status === 'em_espera_de_peca'` → mostrar badge "Espera de Peça" + botão desabilitado com texto "Aguarda Peça"
- Se `status === 'por_fazer'` E o serviço JÁ tem `detected_fault` (tem histórico de visita anterior) E tem `last_status_before_part_request` preenchido → mostrar botão "Continuar"

**`VisitFlowModals.tsx`**: Adicionar prop `mode: 'normal' | 'continuacao_peca'` e renderizar o fluxo simplificado quando em modo continuação.

---

## 6. Bloqueio de Serviço Aguardando Peça — Oficina (NOVO FLUXO)

Mesma lógica, adaptada para oficina:

**`TechnicianOfficePage.tsx`** — no `ServiceCard`:
- Se `status === 'para_pedir_peca' || status === 'em_espera_de_peca'` → botão "Aguarda Peça" desabilitado (sem clique)
- Quando peça chega e status volta → botão "Continuar" habilitado

**Novo fluxo simplificado na oficina** (`WorkshopFlowModals.tsx`) — modo `continuacao_peca`:

Steps:
1. `resumo_continuacao` — Mostra o que foi feito antes (diagnóstico, trabalho anterior, fotos)
2. `confirmacao_peca` — "A peça foi instalada?" (confirmação)
3. `conclusao` — Descrição rápida do trabalho final + conclusão → status `concluidos` + `pending_pricing: true`

**SEM pagamento, SEM assinatura** — na oficina não faz sentido.

---

## 7. Verificação do `PartArrivedModal` e Fluxo de Chegada de Peça

Quando a peça chega, o admin clica em "Peça Chegou" no `PartArrivedModal`. Este modal deve:
1. Marcar `service_parts.arrived = true`
2. Atualizar `services.status` de volta para `last_status_before_part_request`
3. Agendar técnico e data (já obrigatório pela memória)

Após este passo, o técnico vê o botão "Continuar" no seu card de serviço.

Preciso verificar o `PartArrivedModal` para confirmar que a lógica está correcta.

---

## 8. Estrutura de Implementação — Ficheiros a Alterar

### Prioridade 1: Bug de Build (1 ficheiro)
- `src/components/technician/VisitFlowModals.tsx` — corrigir `handleClose` (adicionar campos em falta)

### Prioridade 2: Etapa de Produto Obrigatória na Visita (1 ficheiro)
- `src/components/technician/VisitFlowModals.tsx` — remover `needsProductStep`, tornar etapa produto sempre activa

### Prioridade 3: Bloqueio de Serviços Aguardando Peça — UI
- `src/pages/technician/TechnicianOfficePage.tsx` — adaptar `ServiceCard` para mostrar estado bloqueado vs "Continuar"
- `src/pages/ServicosPage.tsx` (ou equivalente de lista de serviços do técnico) — idem

### Prioridade 4: Novo Fluxo "Continuar após Peça" — Visita
- `src/components/technician/VisitFlowModals.tsx` — adicionar modo `continuacao_peca` com steps simplificados

### Prioridade 5: Novo Fluxo "Continuar após Peça" — Oficina  
- `src/components/technician/WorkshopFlowModals.tsx` — adicionar modo `continuacao_peca`

### Prioridade 6: Verificar e Confirmar Pagamento em Instalação/Entrega
- `src/components/technician/InstallationFlowModals.tsx` — verificar posição do payment step
- `src/components/technician/DeliveryFlowModals.tsx` — verificar posição do payment step

---

## Detalhes Técnicos Críticos

### Detecção de "Continuar após Peça" na Lista do Técnico

Para saber se um serviço é um "continuar após peça", verificar:
```ts
const isAwaitingPart = ['para_pedir_peca', 'em_espera_de_peca'].includes(service.status);
const isContinuacaoPeca = service.status === 'por_fazer' && 
  !!service.last_status_before_part_request && 
  !!service.detected_fault;
// Para oficina: status 'na_oficina' voltou de espera de peça
const isOficinaContinuacao = service.service_location === 'oficina' && 
  service.status === 'na_oficina' && 
  !!service.last_status_before_part_request;
```

### Etapa de Confirmação de Peça Instalada

```tsx
// Modal simples com dois botões
"A peça encomendada foi instalada com sucesso?"
[✗ Ainda não]  [✓ Sim, instalada]
```

Se "Ainda não" → fechar modal sem avançar (o técnico ainda não pode concluir)
Se "Sim" → avançar para pagamento (visita) ou conclusão (oficina)

### Sequência Final — Visita Normal (Reparação)

```
resumo → deslocacao → foto_aparelho → foto_etiqueta → foto_estado → produto → diagnostico → decisao
  ↓ reparar_local                                    ↓ levantar_oficina
pecas_usadas → pedir_peca                           [pagamento] → assinatura_recolha → FIM (oficina)
  ↓ não pede peça                ↓ pede peça
[pagamento] → assinatura        assinatura_pedido_peca → FIM (para_pedir_peca)
  concluidos + pending_pricing
```

### Sequência Final — Visita Continuação (após peça chegar)

```
resumo_continuacao → deslocacao → confirmacao_peca → [pagamento] → assinatura → FIM (concluidos)
```

### Sequência Final — Oficina Continuação (após peça chegar)

```
resumo_continuacao → confirmacao_peca → conclusao → FIM (concluidos)
```

---

## Impacto no Sistema

- **Coexistência de estados**: Não é afectada. O status `concluidos` + `pending_pricing: true` continua a coexistir com "Precificar" e "Em Débito" como antes.
- **RLS**: Não são necessárias alterações à base de dados.
- **Migrações**: Nenhuma necessária — as colunas `last_status_before_part_request`, `status`, `detected_fault` já existem.
- **Persistência localStorage**: Os novos flows serão integrados com `useFlowPersistence` para manter o estado entre sessões.
