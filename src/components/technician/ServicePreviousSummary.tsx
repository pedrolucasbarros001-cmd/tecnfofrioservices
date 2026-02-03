import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  History, 
  User, 
  Calendar, 
  FileText, 
  Camera, 
  ChevronDown, 
  ChevronUp,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import type { Service, PhotoType } from '@/types/database';
import { PHOTO_TYPE_LABELS } from '@/types/database';

interface ServicePreviousSummaryProps {
  service: Service;
  onContinue: () => void;
  onViewDetails?: () => void;
  className?: string;
}

interface ActivityLogWithActor {
  id: string;
  action_type: string;
  description: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
  actor_id: string | null;
  actor_name?: string;
}

export function ServicePreviousSummary({
  service,
  onContinue,
  onViewDetails,
  className,
}: ServicePreviousSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch activity logs for this service
  const { data: activityLogs } = useQuery({
    queryKey: ['service-activity-summary', service.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('service_id', service.id)
        .in('action_type', ['inicio_execucao', 'levantamento', 'pedido_peca', 'conclusao'])
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data as ActivityLogWithActor[];
    },
    enabled: !!service.id,
  });

  // Fetch photos for this service
  const { data: photos } = useQuery({
    queryKey: ['service-photos-summary', service.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_photos')
        .select('*')
        .eq('service_id', service.id)
        .order('uploaded_at', { ascending: false })
        .limit(4);

      if (error) throw error;
      return data;
    },
    enabled: !!service.id,
  });

  // Get the most recent execution log
  const lastExecutionLog = activityLogs?.[0];
  
  // Determine what type of previous work was done
  const getPreviousWorkType = () => {
    if (!lastExecutionLog) return null;
    
    switch (lastExecutionLog.action_type) {
      case 'levantamento':
        return { label: 'Levantado para oficina', color: 'bg-orange-100 text-orange-700' };
      case 'pedido_peca':
        return { label: 'Pedido de peça', color: 'bg-yellow-100 text-yellow-700' };
      case 'inicio_execucao':
        return { label: 'Execução iniciada', color: 'bg-blue-100 text-blue-700' };
      case 'conclusao':
        return { label: 'Reparação concluída', color: 'bg-green-100 text-green-700' };
      default:
        return null;
    }
  };

  const previousWork = getPreviousWorkType();

  // Don't show if no previous work
  if (!service.detected_fault && (!activityLogs || activityLogs.length === 0)) {
    return null;
  }

  return (
    <div className={cn('rounded-lg border bg-amber-50 border-amber-200', className)}>
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-amber-600" />
          <span className="font-semibold text-amber-900">Resumo do atendimento anterior</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-amber-600" />
        ) : (
          <ChevronDown className="h-5 w-5 text-amber-600" />
        )}
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Previous work type */}
          {previousWork && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Última ação:</span>
              <Badge className={previousWork.color}>{previousWork.label}</Badge>
            </div>
          )}

          {/* Last execution info */}
          {lastExecutionLog && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(new Date(lastExecutionLog.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: pt })}
                </span>
              </div>
              {lastExecutionLog.actor_name && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{lastExecutionLog.actor_name}</span>
                </div>
              )}
            </div>
          )}

          {/* Diagnosis */}
          {service.detected_fault && (
            <div className="bg-white rounded-lg p-3 border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <FileText className="h-4 w-4" />
                <span>Diagnóstico</span>
              </div>
              <p className="text-sm">{service.detected_fault}</p>
            </div>
          )}

          {/* Photos - grouped by type */}
          {photos && photos.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Camera className="h-4 w-4" />
                <span>Fotos ({photos.length})</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {photos.slice(0, 4).map((photo) => (
                  <div key={photo.id} className="relative">
                    <img
                      src={photo.file_url}
                      alt={photo.description || 'Foto do serviço'}
                      className="w-full h-16 object-cover rounded-lg"
                    />
                    {photo.photo_type && (
                      <Badge 
                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] px-1 py-0"
                        variant="secondary"
                      >
                        {PHOTO_TYPE_LABELS[photo.photo_type as PhotoType] || photo.photo_type}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
              {photos.length > 4 && (
                <p className="text-xs text-muted-foreground mt-1">
                  +{photos.length - 4} mais fotos
                </p>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            {onViewDetails && (
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails();
                }}
              >
                Ver ficha completa
              </Button>
            )}
            <Button 
              size="sm" 
              className="flex-1 bg-amber-600 hover:bg-amber-700"
              onClick={(e) => {
                e.stopPropagation();
                onContinue();
              }}
            >
              Continuar execução
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Collapsed state - show continue button */}
      {!isExpanded && (
        <div className="px-4 pb-4">
          <Button 
            size="sm" 
            className="w-full bg-amber-600 hover:bg-amber-700"
            onClick={(e) => {
              e.stopPropagation();
              onContinue();
            }}
          >
            Continuar execução
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
