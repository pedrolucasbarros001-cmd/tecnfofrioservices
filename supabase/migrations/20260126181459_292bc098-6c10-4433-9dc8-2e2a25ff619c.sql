-- Permitir leitura publica de servicos na oficina (para TV Monitor)
CREATE POLICY "Public read for workshop services on TV monitor"
  ON public.services FOR SELECT
  TO anon, authenticated
  USING (
    service_location = 'oficina' 
    AND status IN ('na_oficina', 'em_execucao', 'para_pedir_peca', 'em_espera_de_peca', 'concluidos')
  );

-- Permitir leitura publica de customers associados a servicos da oficina
CREATE POLICY "Public read for customers with workshop services"
  ON public.customers FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.customer_id = customers.id
        AND s.service_location = 'oficina'
        AND s.status IN ('na_oficina', 'em_execucao', 'para_pedir_peca', 'em_espera_de_peca', 'concluidos')
    )
  );

-- Permitir leitura publica de technicians para mostrar no monitor
CREATE POLICY "Public read for technicians on TV monitor"
  ON public.technicians FOR SELECT
  TO anon
  USING (active = true);

-- Permitir leitura publica de profiles de tecnicos ativos
CREATE POLICY "Public read for technician profiles on TV monitor"
  ON public.profiles FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.technicians t
      WHERE t.profile_id = profiles.id AND t.active = true
    )
  );