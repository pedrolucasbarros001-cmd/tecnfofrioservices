

## Plano: Corrigir build errors + Garantir que cancelamento remove serviço da visão do técnico

### Diagnóstico

1. **Build errors**: Os 3 erros são sobre `owner_confirmed` não existir no tipo de update gerado pelo Supabase (`src/integrations/supabase/types.ts`). As colunas `owner_confirmed` e `owner_confirmed_at` existem na BD mas o ficheiro de tipos auto-gerado está desatualizado. Como não podemos editar esse ficheiro diretamente, a solução é fazer cast `as any` nos objectos de update.

2. **Cancelamento vs visão do técnico**: A query do técnico em `ServicosPage.tsx` (linha 76) já filtra por `.in('status', ['por_fazer', 'em_execucao', ...])` — `cancelado` **não está incluído**, logo o serviço já desaparece automaticamente quando cancelado. O mesmo acontece na `TechnicianOfficePage`. Não é necessária nenhuma alteração de lógica.

### Alterações

**1. `src/components/services/ServiceDetailSheet.tsx` (linha ~482)**
- Adicionar cast `as any` ao objecto `.update({ owner_confirmed: true, ... } as any)`

**2. `src/pages/GeralPage.tsx` (linha ~312)**
- Mesmo cast `as any` no `.update()`

**3. `src/pages/secretary/SecretaryConcluidosPage.tsx` (linha ~84)**
- Mesmo cast `as any` no `.update()`

### Resultado
- Build compila sem erros
- Cancelamento já funciona correctamente — serviço cancelado não aparece para nenhum técnico

