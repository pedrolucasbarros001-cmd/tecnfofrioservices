

# Sincronizacao Completa: Scroll, Campos em Falta, Upload de Fotos, Remocao de Turno

## Problemas Identificados

1. **Scroll dos modais quebrado** em `EditServiceDetailsModal` (usa `overflow-y-auto` na `DialogContent` sem flex layout) e em `CreateServiceFromCustomerModal` dentro de `CustomerDetailSheet.tsx` (usa `ScrollArea` mas a estrutura pode falhar)
2. **Campos em falta** no `CreateServiceFromCustomerModal` (dentro de `CustomerDetailSheet.tsx`): faltam Modelo, Numero de Serie e PNC
3. **PNC em falta** no `EditServiceDetailsModal`
4. **Upload de fotos na criacao (oficina)** nao existe em nenhum modal
5. **Referencias a "Turno"** ainda presentes em varios ficheiros que devem dizer apenas "Hora"
6. **Display de `scheduled_shift`** em `ServiceDetailSheet` ainda tenta converter `manha/tarde/noite` em vez de exibir directamente como hora (HH:MM)
7. **`SHIFT_CONFIG`** em `database.ts` e `GeralPage.tsx` ainda mapeia turnos antigos
8. **`PartArrivedModal`** valida que `scheduledShift` e obrigatorio mas o label ja diz "Hora"  -- a validacao esta ok, mas a mensagem de erro diz "turno"
9. **`ConvertBudgetModal`** mensagem de validacao diz "turno" em vez de "hora"
10. **`TechnicianOfficePage`** mostra "Sem turno" em vez de "Sem hora"

## Alteracoes por Ficheiro

### 1. `EditServiceDetailsModal.tsx` -- Scroll + PNC

**Scroll**: Mudar a estrutura para usar flex layout consistente:
```text
DialogContent (flex flex-col, max-h-[90vh], p-0)
  DialogHeader (px-6 pt-6 pb-4, flex-shrink-0)
  div (flex-1, overflow-y-auto, px-6)
  DialogFooter (px-6 py-4, border-t, flex-shrink-0)
```

**PNC**: Adicionar campo `pnc` (estado + useEffect + input + handleSave):
- `const [pnc, setPnc] = useState('')`
- Inicializar com `service.pnc || ''`
- Incluir no update: `pnc: pnc || null`
- Input entre Numero de Serie e Descricao da Avaria

### 2. `CustomerDetailSheet.tsx` (CreateServiceFromCustomerModal) -- Campos + Fotos + Scroll + Turno

**Campos em falta**: Adicionar ao `serviceFormSchema`:
- `pnc: z.string().optional()`

Adicionar 3 inputs ao formulario apos Tipo de Aparelho + Marca:
- Modelo (ja existe no schema mas nao no form apos a marca)
- Numero de Serie (ja existe no schema mas nao esta no form)
- PNC (novo no schema)

Incluir `pnc` no `processSubmit`: `pnc: values.pnc`

**Fotos oficina**: Quando `service_location === 'oficina'`, mostrar area de upload de ate 5 imagens. Apos criar o servico, inserir as fotos na `service_photos` com `photo_type: 'aparelho'`. Precisa de storage bucket `service-photos` (se nao existir, criar via migracao).

**Label "Turno / Hora"** na linha 1007: mudar para "Hora" e usar `type="time"`

### 3. `CreateServiceModal.tsx` -- Fotos oficina + Label turno

**Fotos oficina**: Mesma logica que acima -- quando `service_location === 'oficina'`, area de upload de ate 5 fotos.

**Label**: Linha 718 diz "Row 8: Data + Turno" -- mudar comentario e garantir que o label diz "Hora" (ja esta como "Hora" no render, so o comentario precisa de limpeza).

### 4. `AssignTechnicianModal.tsx` -- Label turno

O campo `scheduled_shift` ja usa `Input type="time"` e label "Hora". Esta correcto. Nenhuma alteracao necessaria.

### 5. `RescheduleServiceModal.tsx` -- Texto turno

- Linha 135: "Selecione nova data e turno" -> "Selecione nova data e hora"
- Restante ja usa "Nova Hora" e `Input type="time"`. Correcto.

### 6. `ConvertBudgetModal.tsx` -- Texto turno

- Linha 129: mensagem "a data e o turno sao obrigatorios" -> "a data e a hora sao obrigatorias"

### 7. `PartArrivedModal.tsx` -- Texto turno

- Linha 98: mensagem "selecione o turno" -> "selecione a hora"

### 8. `ServiceDetailSheet.tsx` -- Display shift

Linhas 496-503: Remover a logica de conversao `manha/tarde/noite` e exibir directamente o valor de `scheduled_shift` (que agora e HH:MM):
```
{service.scheduled_shift && (
  <Badge variant="secondary">{service.scheduled_shift}</Badge>
)}
```

### 9. `GeralPage.tsx` -- Label + Display

- Linha 301: "Data + Turno" -> "Data + Hora"
- Linha 403: comentario "Data + Turno" -> "Data + Hora"
- Linhas 412-414: Remover uso de `SHIFT_CONFIG` e exibir directamente `service.scheduled_shift`

### 10. `TechnicianOfficePage.tsx` -- Texto turno

- Linha 244: "Sem turno" -> "Sem hora"

### 11. `database.ts` -- Remover SHIFT_CONFIG (opcional)

Manter `SHIFT_CONFIG` por retrocompatibilidade (pode haver dados antigos), mas nao e necessario remove-lo. Os componentes deixarao de o usar directamente.

### 12. Storage Bucket para fotos

Criar bucket `service-photos` (publico) via migracao SQL se ainda nao existir:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-photos', 'service-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'service-photos');

CREATE POLICY "Anyone can view service photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'service-photos');
```

## Resumo de Ficheiros a Alterar

| Ficheiro | Alteracao |
|---|---|
| `EditServiceDetailsModal.tsx` | Scroll flex + campo PNC |
| `CustomerDetailSheet.tsx` | Campos modelo/serie/PNC + upload fotos oficina + label "Hora" |
| `CreateServiceModal.tsx` | Upload fotos oficina + limpar comentario turno |
| `RescheduleServiceModal.tsx` | Texto "turno" -> "hora" |
| `ConvertBudgetModal.tsx` | Texto "turno" -> "hora" |
| `PartArrivedModal.tsx` | Texto "turno" -> "hora" |
| `ServiceDetailSheet.tsx` | Exibir shift directamente sem conversao turno |
| `GeralPage.tsx` | Label "Data + Hora" + exibir shift directamente |
| `TechnicianOfficePage.tsx` | "Sem turno" -> "Sem hora" |
| **Migracao SQL** | Bucket `service-photos` + RLS policies |

## Tecnica de Upload de Fotos

1. O utilizador seleciona ate 5 imagens via `<input type="file" accept="image/*" multiple>`
2. As imagens sao convertidas para `File` objects e mostradas como preview (URL.createObjectURL)
3. Apos a criacao do servico (com o `service_id` disponivel), cada ficheiro e uploaded para o bucket `service-photos` via `supabase.storage.from('service-photos').upload()`
4. O URL publico e obtido e inserido na tabela `service_photos` com `photo_type: 'aparelho'`
5. Se alguma foto falhar, as restantes continuam -- o servico ja foi criado

