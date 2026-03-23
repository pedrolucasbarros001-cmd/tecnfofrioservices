
-- Passo 1a: Ativar extensão para pesquisa por texto parcial
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Passo 1b: Índice GIN para pesquisa rápida nos campos de texto dos serviços
CREATE INDEX IF NOT EXISTS idx_services_search_trgm ON services USING GIN (
  (
    coalesce(code, '') || ' ' ||
    coalesce(appliance_type, '') || ' ' ||
    coalesce(brand, '') || ' ' ||
    coalesce(model, '') || ' ' ||
    coalesce(serial_number, '') || ' ' ||
    coalesce(fault_description, '')
  ) gin_trgm_ops
);

-- Passo 1c: Índice parcial para pending_pricing (só indexa os TRUE)
CREATE INDEX IF NOT EXISTS idx_services_pending_pricing
  ON services(pending_pricing)
  WHERE pending_pricing = true;

-- Passo 1d: Índice no código do serviço para pesquisa rápida por "TF-xxxxx"
CREATE INDEX IF NOT EXISTS idx_services_code_trgm
  ON services USING GIN (code gin_trgm_ops);
