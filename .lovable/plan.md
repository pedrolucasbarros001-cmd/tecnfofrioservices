## O que vou fazer

Adicionar notificação sonora para todos os utilizadores (telemóvel e computador), com um toggle visível no cabeçalho do painel de Notificações para ligar/desligar.

### 1. Hook `src/hooks/useNotificationSound.ts` (novo)

- Estado `soundEnabled` persistido em `localStorage` (chave `notification-sound-enabled`, default `true`).
- Função `setSoundEnabled(v)` que actualiza estado + localStorage.
- Função `playNotificationSound()` que usa a **Web Audio API** para gerar um bip curto (2 tons agradáveis, ~300ms) — sem ficheiro de áudio, sem dependências, funciona em qualquer browser desktop e mobile.
- Mantém um `AudioContext` singleton lazy. No primeiro toque/click do utilizador (`resume()`) destrava o áudio no iOS/Safari.

### 2. Componente `src/components/shared/NotificationSoundToggle.tsx` (novo)

- Botão ícone pequeno (`Volume2` / `VolumeX` do lucide).
- Toggle do `soundEnabled`. Quando o utilizador activa, toca um bip de teste curto (também serve para "destravar" o áudio em iOS).
- Tooltip "Som de notificação: Ativado/Desativado".

### 3. `src/components/shared/NotificationPanel.tsx`

- Inserir `<NotificationSoundToggle />` no cabeçalho, **entre o badge de contagem e o botão "Marcar todas"** (como na imagem), usando `flex-1 justify-end` para o agrupar à direita junto ao "Marcar todas".

### 4. `src/components/layouts/AppLayout.tsx`

- Adicionar `useEffect` com subscrição Supabase Realtime a `postgres_changes` evento `INSERT` na tabela `notifications` filtrada por `user_id=eq.${user.id}`.
- Quando chega novo registo **e `soundEnabled === true`** → chamar `playNotificationSound()`.
- Cleanup com `supabase.removeChannel`.
- Mantém o `useRealtime('notifications', ...)` existente para invalidar queries — não é alterado.

## Detalhes técnicos

- **Sem ficheiros de áudio**: o bip é sintetizado em runtime (osciladores 880Hz → 660Hz, envelope curto). Evita download de assets e problemas de autoplay com `<audio src>`.
- **Mobile (iOS/Android)**: WebAudio exige gesto do utilizador antes do primeiro `play`. Como a preferência fica persistida e o toggle envolve um clique, o `AudioContext.resume()` é chamado no toggle e está pronto para futuras notificações na sessão.
- **Performance**: a subscrição realtime já existe globalmente no `AppLayout`; só adicionamos um segundo canal específico para o `playSound` (mais simples do que cruzar com o hook existente que só invalida cache).
- **Sem alterações DB / RLS**: a tabela `notifications` e a sua publicação realtime já existem.

## Fora de âmbito

- Notificações push do browser (Web Push API) — exige permissões e Service Worker; podemos abordar separadamente se quiseres.
- Escolha de toques personalizados — fica para iteração futura.

## Ficheiros

- **Novo:** `src/hooks/useNotificationSound.ts`
- **Novo:** `src/components/shared/NotificationSoundToggle.tsx`
- **Editar:** `src/components/shared/NotificationPanel.tsx` (cabeçalho)
- **Editar:** `src/components/layouts/AppLayout.tsx` (subscrição realtime + play)
