
# Plano de correção: modal “pisca e fecha” ao iniciar execução (todas as tipologias)

## Leitura do problema (confirmado)
O comportamento descrito (“clica em iniciar, pisca e fecha, fica em execução mas sem modal aberto”) é compatível com **estado de etapa inválida** + **transição frágil entre diálogos**.

Pontos críticos encontrados no código:
1. `deriveStepFromDb` pode devolver `flow_step` salvo no DB que **não pertence ao fluxo atual** (ex.: passo antigo de visita em fluxo de oficina).
2. Os modais aceitam esse passo via cast (`as ModalStep`) sem validação.
3. Quando `currentStep` fica inválido, nenhum `<Dialog open=...>` bate com `true` → visualmente “fecha tudo”.
4. Em `Visit/Installation/Delivery`, `safeSetStep` ainda usa timeout `0ms`, mais suscetível a race de `onOpenChange(false)` no ciclo de animação.
5. Ainda existem transições com `setCurrentStep(...)` direto (sem guard), o que pode reintroduzir fechamento inesperado.

---

## Estratégia de correção (sem aumentar carga no Supabase)

### 1) Blindar `deriveStepFromDb` contra `flow_step` inválido por fluxo
Arquivo: `src/hooks/useFlowPersistence.ts`

Implementar validação central de etapas:
- Criar mapa de etapas válidas por `flowType`:
  - visita / visita_continuacao
  - oficina / oficina_continuacao
  - instalacao
  - entrega
- Antes de retornar `flowStep` salvo no DB, validar:
  - se não for válido para o fluxo corrente, **ignorar** e derivar passo por dados reais (fotos, peças, status, etc.).
- Manter regra já criada de ignorar passos de foto “stale” na oficina quando há histórico.

Resultado: nunca mais retomará em etapa inexistente para aquele modal.

---

### 2) Normalizar abertura de passo em todos os FlowModals
Arquivos:
- `src/components/technician/WorkshopFlowModals.tsx`
- `src/components/technician/VisitFlowModals.tsx`
- `src/components/technician/InstallationFlowModals.tsx`
- `src/components/technician/DeliveryFlowModals.tsx`

Ações:
- Unificar proteção de transição (`safeSetStep`) para janela segura (mesma abordagem estável, não `0ms`).
- Validar sempre o destino antes de trocar etapa:
  - `safeSetStep(step)` só aceita passo válido do fluxo.
  - Se inválido, fallback para passo seguro (`resumo` ou primeiro passo operacional).
- Substituir `setCurrentStep(...)` de navegação interna por `safeSetStep(...)` onde houver troca entre diálogos.
- Ao carregar `savedState.currentStep` e `derivedResumeStep`, validar antes de aplicar; se inválido, cair para `resumo`.

Resultado: botão “Iniciar” nunca deixa o fluxo “sem segundo modal”.

---

### 3) Adicionar auto-recuperação defensiva (anti-estado fantasma)
Nos quatro modais técnicos:
- Calcular se existe algum diálogo principal aberto para o `currentStep`.
- Se `isOpen === true` e nenhum diálogo principal/submodal estiver ativo por estado inconsistente:
  - recuperar automaticamente para `resumo` (sem fechar fluxo inteiro),
  - opcionalmente registrar warning no console para diagnóstico futuro.

Resultado: mesmo se surgir estado corrompido, a UI se autocorrige.

---

## Diagrama do problema e correção

```text
ANTES
Iniciar -> status atualizado (em_execucao)
        -> currentStep recebe flow_step inválido (ex: "deslocacao" em oficina)
        -> nenhum Dialog casa com o step
        -> modal "pisca/fecha"

DEPOIS
Iniciar -> status atualizado
        -> flow_step validado por fluxo
           -> inválido? ignora e deriva passo correto
        -> safeSetStep com guard + fallback
        -> próximo modal abre e permanece estável
```

---

## Arquivos a alterar
1. `src/hooks/useFlowPersistence.ts`
   - whitelist de etapas por fluxo
   - validação de `flowStep` salvo
   - fallback seguro por fluxo
2. `src/components/technician/WorkshopFlowModals.tsx`
   - validação de passos aplicados
   - remover transições com `setCurrentStep` direto (trocas de diálogo)
3. `src/components/technician/VisitFlowModals.tsx`
   - mesmo padrão de guard/validação/fallback
4. `src/components/technician/InstallationFlowModals.tsx`
   - mesmo padrão de guard/validação/fallback
5. `src/components/technician/DeliveryFlowModals.tsx`
   - mesmo padrão de guard/validação/fallback

---

## Garantia de performance / Supabase
- Não será adicionada nova query recorrente.
- Correção é majoritariamente de lógica cliente (validação de etapa).
- Mantém arquitetura atual de persistência e retoma.
- Sem migração SQL obrigatória para esta correção.

---

## Plano de validação (obrigatório)
Executar teste ponta-a-ponta com técnico em:
1. Oficina (reparação): clicar “Começar/Continuar” em serviços com e sem histórico.
2. Visita: iniciar e avançar 2-3 passos, fechar/reabrir, retomar corretamente.
3. Instalação: iniciar e confirmar que não fecha no passo 1→2.
4. Entrega: iniciar e confirmar transição estável.
5. Caso com `flow_step` antigo/inválido: garantir fallback para passo válido e modal permanece aberto.

Critério de aceite:
- Nenhum fluxo fecha sozinho ao iniciar.
- Nunca fica “em execução sem modal”.
- Sempre abre um passo válido do fluxo correspondente.
