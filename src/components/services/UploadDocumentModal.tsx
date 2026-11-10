import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { UploadCloud, File, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceId: string;
}

export function UploadDocumentModal({ isOpen, onClose, serviceId }: UploadDocumentModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    const ok = files.filter((f) => f.size <= 10 * 1024 * 1024);
    if (ok.length < files.length) toast.error('Alguns ficheiros excedem 10MB e foram ignorados.');
    if (ok.length) setSelectedFiles((prev) => [...prev, ...ok]);
  };

  const clearSelection = () => setSelectedFiles([]);
  const removeFile = (i: number) => setSelectedFiles((prev) => prev.filter((_, idx) => idx !== i));

  const uploadOne = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${serviceId}/${crypto.randomUUID()}.${fileExt}`;
    const { data: storageData, error: storageError } = await supabase.storage
      .from('service_documents')
      .upload(fileName, file, { cacheControl: '3600', upsert: false });
    if (storageError) throw storageError;
    const { error: dbError } = await supabase
      .from('service_documents' as any)
      .insert({
        service_id: serviceId,
        file_name: file.name,
        file_url: storageData.path,
        file_type: file.type || fileExt || 'unknown',
        file_size: file.size,
        uploaded_by: user?.id,
      });
    if (dbError) {
      await supabase.storage.from('service_documents').remove([storageData.path]);
      throw dbError;
    }
  };

  const handleUpload = async () => {
    if (!selectedFiles.length || !serviceId) return;
    setIsUploading(true);
    const failed: File[] = [];
    for (const f of selectedFiles) {
      try { await uploadOne(f); } catch (error) { console.error('Error uploading document:', error); failed.push(f); }
    }
    const done = selectedFiles.length - failed.length;
    queryClient.invalidateQueries({ queryKey: ['service-full', serviceId] });
    queryClient.invalidateQueries({ queryKey: ['service-documents', serviceId] });
    setIsUploading(false);
    if (failed.length) {
      if (done) toast.success(`${done} ficheiro(s) anexado(s).`);
      toast.error(`${failed.length} ficheiro(s) não foram enviados. Tente novamente.`);
      setSelectedFiles(failed);
    } else {
      toast.success(done > 1 ? `${done} ficheiros anexados com sucesso!` : 'Documento anexado com sucesso!');
      handleClose();
    }
  };

  const handleClose = () => {
    clearSelection();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Anexar Documento / Ficheiro</DialogTitle>
          <DialogDescription>
            Faça upload de qualquer ficheiro relevante para este serviço (PDF, Imagens, Word, Excel, etc). Máximo: 10MB.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <Label
            htmlFor="dropzone-file"
            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/30 border-muted hover:bg-muted/50 transition-colors"
          >
            <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-primary">{selectedFiles.length ? 'Adicionar mais' : 'Clique para selecionar'}</span> — pode escolher vários
            </p>
            <p className="text-xs text-muted-foreground">Até 10MB por ficheiro</p>
            <Input id="dropzone-file" type="file" multiple className="hidden" onChange={handleFileChange} disabled={isUploading} />
          </Label>
          {selectedFiles.length > 0 && (
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
              {selectedFiles.map((f, i) => (
                <div key={`${f.name}-${i}`} className="flex items-center justify-between p-3 border rounded-md">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <File className="flex-shrink-0 w-5 h-5 text-primary" />
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-sm font-medium truncate">{f.name}</span>
                      <span className="text-xs text-muted-foreground">{(f.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="flex-shrink-0" onClick={() => removeFile(i)} disabled={isUploading}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={!selectedFiles.length || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                A enviar...
              </>
            ) : (
              selectedFiles.length > 1 ? `Anexar ${selectedFiles.length} ficheiros` : 'Anexar Ficheiro'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
