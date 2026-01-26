-- Criar tabela de logs de atividades
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  actor_id UUID,
  action_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Politica de leitura: dono, secretaria ou logs publicos
CREATE POLICY "Activity logs viewable by dono secretaria or public"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (is_dono(auth.uid()) OR is_secretaria(auth.uid()) OR is_public = true);

-- Politica de leitura para anon (apenas publicos para TV Monitor)
CREATE POLICY "Public activity logs viewable by anyone"
  ON public.activity_logs FOR SELECT
  TO anon
  USING (is_public = true);

-- Politica de insercao para usuarios autenticados
CREATE POLICY "Authenticated users can insert activity logs"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Atualizar funcao de geracao de codigo de servico para TF-
CREATE OR REPLACE FUNCTION public.generate_service_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  -- Buscar o maior numero existente (de OS- ou TF-)
  SELECT COALESCE(
    GREATEST(
      COALESCE(MAX(CAST(SUBSTRING(code FROM 4) AS INTEGER)) FILTER (WHERE code LIKE 'TF-%'), 0),
      COALESCE(MAX(CAST(SUBSTRING(code FROM 4) AS INTEGER)) FILTER (WHERE code LIKE 'OS-%'), 0)
    ), 0) + 1
  INTO next_num
  FROM public.services;
  
  NEW.code := 'TF-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

-- Criar indice para melhor performance
CREATE INDEX idx_activity_logs_service_id ON public.activity_logs(service_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_is_public ON public.activity_logs(is_public) WHERE is_public = true;