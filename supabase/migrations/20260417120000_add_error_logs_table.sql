-- Tabela para registo de erros runtime do frontend
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_message TEXT NOT NULL,
  error_stack TEXT,
  component_stack TEXT,
  user_id UUID REFERENCES auth.users(id),
  user_role TEXT,
  user_agent TEXT,
  url TEXT,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_error_logs_created_at
  ON public.error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved
  ON public.error_logs(resolved) WHERE resolved = false;

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Qualquer utilizador autenticado pode inserir o seu próprio erro
CREATE POLICY "Users can insert their own error logs"
  ON public.error_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Apenas dono pode ler
CREATE POLICY "Only dono can read error logs"
  ON public.error_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'dono'));

-- Apenas dono pode marcar como resolvido
CREATE POLICY "Only dono can update error logs"
  ON public.error_logs FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'dono'));

COMMENT ON TABLE public.error_logs IS
  'Erros runtime do frontend reportados pelo ErrorBoundary. Visível só ao dono.';
