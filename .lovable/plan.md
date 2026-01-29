
# Plano: Ficha Completa com Histórico de Atividades

## Problema Identificado

A ficha de serviço (ServiceDetailSheet) atualmente mostra informações básicas como fotos, assinaturas e pagamentos **apenas quando existem dados**. Porém, falta uma **seção de Histórico de Atividades** que exiba:

- Quem atribuiu o serviço
- Quem levantou o equipamento (se aplicável)
- Pedidos de peça realizados
- Quando a peça chegou
- Pagamentos registados
- Conclusões do técnico
- Entregas realizadas

Estas informações já estão sendo registadas na tabela `activity_logs` pelo sistema, mas **não estão sendo exibidas na ficha**.

---

## Solução Proposta

### 1. Adicionar Nova Seção "Histórico de Atividades"

Criar uma nova seção na ficha que consulta os `activity_logs` do serviço e exibe uma timeline cronológica de todas as ações realizadas.

### 2. Estrutura Visual

```text
+-------------------------------------------+
| HISTÓRICO DE ATIVIDADES                   |
+-------------------------------------------+
| 29/01/2026 14:30                          |
| [icon] João atribuiu SRV-0001 ao técnico  |
|        Carlos Silva                       |
+-------------------------------------------+
| 29/01/2026 15:45                          |
| [icon] Técnico Carlos começou execução    |
+-------------------------------------------+
| 29/01/2026 16:00                          |
| [icon] Equipamento levantado para oficina |
+-------------------------------------------+
| 30/01/2026 09:00                          |
| [icon] Técnico solicitou peça "Compressor"|
+-------------------------------------------+
```

### 3. Ícones por Tipo de Ação

| Tipo de Ação | Ícone | Cor |
|--------------|-------|-----|
| atribuicao | UserPlus | Azul |
| inicio_execucao | Play | Verde |
| levantamento | Package | Laranja |
| pedido_peca | ShoppingCart | Amarelo |
| peca_chegou | CheckCircle | Verde |
| conclusao | CheckCircle2 | Verde |
| precificacao | DollarSign | Roxo |
| pagamento | CreditCard | Teal |
| entrega | Truck | Verde |

---

## Alterações Técnicas

### Arquivo: `src/components/services/ServiceDetailSheet.tsx`

#### 1. Importar hook useActivityLogs
```typescript
import { useActivityLogs } from '@/hooks/useActivityLogs';
```

#### 2. Adicionar query para buscar activity logs
```typescript
// Fetch activity logs for this service
const { data: activityLogs = [] } = useQuery({
  queryKey: ['activity-logs', service?.id],
  queryFn: async () => {
    if (!service?.id) return [];
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('service_id', service.id)
      .order('created_at', { ascending: true }); // Ordem cronológica
    if (error) throw error;
    return data;
  },
  enabled: !!service?.id && open,
});
```

#### 3. Adicionar nova seção "Histórico de Atividades"

Inserir após a seção "Histórico" existente (linha ~648) uma nova seção com timeline de atividades:

```typescript
{/* Activity History Timeline */}
{activityLogs.length > 0 && (
  <Section 
    title="Histórico de Atividades" 
    bgColor="bg-slate-50"
    borderColor="border-l-slate-500"
  >
    <div className="space-y-3">
      {activityLogs.map((log) => (
        <ActivityLogItem key={log.id} log={log} />
      ))}
    </div>
  </Section>
)}
```

#### 4. Criar componente ActivityLogItem

Componente interno que renderiza cada entrada do log com ícone apropriado, descrição e timestamp.

---

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| Histórico só mostra criado/atualizado | Timeline completa de todas as ações |
| Sem informação de quem fez o quê | Cada ação com actor, descrição e data |
| Instalações sem detalhes | Todas as fichas com histórico completo |

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/services/ServiceDetailSheet.tsx` | Adicionar query de activity_logs e nova seção "Histórico de Atividades" com timeline visual |

---

## Benefícios

1. **Rastreabilidade completa**: Quem fez o quê e quando
2. **Transparência**: Cliente pode ver todo o histórico se necessário
3. **Auditoria**: Dono pode verificar todas as ações no serviço
4. **Consistência**: Todas as fichas (instalação, entrega, visita, oficina) terão o mesmo nível de detalhe
