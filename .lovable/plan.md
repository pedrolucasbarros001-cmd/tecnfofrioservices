# Reduzir custos: menos dados transferidos

A análise está correta nos pontos que verifiquei no código. Confirmei:

- O painel principal carrega **todos os serviços com preço** apenas para contar os que estão em dívida (`select('*')` sem filtro de colunas).
- A página de Performance carrega até **500 serviços completos** de cada vez.
- As fotos são enviadas **sem redução de tamanho** (uma foto de telemóvel pode ter 3-5 MB).
- Há **6 canais de atualização em tempo real** abertos por cada pessoa com sessão iniciada, mais um no ecrã da oficina.
- `select('*')` aparece em dezenas de ficheiros.

Proposta, por ordem de impacto.

## 1. Painel principal: contar no servidor

Substituir a leitura de todos os serviços com preço por uma função de base de dados que devolve apenas o número de serviços em dívida. Passa de milhares de linhas para um único número em cada abertura do painel.

## 2. Comprimir fotos antes de enviar

Antes do envio, redimensionar cada foto para no máximo 1600 px de largura e gravar em JPEG com qualidade ~0.75. Reduz 80-90% do peso sem perder detalhe útil para diagnóstico. Aplica-se a todos os pontos de captura (visita, oficina, administração), porque todos passam pela mesma função de envio.

## 3. Página de Performance por agregados

Trocar a leitura das 500 linhas por uma função de base de dados que devolve os totais já somados por técnico. Encaixa na reescrita já prevista para esta página.

## 4. Rever `select('*')` nas listas mais usadas

Limitar às colunas realmente mostradas nas listas de Serviços, Clientes e Orçamentos. As restantes ficam para depois.

## 5. Ecrã da oficina (TV)

Trocar as atualizações em tempo real por uma recarga a cada 45 segundos. Ninguém interage com esse ecrã, por isso o atraso é irrelevante.

Deixo de fora reduzir os canais em tempo real das pessoas que trabalham na app — perde-se a sensação de imediato que já está montada, e o ganho é incerto sem ver a fatura.

## Antes de começar

Vale confirmar no painel da Supabase (Definições → Faturação) qual das categorias está realmente a pesar. Os passos 1 e 2 valem a pena de qualquer forma; os 3 a 5 podem ser reordenados conforme o que a fatura mostrar.

## Detalhes técnicos

- Migração: `count_services_in_debt()` e `technician_performance_summary(_from date, _to date)` como funções `stable security definer` com `search_path = public`, com `grant execute` a `authenticated`.
- `DashboardPage.tsx`: substituir a query `em_debito` por `supabase.rpc('count_services_in_debt')`.
- Novo `src/utils/imageCompression.ts`: `compressImage(dataUrl, { maxWidth: 1600, quality: 0.75 })` via canvas; chamado no início de `uploadServicePhoto` em `src/utils/photoUpload.ts` e no insert direto de `PhotoCaptureStep.tsx`.
- `PerformancePage.tsx`: consumir o RPC agregado em vez do `.limit(500)`.
- `TVMonitorPage.tsx`: remover o canal Realtime e usar `refetchInterval: 45000`.
- Listas: restringir colunas em `useServices`, `useCustomers` e página de orçamentos.
