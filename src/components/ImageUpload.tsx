import React, { useState } from 'react';
import { Upload, X, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImageUploadProps {
  currentImageUrl?: string | null;
  onImageChange: (url: string | null) => void;
  folder: string; // 'empresas' ou 'grupos'
  disabled?: boolean;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  currentImageUrl,
  onImageChange,
  folder,
  disabled = false
}) => {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione apenas arquivos de imagem');
      return;
    }

    // Validar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    setUploading(true);

    try {
      // Gerar nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      // Fazer upload para Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, file);

      if (uploadError) {
        throw uploadError;
      }

      // Obter URL pública
      const { data } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName);

      onImageChange(data.publicUrl);
      toast.success('Logo enviada com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao enviar a logo');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (currentImageUrl) {
      try {
        // Extrair o caminho do arquivo da URL
        const urlParts = currentImageUrl.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const filePath = `${folder}/${fileName}`;

        // Remover do storage
        const { error } = await supabase.storage
          .from('logos')
          .remove([filePath]);

        if (error) {
          console.error('Erro ao remover arquivo:', error);
        }
      } catch (error) {
        console.error('Erro ao remover imagem:', error);
      }
    }

    onImageChange(null);
    toast.success('Imagem removida com sucesso!');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {currentImageUrl ? (
          <div className="relative">
            <img
              src={currentImageUrl}
              alt="Logo atual"
              className="w-24 h-24 object-cover rounded-lg border border-border"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full"
              onClick={handleRemoveImage}
              disabled={disabled || uploading}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        ) : (
          <div className="w-24 h-24 border-2 border-dashed border-border rounded-lg flex items-center justify-center">
            <Image className="w-8 h-8 text-muted-foreground" />
          </div>
        )}

        <div className="space-y-2">
          <label className="block">
            <Button
              type="button"
              variant="outline"
              disabled={disabled || uploading}
              className="cursor-pointer"
              asChild
            >
              <span>
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? 'Enviando...' : 'Escolher Imagem'}
              </span>
            </Button>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={disabled || uploading}
              className="hidden"
            />
          </label>
          <p className="text-xs text-muted-foreground">
            PNG, JPG até 5MB
          </p>
        </div>
      </div>
    </div>
  );
};