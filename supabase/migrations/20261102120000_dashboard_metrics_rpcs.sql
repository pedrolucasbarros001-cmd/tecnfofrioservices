-- Dashboard metrics RPCs for TECNOFRIO
-- Apply via Supabase SQL editor or CLI

-- 1. Saúde financeira geral
CREATE OR REPLACE FUNCTION get_business_health_metrics()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result JSON;
BEGIN
  SELECT json_build_object(
    'revenue_this_month', COALESCE((
      SELECT SUM(final_price) FROM services
      WHERE status = 'finalizado'
        AND DATE_TRUNC('month', updated_at) = DATE_TRUNC('month', NOW())
    ), 0),
    'revenue_last_month', COALESCE((
      SELECT SUM(final_price) FROM services
      WHERE status = 'finalizado'
        AND DATE_TRUNC('month', updated_at) = DATE_TRUNC('month', NOW() - INTERVAL '1 month')
    ), 0),
    'unbilled_services', (
      SELECT COUNT(*) FROM services
      WHERE status = 'finalizado' AND (final_price IS NULL OR final_price = 0)
    ),
    'open_services', (
      SELECT COUNT(*) FROM services WHERE status NOT IN ('finalizado', 'cancelado')
    ),
    'budget_conversion_rate', COALESCE((
      SELECT ROUND(
        COUNT(*) FILTER (WHERE status = 'aprovado')::numeric /
        NULLIF(COUNT(*) FILTER (WHERE status IN ('aprovado','recusado')), 0) * 100, 1
      ) FROM budgets
      WHERE created_at >= NOW() - INTERVAL '30 days'
    ), 0),
    'avg_ticket', COALESCE((
      SELECT ROUND(AVG(final_price)::numeric, 2) FROM services
      WHERE status = 'finalizado'
        AND final_price > 0
        AND updated_at >= NOW() - INTERVAL '30 days'
    ), 0)
  ) INTO result;
  RETURN result;
END;
$$;
GRANT EXECUTE ON FUNCTION get_business_health_metrics() TO authenticated;

-- 2. Tendência de receita (últimos 6 meses)
CREATE OR REPLACE FUNCTION get_revenue_trend()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(t) ORDER BY t.month_date ASC)
    FROM (
      SELECT
        TO_CHAR(DATE_TRUNC('month', updated_at), 'Mon') AS month,
        DATE_TRUNC('month', updated_at)                 AS month_date,
        COALESCE(SUM(final_price), 0)                   AS revenue,
        COUNT(*)                                         AS services_count
      FROM services
      WHERE status = 'finalizado'
        AND updated_at >= DATE_TRUNC('month', NOW() - INTERVAL '5 months')
      GROUP BY DATE_TRUNC('month', updated_at)
    ) t
  );
END;
$$;
GRANT EXECUTE ON FUNCTION get_revenue_trend() TO authenticated;

-- 3. Métricas operacionais
CREATE OR REPLACE FUNCTION get_operational_metrics()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result JSON;
BEGIN
  SELECT json_build_object(
    'by_status', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT status, COUNT(*) AS count
        FROM services
        WHERE status NOT IN ('finalizado','cancelado')
        GROUP BY status
      ) t
    ),
    'by_type', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT service_type, COUNT(*) AS count
        FROM services
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY service_type
      ) t
    ),
    'avg_resolution_days', COALESCE((
      SELECT ROUND(
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400)::numeric, 1
      )
      FROM services
      WHERE status = 'finalizado'
        AND updated_at >= NOW() - INTERVAL '30 days'
    ), 0),
    'services_this_week', (
      SELECT COUNT(*) FROM services
      WHERE created_at >= DATE_TRUNC('week', NOW())
    )
  ) INTO result;
  RETURN result;
END;
$$;
GRANT EXECUTE ON FUNCTION get_operational_metrics() TO authenticated;

-- 4. Performance por técnico (últimos 30 dias)
CREATE OR REPLACE FUNCTION get_team_performance()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(t))
    FROM (
      SELECT
        p.full_name                                                                   AS technician_name,
        COUNT(s.id)                                                                   AS total_services,
        COUNT(s.id) FILTER (WHERE s.status = 'finalizado')                           AS completed,
        COUNT(s.id) FILTER (WHERE s.status NOT IN ('finalizado','cancelado'))        AS in_progress,
        COALESCE(SUM(s.final_price) FILTER (WHERE s.status = 'finalizado'), 0)      AS revenue_generated
      FROM profiles p
      LEFT JOIN services s
        ON s.assigned_technician_id = p.id
        AND s.created_at >= NOW() - INTERVAL '30 days'
      WHERE p.role = 'tecnico'
      GROUP BY p.id, p.full_name
      ORDER BY completed DESC
    ) t
  );
END;
$$;
GRANT EXECUTE ON FUNCTION get_team_performance() TO authenticated;
