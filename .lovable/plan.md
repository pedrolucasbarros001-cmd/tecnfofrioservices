

# Plano: Fotos na Ficha + Edicao de Servico pelo Tecnico + Fotos na Criacao + Scroll Final

## 1. Fotos do Tecnico na Ficha de Consulta (ServiceDetailSheet)

**Diagnostico**: A ficha lateral (`ServiceDetailSheet.tsx`) ja carrega e exibe TODAS as fotos da tabela `service_photos` (linha 689-715), incluindo fotos tiradas pelo tecnico via fluxo de execucao e via historico (`TechnicianServiceSheet`). Se as fotos nao estao a aparecer, o problema e que as fotos adicionadas pelo historico sao guardadas como **base64 data URLs** directamente no campo `file_url` (linha 115-118 do `TechnicianServiceSheet`), o que funciona mas pode causar problemas de performance ou display.

**Solucao**: As fotos adicionadas via historico do tecnico devem ser carregadas para o bucket `service-photos` do Supabase Storage (tal como as fotos de oficina no `CreateServiceModal`), em vez de guardar base64 directamente na base de dados. Isto garante:
- Exibicao consistente na ficha lateral
- Melhor performance (URLs publicas em vez de base64 enorme)
- Consistencia com o resto do sistema

**Ficheiro**: `src/components/technician/TechnicianServiceSheet.tsx`
- Converter `capturedPhotos` de base64 para upload ao bucket `service-photos`
- Gerar URL publica e guardar essa URL no `file_url`

## 2. Edicao de Servico pelo Tecnico

**Problema**: O tecnico nao tem forma eficiente de corrigir dados do servico (equipamento, pecas usadas, adicionar mais pecas). A unica opcao actual e ir ao historico e adicionar uma nota.

**Solucao**: Adicionar um botao "Editar Servico" na ficha do tecnico (`TechnicianServiceSheet`) que abre um modal dedicado com as seguintes opcoes editaveis:

### Modal `TechnicianEditServiceModal` (novo ficheiro)
- **Dados do Equipamento**: marca, modelo, numero de serie (campos que o tecnico preenche/corrige no campo)
- **Avaria Detectada**: campo de texto para corrigir/complementar o diagnostico
- **Trabalho Realizado**: campo de texto para corrigir/complementar
- **Pecas Usadas**: lista editavel das pecas ja registadas + botao para adicionar mais pecas
  - Cada peca: nome, codigo, quantidade, notas
  - Possibilidade de remover pecas adicionadas por engano
- **Pedido de Nova Peca**: botao para solicitar nova peca (reutiliza logica existente do `RequestPartModal`)

### Permissoes
- O tecnico so pode editar servicos que lhe estao atribuidos (ja garantido pelo RLS)
- Campos financeiros (preco, pagamento) NAO aparecem para o tecnico (regra do sistema)
- Cada edicao gera um registo no `activity_logs` para rastreabilidade

### Ficheiros
- **Novo**: `src/components/technician/TechnicianEditServiceModal.tsx`
- **Editar**: `src/components/technician/TechnicianServiceSheet.tsx` (adicionar botao "Editar" no tab "Detalhes")

## 3. Upload de Fotos na Criacao de Servico (Oficina)

**Diagnostico**: O `CreateServiceModal.tsx` ja tem a funcionalidade de upload de fotos para servicos de oficina (linhas 632-672). A secao "Fotos do Equipamento (max. 5)" ja aparece quando `serviceLocation === 'oficina'` e as fotos sao carregadas para o bucket `service-photos` no submit (linhas 283-307).

**Resultado**: Esta funcionalidade ja esta implementada e disponivel para todos os utilizadores com permissao de criar servicos (dono e secretaria). Nao e necessaria nenhuma alteracao adicional.

## 4. Correcao Final de Scroll nos Modais

**Diagnostico**: O `ServicePrintModal.tsx` usa a classe `print-modal-a4` sem as classes padrao de scroll. Precisa de verificacao.

**Modais a verificar/corrigir**:

| Modal | Estado | Accao |
|---|---|---|
| `ServicePrintModal.tsx` | Usa classe especial `print-modal-a4` | Verificar se tem scroll, adicionar `max-w-[95vw]` se necessario |
| Todos os outros | Ja padronizados com `max-w-[95vw]` | Confirmado OK |

O `ServicePrintModal` e o unico modal que nao segue o padrao. Tem uma classe CSS customizada `print-modal-a4` que precisa incluir `max-w-[95vw]` e scroll vertical para mobile.

**Ficheiro**: `src/components/modals/ServicePrintModal.tsx` -- adicionar `max-w-[95vw]` a classe do DialogContent

## Resumo de Ficheiros

| Ficheiro | Alteracao |
|---|---|
| `TechnicianServiceSheet.tsx` | Upload fotos para Storage (em vez de base64) + botao "Editar" |
| `TechnicianEditServiceModal.tsx` | **NOVO** -- modal de edicao de servico para tecnico |
| `ServicePrintModal.tsx` | Adicionar `max-w-[95vw]` para mobile |

## Detalhe Tecnico: Upload de Fotos (TechnicianServiceSheet)

```text
Actual:
  foto capturada -> base64 -> INSERT service_photos(file_url = base64)

Novo:
  foto capturada -> base64 -> converter para Blob -> upload bucket 'service-photos'
  -> obter URL publica -> INSERT service_photos(file_url = publicUrl)
```

## Detalhe Tecnico: Modal de Edicao do Tecnico

```text
TechnicianEditServiceModal
  Tab/Seccao 1: Equipamento
    - brand, model, serial_number (editaveis)
    - detected_fault (textarea)
    - work_performed (textarea)

  Tab/Seccao 2: Pecas
    - Lista de pecas existentes (editavel: quantidade, notas)
    - Botao "Adicionar Peca" (nome, codigo, quantidade)
    - Botao "Remover" em cada peca

  Accoes:
    - Guardar: UPDATE services + UPSERT service_parts + log activity
    - Cancelar: fechar sem guardar
```

