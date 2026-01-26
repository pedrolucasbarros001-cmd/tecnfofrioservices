
# Plano: Corrigir Flickering/Piscar da Câmara no Mobile

## Problema Identificado

O componente `CameraCapture.tsx` está a sofrer de **re-renderizações excessivas** que causam o efeito de "piscar" (flickering) na câmara e nos botões. Isto acontece devido a:

1. **Ciclos de dependências nos `useEffect`** - As funções `startCamera` e `stopCamera` são recriadas a cada render, e como estão nas dependências do `useEffect`, causam loops infinitos.

2. **Gestão de estado fragmentada** - Múltiplos estados (`isLoading`, `cameraReady`, `permissionState`, `stream`) a mudar quase simultaneamente causam múltiplos re-renders.

3. **Falta de debounce/estabilização** - A câmara tenta iniciar antes de estar completamente pronta.

---

## Solução Proposta

### 1. Usar `useRef` para o Stream (evitar re-renders)

Mover o `stream` de `useState` para `useRef`. Isto evita re-renders desnecessários quando o stream muda.

```typescript
// Antes
const [stream, setStream] = useState<MediaStream | null>(null);

// Depois  
const streamRef = useRef<MediaStream | null>(null);
```

### 2. Remover Dependências Problemáticas do useEffect

Usar referências estáveis em vez de callbacks que mudam.

```typescript
// Antes (problema: startCamera e stopCamera recriam a cada render)
useEffect(() => {
  if (open) {
    startCamera();
  } else {
    stopCamera();
  }
}, [open, status, startCamera, stopCamera]);

// Depois (usar função inline ou mover lógica para dentro)
useEffect(() => {
  if (!open) {
    // Parar câmara inline
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    return;
  }
  // Lógica de iniciar...
}, [open, status]);
```

### 3. Consolidar Estados num Único Estado

Reduzir múltiplos estados para um único estado de máquina:

```typescript
// Antes
const [isLoading, setIsLoading] = useState(false);
const [cameraReady, setCameraReady] = useState(false);
const [error, setError] = useState<string | null>(null);
const [permissionState, setPermissionState] = useState<PermissionStatus>('checking');

// Depois
type CameraState = 
  | { phase: 'checking' }
  | { phase: 'prompt' }
  | { phase: 'loading' }
  | { phase: 'ready' }
  | { phase: 'denied' }
  | { phase: 'unsupported' }
  | { phase: 'error'; message: string }
  | { phase: 'captured'; image: string };

const [cameraState, setCameraState] = useState<CameraState>({ phase: 'checking' });
```

### 4. Adicionar Flag de Montagem para Evitar Updates Após Desmontagem

```typescript
useEffect(() => {
  let isMounted = true;
  
  const initCamera = async () => {
    // ... lógica
    if (isMounted) {
      setCameraState({ phase: 'ready' });
    }
  };
  
  initCamera();
  
  return () => {
    isMounted = false;
    // cleanup
  };
}, [open]);
```

### 5. Adicionar Delay para Estabilização da Câmara

Garantir que o vídeo está a reproduzir antes de mostrar a UI de captura:

```typescript
videoRef.current.onloadedmetadata = () => {
  videoRef.current?.play()
    .then(() => {
      // Pequeno delay para estabilizar
      setTimeout(() => {
        if (isMounted) {
          setCameraState({ phase: 'ready' });
        }
      }, 300);
    });
};
```

---

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/shared/CameraCapture.tsx` | Refactoring completo da gestão de estado |

---

## Código Refactorado Principal

### Nova Estrutura de Estado

```typescript
type CameraPhase = 
  | 'idle'
  | 'checking'
  | 'prompt'
  | 'loading'
  | 'ready'
  | 'denied'
  | 'unsupported'
  | 'error'
  | 'captured';

interface CameraState {
  phase: CameraPhase;
  errorMessage?: string;
  capturedImage?: string;
}
```

### Hook useEffect Simplificado

```typescript
useEffect(() => {
  if (!open) {
    // Cleanup ao fechar
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setState({ phase: 'idle' });
    return;
  }

  let isMounted = true;
  
  const initCamera = async () => {
    // Verificar suporte
    if (!navigator.mediaDevices?.getUserMedia) {
      if (isMounted) setState({ phase: 'unsupported' });
      return;
    }

    // Verificar permissão
    if (status === 'denied') {
      if (isMounted) setState({ phase: 'denied' });
      return;
    }

    if (status === 'prompt' || status === 'checking') {
      if (isMounted) setState({ phase: 'prompt' });
      return;
    }

    // Tentar iniciar câmara
    if (isMounted) setState({ phase: 'loading' });
    
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      
      if (!isMounted) {
        mediaStream.getTracks().forEach(t => t.stop());
        return;
      }
      
      streamRef.current = mediaStream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
        
        // Delay de estabilização
        await new Promise(resolve => setTimeout(resolve, 200));
        
        if (isMounted) setState({ phase: 'ready' });
      }
    } catch (err) {
      if (!isMounted) return;
      
      if ((err as Error).name === 'NotAllowedError') {
        setState({ phase: 'denied' });
      } else {
        setState({ phase: 'error', errorMessage: 'Não foi possível aceder à câmara.' });
      }
    }
  };

  initCamera();

  return () => {
    isMounted = false;
  };
}, [open, status]); // Dependências mínimas e estáveis
```

---

## Secção Técnica: Detalhes de Implementação

### Por que o flickering acontece?

1. **Dependências Instáveis**: Funções como `startCamera` e `stopCamera` criadas com `useCallback` dependem de estados que mudam, recriando-as a cada mudança.

2. **Efeito Cascata**:
   ```
   open=true → startCamera() chamado → 
   setIsLoading(true) → re-render → 
   startCamera recriado → useEffect dispara novamente →
   startCamera() chamado OUTRA VEZ → loop!
   ```

3. **Múltiplos setStates Rápidos**:
   ```typescript
   // Cada um destes causa um re-render
   setIsLoading(true);      // render 1
   setCameraReady(false);   // render 2
   setError(null);          // render 3
   // ...câmara pronta...
   setStream(mediaStream);  // render 4
   setCameraReady(true);    // render 5
   setIsLoading(false);     // render 6
   ```

### Solução: Batching de Estado

React 18 faz batching automático, mas dentro de `async/await` pode falhar. A solução é usar um único estado:

```typescript
// Um único setState = um único re-render
setState({ phase: 'ready' });
```

### Benefícios da Refactoração

1. **Performance**: Menos re-renders = UI mais fluída
2. **Previsibilidade**: Estado de máquina claro
3. **Manutenção**: Código mais fácil de debugar
4. **Mobile**: Comportamento estável em dispositivos com menos recursos

---

## Resultado Esperado

Após a implementação:

1. A câmara abre sem piscar
2. Os botões ficam estáveis
3. A transição entre estados é suave
4. Funciona correctamente em dispositivos móveis
5. O fallback para galeria continua a funcionar
