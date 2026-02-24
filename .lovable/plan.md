

# Plano: Migrar Fotos para Storage e Eliminar Bloqueios nos Fluxos

## Diagnostico Final

Analisei a base de dados real e o codigo de todos os fluxos. O problema raiz que causa TODOS os sintomas reportados e um so:

**As fotos sao guardadas como base64 de 4.5MB diretamente na tabela `service_photos`.**

Isto causa uma reacao em cadeia:

```text
Tecnico abre servico
  -> deriveStepFromDb() busca file_url de TODAS as fotos
  -> 3 fotos = 15MB de transferencia so para saber "em que passo retomar"
  -> Timeout / loading infinito
  -> isResuming = true para sempre
  -> Botoes de "Iniciar" ficam desativados
  -> Tecnico nao consegue fazer nada
```

**Prova da base de dados (dados reais):**

| foto | tamanho |
|---|---|
| estado | 4,545,135 bytes (4.5MB) |
| etiqueta | 4,532,815 bytes (4.5MB) |
| aparelho | 4,892,883 bytes (4.9MB) |

Enquanto isso, o `TechnicianServiceSheet` (painel de observacoes) JA usa o padrao correto: upload para o bucket `service-photos` do Storage, guardando apenas o URL publico (~100 bytes).

## Solucao

### 1. Criar utilitario centralizado de upload (NOVO ficheiro)

**Ficheiro:** `src/utils/photoUpload.ts`

Funcao reutilizavel que:
- Converte base64 para Blob
- Faz upload para o bucket `service-photos` (ja existe, ja e publico)
- Retorna o URL publico (~100 bytes)

Baseia-se no codigo ja existente no `TechnicianServiceSheet` (linhas 96-126), extraido para ser reutilizado em todos os fluxos.

```text
Base64 (4.5MB) -> Blob -> Storage bucket -> URL publico (100 bytes)
```

### 2. Remover fetch de file_url no deriveStepFromDb

**Ficheiro:** `src/hooks/useFlowPersistence.ts`

O bloco das linhas 93-104 busca `file_url` (os base64 gigantes) da tabela `service_photos` so para preencher `formDataOverrides`. Isto e completamente desnecessario -- a logica de "em que passo retomar" so precisa saber SE a foto existe (ja disponivel na primeira query de metadata, linha 44-53).

**Antes (linhas 93-104):** Segunda query que busca `file_url` com 4.5MB cada
**Depois:** Usar marcador `__photo_exists__` construido a partir da metadata ja carregada. Zero transferencia extra.

Adicionalmente, envolver o `deriveStepFromDb` num timeout de 8 segundos para que, mesmo que algo falhe, o `isResuming` nunca fique bloqueado eternamente.

### 3. Migrar TODOS os fluxos para usar Storage

**4 ficheiros afetados:**

| Ficheiro | Onde muda |
|---|---|
| `WorkshopFlowModals.tsx` | onCapture da camera (linhas 1009-1040) |
| `VisitFlowModals.tsx` | handlePhotoCapture (linhas 233-261) |
| `InstallationFlowModals.tsx` | handlePhotoCapture (linhas 152-176) |
| `DeliveryFlowModals.tsx` | handlePhotoCapture (linhas 140-157) |

**Padrao atual (todos iguais):**
```typescript
await supabase.from("service_photos").insert({
  file_url: imageData, // 4.5MB base64 direto na BD!
});
setFormData(prev => ({ ...prev, photoAparelho: imageData })); // 4.5MB no state!
```

**Padrao novo:**
```typescript
import { uploadServicePhoto } from '@/utils/photoUpload';

const publicUrl = await uploadServicePhoto(service.id, imageData, photoType, description);
setFormData(prev => ({ ...prev, photoAparelho: publicUrl })); // 100 bytes no state
```

### 4. Adaptar UI para marcador `__photo_exists__`

Nos modais, quando `formData.photoAparelho === '__photo_exists__'` (retomando de DB sem localStorage), mostrar indicador "Foto ja registada" em vez de tentar renderizar um `<img src="__photo_exists__">`.

Padrao simples nos componentes de foto:
```typescript
const hasRealUrl = photo && photo !== '__photo_exists__';
const photoExists = photo === '__photo_exists__';

{hasRealUrl ? <img src={photo} /> : photoExists ? <span>Foto ja registada</span> : <Button>Tirar Foto</Button>}
```

### 5. Adicionar verificacao de erro em INSERTs criticos

Varios INSERT de fotos e assinaturas nao verificam o resultado. Se o INSERT falhar (rede, RLS), o fluxo continua como se nada fosse e o dado perde-se.

**Antes:**
```typescript
await supabase.from("service_photos").insert({...});
// sem verificacao - falha silenciosa
```

**Depois:**
```typescript
const { error } = await supabase.from("service_photos").insert({...});
if (error) throw error;
```

### 6. Corrigir mensagem de erro generica no VisitFlowModals

**Ficheiro:** `src/components/technician/VisitFlowModals.tsx`, linha 219

```typescript
// DE:
toast.error("Erro ao iniciar visita. Verifique a sua sessão.");
// PARA:
toast.error(humanizeError(error));
```

## Ficheiros Alterados

| Ficheiro | Tipo | Alteracao |
|---|---|---|
| `src/utils/photoUpload.ts` | NOVO | Helper centralizado de upload para Storage |
| `src/hooks/useFlowPersistence.ts` | EDIT | Remover fetch de file_url + timeout de 8s + usar `__photo_exists__` |
| `src/components/technician/WorkshopFlowModals.tsx` | EDIT | Usar uploadServicePhoto + UI foto existente + error check |
| `src/components/technician/VisitFlowModals.tsx` | EDIT | Usar uploadServicePhoto + UI foto existente + error check + humanizeError |
| `src/components/technician/InstallationFlowModals.tsx` | EDIT | Usar uploadServicePhoto + UI foto existente + error check |
| `src/components/technician/DeliveryFlowModals.tsx` | EDIT | Usar uploadServicePhoto + error check |

## Resultado Esperado

- **"Fica carregando para sempre"**: Eliminado -- deriveStepFromDb deixa de transferir 15-25MB de base64, passa a usar so metadata (poucos KB) + timeout de 8s como seguranca
- **"Erro ao iniciar"**: Eliminado -- sem timeout de rede, sem loading infinito, botao fica ativo imediatamente
- **"Fotos tiradas mas nao aparecem"**: Eliminado -- upload para Storage e fiavel e rapido vs INSERT de 4.5MB via REST API
- **"Botao nao disponivel"**: Eliminado -- isResuming nunca fica preso (timeout garante)
- **"Assinatura registada mas nao envia"**: Eliminado -- erros de INSERT sao capturados e mostrados
- **Performance geral**: Drasticamente melhor -- cada foto ocupa ~100 bytes de URL em vez de 4.5MB de base64
- **Fotos antigas continuam a funcionar**: URLs base64 ja guardados continuam validos como `src` de img
- **Zero impacto funcional**: Mesmos passos, mesma sequencia, mesma experiencia visual

