CREATE TABLE IF NOT EXISTS public.system_settings (
  id integer PRIMARY KEY DEFAULT 1,
  last_paid_billing_cycle text,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT system_settings_id_check CHECK (id = 1)
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow read access for authenticated users"
  ON public.system_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow update access to authenticated users
CREATE POLICY "Allow update access for authenticated users"
  ON public.system_settings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default row
INSERT INTO public.system_settings (id, last_paid_billing_cycle) 
VALUES (1, null)
ON CONFLICT (id) DO NOTHING;
