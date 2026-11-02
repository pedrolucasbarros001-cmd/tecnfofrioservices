-- ============================================================
-- TECNOFRIO – RPCs completos do spec (Dashboard + Performance)
-- Aplicar NO Supabase SQL Editor (dashboard > project > SQL Editor)
-- Ordem: aplicar DEPOIS das 5 migrações anteriores (1200xx–1600xx)
-- ============================================================

-- ─── 1. get_financial_summary – secção 1.1 ────────────────────────────────────
-- Compara período actual com equivalente anterior
CREATE OR REPLACE FUNCTION get_financial_summary(_days INTEGER DEFAULT 30)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_start       TIMESTAMPTZ := NOW() - (_days || ' days')::INTERVAL;
  v_prev_start  TIMESTAMPTZ := NOW() - (_days * 2 || ' days')::INTERVAL;
  v_prev_end    TIMESTAMPTZ := v_start;
BEGIN
  RETURN json_build_object(

    -- Dinheiro efectivamente recebido no período
    'recebido', (
      SELECT COALESCE(SUM(amount_paid), 0)
      FROM services
      WHERE amount_paid > 0 AND updated_at >= v_start
    ),
    'recebido_prev', (
      SELECT COALESCE(SUM(amount_paid), 0)
      FROM services
      WHERE amount_paid > 0 AND updated_at >= v_prev_start AND updated_at < v_prev_end
    ),

    -- Faturado mas não pago (final_price set, amount_paid < final_price ou 0)
    'por_receber', (
      SELECT COALESCE(SUM(final_price - COALESCE(amount_paid, 0)), 0)
      FROM services
      WHERE final_price IS NOT NULL
        AND final_price > COALESCE(amount_paid, 0)
        AND status NOT IN ('cancelado')
    ),
    'por_receber_count', (
      SELECT COUNT(*)
      FROM services
      WHERE final_price IS NOT NULL
        AND final_price > COALESCE(amount_paid, 0)
        AND status NOT IN ('cancelado')
    ),

    -- Concluído por faturar (status=finalizado/concluído mas sem preço)
    'por_faturar', (
      SELECT COALESCE(SUM(COALESCE(final_price, 0)), 0)
      FROM services
      WHERE status IN ('finalizado', 'concluído', 'concluido')
        AND (final_price IS NULL OR final_price = 0)
        AND pending_pricing IS DISTINCT FROM FALSE
    ),
    'por_faturar_count', (
      SELECT COUNT(*)
      FROM services
      WHERE status IN ('finalizado', 'concluído', 'concluido')
        AND (final_price IS NULL OR final_price = 0)
    ),

    -- Faturado (serviços com final_price definido no período)
    'faturado', (
      SELECT COALESCE(SUM(final_price), 0)
      FROM services
      WHERE final_price IS NOT NULL AND final_price > 0
        AND created_at >= v_start
    ),
    'faturado_prev', (
      SELECT COALESCE(SUM(final_price), 0)
      FROM services
      WHERE final_price IS NOT NULL AND final_price > 0
        AND created_at >= v_prev_start AND created_at < v_prev_end
    ),

    -- Ticket médio (serviços faturados finalizados)
    'ticket_medio', (
      SELECT ROUND(AVG(final_price)::numeric, 2)
      FROM services
      WHERE final_price IS NOT NULL AND final_price > 0
        AND status IN ('finalizado', 'concluído', 'concluido')
        AND created_at >= v_start
    ),
    'ticket_medio_prev', (
      SELECT ROUND(AVG(final_price)::numeric, 2)
      FROM services
      WHERE final_price IS NOT NULL AND final_price > 0
        AND status IN ('finalizado', 'concluído', 'concluido')
        AND created_at >= v_prev_start AND created_at < v_prev_end
    ),

    -- Período
    'days', _days,
    'period_start', v_start,
    'period_prev_start', v_prev_start
  );
END;
$$;
GRANT EXECUTE ON FUNCTION get_financial_summary(INTEGER) TO authenticated;


