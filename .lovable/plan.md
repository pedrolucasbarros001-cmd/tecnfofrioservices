
# Plano: Mover Histórico de Atividades da Oficina para o Dashboard

## Resumo

Remover a secção "Histórico de Atividades" da página `/oficina` (OficinaPage) e adicioná-la na página `/dashboard` (DashboardPage), abaixo dos cards de status. Manter no Monitor TV como está.

---

## Alterações

### 1. `src/pages/OficinaPage.tsx` - Remover histórico

- Remover o import de `useActivityLogs`
- Remover o import de `formatDistanceToNow` e `pt` (se não usados noutro local)
- Remover a variável `activityLogs`
- Remover todo o bloco "Activity History Section" (Card com CardHeader/CardContent, linhas 208-242)

### 2. `src/pages/DashboardPage.tsx` - Adicionar histórico

- Adicionar imports: `useActivityLogs`, `format`, `formatDistanceToNow`, `pt`, `CardHeader`, `CardTitle`
- Adicionar o hook `useActivityLogs({ limit: 10 })`
- Adicionar a secção de histórico abaixo do grid de cards, com o mesmo layout que estava na OficinaPage

### Resultado

| Página | Histórico |
|--------|-----------|
| `/oficina` (admin/secretária) | Removido |
| `/dashboard` (admin) | Adicionado abaixo dos cards |
| `/tv-monitor` | Mantido como está |
