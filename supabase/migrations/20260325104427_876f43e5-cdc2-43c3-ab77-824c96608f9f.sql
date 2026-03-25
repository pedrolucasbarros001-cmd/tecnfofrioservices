
-- Table to store admin-set passwords in plain text for visibility
CREATE TABLE public.user_passwords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  password_plain text NOT NULL,
  set_by uuid,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS: only dono can read
ALTER TABLE public.user_passwords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only dono can view passwords"
  ON public.user_passwords
  FOR SELECT
  TO authenticated
  USING (public.is_dono(auth.uid()));

-- No insert/update/delete via client — only edge functions with service role
