-- Add column to store status before part request
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS last_status_before_part_request text;

COMMENT ON COLUMN public.services.last_status_before_part_request IS 
'Stores the previous status when service enters para_pedir_peca or em_espera_de_peca state';