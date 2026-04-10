# 🌡️ TecnoFrio Services - Guia Narrativo de Uso End-to-End

## Uma Jornada Completa: Do Atendimento do Cliente ao Trabalho Concluído

---

## 📖 Prólogo: Conhecendo os Personagens

Bem-vindo ao TecnoFrio Services! Vamos acompanhar a história de uma segunda-feira normal na empresa de manutenção e reparo de sistemas de ar-condicionado.

**Os atores desta história e seus roles no sistema:**
- **João** - Dono da TecnoFrio Services (role: `dono`) - Gerencia tudo
- **Maria** - Secretária (role: `secretaria`) - Agenda visitas e acompanha chamados
- **Carlos** - Técnico experiente (role: `tecnico`) - Realiza visitas e reparos
- **Roberto** - Técnico novo (role: `tecnico`) - Faz instalações e entregas
- **Cliente Sandra** - Proprietária de um imóvel com problemas no AC
- **Tela da Recepção** - Monitor de TV (role: `monitor`) - Exibe status em tempo real

---

## ⏰ ACT I: Segunda-feira, 08:00 - A Manhã Começa

### 📞 1. Uma Chamada Chega (Maria - Secretária)

Maria chega ao escritório da TecnoFrio Services e encontra uma mensagem no WhatsApp:

> "Oi, Maria! É a Sandra do Condomínio Beleza. O ar condicionado do meu apartamento está estranho, não está esfriando direito desde sábado. Vocês conseguem vir hoje?"

**O que Maria faz:**

1. Maria acessa a URL `/clientes` (página de Clientes)
2. A página mostra uma tabela com todos os clientes via `usePaginatedCustomers` hook
3. Maria clica em **"+ Novo Cliente"** ou usa a barra de busca para procurar por "Sandra"
4. A modal `CreateCustomerModal` abre (ou edita com `EditCustomerModal` se já existe)
5. Se Sandra já está cadastrada, Maria clica no nome dela na tabela

> **O Sistema mostra:**
> - Nome: Sandra Silva
> - Telefone: (11) 98765-4321
> - Email: sandra@email.com
> - Histórico de serviços anteriores: 4 manutenções
> - Última manutenção: há 3 meses

### 📋 2. Criando o Chamado de Serviço

Maria navegacional para `/geral` (página Geral - visão geral de serviços) e procura por um botão **"+ Novo Serviço"** ou acessa `/service-detail` para criar um novo

A modal `CreateServiceModal` abre com um formulário preenchível:

```
┌─ NOVO SERVIÇO (CreateServiceModal) ───────────────┐
│ Cliente: [Sandra Silva             ▼]            │
│ Tipo de Serviço: [reparacao ▼]                   │
│  (opções: reparacao, instalacao, entrega)        │
│ Aparelho/Marca/Modelo: [AC Split LG  ]           │
│ Descrição da Falha:                              │
│ "Ar condicionado não está esfriando"            │
│                                                  │
│ [Cancelar]         [Criar Serviço]              │
└───────────────────────────────────────────────────┘
```

Maria preenche tudo e clica em **"Criar Serviço"**.

> **O que acontece nos bastidores (via `useCreateService` mutation):**
> - Sistema cria novo registro na tabela `services` do Supabase
> - Status inicial: **`por_fazer`** (status inicial padrão)
> - Localização: `cliente` (onde o serviço acontece)
> - Um identificador único é gerado (ex: SRV-2026-001234)
> - React Query invalida queries via `invalidateServiceQueries`
> - Maria recebe toast confirmação: ✅ "Serviço criado com sucesso!"

### 🎯 3. Alocando o Técnico e Agendando

Maria vai para a página `/geral` e clica no serviço recém-criado **"SRV-2026-001234"**

Uma modal/drawer `ServiceDetailSheet` abre mostrando os detalhes. Maria vê um botão **"Alocar Técnico"** ou acessa via botão em `StateActionButtons`.

A modal `AssignTechnicianModal` abre com lista de técnicos (via `useTechnicians` hook):

```
┌─ ALOCAR TÉCNICO (AssignTechnicianModal) ────────┐
│ □ Carlos (Disponível - 4 agendas hoje)          │
│ □ Roberto (Disponível - 2 agendas)              │
│                                                 │
│ Turno (Shift):                                  │
│ [manha ▼]  (08:00-12:00 | tarde | noite)      │
│                                                 │
│ Data: [02/04/2026]                             │
│                                                 │
│ [Cancelar]    [Confirmar Alocação]             │
└─────────────────────────────────────────────────┘
```

Maria escolhe **Carlos** (mais experiente) e seleciona turno **"manha"** (08:00-12:00).

> **Resultado (via `useUpdateService` mutation):**
> - `assigned_technician_id` = Carlos ID
> - Shift agendado é salvo
> - Status permanece `por_fazer` até início
> - Toast confirmação enviado
> - Notificação criada na tabela `notifications` para Carlos (se permissões habilitadas)

### 📱 4. Confirmação para o Cliente

Maria clica em **"Enviar Confirmação ao Cliente"** e uma mensagem de template aparece:

```
Prezada Sandra,

Confirmamos o agendamento de sua manutenção:

📅 Data: 02/04/2026
⏰ Horário: 09:30 - 10:30
👨‍🔧 Técnico: Carlos
📍 Local: Apto 402, Bloco B - Condomínio Beleza

Em caso de dúvidas, ligue: (11) 3555-1234

Atenciosamente,
TecnoFrio Services
```

Maria customiza se necessário e clica **"Enviar"** (WhatsApp, Email ou SMS).

---

## ⏰ ACT II: Segunda-feira, 09:15 - O Técnico Chega

### 🚗 5. Carlos se Prepara

Carlos está na van da TecnoFrio Services e recebe uma notificação no seu telefone com o detalhe do serviço. Ele abre o app e vê:

