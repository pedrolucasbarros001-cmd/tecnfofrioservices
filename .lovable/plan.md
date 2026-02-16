
# Tres Melhorias: Conversao com Tecnico, Email no Orcamento, PDF da Etiqueta

## 1. ConvertBudgetModal — Atribuir Tecnico e Agendar

Adicionar ao modal de conversao de orcamento campos opcionais para:

- **Tecnico Responsavel**: Select com lista de tecnicos activos (usando `useTechnicians`)
- **Data Agendada**: Calendar Popover (aparece apenas se tecnico selecionado)
- **Turno**: Select com opcoes Manha/Tarde/Noite (aparece apenas se tecnico selecionado)

Regras:
- Se tecnico for selecionado, data e turno tornam-se obrigatorios (validacao com toast de aviso)
- Status do servico criado: oficina + tecnico = `na_oficina`, caso contrario = `por_fazer`
- Dados `technician_id`, `scheduled_date`, `scheduled_shift` incluidos no INSERT

Nova seccao visual inserida entre "Local do Servico" e "Budget Info", com subtexto: "Ao atribuir um tecnico, o servico sera agendado na agenda dele."

**Ficheiro**: `src/components/modals/ConvertBudgetModal.tsx`

---

## 2. CreateBudgetModal — Campo de Email

Adicionar campo `customer_email` na seccao "Dados do Cliente" do modal de criacao de orcamento.

- Novo campo no schema zod: `customer_email: z.string().email().optional().or(z.literal(''))`
- Novo input na grid de 3 colunas (passa para grid de 4 colunas ou 2 linhas de 2 colunas)
- Ao criar cliente novo via `handleConfirmCreateCustomer`, passar o email como parametro
- Auto-preencher email quando cliente existente e detectado e associado

**Ficheiro**: `src/components/modals/CreateBudgetModal.tsx`

---

## 3. PDF da Etiqueta — Eliminar Espaco em Branco e Folha Extra

O problema actual: o PDF da etiqueta (29mm x 90mm) gera uma folha com muito espaco branco abaixo do conteudo, e por vezes uma segunda folha completamente em branco.

Causa raiz:
- O container offscreen usa `min-height: 90mm` que forca espaco vazio mesmo que o conteudo real seja menor
- O `jsPDF` cria pagina de 90mm mas o conteudo renderizado pelo html2canvas pode ultrapassar ligeiramente, criando uma segunda pagina

Solucao em `src/utils/pdfUtils.ts`:
- Activar `autoHeight` por defeito para formatos custom (nao-A4): medir a altura real do clone com `offsetHeight`, converter para mm, e usar essa altura exacta como formato do PDF
- Remover `min-height` do container offscreen para formatos custom — usar apenas `height: auto`
- Isto garante que o PDF tem exactamente o tamanho do conteudo, sem espaco branco nem folha extra

Solucao nos chamadores:
- `ServiceTagModal.tsx` e `ServiceTagPage.tsx`: passar `autoHeight: true` na chamada a `generatePDF`
- Remover `minHeight: '90mm'` do div `ref={tagRef}` no ServiceTagModal para que o conteudo defina a altura natural

**Ficheiros**: `src/utils/pdfUtils.ts`, `src/components/modals/ServiceTagModal.tsx`, `src/pages/ServiceTagPage.tsx`

---

## Resumo de Ficheiros

| Ficheiro | Alteracao |
|----------|-----------|
| `src/components/modals/ConvertBudgetModal.tsx` | Adicionar Select tecnico + Calendar data + Select turno |
| `src/components/modals/CreateBudgetModal.tsx` | Adicionar campo email na seccao de cliente |
| `src/utils/pdfUtils.ts` | Usar autoHeight por defeito em formatos custom, remover min-height |
| `src/components/modals/ServiceTagModal.tsx` | Passar autoHeight, remover minHeight do div |
| `src/pages/ServiceTagPage.tsx` | Passar autoHeight na chamada generatePDF |
