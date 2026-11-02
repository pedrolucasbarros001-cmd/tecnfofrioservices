-- Corrige get_team_performance: technician_id aponta para technicians.id, não profiles.id
CREATE OR REPLACE FUNCTION get_team_performance()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(t))
    FROM (
      SELECT
        p.full_name                                                                      AS technician_name,
        t.color                                                                          AS technician_color,
        COUNT(s.id)                                                                      AS total_services,
        COUNT(s.id) FILTER (WHERE s.status = 'finalizado')                              AS completed,
        COUNT(s.id) FILTER (WHERE s.status NOT IN ('finalizado','cancelado'))           AS in_progress,
        COALESCE(SUM(s.final_price) FILTER (WHERE s.status = 'finalizado'), 0)         AS revenue_generated
      FROM technicians t
      JOIN profiles p ON p.id = t.profile_id
      LEFT JOIN services s
        ON s.technician_id = t.id
        AND s.created_at >= NOW() - INTERVAL '30 days'
      WHERE t.active = true
      GROUP BY t.id, p.full_name, t.color
      ORDER BY completed DESC
    ) t
  );
END;
$$;
GRANT EXECUTE ON FUNCTION get_team_performance() TO authenticated;
