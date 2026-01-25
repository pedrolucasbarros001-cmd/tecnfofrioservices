-- ============================================
-- TECNOFRIO - Complete Database Schema
-- ============================================

-- 1. Create enum for roles
CREATE TYPE public.app_role AS ENUM ('dono', 'secretaria', 'tecnico');

-- 2. Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 3. Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- 4. Create customers table
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  nif TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  postal_code TEXT,
  city TEXT,
  customer_type TEXT DEFAULT 'particular',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 5. Create technicians table
CREATE TABLE public.technicians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  specialization TEXT,
  color TEXT DEFAULT '#3B82F6',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 6. Create services table (Ordens de Serviço)
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  technician_id UUID REFERENCES public.technicians(id) ON DELETE SET NULL,
  
  -- Service type and location
  service_type TEXT DEFAULT 'reparacao' CHECK (service_type IN ('reparacao', 'instalacao', 'entrega', 'manutencao')),
  service_location TEXT DEFAULT 'cliente' CHECK (service_location IN ('cliente', 'oficina', 'entregue')),
  
  -- Status workflow
  status TEXT DEFAULT 'por_fazer' CHECK (status IN (
    'por_fazer', 'em_execucao', 'na_oficina', 'para_pedir_peca', 
    'em_espera_de_peca', 'a_precificar', 'concluidos', 'em_debito', 'finalizado'
  )),
  
  -- Appliance info
  appliance_type TEXT,
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  fault_description TEXT,
  detected_fault TEXT,
  work_performed TEXT,
  
  -- Warranty
  is_warranty BOOLEAN DEFAULT false,
  warranty_brand TEXT,
  warranty_process_number TEXT,
  
  -- Flags
  is_urgent BOOLEAN DEFAULT false,
  is_sale BOOLEAN DEFAULT false,
  is_installation BOOLEAN DEFAULT false,
  pending_pricing BOOLEAN DEFAULT false,
  
  -- Scheduling
  scheduled_date DATE,
  scheduled_shift TEXT CHECK (scheduled_shift IN ('manha', 'tarde', 'noite')),
  
  -- Pricing (only visible to dono)
  labor_cost DECIMAL(10,2) DEFAULT 0,
  parts_cost DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  final_price DECIMAL(10,2) DEFAULT 0,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  
  -- Delivery
  delivery_method TEXT CHECK (delivery_method IN ('technician_delivery', 'client_pickup')),
  delivery_technician_id UUID REFERENCES public.technicians(id) ON DELETE SET NULL,
  delivery_date TIMESTAMP WITH TIME ZONE,
  pickup_date TIMESTAMP WITH TIME ZONE,
  
  -- Address override
  service_address TEXT,
  service_postal_code TEXT,
  service_city TEXT,
  
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 7. Create service_parts table
CREATE TABLE public.service_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
  part_name TEXT NOT NULL,
  part_code TEXT,
  quantity INTEGER DEFAULT 1,
  cost DECIMAL(10,2) DEFAULT 0,
  is_requested BOOLEAN DEFAULT false,
  estimated_arrival DATE,
  arrived BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 8. Create service_photos table
CREATE TABLE public.service_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
  photo_type TEXT CHECK (photo_type IN ('visita', 'oficina', 'entrega', 'instalacao', 'antes', 'depois')),
  file_url TEXT NOT NULL,
  description TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 9. Create service_signatures table
CREATE TABLE public.service_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
  signature_type TEXT CHECK (signature_type IN ('recolha', 'entrega', 'visita', 'pedido_peca')),
  file_url TEXT NOT NULL,
  signer_name TEXT,
  signed_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 10. Create service_payments table
CREATE TABLE public.service_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('dinheiro', 'multibanco', 'transferencia', 'mbway')),
  payment_date DATE DEFAULT CURRENT_DATE,
  description TEXT,
  received_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 11. Create budgets table
CREATE TABLE public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  appliance_type TEXT,
  brand TEXT,
  model TEXT,
  fault_description TEXT,
  estimated_labor DECIMAL(10,2) DEFAULT 0,
  estimated_parts DECIMAL(10,2) DEFAULT 0,
  estimated_total DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'recusado', 'convertido')),
  converted_service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  valid_until DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 12. Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  notification_type TEXT,
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- ============================================
-- SECURITY DEFINER FUNCTIONS
-- ============================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to check if user is dono
CREATE OR REPLACE FUNCTION public.is_dono(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'dono')
$$;

-- Function to check if user is secretaria
CREATE OR REPLACE FUNCTION public.is_secretaria(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'secretaria')
$$;