```
┌─ SERVIÇO DO DIA 02/04 ─────────────┐
│ SRV-2026-001234                    │
│ Cliente: Sandra Silva              │
│ 📍 Condomínio Beleza - Apto 402    │
│ ⏰ 09:30                           │
│ 🔧 Tipo: Manutenção AC            │
│ 📝 "Não está esfriando direito"   │
│                                   │
│ [📞 Ligar]  [🗺️ Mapa]  [▶️ Iniciar] │
└───────────────────────────────────┘
```

Carlos clica em **"Iniciar Serviço"** e o status muda para **"Em Execução"** ✅

### 📑 5. Inspeção e Diagnóstico

Carlos chega no apartamento de Sandra. Ele:

1. Inspeciona o ar-condicionado
2. Diagnóstico: filtro entupido + refrigerante baixo
3. Tira **3 fotos do aparelho** usando `PhotoCaptureStep` (componente nativo com câmara)
   - Tipo `aparelho` - Geral do equipamento
   - Tipo `estado` - Danos/ocorrências
   - Tipo `etiqueta` - Placa de identificação
4. Volta para o app e clica em **"Adicionar Fotos"** em `ServiceDetailSheet`

```
┌─ DOCUMENTAÇÃO COM FOTOS ────────────┐
│ ✓ Foto 1: Aparelho (2MB)                       │
│ ✓ Foto 2: Estado/Condição (1.8MB)            │
│ ✓ Foto 3: Etiqueta (2.1MB)                    │
│                                                 │
│ [+ Adicionar Mais]  [Próximo]                 │
└───────────────────────────────────────┘
```

As fotos são salvas como registros `ServicePhoto` ligados ao serviço (stored em Supabase Storage).

### 💰 7. Criando o Orçamento

Carlos precisa solicitar autorização para o reparo. Ele clica em **"Criar Orçamento"** no app:

```
┌─ NOVO ORÇAMENTO ──────────────────┐
│ Serviço: SRV-2026-001234          │
│ Cliente: Sandra                    │
│                                   │
│ Itens de Trabalho:                │
│ ✓ Limpeza de Filtro: R$ 120,00   │
│ ✓ Recarga de Refrigerante: R$ 280,00 │
│ ✓ Verificação Geral: R$ 50,00    │
│                                   │
│ Subtotal: R$ 450,00              │
│ IVA (0%): R$ 0,00                │
│ ─────────────────────────────    │
│ TOTAL: R$ 450,00                 │
│                                   │
│ [Cancelar]  [Enviar para Aproval]│
└───────────────────────────────────┘
```

Carlos clica em **"Enviar para Aprovação"**. O status do serviço muda para **"Aguardando Aprovação"** ⏳

**O que acontece:**
- O orçamento é salvo no banco de dados
- Maria e João recebem uma notificação
- Podem aprovar/rejeitar via sistema
- Mensagem de orçamento é enviada para Sandra (com os valores)

### 📋 7. Negociação com o Cliente

Sandra recebe a mensagem do orçamento (via `ContactClientModal` automático ou manual). Ela liga para Carlos perguntando se o refrigerante é realmente necessário.

Carlos explica que sim, mas oferece um desconto de R$ 50 se fechar tudo agora.

Sandra concorda!

**No Sistema (via `EditBudgetDetailsModal`):**
- Carlos ou João vai para o painel de `/orcamentos`
- Clica **"Editar"** no orçamento
- Ajusta o valor de refrigerante para R$ 230 (desconto de R$ 50)
- Novo Total (via `PricingSummary`): **R$ 400,00**
- Status agora: **`aprovado`** ✅ (pode ser `pendente` → `aprovado` após cliente confirmar)
- Botão **"Converter em Serviço"** fica disponível (modal `ConvertBudgetModal`)

---

## ⏰ ACT III: Segunda-feira, 10:30 - O Trabalho Acontece

### 🔧 9. Executando o Serviço

Com o orçamento aprovado, Carlos começa o trabalho:

1. Limpa o filtro do ar-condicionado
2. Recarga o refrigerante
3. Faz uma verificação completa de funcionamento

**Carlos marca no app cada etapa como concluída:**

```
┌─ PROGRESSO DO SERVIÇO ────────────┐
│ ✅ Limpeza de Filtro (09:40-09:55)│
│ ✅ Recarga de Refrigerante (10:00-10:20) │
│ ✅ Verificação Geral (10:20-10:30) │
│ ⏳ Testes Finais: Iniciando...    │
│                                   │
│ [← Voltar]      [Concluir Etapa] │
└───────────────────────────────────┘
```

### 📸 10. Documentação do Trabalho Realizado

Após terminar, Carlos tira **2 fotos de comprovação**:
- Foto do AC funcionando normalmente
- Temperatura do display mostrando resfriamento

Ele adiciona as fotos no serviço comme "Trabalho Concluído".

### 💳 11. Solicitar Pagamento

Carlos clica em **"Finalizar Serviço"** no app:

```
┌─ FINALIZAR SERVIÇO ──────────────┐
│ Serviço: SRV-2026-001234         │
│ Total: R$ 400,00                 │
│                                  │
│ Forma de Pagamento:              │
│ [ ] Dinheiro                     │
│ [X] Cartão Débito               │
│ [ ] Cartão Crédito              │
│ [ ] Pix                          │
│ [ ] A Faturar                    │
│                                  │
│ Observações: "Trabalho realizado │
│  conforme solicitado. Clientes   │
│  satisfeita."                    │
│                                  │
│ [Cancelar]  [CONCLUIR & FINALIZAR] │
└──────────────────────────────────┘
```

Carlos marca **"Cartão Débito"** (Sandra pagou com cartão) e clica em **"Concluir & Finalizar"**.

**O que acontece automaticamente:**
- Status do serviço muda para: **"Concluído"** ✅
- Recibo é gerado automaticamente
- Histórico de serviço é registrado para Sandra
- Carlos recebe confirmação visual no app: "Serviço concluído com sucesso!"

---

## ⏰ ACT IV: Segunda-feira, 14:00 - Back Office (Maria & João)

