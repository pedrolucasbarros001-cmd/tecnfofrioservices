
# Plano: Corrigir Persistencia e Fluxo do Tecnico

## Problemas Identificados

### 1. Persistencia na BD nao funciona (CRITICO)
A funcao `saveStateToDb` tenta gravar `flow_step` e `flow_data` via RPC `technician_update_service`, mas:
- A tabela `services` **nao tem** as colunas `flow_step` nem `flow_data`
- O RPC **nao aceita** os parametros `_flow_step` e `_flow_data`
- Resultado: a gravacao falha silenciosamente, e quando o tecnico sai e volta, o sistema tenta derivar o passo a partir de fotos/campos, enviando-o para etapas ja concluidas

### 2. Fotos tiradas nao aparecem no modal (foto_aparelho, foto_etiqueta, foto_estado)
Quando o tecnico tira uma foto, a imagem e guardada no `formData` mas o Dialog fecha porque `showCamera` muda. Contudo, os dialogos de foto de reparacao (linhas 769, 825, 882) ainda nao verificam `!showPayment`, e a foto e corretamente mostrada apos captura -- o problema real e que o `deriveStepFromDb` ao reabrir o fluxo nao pre-carrega as fotos no formData porque faz queries desnecessariamente complexas que falham parcialmente.

### 3. Botao "Iniciar" demora porque `deriveStepFromDb` faz 3+ queries sequenciais a BD
O resumo faz: fetch photos metadata + fetch photo URLs + fetch parts, tudo sequencialmente, antes de mostrar o botao como ativo.

### 4. Guardas `!showPayment` em falta nos dialogos de foto (reparacao)
Os dialogos `foto_aparelho`, `foto_etiqueta` e `foto_estado` nao verificam `!showPayment`, herdado da correcao anterior incompleta.

## Solucao

### Parte 1: Adicionar colunas `flow_step` e `flow_data` a tabela `services`

Migracao SQL:
```sql
ALTER TABLE services ADD COLUMN IF NOT EXISTS flow_step text;
ALTER TABLE services ADD COLUMN IF NOT EXISTS flow_data jsonb;
```

### Parte 2: Atualizar RPC `technician_update_service` para aceitar os novos campos

```sql
CREATE OR REPLACE FUNCTION public.technician_update_service(
  _service_id uuid,
  _status text DEFAULT NULL,
  _detected_fault text DEFAULT NULL,
  _work_performed text DEFAULT NULL,
  _pending_pricing boolean DEFAULT NULL,
  _last_status_before_part_request text DEFAULT NULL,
  _flow_step text DEFAULT NULL,
  _flow_data jsonb DEFAULT NULL
) RETURNS void ...
  -- Adicionar ao UPDATE:
  flow_step = COALESCE(_flow_step, flow_step),
  flow_data = COALESCE(_flow_data, flow_data),
```

### Parte 3: Atualizar `src/types/database.ts` para incluir os novos campos

Adicionar `flow_step` e `flow_data` ao tipo `Service` (ja existem no ficheiro, mas confirmar que estao corretos).

### Parte 4: Otimizar `deriveStepFromDb` em `useFlowPersistence.ts`

- Usar `flow_step` da BD como fonte principal (ja esta no codigo, mas nunca tem valor porque a coluna nao existia)
- Executar queries de fotos e pecas em **paralelo** com `Promise.all` em vez de sequencialmente
- Resultado: o botao "Iniciar" carrega em menos de 300ms

### Parte 5: Limpar `flow_step` ao concluir o servico

Em todos os fluxos (Visita, Oficina, Instalacao, Entrega), ao chamar `clearState()` apos conclusao, tambem gravar `flow_step = null` na BD para evitar que o servico fique "preso" num passo antigo.

### Parte 6: Adicionar `!showPayment` aos dialogos de foto (reparacao)

Nos 3 dialogos de foto em `VisitFlowModals.tsx` (linhas 769, 825, 882):
```text
open={currentStep === "foto_X" && !showCamera && !showSignature && !showPayment}
```

## Ficheiros Alterados

| Ficheiro | Alteracao |
|---|---|
| Migracao SQL (nova) | Adicionar colunas `flow_step` e `flow_data` |
| Migracao SQL (nova) | Atualizar RPC `technician_update_service` |
| `src/hooks/useFlowPersistence.ts` | Paralelizar queries; usar `flow_step` da BD como prioridade |
| `src/components/technician/VisitFlowModals.tsx` | Guardar `flow_step=null` ao concluir; guardar `!showPayment` nos 3 dialogos de foto |
| `src/components/technician/WorkshopFlowModals.tsx` | Guardar `flow_step=null` ao concluir |
| `src/components/technician/InstallationFlowModals.tsx` | Guardar `flow_step=null` ao concluir |
| `src/components/technician/DeliveryFlowModals.tsx` | Guardar `flow_step=null` ao concluir |

## Resultado

- O tecnico pode sair e voltar ao servico **exatamente** no passo onde parou (gravado na BD, nao so em localStorage)
- O botao "Iniciar" carrega instantaneamente (queries paralelas)
- As fotos aparecem corretamente apos serem tiradas
- Nenhum dialogo sobrepoe outro (guardas completas)
- A experiencia e fluida e sem travamentos
