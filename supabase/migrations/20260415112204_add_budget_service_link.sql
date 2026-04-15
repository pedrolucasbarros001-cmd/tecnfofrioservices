ALTER TABLE budgets ADD COLUMN source_service_id UUID REFERENCES services(id) ON DELETE SET NULL; ALTER TABLE services ADD COLUMN awaiting_budget_approval BOOLEAN DEFAULT false;