### 📊 12. Revisão dos Serviços do Dia

João entra na URL `/dashboard` (DashboardPage) e vê um resumo visual dos serviços (dados vindos de `useServices` e `useActivityLogs`):

```
┌─ PAINEL PRINCIPAL (DashboardPage) ──────┐
│                                         │
│ 📋 Por Fazer: 3    ▶️ Em Execução: 1    │
│ ✅ Finalizados: 5  💰 À Precificar: 2   │
│ 🏭 Na Oficina: 1   ⏳ Espera Peça: 1    │
│ ⚠️ Em Débito: 1                         │
│                                         │
│ 📈 Receita do Dia: R$ 2.850,00         │
│ 👥 Clientes Atendidos: 5               │
│                                         │
│ ATIVIDADES RECENTES (últimas 10):       │
│ ✅ SRV-2026-001234 - Sandra - Finalizado│
│ ✅ SRV-2026-001233 - Marcos - Finalizado│
│ ⏳ SRV-2026-001235 - Paula - Agendado   │
│ 🔧 SRV-2026-001232 - Fabio - Em Exec.   │
│                                         │
└─────────────────────────────────────────┘
```

**Status visíveis correspondem a SERVICE_STATUS_CONFIG:**
- `por_fazer` = Aberto
- `em_execucao` = Em Execução 
- `na_oficina` = Na Oficina
- `para_pedir_peca` = Pedir Peça
- `em_espera_de_peca` = Espera Peça
- `a_precificar` = À Precificar
- `finalizado` = Finalizado ✅
- `em_debito` = Em Débito (derivado: final_price > amount_paid)
- `cancelado` = Cancelado

### 📋 13. Página "Geral" - Acompanhamento de Todos os Serviços

Maria clica em `/geral` (GeralPage - acessível só para `dono` e `secretaria`) para ver todos os serviços com filtros e buscas. Componente `usePaginatedServices` com filtros por status e location:

```
┌─ TODOS OS SERVIÇOS (GeralPage) ────────────────────────────┐
│ Filtrar por Status: [por_fazer ▼] Ordenar: [Data ▼]       │
│                                                             │
│ ┌─ SRV-2026-001232 ────────────────────────────────────┐   │
│ │ 🟡 em_execucao | Carlos                             │   │
│ │ Cliente: Marcos Silva | Condomínio Morumbi           │   │
│ │ 🔧 reparacao | Diagnóstico realizado                │   │
│ │ Turno: tarde (14:00-18:00)                          │   │
│ │ [Ver Detalhes] [Editar] [⋮ Mais]                   │   │
│ └────────────────────────────────────────────────────┘   │
│                                                             │
│ ┌─ SRV-2026-001234 ────────────────────────────────────┐   │
│ │ 🟢 finalizado | Carlos                              │   │
│ │ Cliente: Sandra | Condomínio Beleza                  │   │
│ │ 🔧 reparacao | Trabalho finalizado                  │   │
│ │ Manhã | R$ 400,00 (Pago em dinheiro)               │   │
│ │ [Ver Recibo] [Imprimir]  [⋮ Mais]                  │   │
│ └────────────────────────────────────────────────────┘   │
│                                                             │
│ ┌─ SRV-2026-001235 ────────────────────────────────────┐   │
│ │ 🔵 a_precificar | Roberto                           │   │
│ │ Cliente: Paula Costa | Casa no Itaim                │   │
│ │ 🏗️ instalacao | Enviado para aprovação              │   │
│ │ Tarde | Orçamento Pendente: R$ 3.200,00            │   │
│ │ [Aprovar] [Ver Detalhes] [⋮ Mais]                 │   │
│ └────────────────────────────────────────────────────┘   │
│                                                             │
│ [< Anterior] [Página 1 de 8] [Próxima >]                 │
└─────────────────────────────────────────────────────────────┘
```

**Ações disponíveis em [⋮ Mais]:**
- Editar (EditServiceDetailsModal)
- Atribuir Técnico (AssignTechnicianModal)
- Transferir (RequestTransferModal)
- Mudar Estado (StateActionButtons com forçar estado se admin)
- Reagendar (RescheduleServiceModal)
- Imprimir (ServicePrintPage, ServiceTagPage, BudgetPrintPage)

### 🛠️ 14. Transferências de Trabalho (RequestTransferModal)

Maria vê que Carlos tem muitos serviços para hoje. Ela clica no serviço **SRV-2026-001235** (instalação de Paula) na `/geral`.

Vai em **"⋮ Mais"** → **"Transferir"** ou **"Reatribuir"** (abre modal `RequestTransferModal`):

```
┌─ SOLICITAR TRANSFERÊNCIA ────────────────────┐
│ (via RequestTransferModal)                   │
│                                              │
│ Serviço: SRV-2026-001235                    │
│ Técnico Atual: Carlos                       │
│                                              │
│ Novo Técnico:                               │
│ [Roberto                               ▼]   │
│ (ou: enviar para João aceitar)              │
│                                              │
│ Motivo (opcional):                          │
│ [Muitos agendas de Carlos hoje]            │
│                                              │
│ [Cancelar]  [Solicitar Transferência]       │
│ (ou [Reatribuir Direto] se admin)           │
└──────────────────────────────────────────────┘
```

Maria escolhe **Roberto** e clica **"Solicitar Transferência"**.

> **O que acontece (via `useCreateTransferRequest` mutation):**
> - Nova linha em tabela `service_transfer_requests` (status: `pendente`)
> - Roberto recebe uma `Notification` tipo "transfer_request"
> - Pode aceitar (`aceite`), recusar (`recusado`) ou ignorar
> - Se aceito, `assigned_technician_id` do serviço é atualizado
> - Status de transferência muda para `aceite` ou `recusado`
> - Se recusado, volta para fila ou vai para João reatribuir

### 🏭 15. Oficina - Peças que Precisam Reparar

