

# Plano: Sistema de Permissões para Câmara e Galeria

## Problema Identificado

Actualmente, quando o modal de câmara abre, tenta aceder directamente ao `getUserMedia()` sem:
1. Verificar primeiro o estado das permissões
2. Guiar o utilizador sobre como conceder permissões se negadas
3. Ter uma estratégia de fallback clara para dispositivos móveis

---

## Solução Proposta

### 1. Criar Hook de Permissões de Câmara

**Ficheiro:** `src/hooks/useCameraPermissions.ts` (NOVO)

Hook dedicado para gerir permissões de câmara com:
- Verificação do estado actual da permissão (`granted`, `denied`, `prompt`)
- Função para solicitar permissão
- Listener para mudanças de estado
- Detecção de suporte do browser

```typescript
interface CameraPermissionState {
  status: 'checking' | 'granted' | 'denied' | 'prompt' | 'unsupported';
  isSupported: boolean;
  canRequest: boolean;
}

export function useCameraPermissions() {
  const [state, setState] = useState<CameraPermissionState>({
    status: 'checking',
    isSupported: false,
    canRequest: false,
  });

  // Verificar suporte e estado da permissão
  // Listener para mudanças
  // Função requestPermission()
  
  return { ...state, requestPermission };
}
```

---

### 2. Actualizar CameraCapture.tsx

**Alterações principais:**

#### 2.1 Verificar Permissão Antes de Iniciar

Antes de chamar `getUserMedia()`, verificar o estado:

```typescript
// Verificar estado da permissão primeiro
const checkPermission = async () => {
  if (navigator.permissions && navigator.permissions.query) {
    try {
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
      return result.state; // 'granted', 'denied', 'prompt'
    } catch {
      return 'unknown';
    }
  }
  return 'unknown';
};
```

#### 2.2 Fluxo de Permissão Melhorado

```text
1. Modal abre
2. Verificar se browser suporta mediaDevices
3. Verificar estado da permissão:
   - 'granted' → Iniciar câmara directamente
   - 'prompt' → Mostrar ecrã explicativo + botão "Permitir Câmara"
   - 'denied' → Mostrar instruções para activar nas definições
   - 'unknown' → Tentar iniciar (trigger nativo do browser)
4. Se falhar → Mostrar opção de upload como alternativa
```

#### 2.3 Ecrã de Solicitação de Permissão

Novo estado `permissionState` com UI dedicada:

```typescript
{permissionState === 'prompt' && (
  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
    <Camera className="h-16 w-16 text-blue-500 mb-4" />
    <h3 className="text-lg font-semibold mb-2">Acesso à Câmara</h3>
    <p className="text-sm text-muted-foreground mb-4">
      Para tirar fotos, precisamos de permissão para aceder à câmara do dispositivo.
    </p>
    <Button onClick={requestCameraAccess} className="gap-2">
      <Camera className="h-4 w-4" />
      Permitir Acesso à Câmara
    </Button>
  </div>
)}
```

#### 2.4 Ecrã de Permissão Negada

```typescript
{permissionState === 'denied' && (
  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
    <X className="h-16 w-16 text-red-500 mb-4" />
    <h3 className="text-lg font-semibold mb-2">Permissão Negada</h3>
    <p className="text-sm text-muted-foreground mb-4">
      O acesso à câmara foi bloqueado. Para usar a câmara:
    </p>
    <div className="text-left text-sm bg-muted p-3 rounded-lg mb-4">
      <p className="font-medium mb-1">📱 No telemóvel:</p>
      <p className="text-muted-foreground mb-2">
        Definições → Aplicações → Browser → Permissões → Câmara
      </p>
      <p className="font-medium mb-1">💻 No computador:</p>
      <p className="text-muted-foreground">
        Clique no ícone 🔒 na barra de endereço → Permissões → Câmara
      </p>
    </div>
    <Button variant="outline" onClick={triggerFileUpload} className="gap-2">
      <Upload className="h-4 w-4" />
      Usar Galeria em vez
    </Button>
  </div>
)}
```

---

### 3. Input de Ficheiro Melhorado para Mobile

O input de ficheiro actual já tem `capture="environment"`, que em dispositivos móveis abre directamente a câmara nativa.

**Melhoria:** Adicionar dois botões separados para clareza:

```typescript
// Opção 1: Câmara nativa (abre câmara do sistema)
<input
  ref={cameraInputRef}
  type="file"
  accept="image/*"
  capture="environment"
  className="hidden"
  onChange={handleFileUpload}
/>

// Opção 2: Galeria (abre seletor de ficheiros)
<input
  ref={galleryInputRef}
  type="file"
  accept="image/*"
  className="hidden"
  onChange={handleFileUpload}
/>

// Botões na UI
<Button onClick={() => cameraInputRef.current?.click()}>
  <Camera /> Tirar Foto
</Button>
<Button onClick={() => galleryInputRef.current?.click()}>
  <ImageIcon /> Da Galeria
</Button>
```

---

### 4. Estratégia Híbrida (Melhor UX)

Para garantir que funciona em todos os dispositivos:

```text
Fluxo Principal:
┌─────────────────────────────────────────┐
│           MODAL ABRE                    │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Browser suporta mediaDevices.getUserMedia?│
└─────────────────┬───────────────────────┘
         ┌────────┴────────┐
         │ SIM             │ NÃO
         ▼                 ▼
┌─────────────────┐  ┌─────────────────┐
│Verificar permissão│ │ Mostrar opções  │
│navigator.permissions│ │ de upload/galeria│
└────────┬────────┘  └─────────────────┘
         │
    ┌────┴────┬──────────┐
    ▼         ▼          ▼
 granted   prompt     denied
    │         │          │
    ▼         ▼          ▼
 Iniciar   Mostrar    Mostrar
 câmara    botão de   instruções
 directo   permissão  + fallback
```

---

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/hooks/useCameraPermissions.ts` | NOVO - Hook de gestão de permissões |
| `src/components/shared/CameraCapture.tsx` | Integrar hook, UI de permissões, fallbacks |

---

## Secção Técnica

### API de Permissões

```typescript
// Verificar suporte
const hasPermissionsAPI = 'permissions' in navigator;

// Query estado actual
const result = await navigator.permissions.query({ name: 'camera' });
// result.state: 'granted' | 'denied' | 'prompt'

// Escutar mudanças
result.addEventListener('change', () => {
  console.log('Permissão mudou para:', result.state);
});
```

### Nota sobre Safari/iOS

O Safari não suporta `navigator.permissions.query({ name: 'camera' })`. Nesses casos:
- Fallback para tentar `getUserMedia()` directamente
- O browser mostrará o prompt nativo
- Tratar erro `NotAllowedError` como permissão negada

### Compatibilidade

| Browser | permissions.query('camera') | getUserMedia | input[capture] |
|---------|----------------------------|--------------|----------------|
| Chrome  | ✅ | ✅ | ✅ |
| Firefox | ✅ | ✅ | ✅ |
| Safari  | ❌ | ✅ | ✅ |
| Edge    | ✅ | ✅ | ✅ |
| iOS Safari | ❌ | ✅ | ✅ |

---

## Resultado Final

Após implementação:

1. **Primeira utilização:** Utilizador vê ecrã explicativo com botão "Permitir Câmara"
2. **Permissão concedida:** Câmara inicia automaticamente
3. **Permissão negada:** Instruções claras + opção de galeria
4. **Browser sem suporte:** Fallback automático para upload de ficheiro
5. **Dispositivo móvel:** Input com `capture="environment"` abre câmara nativa