-- ─── 2. get_activity_metrics – secção 1.2 ─────────────────────────────────────
CREATE OR REPLACE FUNCTION get_activity_metrics(_days INTEGER DEFAULT 30)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_start TIMESTAMPTZ := NOW() - (_days || ' days')::INTERVAL;
BEGIN
  RETURN json_build_object(

    -- Serviços realizados no período
    'iniciados', (
      SELECT COUNT(*) FROM services WHERE created_at >= v_start
    ),
    'concluidos', (
      SELECT COUNT(*) FROM services
      WHERE status IN ('finalizado', 'concluído', 'concluido')
        AND updated_at >= v_start
    ),
    'em_execucao', (
      SELECT COUNT(*) FROM services
      WHERE status NOT IN ('finalizado', 'concluído', 'concluido', 'cancelado')
    ),

    -- Distribuição por tipo
    'por_tipo', (
      SELECT json_agg(r) FROM (
        SELECT
          COALESCE(service_type, 'outro') AS service_type,
          COUNT(*) AS count
        FROM services
        WHERE created_at >= v_start
        GROUP BY service_type
        ORDER BY count DESC
      ) r
    ),

    -- Evolução semanal (últimas 8 semanas)
    'evolucao_semanal', (
      SELECT json_agg(r ORDER BY week) FROM (
        SELECT
          DATE_TRUNC('week', created_at)::DATE AS week,
          COUNT(*) AS count,
          COALESCE(SUM(final_price), 0) AS faturado,
          COALESCE(SUM(amount_paid), 0) AS recebido
        FROM services
        WHERE created_at >= NOW() - INTERVAL '8 weeks'
        GROUP BY DATE_TRUNC('week', created_at)
      ) r
    )
  );
END;
$$;
GRANT EXECUTE ON FUNCTION get_activity_metrics(INTEGER) TO authenticated;


-- ─── 3. get_budget_detail – secção 1.3 completa ──────────────────────────────
CREATE OR REPLACE FUNCTION get_budget_detail(_days INTEGER DEFAULT 30)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_start TIMESTAMPTZ := NOW() - (_days || ' days')::INTERVAL;
BEGIN
  RETURN json_build_object(

    -- Criados no período
    'criados_count', (
      SELECT COUNT(*) FROM budgets WHERE created_at >= v_start
    ),
    'criados_valor', (
      SELECT COALESCE(SUM(estimated_total), 0) FROM budgets WHERE created_at >= v_start
    ),

    -- Aceites no período
    'aceites_count', (
      SELECT COUNT(*) FROM budgets WHERE status = 'aprovado' AND updated_at >= v_start
    ),
    'aceites_valor', (
      SELECT COALESCE(SUM(estimated_total), 0)
      FROM budgets WHERE status = 'aprovado' AND updated_at >= v_start
    ),

    -- Rejeitados no período
    'rejeitados_count', (
      SELECT COUNT(*) FROM budgets WHERE status = 'rejeitado' AND updated_at >= v_start
    ),
    'rejeitados_valor', (
      SELECT COALESCE(SUM(estimated_total), 0)
      FROM budgets WHERE status = 'rejeitado' AND updated_at >= v_start
    ),

    -- Pendentes (todos, não só do período)
    'pendentes_count', (
      SELECT COUNT(*) FROM budgets WHERE status = 'pendente'
    ),
    'pendentes_valor', (
      SELECT COALESCE(SUM(estimated_total), 0) FROM budgets WHERE status = 'pendente'
    ),

    -- Taxa de aceitação: aceites / (aceites + rejeitados) × 100
    'taxa_aceitacao', (
      SELECT ROUND(
        COUNT(*) FILTER (WHERE status = 'aprovado')::numeric
        / NULLIF(COUNT(*) FILTER (WHERE status IN ('aprovado','rejeitado')), 0) * 100, 1
      )
      FROM budgets WHERE created_at >= v_start
    ),

    -- Sem resposta há mais de X dias
    'sem_resposta_7d', (
      SELECT COUNT(*) FROM budgets
      WHERE status = 'pendente' AND updated_at < NOW() - INTERVAL '7 days'
    ),
    'sem_resposta_14d', (
      SELECT COUNT(*) FROM budgets
      WHERE status = 'pendente' AND updated_at < NOW() - INTERVAL '14 days'
    ),
    'sem_resposta_7d_valor', (
      SELECT COALESCE(SUM(estimated_total), 0) FROM budgets
      WHERE status = 'pendente' AND updated_at < NOW() - INTERVAL '7 days'
    ),

    -- Mais antigo pendente (dias)
    'mais_antigo_dias', (
      SELECT ROUND(EXTRACT(EPOCH FROM (NOW() - MIN(created_at))) / 86400)::int
      FROM budgets WHERE status = 'pendente'
    ),

    -- Lista dos pendentes mais antigos (top 5)
    'pendentes_antigos', (
      SELECT json_agg(r ORDER BY dias_pendente DESC) FROM (
        SELECT
          b.id,
          b.code,
          b.estimated_total,
          b.created_at,
          ROUND(EXTRACT(EPOCH FROM (NOW() - b.created_at)) / 86400)::int AS dias_pendente,
          c.name AS customer_name
        FROM budgets b
        LEFT JOIN customers c ON c.id = b.customer_id
        WHERE b.status = 'pendente'
        ORDER BY b.created_at ASC
        LIMIT 5
      ) r
    )
  );