João clica em `/oficina` (OficinaPage - visão da oficina de workshop) para ver os equipamentos que precisam de conserto interno:

Ou técnico vai para `/oficina-tecnico` (TechnicianOfficePage) se trabalha na oficina.

Os modais e fluxos da oficina usam `WorkshopFlowModals` (componente complexo com vários passos):

```
┌─ OFICINA - TRABALHOS PENDENTES (OficinaPage) ─────┐
│                                                     │
│ ┌─ Compressor AC (de Fabio) ─────────────────┐    │
│ │ Status: em_espera_de_peca                   │    │
│ │ Problema: Não liga (sem potência)           │    │
│ │ Chegou em: 01/04/2026                       │    │
│ │ Dias na oficina: 1 dia                      │    │
│ │ [Diagnosticado] [Pedido de Peça feito]     │    │
│ │ [✏️ Editar] [✓ Concluir] [❌ Cancelar]      │    │
│ │ [Para Oficina] [Peça Chegou] [Usar Peça]   │    │
│ └────────────────────────────────────────────┘    │
│                                                     │
│ ┌─ Evaporadora (de Juliana) ─────────────────┐    │
│ │ Status: na_oficina (diagnóstico)            │    │
│ │ Problema: Vazando água                      │    │
│ │ Chegou em: 02/04/2026                       │    │
│ │ Dias na oficina: < 1 dia                    │    │
│ │ [📝 Notas] [Próximo Passo]                  │    │
│ │ [Para Pedir Peça] [Concluir Reparo]         │    │
│ └────────────────────────────────────────────┘    │
│                                                     │
│ [+ Adicionar para Oficina]                        │
└─────────────────────────────────────────────────────┘
```

**Modais workflow de oficina:** `PartArrivedModal`, `UsedPartsModal`, `RequestPartModal`

### 💰 16. Orçamentos para Análise

João clica em `/orcamentos` (OrcamentosPage - só role `dono`) para ver todos os budgets criados com seus status:

```
┌─ ORÇAMENTOS (OrcamentosPage) ─────────────────────┐
│ Status: [pendente ▼]  Valor: [Qualquer ▼]       │
│                                                   │
│ ┌─ Budget ORC-2026-251 ──────────────────────┐   │
│ │ Cliente: Paula Costa                       │   │
│ │ Serviço: instalacao AC Novo                │   │
│ │ Técnico Responsável: Roberto               │   │
│ │ Data Criação: 02/04/2026 13:45             │   │
│ │ Valor Total: R$ 3.200,00                   │   │
│ │ Status Budget: pendente                    │   │
│ │ Valid Until: 05/04/2026                    │   │
│ │ [📧 Reenviar] [✅ Aprovar] [❌ Recusar]    │   │
│ │ [📋 Ver Detalhes]                          │   │
│ └────────────────────────────────────────────┘   │
│                                                   │
│ ┌─ Budget ORC-2026-250 ──────────────────────┐   │
│ │ Cliente: Marcos Silva                      │   │
│ │ Serviço: reparacao - AC Completo           │   │
│ │ Técnico Responsável: Carlos                │   │
│ │ Data Criação: 02/04/2026 10:15             │   │
│ │ Valor Total: R$ 1.850,00                   │   │
│ │ Status Budget: aprovado ✅                 │   │
│ │ [🔄 Converter em Serviço] [⋮ Mais]        │   │
│ └────────────────────────────────────────────┘   │
│                                                   │
└───────────────────────────────────────────────────┘
```

**Modais de orçamento:**
- `CreateBudgetModal` - Criar novo budget
- `EditBudgetDetailsModal` - Editar valores, labor, peças, IVA
- `ConvertBudgetModal` - Converter `aprovado` em novo Service

João vê o orçamento de Paula em status `pendente` e clica **"Aprovar"** (status → `aprovado`) ou **"Recusar"** (→ `recusado`) se achar necessário renegociar.

---

## ⏰ ACT V: Terça-feira, 08:00 - Continuação Natural

### 📋 17. Impressão de Orçamento e Nota Fiscal

Maria precisa gerar a nota fiscal para o serviço de Sandra de ontem.

Ela clica em **SRV-2026-001234** (Sandra) e depois clica em **"Imprimir Orçamento"** ou **"Gerar Nota Fiscal"**:

```
┌─ IMPRESSÃO/EXPORTAÇÃO ────────────────────┐
│ [ ] Orçamento PDF                         │
│ [X] Nota Fiscal                           │
│ [ ] Comprovante de Pagamento              │
│                                           │
│ Formato:                                  │
│ [ ] PDF para Tela                         │
│ [X] PDF para Impressora                   │
│ [ ] Email (email@cliente.com)             │
│                                           │
│ [Cancelar]        [Gerar & Imprimir]    │
└───────────────────────────────────────────┘
```

O documento é gerado e enviado para a impressora. Maria entrega para Sandra na próxima manutenção ou envia por email.

### 🎯 18. Roberto - O Segundo Técnico - Instalação

Roberto chega na casa de Paula para a instalação que foi reatribuída para ele.

Ele abre o app e vê:

```
┌─ NOVA INSTALAÇÃO ──────────────────┐
│ SRV-2026-001235                    │
│ Cliente: Paula Costa               │
│ 📍 Casa no Itaim                   │
│ ⏰ 14:00                           │
│ 🏗️ Instalação AC Novo             │
│ Orçamento Aprovado: R$ 3.200,00   │
│ Status: Pronto para Iniciar        │
│                                    │
│ [📸 Fotos Antes] [▶️ Iniciar]     │
└────────────────────────────────────┘
```

Roberto clica em **"Fotos Antes"** para documentar como era antes da instalação (parede vazia, etc).

Depois clica em **"Iniciar"** e começa o trabalho.

---

## ⏰ ACT VI: Quinta-feira, 17:00 - Relatórios e Performance

### 📊 19. Página de Performance

João quer analisar como está a performance do mês. Ele clica em **"Performance"**:

