-- =====================================================
-- Migração: Corrigir visibilidade do TV Monitor e dados legados
-- =====================================================

-- A) Remover políticas antigas de services para TV Monitor
DROP POLICY IF EXISTS "Public read for workshop services on TV monitor" ON public.services;

-- Criar política corrigida (baseada em location, não apenas status)
CREATE POLICY "Public read for workshop services on TV monitor"
  ON public.services FOR SELECT
  TO anon, authenticated
  USING (
    service_location = 'oficina' 
    AND status NOT IN ('finalizado')
  );

-- B) Remover política antiga de customers para TV Monitor
DROP POLICY IF EXISTS "Public read for customers with workshop services" ON public.customers;

-- Criar política corrigida de customers
CREATE POLICY "Public read for customers with workshop services"
  ON public.customers FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.customer_id = customers.id
        AND s.service_location = 'oficina'
        AND s.status NOT IN ('finalizado')
    )
  );

-- C) Corrigir dados legados: marcar serviços finalizados sem preço
UPDATE public.services
SET pending_pricing = true
WHERE status = 'finalizado'
  AND (pending_pricing = false OR pending_pricing IS NULL)
  AND (final_price IS NULL OR final_price = 0)
  AND (is_warranty = false OR is_warranty IS NULL);