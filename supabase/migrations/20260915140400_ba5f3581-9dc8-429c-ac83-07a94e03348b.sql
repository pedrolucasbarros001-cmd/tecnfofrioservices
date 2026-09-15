CREATE OR REPLACE FUNCTION public.count_services_in_debt()
RETURNS bigint
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COUNT(*) FROM public.services
  WHERE final_price > 0 AND COALESCE(amount_paid, 0) < final_price;
$$;

GRANT EXECUTE ON FUNCTION public.count_services_in_debt() TO authenticated;

CREATE OR REPLACE FUNCTION public.technician_performance_summary(_from date DEFAULT NULL, _to date DEFAULT NULL)
RETURNS TABLE (
  technician_id uuid,
  technician_name text,
  technician_color text,
  total_services bigint,
  completed_services bigint,
  revenue numeric,
  repairs bigint,
  sales bigint,
  installations bigint,
  pending_pricing bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    t.id AS technician_id,
    p.full_name AS technician_name,
    t.color AS technician_color,
    COUNT(s.id) AS total_services,
    COUNT(s.id) FILTER (WHERE s.status IN ('concluidos','finalizado')) AS completed_services,
    COALESCE(SUM(s.final_price) FILTER (WHERE s.final_price > 0), 0) AS revenue,
    COUNT(s.id) FILTER (WHERE s.service_type = 'reparacao' OR (s.service_type IS NULL AND NOT s.is_sale AND NOT s.is_installation)) AS repairs,
    COUNT(s.id) FILTER (WHERE s.is_sale) AS sales,
    COUNT(s.id) FILTER (WHERE s.is_installation) AS installations,
    COUNT(s.id) FILTER (WHERE s.pending_pricing) AS pending_pricing
  FROM public.technicians t
  JOIN public.profiles p ON p.id = t.profile_id
  LEFT JOIN public.services s
    ON s.technician_id = t.id
   AND (_from IS NULL OR s.scheduled_date >= _from)
   AND (_to IS NULL OR s.scheduled_date <= _to)
  GROUP BY t.id, p.full_name, t.color
  ORDER BY revenue DESC;
$$;

GRANT EXECUTE ON FUNCTION public.technician_performance_summary(date, date) TO authenticated;