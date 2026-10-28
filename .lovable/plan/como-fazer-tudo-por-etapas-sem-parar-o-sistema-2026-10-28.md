# Como fazer tudo — por etapas, sem parar o sistema

Regra geral: cada etapa acrescenta coisas novas ao lado do que já existe. Nada do que funciona hoje é apagado ou obrigatório. Se uma etapa falhar, o resto continua igual.

## Etapa 1 — Aparelhos do Cliente (a base de tudo)
- Nova aba **"Aparelhos"** na ficha do cliente, ao lado de Serviços, Orçamentos e Anexos.
- Cada aparelho: tipo, marca, modelo, nº de série, PNC, data de compra/instalação, garantia até, local na casa, notas.
- Botão "Adicionar aparelho" na ficha e ao criar o cliente (opcional).
- **Aparelhos antigos aparecem sozinhos:** o sistema lê os serviços já feitos e propõe a lista (ex.: "Frigorífico Bosch KGN… — 3 serviços"). O dono/secretaria confirma com um toque. Não se perde nada.
- Cada aparelho mostra o seu histórico: visitas, peças trocadas, valores gastos.

## Etapa 2 — Ligar aparelhos à criação de serviços e orçamentos
- Ao criar serviço/orçamento, depois de escolher o cliente aparece "Aparelhos deste cliente". Um toque preenche tipo, marca, modelo e nº de série.
- Continua a poder escrever à mão como hoje; se for um aparelho novo, o sistema pergunta "Guardar na ficha do cliente?".
- O técnico, ao fotografar a etiqueta na visita, pode confirmar/corrigir o nº de série do aparelho.

## Etapa 3 — Painel de Saúde da Empresa (dono)
Cartões simples e gráficos com frases claras:
- "Quanto faturámos este mês" vs mês anterior.
- "Dinheiro por receber" e "Serviços parados há mais de X dias".
- "Orçamentos aceites em cada 10".
- "Clientes que voltaram" e "Clientes novos".
- "Aparelhos fora de garantia / com mais de 8 anos" → lista para oferecer manutenção ou troca (upsell).
- Tudo calculado no servidor (só chegam números ao ecrã), por isso não pesa.

## Etapa 4 — Nova vista dos Técnicos (sem competição)
- Substitui o ranking por "como está a correr": serviços feitos, tempo médio, serviços que voltaram com a mesma avaria, serviços parados.
- Mostra onde está o atrito (ex.: "à espera de peça há 10 dias") em vez de quem é melhor.

## Etapa 5 — Rotas do dia
- Botão "Abrir rota no mapa" com os serviços do dia por ordem (usa Google Maps do telemóvel, sem custo).
- Mais tarde, se a equipa crescer: localização do técnico com permissão dele e ETA ao cliente.

## Etapa 6 — Funcionar sem rede (zonas sem sinal)
- O sistema passa a abrir mesmo sem internet (instalável no telemóvel).
- Mudanças de estado e fotos ficam guardadas no telemóvel e enviam-se sozinhas quando volta o sinal, com aviso "3 envios pendentes".
- É a etapa mais delicada; fica para o fim e testada com um técnico antes de ligar a todos.

## Ordem sugerida
1 → 2 → 3 → 4 → 5 → 6. Cada etapa é entregue e testada antes da seguinte.

## Detalhes técnicos
- Tabela `customer_appliances` (customer_id, appliance_type, brand, model, serial_number, pnc, purchase_date, warranty_until, location, notes, timestamps) com GRANT + RLS: dono/secretaria tudo; técnico lê/atualiza se `can_access_service` num serviço do cliente.
- Coluna opcional `appliance_id` (nullable) em `services` e `budgets`; campos de texto atuais mantêm-se como estão.
- Sugestão de aparelhos antigos: RPC que agrupa serviços por cliente+marca+modelo+nº série; inserção só após confirmação.
- Painéis: RPCs SECURITY DEFINER agregadas (padrão de `technician_performance_summary`), sem `select('*')`.
- Rotas: link `google.com/maps/dir/` com moradas ordenadas por turno.
- Offline: vite-plugin-pwa (desativado no preview/iframe), fila em IndexedDB para estados e fotos, com idempotência já existente nos pagamentos.
