

# Plano: Corrigir Página em Branco da Ficha + Reformular Etiqueta para Histórico Interno

## Problema Identificado

1. **"Ver Ficha" abre página em branco**: A rota `/print/service/:serviceId` está protegida por `ProtectedRoute`, mas ao abrir em nova aba com `window.open()`, a sessão de autenticação não está a ser propagada corretamente. A página carrega antes do Supabase restaurar a sessão, resultando em redirect para `/login` ou conteúdo vazio.

2. **Etiqueta deve mostrar histórico interno para técnicos**: O QR code da etiqueta deve apontar para uma página interna com dados completos do serviço + cliente + histórico (exige login), não apenas o status simplificado.

3. **Acesso universal para técnicos**: Qualquer técnico autenticado deve conseguir ler o QR e ver o histórico completo, não apenas o técnico atribuído.

---

## Causa Raiz da Página em Branco

A rota `/print/service/:serviceId` é protegida mas está **fora do AppLayout**, então ao abrir numa nova aba:

1. `window.open()` cria uma nova instância do browser
2. O Supabase SDK tenta restaurar a sessão do `localStorage`
3. Enquanto `loading === true`, mostra spinner
4. Se `loading` termina antes da sessão ser validada → redireciona para `/login` ou mostra vazio

**Solução**: A página de impressão deve aguardar correctamente a restauração da sessão. Verificar que o `ProtectedRoute` tem fallback adequado durante loading.

---

## Ficheiros a Alterar

| Ficheiro | Acao | Descricao |
|----------|------|-----------|
| `src/pages/ServicePrintPage.tsx` | Alterar | Aguardar auth antes de fazer query |
| `src/pages/ServiceTagPage.tsx` | Alterar | QR aponta para ServiceDetailSheet interno |
| `src/App.tsx` | Alterar | Adicionar rota `/service-detail/:serviceId` para colaboradores |
| `src/pages/ServiceDetailPage.tsx` | **Criar** | Pagina dedicada para historico interno (colaboradores) |
| `src/components/auth/ProtectedRoute.tsx` | Verificar | Garantir que loading mostra spinner adequado |
| Supabase RLS | Alterar | Permitir todos tecnicos verem qualquer servico |

---

## Detalhes Tecnicos

### 1. ServicePrintPage.tsx - Corrigir Pagina em Branco

O problema esta em que a query corre antes de confirmar autenticacao. Adicionar verificacao:

```typescript
import { useAuth } from '@/contexts/AuthContext';

export default function ServicePrintPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { serviceId } = useParams();
  
  // Esperar autenticacao antes de fazer query
  const { data: service, isLoading: loadingService, error } = useQuery({
    queryKey: ['service-print', serviceId],
    queryFn: async () => {
      // ... fetch logic
    },
    enabled: !!serviceId && isAuthenticated && !authLoading, // <-- Adicionar
  });
  
  // Mostrar loading enquanto auth carrega
  if (authLoading) {
    return (
      <div className="print-page">
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }
}
```

### 2. ServiceTagPage.tsx - Mesma Correcao

Aplicar o mesmo padrao para a pagina de etiqueta.

### 3. ServiceDetailPage.tsx - Nova Pagina de Historico Interno

Criar pagina dedicada para visualizacao completa do servico por colaboradores (via QR):

```text
URL: /service-detail/:serviceId
Acesso: Qualquer colaborador autenticado (dono, secretaria, tecnico)
Conteudo:
- Dados do cliente
- Dados do equipamento
- Estado atual
- Historico de atividades (activity_logs)
- Fotos capturadas
- Assinaturas recolhidas
- Pecas utilizadas/pedidas
- Pagamentos (se nao for tecnico, ou se for permitido ver)

Layout: Similar ao ServiceDetailSheet mas em pagina completa
```

