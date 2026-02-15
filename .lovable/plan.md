

# Sistema de UX Inteligente — Narrativa Humana nos Modais

## Visao Geral

Transformar todos os modais, mensagens de erro e toasts do TECNOFRIO num sistema autoexplicativo e didactico, seguindo o padrao: **titulo claro + subtexto contextual + erros educativos + confirmacoes seguras**.

## O Que Muda

### 1. Subtextos Explicativos em Todos os Modais

Adicionar `DialogDescription` (ou `<p>` subtexto) abaixo do titulo de cada modal, explicando o contexto da accao.

| Modal | Titulo Actual | Subtexto a Adicionar |
|-------|--------------|---------------------|
| ServiceTypeSelector | "Escolha o Tipo de Servico" | "O tipo de servico define o fluxo que sera seguido pelo tecnico." |
| CreateServiceModal (location step) | "Tipo de Servico" | "Se o aparelho ja foi deixado na oficina, selecione 'Deixou na Oficina'. Caso contrario, o tecnico fara uma visita ao cliente." |
| CreateServiceModal (form step) | "Criar Novo Servico" | "Preencha os dados do cliente e do equipamento. Campos com * sao obrigatorios." |
| CreateInstallationModal | titulo actual | "O tecnico recebera os detalhes para realizar a instalacao no local indicado." |
| CreateDeliveryModal | titulo actual | "Esta entrega sera atribuida a um tecnico para levar o equipamento ao cliente." |
| SetPriceModal | "Definir Preco" | "O preco definido aqui sera utilizado para controlo financeiro e cobranca." |
| RegisterPaymentModal | "Registar Pagamento" | "Este valor sera abatido do saldo em aberto do servico." |
| RequestPartModal | "Solicitar Peca" | "Ao confirmar, o pedido ficara disponivel para o Dono registar oficialmente a encomenda." |
| ConfirmPartOrderModal | "Registar Pedido de Peca" | "Confirme os detalhes do pedido. A previsao de chegada serve como termometro de urgencia." |
| AssignTechnicianModal | titulo actual | "O tecnico selecionado recebera uma notificacao com os detalhes do servico." |
| ForceStateModal | "Mudar Status" | Ja tem (manter) |
| DeliveryManagementModal | "Opcoes de Entrega" | "Escolha como o equipamento sera devolvido ao cliente." |
| CreateUserModal | "Criar Utilizador" | "Este perfil tera acesso ao sistema de acordo com o nivel selecionado." |
| CreateCustomerModal | "Novo Cliente" / "Editar Cliente" | "Os dados do cliente serao associados aos servicos criados." |
| ConvertBudgetModal | titulo actual | "Ao converter, sera criado um servico com os dados deste orcamento." |
| RescheduleServiceModal | titulo actual | "Selecione nova data e turno. O tecnico sera notificado da alteracao." |

**Ficheiros afectados**: Todos os 16+ modais listados acima.

### 2. Erros Educativos (Substituir Mensagens Genericas)

Criar um utilitario central `src/utils/errorMessages.ts` com funcoes que convertem erros tecnicos em mensagens humanas:

```text
Mapeamento de erros:

"row-level security" / "JWT" / "not authenticated"
  -> "Sessao expirada. Por favor, faca login novamente."

"duplicate key" / "already exists" (email)
  -> "Ja existe uma conta com este email. Cada perfil precisa de um email unico."

"violates not-null constraint"
  -> "Alguns campos obrigatorios nao foram preenchidos."

"Invalid date" / "required_error" em datas
  -> "A data selecionada e invalida. Verifique se escolheu uma data futura valida."

Erro generico
  -> "Ocorreu um problema. Por favor, tente novamente ou contacte o suporte."
```

**Ficheiros afectados**: Novo `src/utils/errorMessages.ts` + actualizacao de todos os `toast.error()` nos modais e hooks.

### 3. Toasts de Sucesso Mais Claros

Auditar e padronizar todos os `toast.success()` para serem curtos, directos e humanos. A maioria ja esta boa gracas ao `feedbackMessages.ts`, mas uniformizar os restantes:

| Actual | Melhorado |
|--------|-----------|
| "Utilizador criado com sucesso!" | "Utilizador criado! Credenciais disponiveis abaixo." |
| "Erro ao definir recolha" | "Nao foi possivel definir a recolha. Tente novamente." |
| "Erro ao solicitar peca" | "Nao foi possivel solicitar a peca. Verifique a ligacao e tente novamente." |

**Ficheiros afectados**: Modais e hooks onde ha `toast.success` / `toast.error`.

### 4. Subtextos de Pagina (Micro-textos Educativos)

Adicionar subtextos discretos nas paginas principais:

| Pagina | Subtexto |
|--------|----------|
| OficinaPage | "Servicos com equipamentos fisicamente na oficina." |
| SecretaryDebitoPage | "Servicos com preco definido e saldo pendente." |
| ServicosPage (filtro "aguardando peca") | "Servicos que dependem de chegada de peca para continuar." |

**Ficheiros afectados**: `OficinaPage.tsx`, `SecretaryDebitoPage.tsx`, `ServicosPage.tsx`.

## Detalhe Tecnico

### Estrutura do errorMessages.ts

```text
export function humanizeError(error: unknown): string
  - Recebe qualquer erro
  - Verifica message contra padroes conhecidos
  - Retorna mensagem humana em portugues

export function isSessionError(error: unknown): boolean
  - Reutiliza logica existente de isSessionOrRlsError

export function getFieldValidationMessage(fieldName: string): string
  - Retorna mensagem especifica por campo
```

### Padrao de Alteracao por Modal

Cada modal recebe apenas 2 alteracoes minimas:
1. Adicionar `<p className="text-sm text-muted-foreground">` ou `DialogDescription` apos o `DialogTitle`
2. Substituir `toast.error('Erro ao...')` por `toast.error(humanizeError(error))`

### Ordem de Implementacao

1. Criar `src/utils/errorMessages.ts`
2. Actualizar modais de criacao (ServiceTypeSelector, CreateServiceModal, CreateInstallationModal, CreateDeliveryModal)
3. Actualizar modais de accao (SetPriceModal, RegisterPaymentModal, RequestPartModal, ConfirmPartOrderModal)
4. Actualizar modais de gestao (AssignTechnicianModal, DeliveryManagementModal, ForceStateModal, RescheduleServiceModal)
5. Actualizar modais de utilizadores/clientes (CreateUserModal, CreateCustomerModal, EditUserModal)
6. Actualizar ConvertBudgetModal
7. Adicionar subtextos de pagina

### Resultado

- Todos os modais: titulo + subtexto contextual
- Todos os erros: mensagens humanas e orientativas
- Todos os toasts: curtos, directos, sem linguagem tecnica
- Zero alteracoes de logica ou fluxo — apenas texto e UX

