-- Create a view for technicians that excludes pricing information
-- This provides a secure way for technicians to access their assigned services
-- without exposing sensitive pricing data (labor_cost, parts_cost, final_price, discount, amount_paid)

CREATE OR REPLACE VIEW public.technician_services WITH (security_invoker = true) AS
SELECT 
  id,
  code,
  customer_id,
  technician_id,
  service_type,
  service_location,
  status,
  appliance_type,
  brand,
  model,
  serial_number,
  fault_description,
  detected_fault,
  work_performed,
  is_warranty,
  warranty_brand,
  warranty_process_number,
  is_urgent,
  is_sale,
  is_installation,
  pending_pricing,
  scheduled_date,
  scheduled_shift,
  delivery_method,
  delivery_technician_id,
  delivery_date,
  pickup_date,
  service_address,
  service_postal_code,
  service_city,
  notes,
  last_status_before_part_request,
  created_at,
  updated_at
  -- Intentionally EXCLUDED: labor_cost, parts_cost, final_price, discount, amount_paid
FROM public.services;

-- Grant access to the view
GRANT SELECT ON public.technician_services TO authenticated;

-- Add a comment explaining the purpose
COMMENT ON VIEW public.technician_services IS 'Secure view for technicians that excludes pricing information (labor_cost, parts_cost, final_price, discount, amount_paid). Use this view when fetching services for technician-facing interfaces.';