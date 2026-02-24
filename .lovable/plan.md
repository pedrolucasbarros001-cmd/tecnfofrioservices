

# Plano: Migrar Fotos para Storage e Eliminar Bloqueios nos Fluxos

## Estado: ✅ IMPLEMENTADO

Todas as alterações foram aplicadas com sucesso.

## Resumo das Alterações

### 1. `src/utils/photoUpload.ts` (NOVO)
- Helper centralizado: base64 → Blob → Storage bucket → URL público (~100 bytes)

### 2. `src/hooks/useFlowPersistence.ts`
- Removida segunda query que buscava `file_url` (4-5MB cada)
- Usa marcador `__photo_exists__` construído a partir da metadata já carregada
- Timeout de 8 segundos para evitar loading infinito

### 3. Todos os 4 fluxos migrados para Storage
- `WorkshopFlowModals.tsx` — usa `uploadServicePhoto`
- `VisitFlowModals.tsx` — usa `uploadServicePhoto` + `humanizeError` no iniciar visita
- `InstallationFlowModals.tsx` — usa `uploadServicePhoto`
- `DeliveryFlowModals.tsx` — usa `uploadServicePhoto` + `humanizeError` na conclusão

### 4. UI adaptada para `__photo_exists__`
- Todos os modais mostram "Foto já registada" com ícone verde quando retomam de DB
- Botão "Tirar Nova" disponível para substituir

### 5. Verificação de erros em INSERTs
- `uploadServicePhoto` verifica erros de upload e de INSERT
- Mensagens de erro claras via `humanizeError` em todos os fluxos
