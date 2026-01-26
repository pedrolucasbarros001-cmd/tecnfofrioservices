

# Plano: Corrigir Label "Aparelho e Avaria", Cores por Tipo, Remover Botoes e "0"

## Resumo das Alteracoes

Este plano aborda 5 problemas identificados:
1. **Label "Aparelho e Avaria"** - Mudar para label mais generica
2. **Cores por tipo de servico** - Visita (azul), Oficina (laranja), Instalacao (amarelo), Entrega (verde)
3. **Remover botoes "Ver Detalhes" e "Acompanhar"** - Manter apenas acoes contextuais
4. **Remover o "0" na ServiceDetailSheet** - Bug visual encontrado na imagem
5. **Corrigir bugs de layout** - Responsividade e overflow

---

## Alteracao 1: Label "Aparelho e Avaria" para "Descricao"

**Ficheiro:** `src/pages/GeralPage.tsx`

**Linha 209**: Mudar o header da tabela
```tsx
// DE:
<TableHead>Aparelho e Avaria</TableHead>

// PARA:
<TableHead>Descricao</TableHead>
```

---

## Alteracao 2: Cores por Tipo de Servico

**Ficheiro:** `src/pages/GeralPage.tsx`

**Linhas 220-225**: Atualizar a logica de cores na coluna "Tipo"

```tsx
// DE:
{isVisit ? <MapPin className="h-5 w-5 text-blue-500" /> : <Badge variant="secondary" className="text-xs">OFICINA</Badge>}

// PARA: Logica por service_type
const getTypeConfig = (service: Service) => {
  if (service.service_type === 'instalacao') {
    return { label: 'INSTALACAO', color: 'bg-yellow-500 text-black', icon: null };
  }
  if (service.service_type === 'entrega') {
    return { label: 'ENTREGA', color: 'bg-green-500 text-white', icon: null };
  }
  if (service.service_location === 'cliente') {
    return { label: null, color: 'text-blue-500', icon: MapPin };
  }
  return { label: 'OFICINA', color: 'bg-orange-500 text-white', icon: null };
};
```

**Ficheiro:** `src/components/services/ServiceDetailSheet.tsx`

**Linhas 337-341**: Atualizar o badge na seccao "Detalhes do Servico"

```tsx
// DE:
<Badge variant="outline">
  {service.service_location === 'cliente' ? 'VISITA' : 'OFICINA'}
</Badge>

// PARA: Cores corretas baseadas no service_type
// VISITA = azul (border-blue-500)
// OFICINA = laranja (bg-orange-500)
// INSTALACAO = amarelo (bg-yellow-500)
// ENTREGA = verde (bg-green-500)
```

---

## Alteracao 3: Remover Botoes "Ver Detalhes" e "Acompanhar"

**Ficheiro:** `src/components/services/StateActionButtons.tsx`

A logica `getMainAction()` retorna "Ver Detalhes" ou "Acompanhar" em varios casos. Vamos:

1. **Remover "Acompanhar"** (linhas 99-105): Status `em_execucao` retorna `null` em vez do botao
2. **Remover "Ver Detalhes"** como acao principal: Todos os casos que retornam apenas "Ver Detalhes" devem retornar `null`

**Casos a modificar:**
- `por_fazer` com tecnico atribuido (linha 94-97): retornar `null`
- `em_execucao` (linhas 99-105): retornar `null`
- `na_oficina` sem tecnico (linhas 116-120): retornar `null`
- `para_pedir_peca` sem permissao (linhas 131-135): retornar `null`
- `em_espera_de_peca` sem permissao (linhas 146-150): retornar `null`
- `a_precificar` sem permissao (linhas 161-165): retornar `null`
- `concluidos` sem acao (linhas 176-180): retornar `null`
- `em_debito` sem permissao (linhas 191-195): retornar `null`
- `finalizado` (linhas 197-202): retornar `null`
- `default` (linhas 204-209): retornar `null`

**Resultado:** O botao principal so aparece quando ha uma acao contextual real (Atribuir Tecnico, Iniciar, Definir Preco, etc.)

---

## Alteracao 4: Remover o "0" da ServiceDetailSheet

**Ficheiro:** `src/components/services/ServiceDetailSheet.tsx`

Analisando a imagem, o "0" aparece logo apos a seccao "Agendamento" (linha verde) e antes do "HISTORICO". 

Apos revisar o codigo das linhas 378-416, nao vejo onde o "0" esta a ser renderizado. Vou procurar:

**Pesquisa necessaria:** O "0" pode estar a vir de:
- Um campo vazio a ser renderizado
- `delivery_technician_id` ou outro campo numerico
- Algum contador mal formatado

**Localizacao provavel:** Entre as linhas 415-420, pode haver renderizacao de dados de entrega ou contadores que mostram "0" quando vazios.

---

## Alteracao 5: Corrigir Bugs de Layout

**Ficheiros afetados:**

1. **ServiceDetailSheet.tsx**: Garantir que os modais nao causam overflow horizontal
2. **GeralPage.tsx**: Melhorar responsividade da tabela

**Alteracoes especificas:**
- Adicionar `overflow-hidden` onde necessario
- Usar `truncate` em textos longos
- Garantir `max-w-full` em containers

---

## Ficheiros a Modificar

| Ficheiro | Alteracoes |
|----------|------------|
| `src/pages/GeralPage.tsx` | Label "Descricao", cores por tipo no badge |
| `src/components/services/StateActionButtons.tsx` | Remover "Ver Detalhes" e "Acompanhar" como acoes principais |
| `src/components/services/ServiceDetailSheet.tsx` | Badge com cores corretas, remover "0", corrigir layout |

---

## Secao Tecnica

### Mapeamento de Cores por Tipo

| Tipo | service_type | service_location | Cor | Badge |
|------|--------------|------------------|-----|-------|
| Visita | reparacao | cliente | Azul (#3B82F6) | Icone MapPin azul |
| Oficina | reparacao | oficina | Laranja (#F97316) | Badge laranja |
| Instalacao | instalacao | * | Amarelo (#EAB308) | Badge amarelo |
| Entrega | entrega | * | Verde (#22C55E) | Badge verde |

### Logica do StateActionButtons Atualizada

```typescript
const getMainAction = (): ActionConfig | null => {
  switch (service.status as ServiceStatus) {
    case 'por_fazer':
      if (!service.technician_id) {
        return { label: 'Atribuir Tecnico', ... };
      }
      if (isTecnico && onStartExecution) {
        return { label: 'Iniciar', ... };
      }
      return null; // SEM Ver Detalhes

    case 'em_execucao':
      return null; // SEM Acompanhar

    case 'na_oficina':
      if (isTecnico && onStartExecution) {
        return { label: 'Iniciar', ... };
      }
      return null; // SEM Ver Detalhes
    
    // ... resto dos casos retornam acoes reais ou null
  }
};
```

