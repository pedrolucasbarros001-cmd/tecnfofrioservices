-- ============================================================
-- TECNOFRIO – Indicadores de Qualidade por Técnico
-- Aplicar no Supabase SQL Editor
-- ============================================================

-- Métricas de qualidade por técnico (últimos 90 dias por omissão)
CREATE OR REPLACE FUNCTION get_technician_quality_metrics(
  _days INTEGER DEFAULT 90
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_from TIMESTAMPTZ := NOW() - (_days || ' days')::INTERVAL;
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(q))
    FROM (
      SELECT
        t.id                                            AS technician_id,
        p.full_name                                     AS technician_name,
        t.color                                         AS technician_color,

        -- Total e concluídos no período
        COUNT(s.id)::int                                AS total_services,
        COUNT(s.id) FILTER (WHERE s.status = 'finalizado')::int
                                                        AS completed_services,

        -- Taxa de conclusão (%)
        ROUND(
          COUNT(s.id) FILTER (WHERE s.status = 'finalizado')::numeric
          / NULLIF(COUNT(s.id), 0) * 100, 1
        )                                               AS completion_rate,

        -- Tempo médio de resolução (dias) — do created_at ao finalizado
        ROUND(
          AVG(
            EXTRACT(EPOCH FROM (s.updated_at - s.created_at)) / 86400
          ) FILTER (WHERE s.status = 'finalizado')::numeric, 1
        )                                               AS avg_resolution_days,

        -- Relatórios completos: serviços com descrição da avaria preenchida (%)
        ROUND(
          COUNT(s.id) FILTER (
            WHERE s.status = 'finalizado'
              AND s.fault_description IS NOT NULL
              AND LENGTH(TRIM(s.fault_description)) > 5
          )::numeric
          / NULLIF(COUNT(s.id) FILTER (WHERE s.status = 'finalizado'), 0) * 100, 1
        )                                               AS reports_complete_pct,

        -- Serviços concluídos rápido (≤ 2 dias) — proxy de "1ª visita"
        COUNT(s.id) FILTER (
          WHERE s.status = 'finalizado'
            AND EXTRACT(EPOCH FROM (s.updated_at - s.created_at)) / 86400 <= 2
        )::int                                          AS quick_resolutions,

        -- Taxa de resolução rápida (%)
        ROUND(
          COUNT(s.id) FILTER (
            WHERE s.status = 'finalizado'
              AND EXTRACT(EPOCH FROM (s.updated_at - s.created_at)) / 86400 <= 2
          )::numeric
          / NULLIF(COUNT(s.id) FILTER (WHERE s.status = 'finalizado'), 0) * 100, 1
        )                                               AS first_visit_rate,

        -- Pendentes de precificação (acção necessária)
        COUNT(s.id) FILTER (
          WHERE s.status = 'finalizado'
            AND (s.final_price IS NULL OR s.final_price = 0)
        )::int                                          AS pending_pricing,

        -- Receita gerada no período
        COALESCE(
          SUM(s.amount_paid) FILTER (WHERE s.status = 'finalizado'), 0
        )::numeric(12,2)                                AS revenue,

        -- Ticket médio
        ROUND(
          AVG(s.final_price) FILTER (
            WHERE s.status = 'finalizado' AND s.final_price > 0
          )::numeric, 2
        )                                               AS avg_ticket

      FROM technicians t
      JOIN profiles p ON p.id = t.profile_id
      LEFT JOIN services s ON s.technician_id = t.id
        AND s.created_at >= v_from
      GROUP BY t.id, p.full_name, t.color
      ORDER BY completed_services DESC
    ) q
  );
END;
$$;
GRANT EXECUTE ON FUNCTION get_technician_quality_metrics(INTEGER) TO authenticated;

-- Retornos em garantia: serviços novos criados para o mesmo cliente num prazo de 60 dias
-- após um serviço finalizado pelo mesmo técnico (proxy de "retorno/garantia")
CREATE OR REPLACE FUNCTION get_warranty_returns(
  _days INTEGER DEFAULT 180
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_from TIMESTAMPTZ := NOW() - (_days || ' days')::INTERVAL;
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(r))
    FROM (
      SELECT
        t.id    AS technician_id,
        p.full_name AS technician_name,
        COUNT(s2.id)::int AS warranty_count
      FROM technicians t
      JOIN profiles p ON p.id = t.profile_id
      -- serviços finalizados que depois tiveram um novo serviço ≤ 60 dias depois, mesmo cliente
      LEFT JOIN services s1 ON s1.technician_id = t.id
        AND s1.status = 'finalizado'
        AND s1.created_at >= v_from
      LEFT JOIN services s2 ON s2.customer_id = s1.customer_id
        AND s2.id <> s1.id
        AND s2.created_at > s1.updated_at
        AND s2.created_at <= s1.updated_at + INTERVAL '60 days'
      GROUP BY t.id, p.full_name
      ORDER BY warranty_count DESC
    ) r
  );
END;
$$;
GRANT EXECUTE ON FUNCTION get_warranty_returns(INTEGER) TO authenticated;
