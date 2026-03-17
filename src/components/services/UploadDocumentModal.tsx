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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Limit to 10MB
      if (file.size > 10 * 1024 * 1024) {
        toast.error('O ficheiro é demasiado grande. O limite é 10MB.');
        return;
      }
      setSelectedFile(file);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
  };

  const handleUpload = async () => {
    if (!selectedFile || !serviceId) return;

    setIsUploading(true);
    try {
      // 1. Upload the file to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${serviceId}/${crypto.randomUUID()}.${fileExt}`;
      
      const { data: storageData, error: storageError } = await supabase.storage
        .from('service_documents')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (storageError) throw storageError;

      // 2. Insert record into service_documents table
      const { error: dbError } = await supabase
        .from('service_documents' as any)
        .insert({
          service_id: serviceId,
          file_name: selectedFile.name,
          file_url: storageData.path,
          file_type: selectedFile.type || fileExt || 'unknown',
          file_size: selectedFile.size,
          uploaded_by: user?.id,
        });

      if (dbError) {
        // Cleanup storage if db insert fails
        await supabase.storage.from('service_documents').remove([storageData.path]);
        throw dbError;
      }

      toast.success('Documento anexado com sucesso!');
      
      // Notify other components that a document was added
      queryClient.invalidateQueries({ queryKey: ['serviceDetails', serviceId] });
      queryClient.invalidateQueries({ queryKey: ['serviceDocuments', serviceId] });

      handleClose();
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast.error(error.message || 'Erro ao fazer upload do documento.');
    } finally {
      setIsUploading(false);
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
          {!selectedFile ? (
            <div className="flex flex-col items-center justify-center w-full">
              <Label 
                htmlFor="dropzone-file" 
                className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer bg-muted/30 border-muted hover:bg-muted/50 transition-colors"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
                  <p className="mb-2 text-sm text-muted-foreground">
                    <span className="font-semibold text-primary">Clique para selecionar</span> ou arraste o ficheiro aqui
                  </p>
                  <p className="text-xs text-muted-foreground">Todos os formatos são aceites até 10MB</p>
                </div>
                <Input 
                  id="dropzone-file" 
                  type="file" 
                  className="hidden" 
                  onChange={handleFileChange}
                />
              </Label>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 border rounded-md">
              <div className="flex items-center space-x-3 overflow-hidden">
                <File className="flex-shrink-0 w-6 h-6 text-primary" />
                <div className="flex pl-2 overflow-hidden flex-col">
                  <span className="text-sm font-medium truncate">{selectedFile.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="flex-shrink-0" 
                onClick={clearSelection}
                disabled={isUploading}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                A enviar...
              </>
            ) : (
              'Anexar Ficheiro'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
