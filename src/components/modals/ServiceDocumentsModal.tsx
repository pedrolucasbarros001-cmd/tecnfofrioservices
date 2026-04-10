import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Download, ExternalLink, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';

interface ServiceDocumentsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceId: string;
  serviceCode?: string;
}

export function ServiceDocumentsModal({
  open,
  onOpenChange,
  serviceId,
  serviceCode,
}: ServiceDocumentsModalProps) {
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['service-documents', serviceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_documents')
        .select('*')
        .eq('service_id', serviceId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!serviceId && open,
  });

  const handleDownload = (doc: any) => {
    const publicUrl = supabase.storage
      .from('service_documents')
      .getPublicUrl(doc.file_url).data.publicUrl;
    window.open(publicUrl, '_blank');
  };

  const handleDeleteDocument = async (doc: any) => {
    setDeletingId(doc.id);
    try {
      const { error: storageError } = await supabase.storage
        .from('service_documents')
        .remove([doc.file_url]);
      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('service_documents')
        .delete()
        .eq('id', doc.id);
      if (dbError) throw dbError;

      queryClient.invalidateQueries({ queryKey: ['service-documents', serviceId] });
      toast.success('Documento eliminado.');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao eliminar documento.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Anexos {serviceCode && `— ${serviceCode}`}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[400px]">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">A carregar...</p>
          ) : documents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum documento anexado a este serviço.
            </p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc: any) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                    <div className="overflow-hidden">
                      <p className="text-sm font-medium truncate" title={doc.file_name}>
                        {doc.file_name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{(doc.file_size / 1024 / 1024).toFixed(2)} MB</span>
                        <span>•</span>
                        <span>
                          {doc.created_at
                            ? format(new Date(doc.created_at), 'dd/MM/yyyy', { locale: pt })
                            : '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(doc)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteDocument(doc)}
                      disabled={deletingId === doc.id}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
