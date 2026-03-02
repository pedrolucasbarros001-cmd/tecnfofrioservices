

## Problema

O crash `TypeError: undefined is not an object (evaluating 'formData.articles.length')` acontece porque ao retomar um serviço, `setFormData(savedState.formData)` restaura dados antigos que não contêm a propriedade `articles`. O fix anterior só cobriu `articlesSubtotal` mas há ~10 acessos directos a `formData.articles` no JSX.

O mesmo risco existe no `WorkshopFlowModals.tsx` (linha 172).

## Solução

Garantir que ao restaurar `formData` de estado guardado, os campos novos (`articles`, `discountValue`, `discountType`, `taxRate`, `articlesLocked`) têm sempre valores default.

### 1. `VisitFlowModals.tsx`

**Linha 209** — Merge com defaults:
```ts
setFormData({ ...INITIAL_FORM_DATA, ...savedState.formData });
```

**Linha ~228** (deriveStepFromDb callback) — Mesmo padrão se houver `formDataOverrides`:
```ts
setFormData(prev => ({ ...INITIAL_FORM_DATA, ...prev, ...formDataOverrides }));
```

**Remover `safeArticles`** (linha 351-352) — Já não é necessário pois `formData.articles` estará sempre inicializado. Voltar a usar `formData.articles` directamente.

### 2. `WorkshopFlowModals.tsx`

**Linha 172** — Mesmo fix:
```ts
setFormData({ ...INITIAL_FORM_DATA, ...savedState.formData });
```

(Onde `INITIAL_FORM_DATA` é o objecto default já definido no componente.)

### 3. Verificação extra

Confirmar que `InstallationFlowModals` e `DeliveryFlowModals` não acedem a `articles` (já confirmado — não usam).

### Ficheiros afectados
- `src/components/technician/VisitFlowModals.tsx` — merge defaults na restauração
- `src/components/technician/WorkshopFlowModals.tsx` — merge defaults na restauração

