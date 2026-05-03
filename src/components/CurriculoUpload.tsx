import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { FileText, X } from "lucide-react";

interface CurriculoUploadProps {
  currentDocumentUrl: string | null;
  onDocumentChange: (url: string | null) => void;
  disabled?: boolean;
}

export function CurriculoUpload({
  currentDocumentUrl,
  onDocumentChange,
  disabled = false,
}: CurriculoUploadProps) {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      const validTypes = ['.pdf', '.doc', '.docx'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!validTypes.includes(fileExtension)) {
        toast.error("Tipo de arquivo inválido. Aceito: PDF, DOC, DOCX");
        return;
      }

      // Validate file size (10MB max)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error("O arquivo deve ter no máximo 10MB");
        return;
      }

      setUploading(true);

      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `curriculos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("documentos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("documentos")
        .getPublicUrl(filePath);

      onDocumentChange(publicUrl);
      toast.success("Currículo enviado com sucesso!");
    } catch (error) {
      console.error("Error uploading:", error);
      toast.error("Erro ao enviar currículo");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveDocument = async () => {
    if (!currentDocumentUrl) return;

    try {
      const path = currentDocumentUrl.split("/").slice(-2).join("/");
      
      const { error } = await supabase.storage
        .from("documentos")
        .remove([path]);

      if (error) throw error;

      onDocumentChange(null);
      toast.success("Currículo removido com sucesso!");
    } catch (error) {
      console.error("Error removing:", error);
      toast.error("Erro ao remover currículo");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {currentDocumentUrl ? (
          <div className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-2 px-3 py-2 border rounded-md flex-1 bg-muted/50">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm truncate">
                {currentDocumentUrl.split('/').pop()}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => window.open(currentDocumentUrl, '_blank')}
              disabled={disabled}
              title="Abrir currículo"
            >
              <FileText className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleRemoveDocument}
              disabled={disabled}
              title="Remover currículo"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="flex-1">
            <Input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileUpload}
              disabled={disabled || uploading}
              className="cursor-pointer"
            />
          </div>
        )}
      </div>
      {uploading && (
        <p className="text-sm text-muted-foreground">Enviando currículo...</p>
      )}
    </div>
  );
}
