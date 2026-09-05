# Plano — Sistema de interações TECNOFRIO end to end

## Objetivo
Modernizar toda a experiência da aplicação com movimento **equilibrado, rápido e funcional**, preservando e refinando a identidade azul atual da TECNOFRIO. O resultado deve ser coerente em desktop e mobile, intuitivo para uso diário e sem alterar regras de negócio, dados ou permissões.

O guia de motion enviado será usado como referência de direção. A personalidade será **corporativa e humana**, próxima da fluidez do Spotify: resposta imediata, transições que explicam mudanças de contexto e animação apenas quando ajuda a compreender o que aconteceu.

## 1. Criar a linguagem global de movimento
- Definir no sistema visual três tempos reutilizáveis: rápido para toque/pressão, normal para estados e lento para janelas/painéis.
- Definir curvas consistentes para entrada, saída e mudança de estado; entradas desaceleram e saídas são mais rápidas.
- Criar padrões globais para fade, escala subtil, deslocamento curto, sequência de listas e feedback de pressão.
- Aplicar `prefers-reduced-motion` globalmente: quem reduzir movimento continua a receber todo o feedback, mas sem deslocamentos ou efeitos desnecessários.
- Manter azul `#2B4F84`, modo claro e cantos de `0.5rem`; refinar apenas profundidade, contraste, sombras e resposta visual.

## 2. Unificar os componentes que propagam a mudança
Atualizar primeiro os elementos partilhados, para que a melhoria chegue ao sistema inteiro sem reescrever cada fluxo:

- **Botões:** pressão tátil, hover apenas em dispositivos compatíveis, foco claro, estado desativado, loading sem alterar largura e confirmação breve quando adequado.
- **Cards e linhas clicáveis:** elevação mínima, seleção, foco, expansão e entrada de listas sem saltos de layout.
- **Modais:** overlay mais leve, entrada/saída consistente, cabeçalho e ações estáveis, conteúdo rolável e teclado/foco preservados.
- **Painéis laterais e drawers:** movimento direcional coerente; no mobile, ocupar espaço confortável e respeitar gestos/toque.
- **Menus, popups, selects e tooltips:** abertura curta, origem visual correta e fechamento imediato sem atrasar o trabalho.
- **Switches, checkboxes, tabs e accordions:** transição clara entre estados, sem animação decorativa excessiva.
- **Badges e indicadores:** mudança de estado legível; pulsação somente para estados que realmente exigem atenção.

## 3. Padronizar loading, sucesso, erro e vazio
- Criar uma família visual reutilizável de estados: carregamento inicial, atualização em segundo plano, vazio, erro recuperável, sucesso e aviso.
- Usar skeletons para conteúdo estrutural e spinner apenas em ações curtas; nunca esconder a página inteira sem explicação.
- Manter o texto do botão e a sua largura durante submissões, bloquear duplo clique e indicar progresso no próprio ponto da ação.
- Unificar as notificações no sistema dominante atual (`sonner`) e remover a apresentação duplicada do sistema antigo após migrar o único uso divergente.
- Definir mensagens PT-PT consistentes, com ação de tentar novamente quando tecnicamente possível.
- Para erros de formulário, levar o foco ao primeiro campo inválido e usar uma animação firme e curta, sem “abanar” a interface inteira.
- Para sucesso, confirmar de forma contida e preservar o contexto do utilizador em vez de fechar ou redirecionar abruptamente.

## 4. Aplicar por jornadas completas, não por páginas isoladas
A migração será feita em lotes pequenos e verificáveis:

1. **Fundação e acesso:** login, proteção de sessão, navegação, menu lateral, notificações e mudança de página.
2. **Criação administrativa:** serviço, orçamento, instalação, entrega, cliente e colaborador — abrir, preencher, validar, guardar, sucesso e erro.
3. **Operação diária:** Geral, Agenda, Serviços e Oficina — cards, filtros, listas, “Assumir”, atribuir, reagendar e estados em tempo real.
4. **Execução técnica:** visita, oficina, instalação e entrega — fotos, peças, pagamentos, assinatura, passos e conclusão.
5. **Detalhe e gestão:** fichas laterais de serviço/cliente, edição, histórico, documentos, impressão e ações destrutivas.
6. **Áreas restantes:** preços, concluídos, débitos, desempenho, perfil, preferências, monitor e páginas públicas.

Cada lote será concluído e validado antes de avançar. Assim, uma regressão fica limitada ao lote atual e pode ser corrigida sem comprometer o restante sistema.

## 5. Comportamento responsivo
- **Desktop:** modais centrados para tarefas curtas; painéis laterais para consulta e edição contextual; feedback de hover apenas como complemento.
- **Mobile:** ações sempre visíveis, alvos de toque confortáveis, rodapé de ações estável, conteúdo rolável sem ficar escondido pelo teclado e painéis que usam toda a largura quando necessário.
- Preservar posição, seleção e dados preenchidos ao alternar estados ou fechar confirmações secundárias.
- Evitar transições longas entre páginas; usar apenas uma entrada curta para orientar, sem atrasar a navegação.

## 6. Acessibilidade e segurança operacional
- Preservar focus trap, Escape, retorno de foco e navegação por teclado fornecidos pelos componentes atuais.
- Dar nome acessível a botões só com ícone e tornar controlos personalizados utilizáveis por teclado.
- Não depender apenas de cor ou movimento para comunicar sucesso, erro, disponibilidade ou perigo.
- Não tocar em queries, mutations, Supabase, estados de serviço, permissões ou cálculos financeiros; a camada de motion será exclusivamente visual e de feedback.
- Não animar propriedades que provoquem reflow; priorizar `transform` e `opacity` para manter fluidez em telemóveis de gama média.

## Detalhes técnicos
- Continuar com Tailwind, `tailwindcss-animate`, Radix e Vaul já presentes; não adicionar uma biblioteca pesada de animação sem necessidade comprovada.
- Centralizar tokens de duração, easing, profundidade e estados no sistema global, com classes semânticas e variantes dos componentes partilhados.
- Criar componentes comuns apenas onde existe repetição real: estado assíncrono, feedback de ação e estruturas consistentes de modal/painel.
- Migrar os 35 botões HTML caso a caso: manter os que representam superfícies especiais (câmara/imagem) e substituir os restantes pelo botão partilhado.
- Formalizar a regra atual: modal para ações/formulários; painel lateral para detalhe contextual; confirmação dedicada para ações destrutivas.
- Evitar animações concorrentes: um elemento principal por interação, deslocamentos curtos e sequências de listas abaixo de 200 ms.

## Validação e critérios de conclusão
Em cada lote:
- Testar os fluxos principais em desktop e mobile, incluindo teclado e viewport com altura reduzida.
- Confirmar abertura/fecho encadeado de modal, select, popup e painel sem sobreposição fantasma ou perda de foco.
- Confirmar loading, sucesso, erro, repetição de clique e ligação lenta.
- Confirmar preferência de movimento reduzido.
- Executar type-check, lint, testes e build; corrigir apenas regressões causadas pelo lote.

A implementação estará completa quando todas as jornadas listadas usarem a mesma linguagem de interação, todos os estados assíncronos tiverem feedback claro e os fluxos atuais continuarem funcionalmente iguais.
