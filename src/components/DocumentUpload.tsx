import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DocumentUploadProps {
  funcionarioId: string;
  empresaId: string;
  onDocumentUploaded: (url: string, fileName: string) => void;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  funcionarioId,
  empresaId,
  onDocumentUploaded
}) => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      setUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `funcionarios/${empresaId}/${funcionarioId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('documentos')
        .getPublicUrl(filePath);

      onDocumentUploaded(publicUrl, file.name);
      
      toast({
        title: "Sucesso",
        description: "Documento enviado com sucesso",
      });
    } catch (error) {
      console.error('Erro ao enviar documento:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar documento",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        type="file"
        onChange={handleFileUpload}
        disabled={uploading}
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
      />
      {uploading && <span className="text-sm text-muted-foreground">Enviando...</span>}
    </div>
  );
};
