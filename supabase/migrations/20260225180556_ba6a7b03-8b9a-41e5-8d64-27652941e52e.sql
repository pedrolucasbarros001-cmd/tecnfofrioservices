
-- services: indices para todas as colunas usadas em filtros e RLS
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
CREATE INDEX IF NOT EXISTS idx_services_technician_id ON services(technician_id);
CREATE INDEX IF NOT EXISTS idx_services_customer_id ON services(customer_id);
CREATE INDEX IF NOT EXISTS idx_services_location ON services(service_location);
CREATE INDEX IF NOT EXISTS idx_services_scheduled_date ON services(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_services_created_at ON services(created_at);
CREATE INDEX IF NOT EXISTS idx_services_status_location ON services(status, service_location);

-- tabelas filhas: indice em service_id para JOINs
CREATE INDEX IF NOT EXISTS idx_service_parts_service_id ON service_parts(service_id);
CREATE INDEX IF NOT EXISTS idx_service_photos_service_id ON service_photos(service_id);
CREATE INDEX IF NOT EXISTS idx_service_signatures_service_id ON service_signatures(service_id);
CREATE INDEX IF NOT EXISTS idx_service_payments_service_id ON service_payments(service_id);

-- notifications: indice para filtro por user
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- customers: indice btree para pesquisa por nome (sem dependencia de pg_trgm)
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
