# Lembrete de renovação mais eficaz (sem incomodar)

O lembrete actual é uma faixa fina no topo, sempre com o mesmo aspecto, fácil de ignorar. A ideia é que ele "suba de tom" conforme a data se aproxima e passa, e que apareça um aviso ao abrir o sistema — mas só quando faz sentido, e no máximo uma vez por dia.

Continua visível apenas para o dono. Nada muda para técnicos, secretaria ou monitor.

## Níveis de urgência (a cor acompanha o tempo)

| Quando | Faixa no topo | Aviso ao abrir |
|---|---|---|
| Faltam 7 a 4 dias | Azul discreto (como hoje) | Não aparece |
| Faltam 3 a 1 dias | Âmbar suave | Uma vez por dia |
| Dia da renovação | Laranja | Uma vez por dia |
| Em atraso 1 a 2 dias | Laranja forte | Uma vez por dia |
| Em atraso 3+ dias | Vermelho | Uma vez por dia |

A cor aplica-se só à faixa, ao ícone e à barrinha de progresso — o resto do sistema mantém o azul de sempre. Nunca há ecrã a piscar, som, nem bloqueio de utilização: o sistema continua totalmente utilizável em qualquer nível.

## Regras anti-spam

- O aviso ao abrir só surge a partir de 3 dias antes da data — antes disso basta a faixa.
- Aparece no máximo **uma vez por dia**, mesmo que feche e volte a abrir a app, mude de página ou use outro separador.
- Ao fechar o aviso, ele não volta nesse dia. A faixa no topo permanece (é o lembrete passivo).
- Fechar a faixa continua a valer só para o dia corrente, como hoje.
- Em atraso, o aviso continua a aparecer uma vez por dia — mas sempre com botão de fechar, nunca preso.

## O aviso ao abrir

Janela pequena e calma, com:
- Título curto conforme o nível ("Renovação em 2 dias", "Renovação hoje", "Renovação em atraso").
- A mesma explicação de hoje: a renovação mantém o plano de hospedagem activo; sem ela o sistema pode ficar indisponível.
- Contagem de dias e a data da renovação.
- Dois botões: "Entendido" (fecha até amanhã) e "Ver depois" (fecha, igual).

Sem valores nem moeda, como combinado.

## Detalhes técnicos

- `src/config/serviceBilling.ts`: acrescentar `modalDays: 3` (antecedência a partir da qual o modal aparece) mantendo `enabled`, `dueDay`, `noticeDays`.
- Extrair o cálculo de ciclo de `ServiceBillingNotice.tsx` para `src/hooks/useServiceBillingCycle.ts`, devolvendo `{ dueDate, daysRemaining, progress, level }` com `level: 'info' | 'soon' | 'due' | 'late' | 'critical'`. Reutilizado pela faixa e pelo modal, sem duplicar lógica de datas (continua a usar datas locais, sem `parseISO`).
- Mapa de estilos por `level` num único objecto (classes de borda/fundo/texto/ícone/barra) para faixa e modal partilharem a mesma paleta.
- Novo `src/components/shared/ServiceBillingModal.tsx` usando o `Dialog` existente; montado em `AppLayout.tsx` ao lado da faixa, também sob `role === 'dono'`.
- Anti-spam: chave `tecnofrio:service-billing-modal-shown` em `localStorage` com a data `YYYY-MM-DD`; o modal só abre se a chave for diferente de hoje, e a chave é escrita no momento em que abre (não ao fechar), garantindo uma vez por dia mesmo com recarregamentos ou vários separadores. A chave da faixa mantém-se separada.
- Abertura com pequeno atraso (~1200 ms) após o layout montar, para não competir com o carregamento inicial.
- Sem alterações de base de dados, permissões ou fluxos de serviço.