**Estrutura Visual**:
```text
+------------------------------------------+
| <- Voltar          TECNOFRIO      [Print]|
+------------------------------------------+
| TF-00123                                 |
| Estado: Em Execucao [badge]              |
+------------------------------------------+
|                                          |
| CLIENTE                                  |
| Nome: Joao Silva                         |
| Telefone: 912 345 678                    |
| Morada: Rua X, 123                       |
+------------------------------------------+
| EQUIPAMENTO                              |
| Tipo: Frigorifico                        |
| Marca: Samsung                           |
| Modelo: RT38K                            |
| Avaria: Nao faz frio                     |
+------------------------------------------+
| HISTORICO                                |
| 03/02 10:00 - Servico criado             |
| 03/02 11:00 - Tecnico atribuido          |
| 03/02 14:30 - Visita realizada           |
| ...                                      |
+------------------------------------------+
| FOTOS (3)                                |
| [img] [img] [img]                        |
+------------------------------------------+
| ASSINATURAS                              |
| [sig] Recolha - Joao Silva 03/02         |
+------------------------------------------+
```

### 4. ServiceTagPage.tsx - QR Aponta para Historico Interno

Mudar o URL do QR code:

```typescript
// Antes:
const qrUrl = `${window.location.origin}/service/${serviceId}`;

// Depois:
const qrUrl = `${window.location.origin}/service-detail/${serviceId}`;
```

Isto faz com que ao ler o QR, o colaborador seja levado para a pagina de historico completo (exige login).

### 5. App.tsx - Nova Rota

```typescript
// Adicionar dentro do AppLayout protegido:
<Route path="/service-detail/:serviceId" element={<ServiceDetailPage />} />
```

### 6. RLS - Permitir Todos Tecnicos Verem Qualquer Servico

Atualmente a funcao `can_access_service` ja permite acesso a qualquer dono/secretaria/tecnico atribuido. Para permitir **todos os tecnicos**, precisamos modificar:

```sql
-- Funcao atualizada
CREATE OR REPLACE FUNCTION public.can_access_service(_service_id uuid, _user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    public.is_dono(_user_id) OR 
    public.is_secretaria(_user_id) OR 
    public.is_tecnico(_user_id)  -- Qualquer tecnico pode ver qualquer servico
$function$
```

**Nota**: Se preferir manter restricao por atribuicao, nao alterar a funcao e usar acesso direto sem can_access_service para esta pagina especifica.

---

## Resumo de Alteracoes

| Ficheiro | Tipo | Descricao |
|----------|------|-----------|
| `src/pages/ServicePrintPage.tsx` | Alterar | +10 linhas (aguardar auth) |
| `src/pages/ServiceTagPage.tsx` | Alterar | +10 linhas (aguardar auth) + mudar URL QR |
| `src/pages/ServiceDetailPage.tsx` | **Criar** | ~250 linhas |
| `src/App.tsx` | Alterar | +1 rota |
| Supabase RLS | Alterar | Permitir todos tecnicos |

**Total: 4 ficheiros alterados + 1 novo + 1 migracao SQL**

---

## Resultado Esperado

1. **Pagina de Ficha (Ver Ficha)**: Nunca mais aparece em branco - aguarda auth antes de carregar
2. **Pagina de Etiqueta (Ver Etiqueta)**: Nunca mais aparece em branco - aguarda auth antes de carregar
3. **QR Code da Etiqueta**: Aponta para `/service-detail/:id` com historico completo
4. **Acesso Universal**: Qualquer tecnico autenticado pode ler QR e ver historico de qualquer servico
5. **Cliente (pagina publica)**: Mantem-se `/service/:id` para consulta simplificada de status (se necessario separar)

---

## Pagina de Consulta do Cliente

A pagina `/service/:id` (ServiceConsultPage) continuara a existir para clientes finais. O QR da etiqueta agora aponta para a versao interna, mas podemos criar uma segunda versao da etiqueta (cliente) se necessario no futuro.

**Fluxo Final**:
- Etiqueta Tecnico: QR → `/service-detail/:id` → Historico interno (requer login)
- Link para Cliente: Pode ser gerado separadamente se necessario

