import { useState } from 'react';
import { Package, X, AlertTriangle } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useUpdateService } from '@/hooks/useServices';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { humanizeError } from '@/utils/errorMessages';
import { useAuth } from '@/contexts/AuthContext';
import { logActivity } from '@/utils/activityLogUtils';
import type { Service, ServicePart } from '@/types/database';

interface CancelPartSelectionModalProps {
    service: Service | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function CancelPartSelectionModal({ service, open, onOpenChange, onSuccess }: CancelPartSelectionModalProps) {
    const { user } = useAuth();
    const [selectedPartIds, setSelectedPartIds] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const updateService = useUpdateService();
    const queryClient = useQueryClient();

    // Fetch parts that are currently in "waiting" (is_requested=true, arrived=false)
    const { data: orderedParts = [], isLoading } = useQuery({
        queryKey: ['ordered-parts-selection', service?.id],
        queryFn: async () => {
            if (!service?.id) return [];
            const { data, error } = await supabase
                .from('service_parts')
                .select('*')
                .eq('service_id', service.id)
                .eq('is_requested', true)
                .eq('arrived', false)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data as ServicePart[];
        },
        enabled: !!service?.id && open,
    });

    const handleTogglePart = (id: string) => {
        setSelectedPartIds(prev =>
            prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
        );
    };

    const handleCancelSelected = async () => {
        if (!service || selectedPartIds.length === 0) return;

        setIsSubmitting(true);
        try {
            // 1. Update selected parts: is_requested = false, estimated_arrival = null
            const { error: updateError } = await supabase
                .from('service_parts')
                .update({
                    is_requested: false,
                    estimated_arrival: null,
                    notes: `[Cancelado em ${new Date().toLocaleDateString('pt-PT')}]`
                })
                .in('id', selectedPartIds);

            if (updateError) throw updateError;

            // 2. Log the activity
            const cancelledPartNames = orderedParts
                .filter(p => selectedPartIds.includes(p.id))
                .map(p => p.part_name)
                .join(', ');

            await logActivity({
                serviceId: service.id,
                actorId: user?.id,
                actionType: 'cancelamento',
                description: `Cancelado pedido dos artigos: ${cancelledPartNames}`,
                isPublic: true,
            });

            // 3. Check if all parts were cancelled
            const remainingPartsCount = orderedParts.length - selectedPartIds.length;
            if (remainingPartsCount === 0) {
                // Revert service status to 'por_fazer' (Aberto)
                await updateService.mutateAsync({
                    id: service.id,
                    status: 'por_fazer',
                    skipToast: true,
                });
                toast.success('Todos os artigos cancelados. O serviço voltou para "Aberto".');
            } else {
                toast.success(`${selectedPartIds.length} artigo(s) cancelado(s) com sucesso.`);
            }

            queryClient.invalidateQueries({ queryKey: ['service-parts'] });
            queryClient.invalidateQueries({ queryKey: ['full-service-data'] });
            queryClient.invalidateQueries({ queryKey: ['services'] });

            onSuccess?.();
            onOpenChange(false);
            setSelectedPartIds([]);
        } catch (error) {
            console.error('Error cancelling selected parts:', error);
            toast.error(humanizeError(error));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md max-w-[95vw]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <X className="h-5 w-5 text-destructive" />
                        Cancelar Pedido de Artigo
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground">
                        Selecione quais os artigos que deseja cancelar deste pedido.
                    </p>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    {isLoading ? (
                        <p className="text-center text-sm text-muted-foreground">A carregar artigos...</p>
                    ) : orderedParts.length === 0 ? (
                        <p className="text-center text-sm text-muted-foreground">Nenhum artigo encontrado para cancelar.</p>
                    ) : (
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                            {orderedParts.map((part) => (
                                <div
                                    key={part.id}
                                    className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                                    onClick={() => handleTogglePart(part.id)}
                                >
                                    <Checkbox
                                        id={`part-${part.id}`}
                                        checked={selectedPartIds.includes(part.id)}
                                        onCheckedChange={() => handleTogglePart(part.id)}
                                    />
                                    <div className="flex-1">
                                        <Label
                                            htmlFor={`part-${part.id}`}
                                            className="text-sm font-medium leading-none cursor-pointer"
                                        >
                                            {part.part_name}
                                        </Label>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {part.part_code ? `Ref: ${part.part_code}` : 'Sem referência'} • Qtd: {part.quantity}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {selectedPartIds.length === orderedParts.length && orderedParts.length > 0 && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
                            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                            <p className="text-xs text-amber-700">
                                Ao cancelar todos os artigos, o serviço voltará automaticamente para o estado <strong>&quot;Aberto&quot;</strong>.
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Voltar
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleCancelSelected}
                        disabled={isSubmitting || selectedPartIds.length === 0}
                    >
                        {isSubmitting ? 'A cancelar...' : `Cancelar ${selectedPartIds.length} Artigo(s)`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
