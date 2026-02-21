

# Plano de Correcao — Eliminacao de Clientes, Estabilidade de Fluxos e Performance

## 1. Bug Critico: Eliminacao de Clientes Bloqueada por RLS

**Problema**: A tabela `customers` nao tem NENHUMA politica RLS para DELETE. Quando o admin ou secretaria tenta apagar um cliente, a operacao falha silenciosamente por violacao de RLS.

**Solucao**: Criar uma migracao SQL que adiciona a politica de DELETE:
```sql
CREATE POLICY "Dono and secretaria can delete customers"
  ON public.customers FOR DELETE
  USING (is_dono(auth.uid()) OR is_secretaria(auth.uid()));
```

---

## 2. Bug Critico: Deteccao de "Continuar apos Peca" Quebrada

**Problema**: No `PartArrivedModal.tsx` (linha 134), quando a peca chega, o campo `last_status_before_part_request` e limpo para `null`. Mas a logica de deteccao de continuacao no `ServicosPage.tsx` (linha 161) e `TechnicianOfficePage.tsx` (linha 163) depende de `!!service.last_status_before_part_request` para mostrar o botao "Continuar".

Resultado: apos a peca chegar, o botao mostra "Comecar" em vez de "Continuar", e o tecnico entra no fluxo normal em vez do fluxo simplificado de continuacao.

**Solucao**: No `PartArrivedModal.tsx`, NAO limpar `last_status_before_part_request` na chegada da peca. Manter o valor para que a UI saiba que e uma continuacao. O campo so sera limpo quando o tecnico completar o fluxo de continuacao (dentro dos modais de fluxo).

Alteracao em `PartArrivedModal.tsx` linha 134:
- Remover: `last_status_before_part_request: null`

Nos fluxos de conclusao (`VisitFlowModals` e `WorkshopFlowModals`), ao concluir o fluxo de continuacao, limpar o campo:
```ts
await updateService.mutateAsync({
  ...updates,
  last_status_before_part_request: null, // Limpar aqui, no fim do fluxo
});
```

---

## 3. Persistencia de Fluxo — Garantir Retoma sem Duplicacao

**Estado actual**: O `useFlowPersistence` ja guarda estado no `localStorage` com TTL de 24h. No entanto, ha dois cenarios de risco:

**Cenario A — Fotos duplicadas**: Se o tecnico tira fotos, fecha o browser, e retoma, as fotos ja foram enviadas para `service_photos`. Quando o fluxo retoma, precisa de verificar se as fotos ja existem na DB antes de apresentar o step de fotos novamente.

**Solucao**: O `deriveStepFromDb` no `useFlowPersistence.ts` ja implementa esta logica (verifica `hasPhoto` antes de pedir novas fotos). Garantir que os fluxos usam `deriveStepFromDb` como fallback quando o `localStorage` esta vazio (ex: browser reiniciado).

**Cenario B — Pagamentos duplicados**: Se o tecnico regista um pagamento e depois fecha o modal, ao retomar nao deve ver o step de pagamento novamente se ja foi registado.

**Solucao**: Nos modais de fluxo, ao retomar, verificar se ja existe pagamento registado para este servico em `service_payments`. Se sim, saltar o step de pagamento.

---

## 4. Performance e Fluidez

### 4a. QueryClient — Optimizacoes

**Estado actual** (`App.tsx` linha 48):
```ts
staleTime: 1000 * 10, // 10 segundos
gcTime: 1000 * 60 * 60 * 24, // 24h
refetchOnWindowFocus: true,
retry: 1,
```

**Melhoria**: Aumentar `staleTime` para 30 segundos em queries gerais, mantendo `refetchInterval: 30000` nas queries de servicos para polling automatico. Isto reduz refetches desnecessarios quando o utilizador navega entre paginas.

```ts
staleTime: 1000 * 30, // 30 segundos
```

### 4b. Prefetch em Hover/Touch

**Estado actual**: `ServicosPage` e `TechnicianOfficePage` ja implementam `prefetchFullServiceData` no `onMouseEnter` e `onTouchStart`. Isto esta correcto.

### 4c. Eliminar Console.logs Desnecessarios

Em `useCustomers.ts` linha 62:
```ts
console.log('Customers Debug:', { count, countError, data, dataError });
```
Remover este log para reduzir overhead em producao.

---

## 5. Alinhamento de Permissoes Admin/Secretaria

### Verificacao de acessos:

| Funcionalidade | Admin (dono) | Secretaria | Estado |
|---|---|---|---|
| Ver clientes | OK | OK | RLS SELECT funciona |
| Criar clientes | OK | OK | RLS INSERT funciona |
| Editar clientes | OK | OK | RLS UPDATE funciona |
| **Eliminar clientes** | **FALHA** | **FALHA** | **SEM politica DELETE** |
| Criar servicos | OK | OK | RLS INSERT funciona |
| Ver servicos | OK | OK | RLS SELECT funciona |
| Atualizar servicos | OK | OK | RLS UPDATE funciona |

A unica falha identificada e a eliminacao de clientes. As restantes operacoes estao alinhadas.

---

## 6. Sincronizacao e Notificacoes

**Estado actual**: O sistema ja tem `refetchInterval: 30000` (30s) para polling de servicos. Para melhorar a experiencia em tempo real sem adicionar complexidade:

- Adicionar `refetchOnReconnect: true` ao QueryClient para garantir que dados sao atualizados quando a ligacao de rede volta (importante para telemoveis).
- O sistema de push notifications ja existe (`PushPermissionBanner`, Service Worker) — nao requer alteracoes.

---

## Resumo de Ficheiros a Alterar

| Ficheiro | Alteracao |
|---|---|
| **Migracao SQL** | Adicionar politica DELETE para `customers` |
| `src/components/modals/PartArrivedModal.tsx` | Nao limpar `last_status_before_part_request` na chegada da peca |
| `src/hooks/useCustomers.ts` | Remover `console.log` de debug |
| `src/App.tsx` | Aumentar `staleTime` para 30s, adicionar `refetchOnReconnect: true` |
| `src/components/technician/VisitFlowModals.tsx` | Limpar `last_status_before_part_request` ao concluir fluxo de continuacao |
| `src/components/technician/WorkshopFlowModals.tsx` | Limpar `last_status_before_part_request` ao concluir fluxo de continuacao |

---

## Prioridades de Execucao

1. **Migracao SQL** — Politica DELETE para clientes (resolve bug imediato)
2. **PartArrivedModal** — Corrigir limpeza prematura do `last_status_before_part_request`
3. **Performance** — staleTime, refetchOnReconnect, remover logs
4. **Fluxos de continuacao** — Limpar campo no momento correcto (fim do fluxo)

