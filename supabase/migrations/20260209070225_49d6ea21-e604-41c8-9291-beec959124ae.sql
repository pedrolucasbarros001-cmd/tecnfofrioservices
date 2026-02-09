-- Create service_transfer_requests table
CREATE TABLE public.service_transfer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  from_technician_id UUID NOT NULL REFERENCES public.technicians(id),
  to_technician_id UUID NOT NULL REFERENCES public.technicians(id),
  status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente', 'aceite', 'recusado', 'cancelado'
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  
  CONSTRAINT different_technicians CHECK (from_technician_id != to_technician_id)
);

-- Enable Row Level Security
ALTER TABLE public.service_transfer_requests ENABLE ROW LEVEL SECURITY;

-- Technicians can see transfers where they are source or destination, admin/secretary can see all
CREATE POLICY "Technicians see own transfers" ON public.service_transfer_requests
  FOR SELECT USING (
    from_technician_id IN (SELECT id FROM public.technicians WHERE profile_id = public.get_technician_profile_id(auth.uid()))
    OR to_technician_id IN (SELECT id FROM public.technicians WHERE profile_id = public.get_technician_profile_id(auth.uid()))
    OR public.is_dono(auth.uid())
    OR public.is_secretaria(auth.uid())
  );

-- Technicians can create transfer requests for services they own
CREATE POLICY "Technicians can request transfers" ON public.service_transfer_requests
  FOR INSERT WITH CHECK (
    from_technician_id IN (SELECT id FROM public.technicians WHERE profile_id = public.get_technician_profile_id(auth.uid()))
  );

-- Target technician can accept/reject, source can cancel, admin can do anything
CREATE POLICY "Technicians can update their transfers" ON public.service_transfer_requests
  FOR UPDATE USING (
    (to_technician_id IN (SELECT id FROM public.technicians WHERE profile_id = public.get_technician_profile_id(auth.uid())) AND status = 'pendente')
    OR (from_technician_id IN (SELECT id FROM public.technicians WHERE profile_id = public.get_technician_profile_id(auth.uid())) AND status = 'pendente')
    OR public.is_dono(auth.uid())
  );

-- Only admin can delete transfer requests
CREATE POLICY "Only dono can delete transfers" ON public.service_transfer_requests
  FOR DELETE USING (public.is_dono(auth.uid()));