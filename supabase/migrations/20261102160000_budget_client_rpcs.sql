-- ============================================================
-- TECNOFRIO – Orçamentos com contexto + Clientes e Recorrência
-- Aplicar no Supabase SQL Editor
-- ============================================================

-- 1. Orçamentos: valor potencial, tempo parado, taxa de aceitação
CREATE OR REPLACE FUNCTION get_budget_opportunities()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN json_build_object(
    'total_pendentes',        (SELECT COUNT(*)                          FROM budgets WHERE status = 'pendente'),
    'valor_total_pendente',   (SELECT COALESCE(SUM(estimated_total), 0) FROM budgets WHERE status = 'pendente'),
    'sem_resposta_7d',        (SELECT COUNT(*)                          FROM budgets WHERE status = 'pendente' AND updated_at < NOW() - INTERVAL '7 days'),
    'sem_resposta_14d',       (SELECT COUNT(*)                          FROM budgets WHERE status = 'pendente' AND updated_at < NOW() - INTERVAL '14 days'),
    'valor_sem_resposta_7d',  (SELECT COALESCE(SUM(estimated_total), 0) FROM budgets WHERE status = 'pendente' AND updated_at < NOW() - INTERVAL '7 days'),
    'aprovados_30d',          (SELECT COUNT(*) FROM budgets WHERE status = 'aprovado'  AND updated_at >= NOW() - INTERVAL '30 days'),
    'rejeitados_30d',         (SELECT COUNT(*) FROM budgets WHERE status = 'rejeitado' AND updated_at >= NOW() - INTERVAL '30 days'),
    'taxa_aceitacao',         (
      SELECT ROUND(
        COUNT(*) FILTER (WHERE status = 'aprovado')::numeric
        / NULLIF(COUNT(*) FILTER (WHERE status IN ('aprovado','rejeitado')), 0) * 100, 1
      )
      FROM budgets WHERE created_at >= NOW() - INTERVAL '90 days'
    ),
    'mais_antigo_dias',       (
      SELECT ROUND(EXTRACT(EPOCH FROM (NOW() - MIN(created_at))) / 86400)::int
      FROM budgets WHERE status = 'pendente'
    )
  );
END;
$$;
GRANT EXECUTE ON FUNCTION get_budget_opportunities() TO authenticated;


-- 2. Clientes e recorrência calculados a partir dos dados existentes
CREATE OR REPLACE FUNCTION get_client_recurrence()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_month_start TIMESTAMPTZ := DATE_TRUNC('month', NOW());
  v_90d         TIMESTAMPTZ := NOW() - INTERVAL '90 days';
  v_180d        TIMESTAMPTZ := NOW() - INTERVAL '180 days';
BEGIN
  RETURN json_build_object(

    -- Clientes criados este mês
    'novos_mes', (
      SELECT COUNT(*) FROM customers WHERE created_at >= v_month_start
    ),

    -- Clientes com ≥ 2 serviços no histórico total
    'recorrentes', (
      SELECT COUNT(*) FROM (
        SELECT customer_id FROM services
        GROUP BY customer_id HAVING COUNT(*) >= 2
      ) t
    ),

    -- Clientes com pelo menos 1 serviço nos últimos 90 dias
    'ativos_90d', (
      SELECT COUNT(DISTINCT customer_id) FROM services WHERE created_at >= v_90d
    ),

    -- Clientes que tiveram serviços mas nenhum nos últimos 90 dias (inativos)
    'inativos', (
      SELECT COUNT(DISTINCT s1.customer_id)
      FROM services s1
      WHERE NOT EXISTS (
        SELECT 1 FROM services s2
        WHERE s2.customer_id = s1.customer_id AND s2.created_at >= v_90d
      )
    ),

    -- Reativados: sem serviços entre 180d e 90d atrás, mas regressaram nos últimos 90d
    'reativados', (
      SELECT COUNT(DISTINCT s1.customer_id)
      FROM services s1
      WHERE s1.created_at >= v_90d
        AND EXISTS (
          SELECT 1 FROM services s2
          WHERE s2.customer_id = s1.customer_id AND s2.created_at < v_180d
        )
        AND NOT EXISTS (
          SELECT 1 FROM services s3
          WHERE s3.customer_id = s1.customer_id
            AND s3.created_at >= v_180d AND s3.created_at < v_90d
        )
    ),

    -- Total de clientes na base
    'total_clientes', (SELECT COUNT(*) FROM customers),

    -- Média de intervenções por cliente (só clientes com ≥ 1 serviço)
    'media_intervencoes', (
      SELECT ROUND(AVG(cnt)::numeric, 1)
      FROM (SELECT COUNT(*) AS cnt FROM services GROUP BY customer_id) t
    ),

    -- Receita média por cliente (lifetime, clientes com amount_paid > 0)
    'receita_media_por_cliente', (
      SELECT ROUND(AVG(total)::numeric, 2)
      FROM (
        SELECT customer_id, SUM(amount_paid) AS total
        FROM services
        WHERE amount_paid > 0
        GROUP BY customer_id
      ) t
    ),

    -- Clientes com múltiplos aparelhos registados
    'com_multiplos_aparelhos', (
      SELECT COUNT(*) FROM (
        SELECT customer_id FROM customer_appliances
        GROUP BY customer_id HAVING COUNT(*) > 1
      ) t
    ),

    -- Distribuição: clientes com 1, 2-5, 6+ serviços
    'dist_1_servico', (
      SELECT COUNT(*) FROM (
        SELECT customer_id FROM services GROUP BY customer_id HAVING COUNT(*) = 1
      ) t
    ),
    'dist_2_5_servicos', (
      SELECT COUNT(*) FROM (
        SELECT customer_id FROM services GROUP BY customer_id HAVING COUNT(*) BETWEEN 2 AND 5
      ) t
    ),
    'dist_6_mais', (
      SELECT COUNT(*) FROM (
        SELECT customer_id FROM services GROUP BY customer_id HAVING COUNT(*) >= 6
      ) t
    )
  );
END;
$$;
GRANT EXECUTE ON FUNCTION get_client_recurrence() TO authenticated;
