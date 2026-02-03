
# Plano: Renomear Estados do Sistema

## Resumo

Alterar a nomenclatura de 5 estados conforme solicitado:

| Estado Interno | Label Antigo | Label Novo |
|----------------|--------------|------------|
| `por_fazer` | Por Fazer | **Aberto** |
| `na_oficina` | Na Oficina | **Oficina** |
| `para_pedir_peca` | Para Pedir Peça | **Pedir Peça** |
| `em_espera_de_peca` | Em Espera de Peça | **Espera de Peça** |
| `a_precificar` | A Precificar | **Precificar** |

---

## Ficheiros a Alterar

| Ficheiro | Alterações |
|----------|------------|
| `src/types/database.ts` | 5 labels (fonte central) |
| `src/pages/DashboardPage.tsx` | 4 labels |
| `src/pages/PerformancePage.tsx` | 2 labels |
| `src/pages/TVMonitorPage.tsx` | 5 labels |
| `src/pages/technician/TechnicianOfficePage.tsx` | 4 labels |
| `src/components/shared/ServiceTimeline.tsx` | 1 label |
| `src/components/services/ServiceDetailSheet.tsx` | 1 label |

---

## Detalhes por Ficheiro

### 1. `src/types/database.ts` (Configuração Central)

Esta é a fonte de verdade para todos os badges do sistema:

```typescript
// Linha 203-208 - De:
por_fazer: { label: 'Por Fazer', ... },
na_oficina: { label: 'Na Oficina', ... },
para_pedir_peca: { label: 'Para Pedir Peça', ... },
em_espera_de_peca: { label: 'Em Espera de Peça', ... },
a_precificar: { label: 'A Precificar', ... },

// Para:
por_fazer: { label: 'Aberto', ... },
na_oficina: { label: 'Oficina', ... },
para_pedir_peca: { label: 'Pedir Peça', ... },
em_espera_de_peca: { label: 'Espera de Peça', ... },
a_precificar: { label: 'Precificar', ... },
```

### 2. `src/pages/DashboardPage.tsx` (Cards do Dashboard)

```typescript
// Linhas 35-41 - De:
{ key: 'por_fazer', label: 'Por Fazer', ... },
{ key: 'na_oficina', label: 'Na Oficina', ... },
{ key: 'para_pedir_peca', label: 'Para Pedir Peça', ... },
{ key: 'em_espera_de_peca', label: 'Em Espera de Peça', ... },
{ key: 'a_precificar', label: 'A Precificar', ... },

// Para:
{ key: 'por_fazer', label: 'Aberto', ... },
{ key: 'na_oficina', label: 'Oficina', ... },
{ key: 'para_pedir_peca', label: 'Pedir Peça', ... },
{ key: 'em_espera_de_peca', label: 'Espera de Peça', ... },
{ key: 'a_precificar', label: 'Precificar', ... },
```

### 3. `src/pages/PerformancePage.tsx` (Página de Performance)

```typescript
// Linhas 10-12 - De:
por_fazer: 'Por Fazer',
na_oficina: 'Na Oficina',

// Para:
por_fazer: 'Aberto',
na_oficina: 'Oficina',
```

### 4. `src/pages/TVMonitorPage.tsx` (Monitor TV)

```typescript
// Linhas 44, 58, 65, 72 - De:
{ key: 'na_oficina', label: 'Na Oficina', ... },
{ key: 'para_pedir_peca', label: 'Para Pedir Peça', ... },
{ key: 'em_espera_de_peca', label: 'Em Espera de Peça', ... },
{ key: 'a_precificar', label: 'A Precificar', ... },

// Para:
{ key: 'na_oficina', label: 'Oficina', ... },
{ key: 'para_pedir_peca', label: 'Pedir Peça', ... },
{ key: 'em_espera_de_peca', label: 'Espera de Peça', ... },
{ key: 'a_precificar', label: 'Precificar', ... },
```

### 5. `src/pages/technician/TechnicianOfficePage.tsx` (Página Oficina Técnico)

```typescript
// Linhas 130-134 - De:
por_fazer: { label: 'Por Fazer', ... },
na_oficina: { label: 'Na Oficina', ... },
para_pedir_peca: { label: 'Pedir Peça', ... },
em_espera_de_peca: { label: 'Aguarda Peça', ... },

// Para:
por_fazer: { label: 'Aberto', ... },
na_oficina: { label: 'Oficina', ... },
para_pedir_peca: { label: 'Pedir Peça', ... },
em_espera_de_peca: { label: 'Espera de Peça', ... },
```

### 6. `src/components/shared/ServiceTimeline.tsx` (Timeline)

O label "Na Oficina" aparece como step da timeline para serviços de oficina:

```typescript
// Linha 37 - De:
{ id: 'workshop', label: 'Na Oficina', icon: Package, ... },

// Para:
{ id: 'workshop', label: 'Oficina', icon: Package, ... },
```

### 7. `src/components/services/ServiceDetailSheet.tsx` (Ficha de Detalhes)

O label "Na Oficina" aparece nos progress steps:

```typescript
// Linha 137 - De:
{ label: 'Na Oficina', statuses: [...] },

// Para:
{ label: 'Oficina', statuses: [...] },
```

---

## Nota Técnica

Os **estados internos** permanecem inalterados no código e base de dados:
- `por_fazer` → mantém (apenas label muda para "Aberto")
- `na_oficina` → mantém (apenas label muda para "Oficina")
- `para_pedir_peca` → mantém (apenas label muda para "Pedir Peça")
- `em_espera_de_peca` → mantém (apenas label muda para "Espera de Peça")
- `a_precificar` → mantém (apenas label muda para "Precificar")

Isto significa:
- Nenhuma migração de base de dados necessária
- Nenhuma alteração em queries ou rotas
- Apenas alterações visuais/UI

---

## Resumo de Alterações

| Ficheiro | Quantidade |
|----------|------------|
| `src/types/database.ts` | 5 |
| `src/pages/DashboardPage.tsx` | 5 |
| `src/pages/PerformancePage.tsx` | 2 |
| `src/pages/TVMonitorPage.tsx` | 4 |
| `src/pages/technician/TechnicianOfficePage.tsx` | 4 |
| `src/components/shared/ServiceTimeline.tsx` | 1 |
| `src/components/services/ServiceDetailSheet.tsx` | 1 |

**Total: 7 ficheiros, ~22 alterações**

---

## Resultado Final

| Estado Interno | Label Novo |
|----------------|------------|
| `por_fazer` | Aberto |
| `em_execucao` | Em Execução (sem alteração) |
| `na_oficina` | Oficina |
| `para_pedir_peca` | Pedir Peça |
| `em_espera_de_peca` | Espera de Peça |
| `a_precificar` | Precificar |
| `concluidos` | Of. Reparados (já alterado) |
| `em_debito` | Em Débito (sem alteração) |
| `finalizado` | Concluídos (já alterado) |
