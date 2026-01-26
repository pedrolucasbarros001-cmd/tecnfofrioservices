

# Plano: Corrigir TV Monitor - Exibir Servicos da Oficina

## Problema Identificado

O TV Monitor (`/tv-monitor`) e uma rota **publica** (sem autenticacao), mas a tabela `services` tem politicas RLS que exigem autenticacao:

```sql
-- Politica atual:
"Dono and secretaria see all services, tecnico sees assigned"
USING (is_dono(auth.uid()) OR is_secretaria(auth.uid()) OR ...)
```

Quando um utilizador acede ao monitor sem estar autenticado, `auth.uid()` retorna `NULL`, e a query nao devolve resultados.

---

## Solucao: Policy RLS Publica para Servicos na Oficina

Adicionar uma nova policy RLS que permita leitura publica APENAS de servicos que estao na oficina:

```sql
CREATE POLICY "Public read for workshop services on TV monitor"
  ON public.services FOR SELECT
  TO anon, authenticated
  USING (
    service_location = 'oficina' 
    AND status IN ('na_oficina', 'em_execucao', 'para_pedir_peca', 'em_espera_de_peca', 'concluidos')
  );
```

Esta policy e segura porque:
- So permite leitura (SELECT), nao escrita
- So expoe servicos na oficina (nao servicos no cliente)
- So expoe servicos em estados operacionais (nao finalizados)

---

## Alteracoes no TVMonitorPage.tsx

### 1. Manter Query Existente (ja correta)

A query ja filtra corretamente por `service_location = 'oficina'` e pelos status relevantes.

### 2. Organizar por Seccoes (Status)

Em vez de mostrar todos os cards misturados, organizar por seccoes:

```text
┌─────────────────────────────────────────────────────────────────┐
│ TECNOFRIO        Monitor da Oficina              15:32:45      │
├─────────────────────────────────────────────────────────────────┤
│ [Em Exec: 2] [Na Oficina: 3] [Pedir Peca: 1] [Espera: 2] [Conc: 4]│
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ━━━━━━━━━━━ EM EXECUCAO ━━━━━━━━━━━                              │
│ ┌──────────────────┐ ┌──────────────────┐                       │
│ │    TF-00045      │ │    TF-00048      │                       │
│ │ Joao Silva       │ │ Ana Costa        │                       │
│ └──────────────────┘ └──────────────────┘                       │
│                                                                  │
│ ━━━━━━━━━━━ NA OFICINA (Disponiveis) ━━━━━━━━━━━                 │
│ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐  │
│ │    TF-00046      │ │    TF-00049      │ │    TF-00050      │  │
│ │ ⚡ DISPONIVEL    │ │ ⚡ DISPONIVEL    │ │ Pedro Costa      │  │
│ └──────────────────┘ └──────────────────┘ └──────────────────┘  │
│                                                                  │
│ ━━━━━━━━━━━ PARA PEDIR PECA ━━━━━━━━━━━                          │
│ ┌──────────────────┐                                             │
│ │    TF-00047      │                                             │
│ │ Maria Santos     │                                             │
│ └──────────────────┘                                             │
│                                                                  │
│ ━━━━━━━━━━━ CONCLUIDOS (Prontos para Entrega) ━━━━━━━━━━━        │
│ ┌──────────────────┐ ┌──────────────────┐                       │
│ │    TF-00043      │ │    TF-00044      │                       │
│ │ Antonio Pereira  │ │ Carlos Mendes    │                       │
│ └──────────────────┘ └──────────────────┘                       │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ 📋 Atividades Recentes                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Ficheiros a Modificar

| Ficheiro | Acao | Descricao |
|----------|------|-----------|
| Migracao SQL | Criar | Policy RLS publica para servicos da oficina |
| Migracao SQL | Criar | Policy RLS publica para activity_logs (is_public = true) |
| `src/pages/TVMonitorPage.tsx` | Modificar | Organizar cards por seccoes de status |

---

## Seccao Tecnica

### 1. Migracao SQL - Policies Publicas

```sql
-- Permitir leitura publica de servicos na oficina
CREATE POLICY "Public read for workshop services on TV monitor"
  ON public.services FOR SELECT
  TO anon, authenticated
  USING (
    service_location = 'oficina' 
    AND status IN ('na_oficina', 'em_execucao', 'para_pedir_peca', 'em_espera_de_peca', 'concluidos')
  );

-- Permitir leitura publica de activity_logs publicos
-- (ja existe policy similar, mas garantir para anon)
CREATE POLICY "Public activity logs viewable by anyone"
  ON public.activity_logs FOR SELECT
  TO anon, authenticated
  USING (is_public = true);
```

### 2. TVMonitorPage.tsx - Estrutura por Seccoes

```typescript
// Definir ordem e labels das seccoes
const MONITOR_SECTIONS = [
  { status: 'em_execucao', label: 'Em Execucao', icon: Play },
  { status: 'na_oficina', label: 'Na Oficina (Disponiveis)', icon: Building2 },
  { status: 'para_pedir_peca', label: 'Para Pedir Peca', icon: Package },
  { status: 'em_espera_de_peca', label: 'Em Espera de Peca', icon: Clock },
  { status: 'concluidos', label: 'Concluidos (Prontos)', icon: CheckCircle },
];

// Renderizar seccoes
{MONITOR_SECTIONS.map(section => {
  const sectionServices = groupedServices[section.status] || [];
  if (sectionServices.length === 0) return null;
  
  return (
    <div key={section.status} className="mb-8">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-4 border-b border-slate-700 pb-2">
        <section.icon className="h-6 w-6 text-slate-400" />
        <h2 className="text-xl font-bold text-slate-300">
          {section.label}
        </h2>
        <Badge>{sectionServices.length}</Badge>
      </div>
      
      {/* Section Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sectionServices.map(service => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </div>
    </div>
  );
})}
```

### 3. Manter Compatibilidade com Codigos Existentes

Os servicos existentes com codigo "OS-" continuam visiveis. A query nao filtra por prefixo de codigo.

---

## Consideracoes de Seguranca

1. **Dados Expostos**: Apenas servicos fisicamente na oficina sao visiveis
2. **Campos Sensiveis**: O monitor mostra apenas:
   - Codigo do servico (TF-XXXXX)
   - Nome do cliente
   - Tipo de equipamento
   - Status
   - Tecnico atribuido
3. **Sem Dados Financeiros**: Precos, pagamentos e debitos NAO sao expostos
4. **Sem Dados Pessoais**: Telefones, emails e enderecos NAO sao expostos

---

## Resultado Esperado

1. **TV Monitor Publico**:
   - Acesso sem login em `/tv-monitor`
   - Exibe todos os servicos na oficina
   - Organizado por seccoes de status
   - Cards grandes e legiveis

2. **Seccoes Visiveis**:
   - Em Execucao (servicos sendo trabalhados)
   - Na Oficina (disponiveis ou com tecnico)
   - Para Pedir Peca
   - Em Espera de Peca
   - Concluidos (prontos para entrega)

3. **Feed de Atividades**:
   - Mostra apenas logs com `is_public = true`
   - Atualiza a cada 10 segundos