```
┌─ DASHBOARD DE PERFORMANCE ────────────────────┐
│                                               │
│ PERÍODO: [01/04 - 04/04] Comparar com: [Mês Anterior ▼] │
│                                               │
│ 📊 RESUMO DO PERÍODO:                        │
│ • Serviços Realizados: 18                    │
│ • Serviços Agendados: 5                      │
│ • Taxa de Conclusão: 94%                     │
│ • Receita Gerada: R$ 12.450,00              │
│ • Ticket Médio: R$ 691,67                    │
│ • Custo em Peças: R$ 3.200,00               │
│ • Margem Bruta: 74%                         │
│                                               │
│ 👥 PERFORMANCE POR TÉCNICO:                  │
│ ┌─────────────────────────────────────────┐  │
│ │ Carlos        │ 12 serviços | R$ 8.200 │  │
│ │ Roberto       │ 6 serviços  | R$ 4.250 │  │
│ └─────────────────────────────────────────┘  │
│                                               │
│ 📈 GRÁFICO DE RECEITA:                       │
│ [Gráfico em Barras: Linha por dia]          │
│                                               │
│ 🎯 METAS:                                    │
│ • Meta de Receita: R$ 15.000/semana         │
│ • Progresso: 82% (🟨 Quase lá!)             │
│                                               │
└───────────────────────────────────────────────┘
```

### 🔍 20. Histórico de Atividades

João clica em **"Geral"** e depois vê o menu ou uma aba chamada **"Histórico de Atividades\"** para ver logs (via hook `useActivityLogs`):

```
┌─ LOG DE ATIVIDADES (ÚLTIMOS 7 DIAS) ───────────────────┐
│                                                         │
│ 04/04 17:30 - Carlos: Finalizou SRV-2026-001240       │
│              Status: Concluído | Valor: R$ 450,00    │
│                                                         │
│ 04/04 15:45 - Maria: Aprovou Orçamento ORC-2026-255  │
│              Cliente: Fabio Santos | R$ 1.200,00     │
│                                                         │
│ 04/04 14:20 - Roberto: Iniciou SRV-2026-001235      │
│              Cliente: Paula Costa | Instalação        │
│                                                         │
│ 04/04 09:15 - Maria: Criou SRV-2026-001241           │
│              Cliente: Novo - Pedro Oliveira            │
│                                                         │
│ 03/04 16:00 - João: Reatribuiu SRV-2026-001239       │
│              De: Carlos → Para: Roberto               │
│                                                         │
│ 02/04 10:30 - Carlos: Finalizou SRV-2026-001234      │
│              Cliente: Sandra | Manutenção | R$ 400,00│
│                                                         │
│ [← Anterior] [Página 1 de 12] [Próxima →]             │
└──────────────────────────────────────────────────────┘
```

### 👥 21. Gerenciamento de Colaboradores (Técnicos)

João clica em **"Colaboradores"**:

```
┌─ GERENCIAMENTO DE TÉCNICOS ────────────────────┐
│ [+ Novo Técnico]  Buscar: [_________]         │
│                                                │
│ ┌─ Carlos - TÉCNICO SÊNIOR ──────────────────┐│
│ │ Status: Ativo                              ││
│ │ Telefone: (11) 98765-4321                  ││
│ │ Email: carlos@tecnofrioservices.com        ││
│ │ Especialidade: Manutenção e Diagnóstico   ││
│ │ Serviços Este Mês: 12                      ││
│ │ Taxa de Satisfação: 4.8/5 ⭐              ││
│ │ [Editar] [Ver Agenda] [Histórico]         ││
│ └────────────────────────────────────────────┘│
│                                                │
│ ┌─ Roberto - TÉCNICO JUNIOR ─────────────────┐│
│ │ Status: Ativo                              ││
│ │ Telefone: (11) 97654-3210                  ││
│ │ Email: roberto@tecnofrioservices.com       ││
│ │ Especialidade: Instalação                  ││
│ │ Serviços Este Mês: 6                       ││
│ │ Taxa de Satisfação: 4.6/5 ⭐              ││
│ │ [Editar] [Ver Agenda] [Contrato]          ││
│ └────────────────────────────────────────────┘│
│                                                │
└────────────────────────────────────────────────┘
```

---

## ⏰ ACT VII: Segunda-feira, 10:00 - Semana 2 - Algo Diferente

### 🚚 22. Fluxo de Entrega - Um Novo Equipamento

Roberto recebe um novo tipo de serviço: uma **Entrega de Equipamento** que foi vendido para um cliente novo.

Ele clica em **"Entregas"** no seu painel:

```
┌─ ENTREGAS PROGRAMADAS ────────────────────┐
│                                           │
│ ┌─ Entrega: Condensadora (Novo Cliente)─┐│
│ │ Cliente: Ricardo Almeida               ││
│ │ Equipamento: Condensadora 36K         ││
│ │ 📍 Rua das Flores, 456 - Casa 12      ││
│ │ Agendado: 08/04 às 09:00              ││
│ │ Status: Pronto para Entregar           ││
│ │ [ ] Entrega Realizada                 ││
│ │ [Iniciar Entrega]                     ││
│ └───────────────────────────────────────┘│
│                                           │
└───────────────────────────────────────────┘
```

Roberto clica em **"Iniciar Entrega"** e o app muda para modo de entrega:

```
┌─ FLUXO DE ENTREGA ────────────────────────┐
│                                           │
│ 1️⃣ CONFIRMAÇÃO DE CHEGADA                │
│ [Confirmar que Chegou no Local]          │
│                                           │
│ 2️⃣ FOTOS DE CHEGADA                      │
│ [Tirar fotos do equipamento]             │
│                                           │
│ 3️⃣ VERIFICAÇÃO                           │
│ [ ] Equipamento íntegro (sem danos)     │
│ [ ] Acessórios completos                │
│ [ ] Documentação (Nota Fiscal, Garantia)│
│                                           │
│ 4️⃣ ENTREGA                               │
│ [Assinatura Digital do Cliente] ✍️       │
│                                           │
│ 5️⃣ FOTOS PÓS-ENTREGA                    │
│ [Confirmar Entrega com Foto]            │
│                                           │
│ [Voltar]              [Próximo Passo]    │
└───────────────────────────────────────────┘
```