END;
$$;
GRANT EXECUTE ON FUNCTION get_budget_detail(INTEGER) TO authenticated;


-- ─── 4. get_team_overview – secção 1.7 (visão colectiva) ─────────────────────
CREATE OR REPLACE FUNCTION get_team_overview(_days INTEGER DEFAULT 30)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_start TIMESTAMPTZ := NOW() - (_days || ' days')::INTERVAL;
BEGIN
  RETURN json_build_object(

    -- Serviços concluídos pela equipa
    'concluidos', (
      SELECT COUNT(*) FROM services
      WHERE status IN ('finalizado', 'concluído', 'concluido')
        AND updated_at >= v_start
    ),

    -- Em execução
    'em_execucao', (
      SELECT COUNT(*) FROM services
      WHERE status NOT IN ('finalizado', 'concluído', 'concluido', 'cancelado')
        AND technician_id IS NOT NULL
    ),

    -- Distribuição por técnico (carga)
    'distribuicao_carga', (
      SELECT json_agg(r ORDER BY total DESC) FROM (
        SELECT
          p.full_name AS technician_name,
          t.color AS technician_color,
          COUNT(s.id) AS total,
          COUNT(s.id) FILTER (WHERE s.status IN ('finalizado','concluído','concluido')) AS concluidos
        FROM services s
        JOIN technicians t ON t.id = s.technician_id
        JOIN profiles p ON p.id = t.id
        WHERE s.created_at >= v_start
        GROUP BY p.full_name, t.color
        ORDER BY total DESC
      ) r
    ),

    -- FTFR agregado (aproximação: serviços sem retorno em 30 dias)
    -- Identificamos retorno como serviço do mesmo cliente no mesmo aparelho em <30d
    'ftfr_pct', (
      SELECT ROUND(
        (1 - COUNT(*) FILTER (WHERE has_return)::numeric / NULLIF(COUNT(*), 0)) * 100, 1
      )
      FROM (
        SELECT s.id,
          EXISTS (
            SELECT 1 FROM services s2
            WHERE s2.customer_id = s.customer_id
              AND s2.id != s.id
              AND s2.created_at BETWEEN s.updated_at AND s.updated_at + INTERVAL '30 days'
              AND s2.appliance_type = s.appliance_type
          ) AS has_return
        FROM services s
        WHERE s.status IN ('finalizado','concluído','concluido')
          AND s.updated_at >= v_start
          AND s.appliance_type IS NOT NULL
      ) t
    ),

    -- Documentação completa: tem diagnóstico + tipo de serviço + resultado
    'doc_completa_pct', (
      SELECT ROUND(
        COUNT(*) FILTER (
          WHERE fault_description IS NOT NULL
            AND service_type IS NOT NULL
            AND status IN ('finalizado','concluído','concluido')
        )::numeric
        / NULLIF(COUNT(*) FILTER (WHERE status IN ('finalizado','concluído','concluido')), 0) * 100, 1
      )
      FROM services
      WHERE created_at >= v_start
    ),

    -- Sem técnico atribuído
    'sem_tecnico', (
      SELECT COUNT(*) FROM services
      WHERE technician_id IS NULL
        AND status NOT IN ('finalizado','concluído','concluido','cancelado')
    )
  );
END;
$$;
GRANT EXECUTE ON FUNCTION get_team_overview(INTEGER) TO authenticated;


