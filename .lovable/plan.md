
# Plano de Correcao — Build Errors, Modal Closing, e Alinhamento de Formularios

## Problema Principal: Modal Fecha ao Clicar nos Inputs

Quando o tecnico clica num campo de texto (ex: "Modelo") dentro do modal de execucao, o modal fecha inesperadamente. Isto acontece porque o componente `DialogContent` do Radix UI interpreta certos eventos como interacoes externas.

**Solucao**: Adicionar `onPointerDownOutside` e `onInteractOutside` com `e.preventDefault()` em TODOS os `DialogContent` dos fluxos de execucao (`VisitFlowModals`, `WorkshopFlowModals`, `InstallationFlowModals`, `DeliveryFlowModals`).

---

## Erros de Build a Corrigir

### 1. VisitFlowModals.tsx — Tipo `ModalStep` incompleto

O tipo `ModalStep` nao inclui `resumo_continuacao` e `confirmacao_peca`, que sao usados no modo `continuacao_peca`.

**Correcao**: Adicionar `resumo_continuacao` e `confirmacao_peca` ao tipo `RepairModalStep` e `OtherModalStep`:
```ts
type RepairModalStep =
  | "resumo"
  | "resumo_continuacao"
  | "deslocacao"
  | "foto_aparelho"
  | "foto_etiqueta"
  | "foto_estado"
  | "produto"
  | "diagnostico"
  | "decisao"
  | "pecas_usadas"
  | "pedir_peca"
  | "confirmacao_peca";
```
E o mesmo para `OtherModalStep`.

Tambem adicionar `partInstalled: boolean` ao `VisitFormData` (ja existe no `setFormData` mas precisa estar na interface).

### 2. RPC Functions nao registadas nos tipos (`lift_service_to_workshop`, `start_workshop_service`, `technician_update_service`)

Estas funcoes existem na base de dados mas nao estao no ficheiro `types.ts` gerado. O TypeScript rejeita as chamadas `supabase.rpc(...)` porque o tipo nao inclui estas funcoes.

**Correcao**: Usar type assertion `(supabase.rpc as any)(...)` nas chamadas existentes. Isto e necessario porque o ficheiro `types.ts` e gerado automaticamente e nao pode ser editado manualmente de forma segura.

Alternativa mais limpa: adicionar as funcoes na seccao `Functions` do `types.ts`.

### 3. useServices.ts — Tipos `ServicePart`, `ServicePhoto`, `ServiceSignature`, `ServicePayment` nao importados

**Correcao**: Adicionar imports de `@/types/database`:
```ts
import type { Service, ServiceStatus, ServicePart, ServicePhoto, ServiceSignature } from '@/types/database';
```
E verificar se `ServicePayment` existe no `database.ts` — caso nao, adiciona-lo.

### 4. TechnicianVisitFlow.tsx — `React` nao importado

Linha 55 usa `React.useEffect` mas `React` nao esta importado.

**Correcao**: Adicionar `import React from 'react'` ou mudar para `useEffect` importado directamente.

### 5. useFlowPersistence.ts — RPC `technician_update_service` nao no tipo

Mesma correcao do ponto 2 — usar type assertion.

---

## Alinhamento de Formularios — CreateServiceModal (Reparacao)

O `CreateServiceModal` (usado por admin e secretaria para criar servicos de reparacao) falta os campos:
- **Modelo** 
- **Numero de Serie**
- **PNC**

O `CreateInstallationModal` ja tem estes campos. O `CreateDeliveryModal` tambem.

**Correcao**: Adicionar ao `CreateServiceModal`:
- Campo `model` no schema zod (ja existe como opcional)
- Campo `serial_number` no schema zod (ja existe como opcional)  
- Campo `pnc` no schema zod (precisa ser adicionado)
- Campos visuais no formulario apos a row "Tipo de Aparelho + Marca":
  - Row nova: Modelo + N Serie
  - Row nova: PNC (meia largura)
- Incluir `pnc` no `processSubmit` ao criar servico

Todos estes campos serao **opcionais** (nao obrigatorios).

---

## Resumo dos Ficheiros a Alterar

| Ficheiro | Alteracao |
|---|---|
| `src/components/technician/VisitFlowModals.tsx` | Corrigir tipo `ModalStep`, adicionar `partInstalled` a interface, adicionar `onPointerDownOutside`/`onInteractOutside` a TODOS os `DialogContent`, usar type assertion para RPC |
| `src/components/technician/WorkshopFlowModals.tsx` | Adicionar `onPointerDownOutside`/`onInteractOutside` a TODOS os `DialogContent`, usar type assertion para RPCs |
| `src/components/technician/InstallationFlowModals.tsx` | Adicionar `onPointerDownOutside`/`onInteractOutside` a TODOS os `DialogContent` |
| `src/components/technician/DeliveryFlowModals.tsx` | Adicionar `onPointerDownOutside`/`onInteractOutside` a TODOS os `DialogContent` |
| `src/hooks/useServices.ts` | Importar tipos em falta (`ServicePart`, `ServicePhoto`, `ServiceSignature`, `ServicePayment`) |
| `src/hooks/useFlowPersistence.ts` | Usar type assertion para RPC `technician_update_service` |
| `src/types/database.ts` | Adicionar interface `ServicePayment` se nao existir |
| `src/pages/technician/TechnicianVisitFlow.tsx` | Adicionar `import React` |
| `src/components/modals/CreateServiceModal.tsx` | Adicionar campos modelo, n serie e PNC ao formulario e schema |
| `src/integrations/supabase/types.ts` | Adicionar RPCs em falta na seccao Functions |

---

## Prioridades de Execucao

1. Corrigir todos os erros de build (tipos, imports, RPCs)
2. Corrigir modal closing (`onPointerDownOutside` / `onInteractOutside`)
3. Adicionar campos modelo/serie/PNC ao `CreateServiceModal`
4. Verificar alinhamento entre modal da secretaria e admin
