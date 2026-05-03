import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageUpload } from './ImageUpload';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Empresa } from '@/hooks/useUserEmpresas';

interface EmpresaLogoManagerProps {
  empresa: Empresa;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const EmpresaLogoManager: React.FC<EmpresaLogoManagerProps> = ({
  empresa,
  onSuccess,
  onCancel
}) => {
  const [logoUrl, setLogoUrl] = useState<string | null>(empresa.logo_url || null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);

    try {
      const { error } = await supabase
        .from('empresas')
        .update({ logo_url: logoUrl })
        .eq('id', empresa.id);

      if (error) throw error;
      
      toast.success('Logo da empresa atualizada com sucesso!');
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao atualizar logo:', error);
      toast.error('Erro ao atualizar logo da empresa');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Gerenciar Logo - {empresa.fantasia}</CardTitle>
        <CardDescription>
          Adicione ou altere a logo da empresa
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <label className="text-sm font-medium">Logo da Empresa</label>
            <div className="mt-2">
              <ImageUpload
                currentImageUrl={logoUrl}
                onImageChange={setLogoUrl}
                folder="empresas"
                disabled={saving}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};