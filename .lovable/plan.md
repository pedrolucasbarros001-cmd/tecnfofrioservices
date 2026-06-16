## Problema
No **Histórico de Intervenções** (ex.: TF-00464 na imagem) há artigos repetidos por engano e o role `dono` não tem botão para os apagar. A RLS já permite (`Dono and secretaria can delete parts`) — falta apenas a UI.

## Solução (apenas frontend)

1. **Botão "lixo" por linha** em cada artigo do histórico → apaga essa linha de `service_parts`.
2. **Botão "lixo" no cabeçalho do grupo** (data + técnico + localização) → apaga todas as linhas dessa intervenção.
3. `AlertDialog` de confirmação antes de qualquer remoção, com o nome do artigo ou o resumo do grupo.
4. Visibilidade: **apenas `dono`**. Secretaria e técnico continuam sem botão.
5. Depois de apagar:
   - `DELETE` em `service_parts` via Supabase.
   - Registo em `activity_logs` ("Dono removeu artigo X — €Y").
   - Invalidar `['service-full', id]` → subtotais e total do histórico recalculam.
   - Toast sucesso/erro com a mensagem real.
6. Botões visíveis por defeito (mobile-first, sem `hover:`).

## Ficheiros
- `src/components/shared/ServicePartsHistory.tsx` — props `canDelete`, `onDeletePart`, `onDeleteGroup` + ícones + dialogs.
- `src/components/services/ServiceDetailSheet.tsx` — passa `canDelete={role === 'dono'}` e implementa os handlers.

## Fora de âmbito
- Não permite editar (só apagar).
- Não toca em pagamentos, fotos nem assinaturas.
