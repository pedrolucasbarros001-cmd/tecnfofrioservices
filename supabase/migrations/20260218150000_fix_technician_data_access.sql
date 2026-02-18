-- Fix photo type constraints to include all types used in the application
ALTER TABLE public.service_photos DROP CONSTRAINT IF EXISTS service_photos_photo_type_check;
ALTER TABLE public.service_photos ADD CONSTRAINT service_photos_photo_type_check 
  CHECK (photo_type IN (
    'visita', 'oficina', 'entrega', 'instalacao', 'antes', 'depois',
    'aparelho', 'etiqueta', 'estado', 'instalacao_antes', 'instalacao_depois'
  ));

-- Update RLS for service_payments to allow technicians to view and register payments
DROP POLICY IF EXISTS "Payments viewable by dono and secretaria" ON public.service_payments;
CREATE POLICY "Payments viewable by dono, secretaria and assigned tecnico"
  ON public.service_payments FOR SELECT
  TO authenticated
  USING (
    public.is_dono(auth.uid()) OR 
    public.is_secretaria(auth.uid()) OR
    public.can_access_service(service_id, auth.uid())
  );

DROP POLICY IF EXISTS "Dono and secretaria can insert payments" ON public.service_payments;
CREATE POLICY "Dono, secretaria and assigned tecnico can insert payments"
  ON public.service_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_dono(auth.uid()) OR 
    public.is_secretaria(auth.uid()) OR
    public.can_access_service(service_id, auth.uid())
  );

-- Ensure technicians can update services they are assigned to (including financial fields if needed)
-- (Technicians already have UPDATE access via existing policy if assigned)

-- Function to ensure received_by is set to auth.uid() if not provided
CREATE OR REPLACE FUNCTION public.handle_payment_received_by()
RETURNS trigger AS $$
BEGIN
  IF NEW.received_by IS NULL THEN
    NEW.received_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for service_payments
DROP TRIGGER IF EXISTS set_payment_received_by ON public.service_payments;
CREATE TRIGGER set_payment_received_by
  BEFORE INSERT ON public.service_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_payment_received_by();

-- Also ensure uploaded_by is set for photos
DROP TRIGGER IF EXISTS set_photo_uploaded_by ON public.service_photos;
CREATE OR REPLACE FUNCTION public.handle_photo_uploaded_by()
RETURNS trigger AS $$
BEGIN
  IF NEW.uploaded_by IS NULL THEN
    NEW.uploaded_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER set_photo_uploaded_by
  BEFORE INSERT ON public.service_photos
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_photo_uploaded_by();