-- ─── 5. get_dashboard_alerts – secção 1.8 ────────────────────────────────────
CREATE OR REPLACE FUNCTION get_dashboard_alerts()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN json_build_object(

    -- Serviços concluídos por faturar
    'por_faturar', (
      SELECT json_agg(r) FROM (
        SELECT s.id, s.code, c.name AS customer_name,
          s.appliance_type, s.updated_at,
          ROUND(EXTRACT(EPOCH FROM (NOW() - s.updated_at)) / 86400)::int AS dias
        FROM services s
        LEFT JOIN customers c ON c.id = s.customer_id
        WHERE s.status IN ('finalizado','concluído','concluido')
          AND (s.final_price IS NULL OR s.final_price = 0)
        ORDER BY s.updated_at ASC
        LIMIT 10
      ) r
    ),

    -- Pagamentos pendentes há mais de 7 dias
    'pagamento_pendente', (
      SELECT json_agg(r) FROM (
        SELECT s.id, s.code, c.name AS customer_name,
          s.final_price, s.amount_paid,
          s.final_price - COALESCE(s.amount_paid, 0) AS em_falta,
          s.updated_at,
          ROUND(EXTRACT(EPOCH FROM (NOW() - s.updated_at)) / 86400)::int AS dias
        FROM services s
        LEFT JOIN customers c ON c.id = s.customer_id
        WHERE s.final_price IS NOT NULL AND s.final_price > COALESCE(s.amount_paid, 0)
          AND s.status NOT IN ('cancelado')
          AND s.updated_at < NOW() - INTERVAL '7 days'
        ORDER BY em_falta DESC
        LIMIT 10
      ) r
    ),

    -- Orçamentos sem resposta há mais de 7 dias
    'orcamentos_sem_resposta', (
      SELECT json_agg(r) FROM (
        SELECT b.id, b.code, c.name AS customer_name,
          b.estimated_total,
          ROUND(EXTRACT(EPOCH FROM (NOW() - b.created_at)) / 86400)::int AS dias
        FROM budgets b
        LEFT JOIN customers c ON c.id = b.customer_id
        WHERE b.status = 'pendente'
          AND b.created_at < NOW() - INTERVAL '7 days'
        ORDER BY b.created_at ASC
        LIMIT 10
      ) r
    ),

    -- Serviços parados há mais de 5 dias (sem mudança de estado)
    'servicos_parados', (
      SELECT json_agg(r) FROM (
        SELECT s.id, s.code, s.status, c.name AS customer_name,
          s.appliance_type,
          ROUND(EXTRACT(EPOCH FROM (NOW() - s.updated_at)) / 86400)::int AS dias_parado
        FROM services s
        LEFT JOIN customers c ON c.id = s.customer_id
        WHERE s.status NOT IN ('finalizado','concluído','concluido','cancelado')
          AND s.updated_at < NOW() - INTERVAL '5 days'
        ORDER BY s.updated_at ASC
        LIMIT 10
      ) r
    ),

    -- Serviços sem técnico
    'sem_tecnico', (
      SELECT json_agg(r) FROM (
        SELECT s.id, s.code, s.status, c.name AS customer_name,
          s.appliance_type, s.created_at,
          ROUND(EXTRACT(EPOCH FROM (NOW() - s.created_at)) / 86400)::int AS dias
        FROM services s
        LEFT JOIN customers c ON c.id = s.customer_id
        WHERE s.technician_id IS NULL
          AND s.status NOT IN ('finalizado','concluído','concluido','cancelado')
        ORDER BY s.created_at ASC
        LIMIT 10
      ) r
    ),

    -- Counts para badge summary
    'counts', json_build_object(
      'por_faturar',          (SELECT COUNT(*) FROM services WHERE status IN ('finalizado','concluído','concluido') AND (final_price IS NULL OR final_price = 0)),
      'pagamento_pendente',   (SELECT COUNT(*) FROM services WHERE final_price IS NOT NULL AND final_price > COALESCE(amount_paid, 0) AND status NOT IN ('cancelado') AND updated_at < NOW() - INTERVAL '7 days'),
      'orcamento_sem_resp',   (SELECT COUNT(*) FROM budgets WHERE status = 'pendente' AND created_at < NOW() - INTERVAL '7 days'),
      'servicos_parados',     (SELECT COUNT(*) FROM services WHERE status NOT IN ('finalizado','concluído','concluido','cancelado') AND updated_at < NOW() - INTERVAL '5 days'),
      'sem_tecnico',          (SELECT COUNT(*) FROM services WHERE technician_id IS NULL AND status NOT IN ('finalizado','concluído','concluido','cancelado'))
    )
  );
END;
$$;
GRANT EXECUTE ON FUNCTION get_dashboard_alerts() TO authenticated;


