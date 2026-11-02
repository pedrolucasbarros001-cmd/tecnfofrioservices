-- ============================================================
-- TECNOFRIO – Enhanced Dashboard RPCs v2
-- Breakdown financeiro correto + Gargalos
-- Aplicar no Supabase SQL Editor
-- ============================================================

-- 1. Saúde financeira MELHORADA
--    Recebido / Faturado por receber / Por faturar / Orçamentos pendentes
CREATE OR REPLACE FUNCTION get_business_health_metrics()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_month_start TIMESTAMPTZ := DATE_TRUNC('month', NOW());
  v_last_month_start TIMESTAMPTZ := DATE_TRUNC('month', NOW() - INTERVAL '1 month');
  v_last_month_end  TIMESTAMPTZ := DATE_TRUNC('month', NOW());
  v_30d TIMESTAMPTZ := NOW() - INTERVAL '30 days';
BEGIN
  RETURN (
    SELECT json_build_object(
      -- Dinheiro efectivamente recebido este mês
      'recebido', COALESCE((
        SELECT SUM(COALESCE(amount_paid, 0))
        FROM services
        WHERE status = 'finalizado'
          AND updated_at >= v_month_start
      ), 0),

      -- Faturado mas ainda não pago (finalizado com preço, parcialmente pago)
      'faturado_por_receber', COALESCE((
        SELECT SUM(final_price - COALESCE(amount_paid, 0))
        FROM services
        WHERE status = 'finalizado'
          AND final_price > 0
          AND COALESCE(amount_paid, 0) < final_price
      ), 0),

      -- Concluídos sem preço definido (por faturar)
      'por_faturar_count', (
        SELECT COUNT(*)
        FROM services
        WHERE status = 'finalizado'
          AND (final_price IS NULL OR final_price = 0)
      ),

      -- Orçamentos pendentes
      'orcamentos_pendentes_count', (
        SELECT COUNT(*) FROM budgets WHERE status = 'pendente'
      ),
      'orcamentos_pendentes_valor', COALESCE((
        SELECT SUM(COALESCE(estimated_total, 0))
        FROM budgets WHERE status = 'pendente'
      ), 0),

      -- Comparação mês anterior (baseado em amount_paid)
      'revenue_this_month', COALESCE((
        SELECT SUM(COALESCE(amount_paid, 0))
        FROM services
        WHERE status = 'finalizado' AND updated_at >= v_month_start
      ), 0),
      'revenue_last_month', COALESCE((
        SELECT SUM(COALESCE(amount_paid, 0))
        FROM services
        WHERE status = 'finalizado'
          AND updated_at >= v_last_month_start
          AND updated_at < v_last_month_end
      ), 0),

      -- Serviços em aberto / sem faturar (para alertas)
      'unbilled_services', (
        SELECT COUNT(*) FROM services
        WHERE status = 'finalizado'
          AND (final_price IS NULL OR final_price = 0)
      ),
      'open_services', (
        SELECT COUNT(*) FROM services WHERE status NOT IN ('finalizado','cancelado')
      ),

      -- Conversão de orçamentos e ticket médio
      'budget_conversion_rate', COALESCE((
        SELECT ROUND(
          COUNT(*) FILTER (WHERE status = 'aprovado')::numeric /
          NULLIF(COUNT(*) FILTER (WHERE status IN ('aprovado','recusado')), 0) * 100, 1
        ) FROM budgets WHERE created_at >= v_30d
      ), 0),
      'avg_ticket', COALESCE((
        SELECT ROUND(AVG(final_price)::numeric, 2)
        FROM services
        WHERE status = 'finalizado' AND final_price > 0 AND updated_at >= v_30d
      ), 0),

      -- Clientes novos este mês
      'clientes_novos_mes', (
        SELECT COUNT(*) FROM customers WHERE created_at >= v_month_start
      ),

      -- Serviços parados há mais de 5 dias (para alerta de gargalo)
      'stuck_services_5d', (
        SELECT COUNT(*) FROM services
        WHERE status NOT IN ('finalizado','cancelado')
          AND updated_at < NOW() - INTERVAL '5 days'
      ),

      -- Serviços sem técnico atribuído
      'sem_tecnico', (
        SELECT COUNT(*) FROM services
        WHERE status NOT IN ('finalizado','cancelado')
          AND technician_id IS NULL
      )
    )
  );
END;
$$;
GRANT EXECUTE ON FUNCTION get_business_health_metrics() TO authenticated;

-- 2. Gargalos por estado: tempo médio parado em cada estado
CREATE OR REPLACE FUNCTION get_service_bottlenecks()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(b) ORDER BY b.avg_days DESC)
    FROM (
      SELECT
        status,
        COUNT(*)::int                                                           AS count,
        ROUND(AVG(
          EXTRACT(EPOCH FROM (NOW() - updated_at)) / 86400
        )::numeric, 1)                                                         AS avg_days,
        MAX(EXTRACT(EPOCH FROM (NOW() - updated_at)) / 86400)::int            AS max_days
      FROM services
      WHERE status NOT IN ('finalizado','cancelado')
        AND updated_at IS NOT NULL
      GROUP BY status
    ) b
  );
END;
$$;
GRANT EXECUTE ON FUNCTION get_service_bottlenecks() TO authenticated;
