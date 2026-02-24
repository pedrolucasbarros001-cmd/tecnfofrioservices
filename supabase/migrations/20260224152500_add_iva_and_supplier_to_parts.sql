-- Adicionar colunas para IVA e Fornecedor na tabela de peças
ALTER TABLE IF EXISTS public.service_parts 
ADD COLUMN IF NOT EXISTS iva_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS supplier text;

-- Comentários para documentação
COMMENT ON COLUMN public.service_parts.iva_rate IS 'Taxa de IVA aplicada à peça (0, 6, 13, 23)';
COMMENT ON COLUMN public.service_parts.supplier IS 'Nome do fornecedor onde a peça foi encomendada';