-- ─── 6. get_bottleneck_detail – secção 1.6 (mais completo) ───────────────────
CREATE OR REPLACE FUNCTION get_bottleneck_detail()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN json_build_object(

    -- Serviços por estado
    'por_estado', (
      SELECT json_agg(r ORDER BY count DESC) FROM (
        SELECT status, COUNT(*) AS count,
          ROUND(AVG(EXTRACT(EPOCH FROM (NOW() - updated_at)) / 86400)::numeric, 1) AS media_dias,
          MAX(ROUND(EXTRACT(EPOCH FROM (NOW() - updated_at)) / 86400)::int) AS max_dias
        FROM services
        WHERE status NOT IN ('finalizado','concluído','concluido','cancelado')
        GROUP BY status
      ) r
    ),

    -- Total em aberto
    'total_abertos', (
      SELECT COUNT(*) FROM services
      WHERE status NOT IN ('finalizado','concluído','concluido','cancelado')
    ),

    -- Parados há mais de 5 dias
    'parados_5d', (
      SELECT COUNT(*) FROM services
      WHERE status NOT IN ('finalizado','concluído','concluido','cancelado')
        AND updated_at < NOW() - INTERVAL '5 days'
    ),

    -- Parados há mais de 10 dias
    'parados_10d', (
      SELECT COUNT(*) FROM services
      WHERE status NOT IN ('finalizado','concluído','concluido','cancelado')
        AND updated_at < NOW() - INTERVAL '10 days'
    ),

    -- A aguardar peça
    'aguardar_peca', (
      SELECT COUNT(*) FROM services
      WHERE status ILIKE '%peca%' OR status ILIKE '%peça%' OR status ILIKE '%aguard%'
    ),

    -- Por agendar (sem data agendada)
    'por_agendar', (
      SELECT COUNT(*) FROM services
      WHERE scheduled_date IS NULL
        AND status NOT IN ('finalizado','concluído','concluido','cancelado')
    ),

    -- Tempo médio de resolução (dias), últimos 30 dias
    'tempo_medio_resolucao', (
      SELECT ROUND(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400)::numeric, 1)
      FROM services
      WHERE status IN ('finalizado','concluído','concluido')
        AND updated_at >= NOW() - INTERVAL '30 days'
    )
  );
END;
$$;
GRANT EXECUTE ON FUNCTION get_bottleneck_detail() TO authenticated;


-- ─── 7. get_ftfr_metrics – secção 2.2 ────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_ftfr_metrics(_days INTEGER DEFAULT 90)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_start TIMESTAMPTZ := NOW() - (_days || ' days')::INTERVAL;
BEGIN
  RETURN json_build_object(

    -- Por técnico
    'por_tecnico', (
      SELECT json_agg(r ORDER BY ftfr_pct DESC) FROM (
        SELECT
          p.full_name AS technician_name,
          t.color AS technician_color,
          t.id AS technician_id,
          COUNT(s.id) AS total_elegivel,
          COUNT(s.id) FILTER (WHERE NOT has_return) AS resolvido_1a,
          COUNT(s.id) FILTER (WHERE has_return) AS com_retorno,
          ROUND(
            COUNT(s.id) FILTER (WHERE NOT has_return)::numeric
            / NULLIF(COUNT(s.id), 0) * 100, 1
          ) AS ftfr_pct
        FROM (
          SELECT s.id, s.technician_id, s.customer_id, s.appliance_type, s.updated_at,
            EXISTS (
              SELECT 1 FROM services s2
              WHERE s2.customer_id = s.customer_id
                AND s2.id != s.id
                AND s2.appliance_type = s.appliance_type
                AND s2.created_at BETWEEN s.updated_at AND s.updated_at + INTERVAL '30 days'
            ) AS has_return
          FROM services s
          WHERE s.status IN ('finalizado','concluído','concluido')
            AND s.updated_at >= v_start
            AND s.appliance_type IS NOT NULL
            AND s.technician_id IS NOT NULL
        ) s
        JOIN technicians t ON t.id = s.technician_id
        JOIN profiles p ON p.id = t.id
        GROUP BY p.full_name, t.color, t.id
      ) r
    ),

    -- Agregado equipa
    'equipa_ftfr', (
      SELECT ROUND(
        (1 - COUNT(*) FILTER (WHERE has_return)::numeric / NULLIF(COUNT(*), 0)) * 100, 1
      )
      FROM (
        SELECT
          EXISTS (
            SELECT 1 FROM services s2
            WHERE s2.customer_id = s.customer_id
              AND s2.id != s.id
              AND s2.appliance_type = s.appliance_type
              AND s2.created_at BETWEEN s.updated_at AND s.updated_at + INTERVAL '30 days'
          ) AS has_return
        FROM services s
        WHERE s.status IN ('finalizado','concluído','concluido')
          AND s.updated_at >= v_start
          AND s.appliance_type IS NOT NULL
      ) t
    ),

    'days', _days
  );
