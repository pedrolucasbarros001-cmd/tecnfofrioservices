import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * Redirect page for QR Code scanning.
 * Fetches the service and redirects to the appropriate technician flow.
 */
export default function ServiceRedirect() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (serviceId) {
      redirectToFlow(serviceId, isMounted);
    }
    return () => { isMounted = false; };
  }, [serviceId]);

  async function redirectToFlow(id: string) {
    try {
      const { data: service, error: fetchError } = await supabase
        .from('services')
        .select('id, service_type, service_location')
        .eq('id', id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!service) {
        setError('Serviço não encontrado.');
        return;
      }

      // Determine the correct flow based on service attributes
      if (service.service_type === 'entrega') {
        navigate(`/technician/delivery/${service.id}`, { replace: true });
      } else if (service.service_type === 'instalacao') {
        navigate(`/technician/installation/${service.id}`, { replace: true });
      } else if (service.service_location === 'oficina') {
        navigate(`/technician/workshop/${service.id}`, { replace: true });
      } else {
        navigate(`/technician/visit/${service.id}`, { replace: true });
      }
    } catch (err) {
      console.error('Error redirecting:', err);
      setError('Erro ao carregar serviço. Verifique se está autenticado.');
    }
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-lg font-semibold">Erro</h2>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => navigate('/login')}>
              Ir para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">A carregar serviço...</p>
      </div>
    </div>
  );
}