-- Function to check if user is tecnico
CREATE OR REPLACE FUNCTION public.is_tecnico(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'tecnico')
$$;

-- Function to get technician profile_id from user_id
CREATE OR REPLACE FUNCTION public.get_technician_profile_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = _user_id
$$;

-- Function to check if technician can access service
CREATE OR REPLACE FUNCTION public.can_access_service(_service_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.is_dono(_user_id) OR 
    public.is_secretaria(_user_id) OR 
    EXISTS (
      SELECT 1 FROM public.services s
      JOIN public.technicians t ON s.technician_id = t.id
      WHERE s.id = _service_id AND t.profile_id = public.get_technician_profile_id(_user_id)
    )
$$;

-- Function to get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles 
  WHERE user_id = _user_id 
  ORDER BY 
    CASE role 
      WHEN 'dono' THEN 1 
      WHEN 'secretaria' THEN 2 
      WHEN 'tecnico' THEN 3 
    END
  LIMIT 1
$$;

-- ============================================
-- AUTO-INCREMENT CODE GENERATION
-- ============================================

-- Function to generate service code
CREATE OR REPLACE FUNCTION public.generate_service_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 4) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.services
  WHERE code LIKE 'OS-%';
  
  NEW.code := 'OS-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_service_code
  BEFORE INSERT ON public.services
  FOR EACH ROW
  WHEN (NEW.code IS NULL)
  EXECUTE FUNCTION public.generate_service_code();

-- Function to generate budget code
CREATE OR REPLACE FUNCTION public.generate_budget_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.budgets
  WHERE code LIKE 'ORC-%';
  
  NEW.code := 'ORC-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_budget_code
  BEFORE INSERT ON public.budgets
  FOR EACH ROW
  WHEN (NEW.code IS NULL)
  EXECUTE FUNCTION public.generate_budget_code();

-- ============================================
-- AUTO CREATE PROFILE ON SIGNUP
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES: PROFILES
-- ============================================

CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile or dono can update any"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_dono(auth.uid()));

CREATE POLICY "Only dono can delete profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.is_dono(auth.uid()));

-- ============================================
-- RLS POLICIES: USER_ROLES
-- ============================================

CREATE POLICY "User roles viewable by authenticated"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only dono can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_dono(auth.uid()));

CREATE POLICY "Only dono can update roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (public.is_dono(auth.uid()));

CREATE POLICY "Only dono can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.is_dono(auth.uid()));

-- ============================================
-- RLS POLICIES: CUSTOMERS
-- ============================================

CREATE POLICY "Customers viewable by authenticated"
  ON public.customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Dono and secretaria can insert customers"
  ON public.customers FOR INSERT
  TO authenticated
  WITH CHECK (public.is_dono(auth.uid()) OR public.is_secretaria(auth.uid()));

CREATE POLICY "Dono and secretaria can update customers"
  ON public.customers FOR UPDATE
  TO authenticated
  USING (public.is_dono(auth.uid()) OR public.is_secretaria(auth.uid()));

CREATE POLICY "Only dono can delete customers"
  ON public.customers FOR DELETE
  TO authenticated
  USING (public.is_dono(auth.uid()));

-- ============================================
-- RLS POLICIES: TECHNICIANS
-- ============================================

CREATE POLICY "Technicians viewable by authenticated"
  ON public.technicians FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only dono can manage technicians"
  ON public.technicians FOR INSERT
  TO authenticated
  WITH CHECK (public.is_dono(auth.uid()));

CREATE POLICY "Only dono can update technicians"
  ON public.technicians FOR UPDATE
  TO authenticated
  USING (public.is_dono(auth.uid()));

CREATE POLICY "Only dono can delete technicians"
  ON public.technicians FOR DELETE
  TO authenticated
  USING (public.is_dono(auth.uid()));

-- ============================================
-- RLS POLICIES: SERVICES
-- ============================================

CREATE POLICY "Dono and secretaria see all services, tecnico sees assigned"
  ON public.services FOR SELECT
  TO authenticated
  USING (
    public.is_dono(auth.uid()) OR 
    public.is_secretaria(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.technicians t 
      WHERE t.id = technician_id 
      AND t.profile_id = public.get_technician_profile_id(auth.uid())
    )
  );

CREATE POLICY "Dono and secretaria can insert services"
  ON public.services FOR INSERT
  TO authenticated
  WITH CHECK (public.is_dono(auth.uid()) OR public.is_secretaria(auth.uid()));