END;
$$;
GRANT EXECUTE ON FUNCTION get_ftfr_metrics(INTEGER) TO authenticated;


-- ─── 8. get_doc_quality_metrics – secção 2.4 ─────────────────────────────────
CREATE OR REPLACE FUNCTION get_doc_quality_metrics(_days INTEGER DEFAULT 30)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_start TIMESTAMPTZ := NOW() - (_days || ' days')::INTERVAL;
BEGIN
  RETURN json_build_object(

    -- Por técnico
    'por_tecnico', (
      SELECT json_agg(r ORDER BY completo_pct DESC NULLS LAST) FROM (
        SELECT
          p.full_name AS technician_name,
          t.color AS technician_color,
          t.id AS technician_id,
          COUNT(s.id) AS total,
          COUNT(s.id) FILTER (
            WHERE s.fault_description IS NOT NULL
              AND s.service_type IS NOT NULL
          ) AS com_diagnostico,
          COUNT(s.id) FILTER (
            WHERE s.fault_description IS NULL OR s.service_type IS NULL
          ) AS sem_diagnostico,
          ROUND(
            COUNT(s.id) FILTER (
              WHERE s.fault_description IS NOT NULL AND s.service_type IS NOT NULL
            )::numeric / NULLIF(COUNT(s.id), 0) * 100, 1
          ) AS completo_pct
        FROM services s
        JOIN technicians t ON t.id = s.technician_id
        JOIN profiles p ON p.id = t.id
        WHERE s.status IN ('finalizado','concluído','concluido')
          AND s.updated_at >= v_start
        GROUP BY p.full_name, t.color, t.id
      ) r
    ),

    -- Agregado
    'equipa_completo_pct', (
      SELECT ROUND(
        COUNT(*) FILTER (WHERE fault_description IS NOT NULL AND service_type IS NOT NULL)::numeric
        / NULLIF(COUNT(*), 0) * 100, 1
      )
      FROM services
      WHERE status IN ('finalizado','concluído','concluido')
        AND updated_at >= v_start
        AND technician_id IS NOT NULL
    ),

    'total_finalizados', (
      SELECT COUNT(*) FROM services
      WHERE status IN ('finalizado','concluído','concluido')
        AND updated_at >= v_start
    ),
    'sem_diagnostico', (
      SELECT COUNT(*) FROM services
      WHERE status IN ('finalizado','concluído','concluido')
        AND updated_at >= v_start
        AND (fault_description IS NULL OR service_type IS NULL)
    )
  );
END;
$$;
GRANT EXECUTE ON FUNCTION get_doc_quality_metrics(INTEGER) TO authenticated;


-- ─── 9. get_productivity_metrics – secção 2.6 ────────────────────────────────
CREATE OR REPLACE FUNCTION get_productivity_metrics(_days INTEGER DEFAULT 30)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_start TIMESTAMPTZ := NOW() - (_days || ' days')::INTERVAL;
BEGIN
  RETURN json_build_object(

    'por_tecnico', (
      SELECT json_agg(r ORDER BY total_servicos DESC) FROM (
        SELECT
          p.full_name AS technician_name,
          t.color AS technician_color,
          t.id AS technician_id,
          COUNT(s.id) AS total_servicos,
          COUNT(DISTINCT s.customer_id) AS clientes_distintos,
          COUNT(s.id) FILTER (WHERE s.status IN ('finalizado','concluído','concluido')) AS concluidos,
          COUNT(s.id) FILTER (WHERE s.is_installation = TRUE) AS instalacoes,
          COUNT(s.id) FILTER (WHERE s.is_sale = TRUE) AS vendas,
          COALESCE(SUM(s.final_price), 0) AS receita_total,
          ROUND(COALESCE(AVG(s.final_price) FILTER (WHERE s.final_price IS NOT NULL), 0)::numeric, 2) AS ticket_medio
        FROM services s
        JOIN technicians t ON t.id = s.technician_id
        JOIN profiles p ON p.id = t.id
        WHERE s.created_at >= v_start
        GROUP BY p.full_name, t.color, t.id
      ) r
    ),

    'days', _days
  );
END;
$$;
GRANT EXECUTE ON FUNCTION get_productivity_metrics(INTEGER) TO authenticated;
