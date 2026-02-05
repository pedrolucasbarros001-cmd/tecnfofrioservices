

# Plano: Remover Histórico da Oficina ADM + Push Notifications Nativas

## Objectivo
1. **Remover** a secção "Histórico de Atividades" da página `/oficina` (administrador)
2. **Manter** o feed de atividades na página `/tv-monitor` (já está no footer)
3. **Implementar Push Notifications** para que os utilizadores recebam alertas reais nos telemóveis

---

## Parte 1: Remover Histórico da Página Oficina (Admin)

### Alterações em `src/pages/OficinaPage.tsx`

**Remover:**
- Importação do hook `useActivityLogs`
- Query `const { data: activityLogs = [] } = useActivityLogs({ limit: 10 });`
- Toda a secção `<Card>` do "Histórico de Atividades" (linhas 208-242)

**Resultado:** A página ficará apenas com o grid de serviços e botões de acção.

---

## Parte 2: Push Notifications Nativas

### Arquitectura

```text
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│  Supabase DB     │────▶│  Edge Function  │
│   (Browser)     │     │  (notifications) │     │  (send-push)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                                                │
        │ 1. Request Permission                          │
        │ 2. Get Push Subscription                       │
        │ 3. Store subscription in DB                    │
        │                                                ▼
        │                                        ┌─────────────────┐
        │◀───────────────────────────────────────│  Web Push API   │
        │            Push Notification           │  (Firebase/etc) │
        └────────────────────────────────────────└─────────────────┘
```

### Componentes a Criar

#### 1. Nova tabela `push_subscriptions`
```sql
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, endpoint)
);
```

#### 2. Service Worker (`public/sw.js`)
```javascript
self.addEventListener('push', function(event) {
  const data = event.data?.json() || {};
  const options = {
    body: data.message,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: { url: data.url || '/' }
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'TECNOFRIO', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
```

#### 3. Hook `usePushNotifications.ts`
```typescript
// Responsável por:
// - Verificar suporte do browser
// - Pedir permissão
// - Registar service worker
// - Obter subscription
// - Guardar subscription na BD
```

#### 4. Componente de prompt para permissão
Mostrar um banner/toast amigável pedindo permissão na primeira vez que o utilizador entra.

#### 5. Edge Function `send-push`
Quando uma notificação é criada na BD, envia push para os dispositivos registados.

#### 6. Database Trigger
Trigger que chama a edge function quando INSERT em `notifications`.

---

## Ficheiros a Criar/Alterar

| Ficheiro | Acção | Descrição |
|----------|-------|-----------|
| `src/pages/OficinaPage.tsx` | Alterar | Remover secção de histórico |
| `public/sw.js` | Criar | Service Worker para push |
| `src/hooks/usePushNotifications.ts` | Criar | Hook para gerir push |
| `src/components/shared/PushPermissionBanner.tsx` | Criar | Banner para pedir permissão |
| `src/components/layouts/AppLayout.tsx` | Alterar | Integrar banner de push |
| `supabase/functions/send-push/index.ts` | Criar | Edge function para enviar push |
| Migração SQL | Criar | Tabela push_subscriptions + trigger |

---

## Fluxo de Implementação

### Etapa 1: Remover Histórico da Oficina
- Alterar `OficinaPage.tsx`

### Etapa 2: Infraestrutura Push
- Criar tabela `push_subscriptions`
- Criar Service Worker
- Criar hook `usePushNotifications`

### Etapa 3: UI de Permissão
- Criar banner/componente de permissão
- Integrar no AppLayout

### Etapa 4: Envio de Push
- Criar edge function `send-push`
- Configurar trigger na tabela `notifications`
- Gerar VAPID keys para Web Push

---

## Notas Técnicas

### VAPID Keys
Para Web Push funcionar, precisamos de gerar um par de chaves VAPID:
- Chave pública: será usada no frontend
- Chave privada: será um secret na edge function

### Compatibilidade
- Push Notifications funcionam em:
  - Chrome (Android/Desktop)
  - Firefox (Desktop/Android)
  - Safari 16+ (macOS/iOS 16.4+)
  - Edge

### Permissões
O browser só permite pedir permissão após interacção do utilizador (clique).

---

## Resultado Esperado

1. ✅ Página Oficina (admin) sem o card de histórico de atividades
2. ✅ Monitor TV mantém o feed de atividades no footer
3. ✅ Utilizadores podem receber notificações push nos telemóveis
4. ✅ Banner amigável pede permissão (uma vez)
5. ✅ Notificações do sistema (peça chegou, serviço atribuído, etc.) aparecem como push

