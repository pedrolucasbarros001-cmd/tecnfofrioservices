import { ArrowRightLeft, Check, X, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  useAcceptTransferRequest, 
  useRejectTransferRequest,
  type TransferRequestWithDetails 
} from '@/hooks/useServiceTransfers';
import { cn } from '@/lib/utils';

interface TransferRequestCardProps {
  request: TransferRequestWithDetails;
  isIncoming?: boolean;
}

export function TransferRequestCard({ request, isIncoming = true }: TransferRequestCardProps) {
  const acceptTransfer = useAcceptTransferRequest();
  const rejectTransfer = useRejectTransferRequest();

  const fromName = request.from_technician?.profile?.full_name || 'Técnico';
  const toName = request.to_technician?.profile?.full_name || 'Técnico';
  const serviceCode = request.service?.code || 'N/A';
  const customerName = request.service?.customer?.name || 'Cliente';
  const appliance = [request.service?.appliance_type, request.service?.brand]
    .filter(Boolean)
    .join(' ');

  const isPending = acceptTransfer.isPending || rejectTransfer.isPending;

  return (
    <Card className={cn(
      'border-l-4',
      isIncoming ? 'border-l-blue-500 bg-blue-50/50' : 'border-l-orange-500 bg-orange-50/50'
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-sm">
                  {isIncoming 
                    ? `${fromName} quer transferir um serviço para si`
                    : `Aguarda resposta de ${toName}`
                  }
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs font-mono">
                    {serviceCode}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {customerName}
                  </span>
                </div>
              </div>
            </div>

            {appliance && (
              <p className="text-xs text-muted-foreground">
                {appliance}
              </p>
            )}

            {request.message && (
              <p className="text-sm italic text-muted-foreground bg-white/50 rounded p-2">
                "{request.message}"
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(request.created_at), {
                addSuffix: true,
                locale: pt,
              })}
            </p>

            {/* Actions for incoming requests */}
            {isIncoming && request.status === 'pendente' && (
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => acceptTransfer.mutate(request.id)}
                  disabled={isPending}
                >
                  {acceptTransfer.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Aceitar
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => rejectTransfer.mutate(request.id)}
                  disabled={isPending}
                >
                  {rejectTransfer.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <X className="h-4 w-4 mr-1" />
                      Recusar
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