Roberto segue cada passo:
1. Chega e tira foto
2. Verifica que tudo está Ok 
3. Pede a assinatura do Ricardo no app
4. Tira foto final com equipamento no local
5. Clica "Concluir Entrega"

**Status muda para:** ✅ **"Entregue"**

### 📝 23A. Campo de Observações em Orçamentos ⭐ **NOVO**

Quando um orçamento chega à fase de **"Definir Preço"** (acessível por `dono` e `secretaria`), um novo campo foi adicionado:

**Campo: "OBSERVAÇÕES"** (novo em SetPriceModal)

```
┌─ DEFINIR PREÇO - TF-00198 ──────────────────────────┐
│                                                     │
│ [ARTIGOS / INTERVENÇÕES]                          │
│ [Tabela de itens]                                 │
│                                                     │
│ [RESUMO - Subtotal, IVA, Desconto, Ajuste]       │
│                                                     │
│ 💬 OBSERVAÇÕES ⭐ (NOVO CAMPO):                   │
│ ┌─────────────────────────────────────────────────┐
│ │ Adicione notas, detalhes adicionais ou         │
│ │ informações importantes sobre o orçamento...   │
│ │                                                   │
│ │ [Textarea de 80px min. altura]                 │
│ │                                                   │
│ └─────────────────────────────────────────────────┘
│ Estas observações serão salvas no histórico do    │
│ orçamento e visíveis para referência futura.      │
│                                                     │
│ [Cancelar]  [Confirmar Preço]                    │
└─────────────────────────────────────────────────────┘
```

**Características:**
- 📝 Campo textarea com mínimo 80px de altura
- 💾 Salvo em: `pricing_description.observations` (JSON)
- 👥 Acessível para: `dono` e `secretaria`
- 🔄 Carregado automaticamente ao editar orçamento
- ⛔ Desabilitado se "Garantia cobre tudo" marcada

**Exemplos de uso:**
- "Cliente aprovou com desconto de R$ 50 se feito hoje"
- "Necessita chegada antes das 18h"
- "Peça especial - prazo 5 dias"
- "Garantia de 2 anos conforme contato telefônico"
- "Negociação: cliente pediu para pensar e retorna segunda"

---

## ⏰ ACT VIII: Sexta-feira, 14:00 - Relatórios Finais

### 📊 23. Exportação de Relatórios

João precisa fazer a prestação de contas semanal. Ele vai para uma página especial (ou clica em um botão **"Relatórios"**):

```
┌─ GERAR RELATÓRIOS ────────────────────────┐
│                                           │
│ Tipo de Relatório:                        │
│ [X] Receita e Custos                     │
│ [ ] Performance por Técnico              │
│ [ ] Clientes e Satisfação                │
│ [ ] Estoque de Peças                     │
│ [ ] Manutenções Realizadas               │
│                                           │
│ Período:                                  │
│ De: [06/04/2026]  Até: [12/04/2026]     │
│                                           │
│ Formato:                                  │
│ [ ] PDF                                  │
│ [X] Excel (planilha)                    │
│ [ ] Imprimir                             │
│                                           │
│ [Cancelar]          [Gerar Relatório]   │
└───────────────────────────────────────────┘
```

João seleciona as opções e clica **"Gerar Relatório"**:

Um arquivo Excel é baixado com uma planilha contendo:
- Total de receita: R$ 28.450,00
- Total de custos: R$ 8.930,00
- Margem: R$ 19.520,00
- Serviços concluídos: 42
- Taxa de conclusão: 96%
- Clientes novos: 8
- Tabelas por técnico, por tipo de serviço, por cliente

---

## 📱 ACT IX: Recursos Adicionais - O Que Mais o Sistema Faz

### 🔐 24. Perfil e Preferências (Qualquer Usuário)

Qualquer usuário (João, Maria ou Carlos) pode clicar em seu **Avatar/Perfil** no canto superior direito:

```
┌─ MENU DE PERFIL ──────────────────────────┐
│ 👤 João Silva (Dono)                     │
│ 📧 joao@tecnofrioservices.com           │
│                                          │
│ [Editar Perfil]                         │
│ [Alterar Senha]                         │
│ [Preferências] → Tema (Claro/Escuro)   │
│ [Notificações] → Ativar/Desativar      │
│ [Minha Documentação]                    │
│ [Sair]                                  │
└──────────────────────────────────────────┘
```

### 🌙 25. Tema Escuro

Maria prefere trabalhar com o app em **modo escuro** para não cansar os olhos. Ela clica em **"Preferências"** → **"Tema"** → **"Escuro"** ✅

O app alterna para:
```
🟫 Fundo escuro
🟩 Texto claro
🟦 Botões coloridos com contraste
```

### 📲 26. Notificações e Alertas

Quando um serviço é atribuído ou quando há atualizações importantes, o sistema envia notificações:

**Na Tela:**
```
┌─ NOTIFICAÇÃO ─────────────────┐
│ 🔔 SRV-2026-001234             │
│ "Novo serviço atribuído!"     │
│ Cliente: Eduardo              │
│ [Ver Serviço] [Descartar]     │
└────────────────────────────────┘
```

Pode ser configurado em **Preferências** quais notificações receber (por email, SMS, no app, etc).

### 📊 27. Dashboard Customizável

No dashboard principal, João pode **"Personalizar Widgets"** clicando em um ícone de engrenagem:

```
┌─ CUSTOMIZAR DASHBOARD ────────────┐
│ [✓] Estatísticas Rápidas          │
│ [✓] Gráfico de Receita            │
│ [✓] Atividades Recentes           │
│ [ ] Mapa de Técnicos              │
│ [✓] Metas Semanais                │
│ [ ] Clima e Previsões             │
│ [✓] Próximos Aniversários (Clientes) │
│                                   │
│ [Salvar Configurações]            │
└───────────────────────────────────┘
```

