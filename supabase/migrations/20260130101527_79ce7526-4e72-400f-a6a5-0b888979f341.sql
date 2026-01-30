-- Adicionar campo pricing_description na tabela services
ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS pricing_description TEXT;

COMMENT ON COLUMN public.services.pricing_description IS 
'Descricao livre de mao de obra, materiais e pecas incluidas no preco';