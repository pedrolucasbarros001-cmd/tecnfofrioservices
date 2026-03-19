

## Redesign dos Templates de Email — Edge Function

### Problema Actual
Os emails chegam com design muito básico — o lembrete de pagamento mostra apenas "Lembrete de Pagamento / Valor Pendente: 15.00€" sem estrutura visual. O relatório de intervenção é simples sem logo, sem tabela de artigos com preços, sem layout profissional.

### Referência Visual (imagens enviadas)
- **Relatório de Intervenção**: Header azul escuro com logo Tecnofrio, secção de resumo (ID, cliente, localização), detalhes do equipamento em grid, trabalho realizado com borda, tabela de artigos com código/descrição/qtd/preço/total, galeria de imagens com legendas, footer com técnico responsável e contactos
- **Lembrete de Pagamento**: Logo no topo, banner vermelho "AVISO DE VALOR PENDENTE", valor grande em destaque, tabela de dados de pagamento (Entidade, Referência, IBAN, Montante), texto formal, footer com contactos
- **Aguardar Peças**: Header dourado com logo, mensagem clara, detalhes do equipamento (modelo, S/N, chamado), footer motivacional

### Plano de Implementação

**Ficheiro**: `supabase/functions/send-email-notification/index.ts`

**1. Corrigir query do técnico**
A query actual tenta `profiles!services_technician_id_fkey(*)` mas o FK aponta para `technicians`, não `profiles`. Corrigir para:
```sql
*, customer:customers(*), tech:technicians(*, profile:profiles(*))
```
Depois aceder ao nome via `service.tech?.profile?.full_name`.

**2. Adicionar logo hospedada**
Fazer upload do logo `tecnofrio-logo-full.png` para o bucket `service-photos` (público) e usar o URL público nos templates. Alternativa: usar o URL do asset publicado.

**3. Redesign do template `generateVisitReportTemplate`**
- Header azul escuro (#1a365d) com logo à esquerda + "Relatório de Intervenção" + data à direita
- Secção "Resumo da Intervenção": ID, Cliente, Localização (morada do serviço)
- Card "Detalhes do Equipamento" em grid: Marca, Modelo, Nº Série, Tipo, Localização, Estado
- Secção "Trabalho Realizado" com fundo claro e borda lateral azul
- Tabela "Artigos Utilizados" com colunas: Código, Descrição, Qtd, Unidade, Preço Unitário, Total (usando `part_code`, `part_name`, `quantity`, `cost`, `iva_rate`)
- Total geral calculado
- "Galeria de Imagens" com fotos em grid 2x2 e legendas (`description`)
- Documentação anexa (links)
- Footer: Técnico Responsável, dados da empresa (morada, telefone, email)

**4. Redesign do template `generatePaymentReminderTemplate`**
- Logo centrada no topo
- Banner vermelho (#c53030) "AVISO DE VALOR PENDENTE"
- Valor em destaque grande com fundo claro e borda
- Texto "Por favor, regularize a sua situação"
- Tabela de dados de pagamento (placeholder para Entidade/Referência/IBAN que o dono pode configurar futuramente)
- Texto formal: "Verificámos que o valor indicado acima ainda se encontra pendente..."
- Footer com contactos da empresa

**5. Redesign do template `generatePartNoticeTemplate`**
- Header dourado/âmbar com logo
- "Atualização: Aguardando Peças"
- Card branco com mensagem explicativa
- Card "Equipamento" com modelo, S/N, código do serviço
- Footer motivacional + contactos

**6. Redesign do template `generateCustomMessageTemplate`**
- Mesmo padrão visual (header azul institucional com logo)
- Corpo com mensagem personalizada
- Detalhes do equipamento
- Footer padrão

### Secção Técnica

- Todos os templates usam tabelas HTML (não divs) para compatibilidade com clientes de email (Gmail, Outlook)
- Logo referenciada via URL público do Supabase Storage
- Cores institucionais: azul #1a365d (header), #2B4F84 (links), vermelho #c53030 (pagamento), âmbar #b7791f (peças)
- Font stack: Arial, Helvetica, sans-serif (compatibilidade universal)
- Largura máxima 600px (padrão email)
- A edge function será automaticamente redeployada após a edição