---

## 🎬 Epílogo: Ciclo Fechado

### ✅ Resumo do Fluxo End-to-End

Uma chamada de Sandra evoluiu assim:

```
📞 CLIENTE LIGA
    ↓
📋 SECRETÁRIA CRIA SERVIÇO
    ↓
👨‍🔧 ALOCA TÉCNICO
    ↓
📱 TÉCNICO RECEBE NOTIFICAÇÃO
    ↓
🔍 TÉCNICO FAZ DIAGNÓSTICO
    ↓
💰 CRIA ORÇAMENTO
    ↓
✅ CLIENTE APROVA
    ↓
🔧 TÉCNICO EXECUTA TRABALHO
    ↓
📸 DOCUMENTA COM FOTOS
    ↓
💳 RECEBE PAGAMENTO
    ↓
🎯 SERVIÇO FINALIZADO
    ↓
📊 SISTEMA REGISTRA TUDO
    ↓
📈 RELATÓRIOS GERADOS
    ↓
😊 CLIENTE SATISFEITO E DOCUMENTADO
```

---

## 🎓 Dicas Práticas de Uso

### ⏱️ Ganho de Tempo
- Use **busca rápida** (Ctrl+K) para encontrar serviços ou clientes
- Configure **templates de orçamento** para cobranças recorrentes
- Imprima **comprovantes em lote** no final do dia

### 📱 Acesso Mobile
- Técnicos usam primariamente no **smartphone** (Android/iOS)
- Desktop é melhor para **back-office** e **relatórios**
- Sincronização automática mantém tudo atualizado

### 🔐 Segurança
- Cada usuário tem **role-based access** (Dono, Secretária, Técnico)
- Apenas técnicos veem seus próprios serviços
- Histórico completo é mantido para **auditoria**

### 💡 Boas Práticas
1. **Tire fotos sempre** - Documentam e evitam disputas
2. **Atualize status regularmente** - Clientes querem saber o andamento
3. **Envie orçamento rápido** - Clientes aprovam mais rápido se enviado no mesmo dia
4. **Feche o serviço imediatamente** - Não esqueça de marcar como concluído
5. **Revise custos regularmente** - Use relatórios para otimizar margem

---

## 🏁 Conclusão

O **TecnoFrio Services** transforma uma simples ligação de cliente em um **fluxo automatizado e documentado** que beneficia:

- **👥 Clientes**: Transparência, agendamento rápido, documentação completa
- **🔧 Técnicos**: Fácil acesso a informações, documentação em tempo real
- **🎯 Secretária**: Menos trabalho manual, melhor organização
- **📊 Dono**: Visibilidade total, relatórios para decisões

**Bem-vindo ao futuro da gestão de serviços de ar-condicionado! 🌡️**

---

## � APPENDIX: Referência Técnica Completa do Sistema

### 🗺️ Mapa de Rotas Acessíveis

| Rota | Role(s) | Componente | Propósito |
|------|---------|-----------|----------|
| `/login` | Público | LoginPage | Autenticação |
| `/dashboard` | `dono` | DashboardPage | Dashboard principal com estatísticas |
| `/geral` | `dono`, `secretaria` | GeralPage | Visão geral de todos os serviços |
| `/oficina` | `dono`, `secretaria` | OficinaPage | Gerenciamento de serviços em oficina |
| `/clientes` | `dono`, `secretaria` | ClientesPage | Tabela de clientes com CRUD |
| `/servicos` | `tecnico` | ServicosPage | Agenda diária do técnico |
| `/colaboradores` | `dono` | ColaboradoresPage | Gerenciamento de técnicos |
| `/orcamentos` | `dono` | OrcamentosPage | Gerenciamento de budgets |
| `/performance` | `dono` | PerformancePage | Métricas e performance por técnico |
| `/concluidos` | `dono`, `secretaria` | SecretaryConcluidosPage | Serviços concluídos na oficina |
| `/em-debito` | `dono`, `secretaria` | SecretaryDebitoPage | Serviços com débito pendente |
| `/precificar` | `dono`, `secretaria` | SecretaryPrecificarPage | Serviços a orçamentar |
| `/oficina-tecnico` | `tecnico` | TechnicianOfficePage | Área de trabalho técnico |
| `/print/service/:id` | Autenticado | ServicePrintPage | Impressão de serviço |
| `/print/tag/:id` | Autenticado | ServiceTagPage | Impressão de etiqueta/tag |
| `/print/budget/:id` | Autenticado | BudgetPrintPage | Impressão de orçamento |

### 🎨 Modais Disponíveis (src/components/modals/)

| Modal | Acionado Via | Função |
|-------|------------|---------|
| `CreateServiceModal` | Botão "+ Novo Serviço" | Criar novo serviço com cliente, tipo, descrição |
| `EditServiceDetailsModal` | "Editar" em serviço | Editar detalhes técnicos do serviço |
| `AssignTechnicianModal` | "Alocar Técnico" | Atribuir técnico e turno (manha/tarde/noite) |
| `RequestTransferModal` | "Transferir" em serviço | Solicitar transferência entre técnicos |
| `RescheduleServiceModal` | "Reagendar" | Mudar data/turno do serviço |
| `CreateBudgetModal` | "Criar Orçamento" | Criar novo budget com linhas de preço |
| `EditBudgetDetailsModal` | "Editar" em orçamento | Editar valores, labor, peças, IVA |
| `ConvertBudgetModal` | "Converter" em orçamento aprovado | Converter budget aprovado em novo Service |
| `SetPriceModal` ⭐ **NOVO CAMPO** | "Definir Preço" na precificação | Define valor final + **OBSERVAÇÕES** para referência | 
| `CreateCustomerModal` | "+ Novo Cliente" | Criar novo cliente com dados |
| `EditCustomerModal` | "Editar" em cliente | Editar telefone, email, endereço |
| `ContactClientModal` | "Contatar Cliente" | Enviar mensagem/orçamento via WhatsApp/Email |
| `RequestPartModal` | "Pedir Peça" | Solicitar peça com nome, código, qtd |
| `PartArrivedModal` | "Peça Chegou" | Confirmar chegada de peça |
| `UsedPartsModal` | "Usar Peças" | Seleção de peças usadas no reparo |
| `RegisterPaymentModal` | "Registrar Pagamento" | Registrar pagamento recebido (método, valor) |
| `ForceStateModal` | Admin: "Forçar Estado" | Mudar status de serviço manualmente |
| `UploadDocumentModal` | "Upload Doc" | Upload de documentos (PDF, IMG) |
| `PhotoGalleryModal` | "Ver Fotos" | Galeria de fotos do serviço/aparelho |