CREATE POLICY "Dono secretaria and assigned tecnico can update services"
  ON public.services FOR UPDATE
  TO authenticated
  USING (
    public.is_dono(auth.uid()) OR 
    public.is_secretaria(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.technicians t 
      WHERE t.id = technician_id 
      AND t.profile_id = public.get_technician_profile_id(auth.uid())
    )
  );

CREATE POLICY "Only dono can delete services"
  ON public.services FOR DELETE
  TO authenticated
  USING (public.is_dono(auth.uid()));

-- ============================================
-- RLS POLICIES: SERVICE_PARTS
-- ============================================

CREATE POLICY "Service parts viewable by service access"
  ON public.service_parts FOR SELECT
  TO authenticated
  USING (public.can_access_service(service_id, auth.uid()));

CREATE POLICY "Dono and tecnico can insert parts"
  ON public.service_parts FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_dono(auth.uid()) OR 
    public.can_access_service(service_id, auth.uid())
  );

CREATE POLICY "Dono and tecnico can update parts"
  ON public.service_parts FOR UPDATE
  TO authenticated
  USING (
    public.is_dono(auth.uid()) OR 
    public.can_access_service(service_id, auth.uid())
  );

CREATE POLICY "Only dono can delete parts"
  ON public.service_parts FOR DELETE
  TO authenticated
  USING (public.is_dono(auth.uid()));

-- ============================================
-- RLS POLICIES: SERVICE_PHOTOS
-- ============================================

CREATE POLICY "Service photos viewable by service access"
  ON public.service_photos FOR SELECT
  TO authenticated
  USING (public.can_access_service(service_id, auth.uid()));

CREATE POLICY "Authenticated users can insert photos"
  ON public.service_photos FOR INSERT
  TO authenticated
  WITH CHECK (public.can_access_service(service_id, auth.uid()));

CREATE POLICY "Only dono can delete photos"
  ON public.service_photos FOR DELETE
  TO authenticated
  USING (public.is_dono(auth.uid()));

-- ============================================
-- RLS POLICIES: SERVICE_SIGNATURES
-- ============================================

CREATE POLICY "Service signatures viewable by service access"
  ON public.service_signatures FOR SELECT
  TO authenticated
  USING (public.can_access_service(service_id, auth.uid()));

CREATE POLICY "Authenticated users can insert signatures"
  ON public.service_signatures FOR INSERT
  TO authenticated
  WITH CHECK (public.can_access_service(service_id, auth.uid()));

CREATE POLICY "Only dono can delete signatures"
  ON public.service_signatures FOR DELETE
  TO authenticated
  USING (public.is_dono(auth.uid()));

-- ============================================
-- RLS POLICIES: SERVICE_PAYMENTS
-- ============================================

CREATE POLICY "Payments viewable by dono and secretaria"
  ON public.service_payments FOR SELECT
  TO authenticated
  USING (public.is_dono(auth.uid()) OR public.is_secretaria(auth.uid()));

CREATE POLICY "Dono and secretaria can insert payments"
  ON public.service_payments FOR INSERT
  TO authenticated
  WITH CHECK (public.is_dono(auth.uid()) OR public.is_secretaria(auth.uid()));

CREATE POLICY "Dono and secretaria can update payments"
  ON public.service_payments FOR UPDATE
  TO authenticated
  USING (public.is_dono(auth.uid()) OR public.is_secretaria(auth.uid()));

CREATE POLICY "Only dono can delete payments"
  ON public.service_payments FOR DELETE
  TO authenticated
  USING (public.is_dono(auth.uid()));

-- ============================================
-- RLS POLICIES: BUDGETS
-- ============================================

CREATE POLICY "Only dono can view budgets"
  ON public.budgets FOR SELECT
  TO authenticated
  USING (public.is_dono(auth.uid()));

CREATE POLICY "Only dono can insert budgets"
  ON public.budgets FOR INSERT
  TO authenticated
  WITH CHECK (public.is_dono(auth.uid()));

CREATE POLICY "Only dono can update budgets"
  ON public.budgets FOR UPDATE
  TO authenticated
  USING (public.is_dono(auth.uid()));

CREATE POLICY "Only dono can delete budgets"
  ON public.budgets FOR DELETE
  TO authenticated
  USING (public.is_dono(auth.uid()));

-- ============================================
-- RLS POLICIES: NOTIFICATIONS
-- ============================================

CREATE POLICY "Users see own notifications or dono sees all"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_dono(auth.uid()));

CREATE POLICY "Authenticated users can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_dono(auth.uid()));