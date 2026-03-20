

## Redesign dos Templates de Email — Espelhar a Ficha de Serviço

### Objectivo
Alinhar os templates de email com o layout da Ficha de Serviço (`ServicePrintPage.tsx`), para que o cliente receba um email que é essencialmente a mesma ficha que o sistema imprime, adaptada ao contexto (relatório, pagamento, peças).

### O que muda

**Ficheiro**: `supabase/functions/send-email-notification/index.ts`

**1. Relatório de Intervenção** — passa a espelhar a Ficha de Serviço completa:
- Header: Logo à esquerda + "Ficha de Serviço" à direita (como no print)
- Código do serviço + Data de entrada
- Secção "Dados do Cliente": Nome, NIF, Telefone, Email, Morada (grid 2 colunas)
- Secção "Detalhes do Serviço": Categoria, Tipo (Visita/Oficina), Estado, Prioridade, Data Agendada
- Secção "Detalhes do Equipamento": Tipo, Marca, Modelo, Nº Série, PNC, Avaria, Diagnóstico
- Garantia (se aplicável): Marca garantia + Processo
- "Trabalho Realizado" (se preenchido)
- Tabela "Artigos do Serviço": Ref, Descrição, Qtd, Valor Unit., Total + Subtotal
- "Peças Solicitadas" (se existirem): Peça, Referência, Data Pedido, Estado
- "Resumo Financeiro": Subtotal, Mão de obra, IVA, Desconto, TOTAL, Pago, Em Débito
- "Histórico de Pagamentos": Data, Método, Descrição, Valor
- "Assinaturas Recolhidas": imagens das assinaturas com descrição e data
- Footer com contactos

**2. Lembrete de Pagamento** — mesma estrutura da ficha mas enfatizando o débito:
- Header: Logo + "AVISO DE VALOR PENDENTE" (banner vermelho)
- Código + Data
- Dados do Cliente (resumidos)
- Detalhes do Equipamento (resumidos)
- Resumo Financeiro completo com destaque visual no valor em débito (fundo vermelho, tamanho grande)
- Histórico de Pagamentos (para o cliente ver o que já pagou)
- Dados de pagamento / contacto
- Footer

**3. Aguardar Peças** — sem alteração significativa (já está bom), apenas adicionar dados do cliente e equipamento completos como na ficha.

**4. Mensagem Personalizada** — sem alteração significativa.

**5. Query expandida** — buscar também `service_payments` e `service_signatures` para os templates (já busca parts, photos, docs).

### Secção Técnica

- Adicionar queries para `service_payments` e `service_signatures` no template de relatório e pagamento
- Buscar dados do customer via join já existente (`customer:customers(*)`) para NIF, morada completa
- Manter tabelas HTML para compatibilidade email
- Reutilizar helpers existentes (`infoRow`, `sectionTitle`, `emailWrapper`)
- Adicionar helper `gridCell` para layout 2-colunas tipo ficha
- Redesenhar `generateVisitReportTemplate` e `generatePaymentReminderTemplate` completamente
- Deploy automático da edge function

