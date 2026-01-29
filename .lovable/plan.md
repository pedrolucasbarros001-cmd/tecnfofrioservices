
# Plano: Simplificar Layout do Monitor TV

## Problema Actual

O layout actual está visualmente poluído com:
- **7 headers de secção** ("Para Assumir", "Na Oficina", etc.)
- **Mensagens "Nenhum serviço nesta secção"** para cada secção vazia
- **Separação visual excessiva** entre categorias

## Solução: Grid Unificado

Remover os separadores e mostrar todos os serviços num único grid fluido, onde cada card já contém o seu estado através do badge interno.

### Antes vs Depois

```text
┌─────────────────────────────────────────────────────────────┐
│                        ANTES                                 │
├─────────────────────────────────────────────────────────────┤
│  [Cards de contagem: 7 números no topo] ✓                   │
│                                                              │
│  👤 Para Assumir (0)                                        │
│     Nenhum serviço nesta secção                             │
│                                                              │
│  🏢 Na Oficina (1)                                          │
│     [Card OS-00002]                                         │
│                                                              │
│  ▶ Em Execução (0)                                          │
│     Nenhum serviço nesta secção                             │
│                                                              │
│  📦 Para Pedir Peça (0)                                     │
│     Nenhum serviço nesta secção                             │
│                                                              │
│  ... (continua para cada secção)                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                        DEPOIS                                │
├─────────────────────────────────────────────────────────────┤
│  [Cards de contagem: 7 números no topo] ✓ (mantém)          │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ OS-00002 │  │ OS-00003 │  │ OS-00004 │  │ OS-00005 │    │
│  │ Na Ofic. │  │ Em Exec. │  │ Concluído│  │ A Precif.│    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│                                                              │
│  (Grid único com todos os serviços, ordenados)              │
│  (Cada card já mostra o seu estado via badge interno)       │
└─────────────────────────────────────────────────────────────┘
```

---

## Alterações Técnicas

### Ficheiro: `src/pages/TVMonitorPage.tsx`

**Remover a secção de loop por categorias (linhas 316-354) e substituir por grid único:**

```typescript
// ANTES: Loop por MONITOR_SECTIONS com headers
<div className="space-y-6 mb-6">
  {MONITOR_SECTIONS.map((section) => {
    // Header, badge, "Nenhum serviço nesta secção", etc.
  })}
</div>

// DEPOIS: Grid único com todos os serviços
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 mb-6">
  {services.map((service) => (
    <ServiceCard key={service.id} service={service} />
  ))}
</div>
```

**Resultado:**
- Cards de contagem no topo: **mantidos** (informação resumida útil)
- Headers de secção: **removidos**
- "Nenhum serviço nesta secção": **removido**
- Grid de cards: **unificado**, todos os serviços visíveis de uma vez
- Cada card já mostra o seu estado através do badge de status interno

---

## Benefícios

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Legibilidade** | 7 separadores ocupam espaço | Layout limpo e fluido |
| **Espaço** | Muito desperdício | Aproveitamento máximo |
| **Contexto** | Estado visível no header de secção | Estado visível no badge do card |
| **Manutenção** | Código complexo com loops aninhados | Código simples com grid único |
