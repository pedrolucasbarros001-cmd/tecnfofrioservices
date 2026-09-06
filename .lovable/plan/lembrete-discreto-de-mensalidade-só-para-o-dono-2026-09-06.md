# Lembrete discreto de mensalidade (só para o dono)

Um aviso subtil, no estilo do painel de faturação do Supabase, que lembra o dono de que a mensalidade de manutenção e suporte (60 €) está a chegar ao fim do ciclo.

## Como vai funcionar

- Aparece apenas para quem tem o papel de **dono**. Técnicos, secretaria e monitor nunca o veem.
- Fica no topo da aplicação, por baixo da barra superior, em todas as páginas internas.
- Só surge nos **7 dias antes** da data de vencimento e mantém-se enquanto o pagamento estiver em atraso.
- O dono pode fechá-lo; volta a aparecer no dia seguinte.
- Vencimento num **dia fixo de cada mês** (por omissão dia 18, ajustável num único sítio no código).

## Aspeto

Faixa discreta, com a identidade azul atual:

```text
+-----------------------------------------------------------------------+
| (i) Manutenção e suporte · 60 €       Faltam 5 dias  [====----]   (x)  |
|     Renovação do serviço a 18 de setembro                              |
+-----------------------------------------------------------------------+
```

- Barra fina de progresso do ciclo, como na imagem de referência do Supabase.
- Tom neutro/informativo nos dias anteriores; tom de atenção (âmbar) no próprio dia e depois de passar a data, com o texto “Renovação em atraso”.
- Entrada suave (deslize curto), respeitando a preferência de movimento reduzido do sistema.
- Em ecrã pequeno passa a duas linhas, sem cortar texto nem tapar botões.

## Texto (pt-PT, não agressivo)

- Antecedência: “Manutenção e suporte — renovação a 18 de setembro. Faltam 5 dias.”
- No dia: “Manutenção e suporte — renovação hoje.”
- Depois: “Manutenção e suporte — renovação pendente desde 18 de setembro.”

## Detalhes técnicos

- Novo ficheiro `src/config/serviceBilling.ts`: dia de vencimento, valor, moeda, dias de antecedência e um interruptor para desligar tudo.
- Novo componente `src/components/shared/ServiceBillingNotice.tsx`: calcula o próximo vencimento com as utilidades de data locais existentes (`parseLocalDate`/`safeDateFormat`, sem `new Date()` para datas puras), aplica a regra dos 7 dias e a dispensa diária guardada em `localStorage` com a chave do dia.
- `src/components/layouts/AppLayout.tsx`: renderiza o componente entre o cabeçalho e o conteúdo, condicionado a `role === 'dono'`.
- Sem alterações à base de dados, permissões, consultas ou lógica de serviços.
- Acessibilidade: `role="status"`, botão de fechar com rótulo, foco visível.
- Validação: `type-check`, lint, testes e build, mais verificação visual em desktop e telemóvel.
