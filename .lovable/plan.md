

# Adicionar coluna `pnc` a tabela `services`

## Contexto

O campo PNC (Part Number Code) ja existe no codigo TypeScript (`src/types/database.ts` linha 126: `pnc: string | null`) e no formulario `CreateServiceModal`, mas **nao existe na tabela `services` da base de dados**. Isto significa que o valor e ignorado silenciosamente quando gravado.

## Migracao SQL

```sql
ALTER TABLE public.services
ADD COLUMN pnc text DEFAULT NULL;
```

## Impacto

- Coluna nullable, sem valores por defeito — zero impacto nos dados existentes
- O codigo que ja envia `pnc` no insert/update passara a gravar correctamente
- Nenhuma alteracao de codigo necessaria — o campo ja esta mapeado nos tipos e formularios