### 🧩 Componentes Principais por Feature

**Serviços:**
- `ServiceDetailSheet` - Painel lateral com detalhes do serviço
- `StateActionButtons` - Botões de ação (próximo status/workflow)
- `ServiceStatusBadge` - Badge com status do serviço
- `ServiceTimeline` - Timeline de eventos do serviço

**Pricing/Orçamento:**
- `PriceLineItems` - Componente para listar labor, peças, IVA
- `PricingSummary` - Resumo com total do orçamento
- `BudgetDetailPanel` - Painel com detalhes do budget
- `SetPriceModal` ⭐ - Modal para definir preço final + novo campo **Observações** (textarea) para notas/detalhes

**Fotos/Documentação:**
- `CameraCapture` - Componente para captura de câmera
- `PhotoGalleryModal` - Galeria modal de fotos
- `DiagnosisPhotosGallery` - Galeria específica de diagnóstico

**Técnico Workflow:**
- `VisitFlowModals` - Fluxo completo de visita (5+ passos)
- `InstallationFlowModals` - Fluxo de instalação
- `DeliveryFlowModals` - Fluxo de entrega (5 passos: chegada → fotos → verificação → assinatura → fotos)
- `WorkshopFlowModals` - Fluxo de oficina
- `FieldPaymentStep` - Passo de pagamento em campo

**Compartilhado:**
- `CustomerLink` - Botão para abrir profile de cliente
- `CustomerDetailSheet` - Painel com detalhes do cliente
- `SignatureCanvas` - Canvas para captura de assinatura digital
- `NotificationPanel` - Painel de notificações

### 📊 Status de Serviço vs Badge Color

| Status | Label | Cor | Derivado |
|--------|-------|-----|---------|
| `por_fazer` | Aberto | 🔴 Vermelho | - |
| `em_execucao` | Em Execução | 🟡 Amarelo | - |
| `na_oficina` | Na Oficina | 🟠 Laranja | - |
| `para_pedir_peca` | Pedir Peça | 🔵 Azul | - |
| `em_espera_de_peca` | Espera Peça | 🟣 Púrpura | - |
| `a_precificar` | À Precificar | 🟢 Verde Claro | - |
| `finalizado` | Finalizado | 🟢 Verde | - |
| `cancelado` | Cancelado | ⚫ Preto | - |
| `em_debito` | Em Débito | 🔴 Vermelho | final_price > amount_paid |

### 👨‍💼 Roles & Permissões

| Feature | `dono` | `secretaria` | `tecnico` | `monitor` |
|---------|--------|-------------|----------|----------|
| Dashboard | ✅ | ❌ | ❌ | ❌ |
| Ver Geral | ✅ | ✅ | ❌ | ❌ |
| Gerenciar Clientes | ✅ | ✅ | ❌ | ❌ |
| Gerenciar Oficina | ✅ | ✅ | ❌ | ❌ |
| Orçamentos | ✅ | ❌ | ❌ | ❌ |
| Performance | ✅ | ❌ | ❌ | ❌ |
| Colaboradores | ✅ | ❌ | ❌ | ❌ |
| Minha Agenda (/servicos) | ❌ | ❌ | ✅ | ❌ |
| Meu Perfil | ✅ | ✅ | ✅ | ❌ |
| TV Monitor | ❌ | ❌ | ❌ | ✅ |

### 🔗 Hooks Custom Principais

```typescript
// Serviços
useServices(options?)                    // Fetch com filtros
usePaginatedServices(options)            // Paginado
useFullServiceData(serviceId, enabled)   // Fetch completo com relações
useCreateService()                       // Criar
useUpdateService()                       // Atualizar

// Clientes
useCustomers(searchTerm?)               // Listar
usePaginatedCustomers(options)          // Paginado com busca
useCreateCustomer()                     // Criar
useUpdateCustomer()                     // Atualizar
useDeleteCustomer()                     // Deletar

// Técnicos
useTechnicians(onlyActive?)             // Listar técnicos

// Transferências
useCreateTransferRequest()              // Solicitar transferência
useAcceptTransferRequest()              // Aceitar
useRejectTransferRequest()              // Rejeitar
usePendingTransferRequests()            // Ver pendentes

// Logs & Realtime
useActivityLogs(options)                // Logs paginados
useRealtime(table, keys, event)         // Subscribe a updates
```

### 📱 ComponentWillUnmount Patterns

- `useFlowPersistence()` - Persiste estado de fluxos em localStorage (validez: 24h)
- `usePrintSessionBridge()` - Bridge de autenticação para popup de impressão
- `useRoleRedirect()` - Redireciona baseado em role

---



Em caso de dúvidas:
- 📧 **Email**: support@tecnofrioservices.com
- 📱 **WhatsApp**: (11) 3555-1234
- 💬 **Chat**: Clique no ícone de chat no canto inferior direito
- 📖 **FAQ**: Veja a seção de Ajuda (?)

---

**Versão**: 1.0  
**Data**: Abril de 2026  
**Última atualização**: 12/04/2026  
**Status**: ✅ Documentação Completa e Narrativa
