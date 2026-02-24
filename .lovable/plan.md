
# Plano: Expandir Acesso da Secretaria nas Accoes de Pecas

## Problema

Tres accoes nos servicos estao restritas apenas ao nivel "dono", impedindo qualquer conta com nivel "secretaria" de as usar:

1. **"Registar Pedido"** (quando servico esta em "para_pedir_peca") -- so dono
2. **"Peca Chegou"** (quando servico esta em "em_espera_de_peca") -- so dono
3. **"Solicitar Peca"** (durante execucao/oficina) -- so tecnico ou dono

## Solucao (1 ficheiro)

### `src/components/services/StateActionButtons.tsx`

Tres alteracoes simples de permissao:

1. Linha 134: `isDono` passa a `(isDono || isSecretaria)` -- botao principal "Registar Pedido"
2. Linha 145: `isDono` passa a `(isDono || isSecretaria)` -- botao principal "Peca Chegou"
3. Linha 279: `(isTecnico || isDono)` passa a `(isTecnico || isDono || isSecretaria)` -- menu "Solicitar Peca"

### O que NAO muda (mantido exclusivo do dono)

- "Mudar Status (Forcado)" -- accao critica de seguranca
- "Eliminar Servico" -- accao destrutiva irreversivel

## Resultado

Qualquer conta com o nivel de acesso "secretaria" podera gerir todo o fluxo de pecas (solicitar, registar pedido, confirmar chegada), alinhando com as permissoes ja existentes de orcamentar e registar pagamentos.
