-- Corrigir servicos de entrega/instalacao que estao em em_debito mas deveriam estar por_fazer
-- Estes servicos foram criados antes da correcao de codigo e precisam de ter o status operacional correcto
UPDATE public.services
SET status = 'por_fazer'
WHERE status = 'em_debito'
  AND service_type IN ('entrega', 'instalacao')
  AND delivery_date IS NULL;