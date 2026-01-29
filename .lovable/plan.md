
# Plano: Progresso do Serviço Mostra Apenas Passos Relevantes

## Problema Identificado
Na imagem, o serviço de **Instalação** mostra todos os 9 passos (Por Fazer, Em Execução, Na Oficina, Para Pedir, Em Espera, A Precificar, Concluídos, Em Débito, Finalizado), quando deveria mostrar apenas os 4 passos que fazem sentido para uma instalação:
1. Por Fazer
2. Instalação (Em Execução)
3. Concluído
4. Finalizado

## Solução
Reutilizar a lógica do componente `ServiceTimeline` que já existe e filtra corretamente os passos por tipo de serviço:
- **Entrega**: Criado → Em Curso → Entregue → Finalizado (4 passos)
- **Instalação**: Criado → Instalação → Concluído → Finalizado (4 passos)
- **Oficina**: Criado → Na Oficina → Reparação → Concluído → Finalizado (5 passos)
- **Visita**: Criado → Visita → Concluído → Finalizado (4 passos)

## Alterações

### Arquivo: `src/components/services/ServiceDetailSheet.tsx`

**1. Adicionar função `getServiceProgressSteps`** (inspirada na função `getTimelineSteps` de `ServiceTimeline.tsx`):
```typescript
const getServiceProgressSteps = (service: Service) => {
  const isWorkshop = service.service_location === 'oficina';
  const isDelivery = service.service_type === 'entrega';
  const isInstallation = service.service_type === 'instalacao';

  if (isDelivery) {
    return [
      { label: 'Criado', status: ['por_fazer', 'em_execucao', ...] },
      { label: 'Em Curso', status: ['em_execucao', 'concluidos', ...] },
      { label: 'Entregue', status: ['concluidos', 'em_debito', ...] },
      { label: 'Finalizado', status: ['finalizado'] },
    ];
  }

  if (isInstallation) {
    return [
      { label: 'Criado', status: [...] },
      { label: 'Instalação', status: [...] },
      { label: 'Concluído', status: [...] },
      { label: 'Finalizado', status: ['finalizado'] },
    ];
  }

  // ... etc para Oficina e Visita
};
```

**2. Substituir o uso de `STATUS_TIMELINE`** na seção "Progresso do Serviço" (linhas 296-337) para usar a nova função que retorna apenas os passos relevantes.

**3. Manter a visualização atual** com círculos numerados e linhas de conexão, mas renderizar apenas os passos filtrados.

## Resultado Esperado

| Tipo de Serviço | Antes | Depois |
|-----------------|-------|--------|
| Instalação | 9 passos | 4 passos |
| Entrega | 9 passos | 4 passos |
| Oficina | 9 passos | 5 passos |
| Visita | 9 passos | 4 passos |

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/services/ServiceDetailSheet.tsx` | Adicionar função de filtragem e atualizar renderização do progresso |
