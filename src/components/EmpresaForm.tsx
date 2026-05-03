import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ImageUpload } from './ImageUpload';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { type Empresa } from '@/hooks/useUserEmpresas';

const empresaSchema = z.object({
  fantasia: z.string().min(1, 'Nome fantasia é obrigatório'),
  razao_social: z.string().optional(),
  cnpj: z.string().optional(),
});

type EmpresaFormData = z.infer<typeof empresaSchema>;

interface EmpresaFormProps {
  empresa?: Empresa;
  grupoEmpresarialId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const EmpresaForm: React.FC<EmpresaFormProps> = ({
  empresa,
  grupoEmpresarialId,
  onSuccess,
  onCancel
}) => {
  const [logoUrl, setLogoUrl] = useState<string | null>(empresa?.logo_url || null);
  const [saving, setSaving] = useState(false);
  const isCreating = !empresa;

  const form = useForm<EmpresaFormData>({
    resolver: zodResolver(empresaSchema),
    defaultValues: {
      fantasia: empresa?.fantasia || '',
      razao_social: empresa?.razao_social || '',
      cnpj: empresa?.cnpj || '',
    },
  });

  const onSubmit = async (data: EmpresaFormData) => {
    setSaving(true);

    try {
      const empresaData = {
        fantasia: data.fantasia,
        razao_social: data.razao_social || null,
        cnpj: data.cnpj || null,
        logo_url: logoUrl,
      };

      if (isCreating) {
        if (!grupoEmpresarialId) {
          toast.error('Grupo empresarial não informado');
          return;
        }

        // Insert the empresa and get its ID
        const { data: newEmpresa, error: empresaError } = await supabase
          .from('empresas')
          .insert({
            ...empresaData,
            grupo_empresarial_id: grupoEmpresarialId,
            ativo: true,
          })
          .select()
          .single();

        if (empresaError) throw empresaError;

        // Link the current user to the new empresa
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error: linkError } = await supabase
            .from('usuarios_empresas')
            .insert({
              user_id: user.id,
              empresa_id: newEmpresa.id,
            });

          if (linkError) {
            console.error('Erro ao vincular usuário à empresa:', linkError);
            toast.error('Empresa criada mas erro ao vincular usuário');
            return;
          }
        }

        toast.success('Empresa cadastrada com sucesso!');
      } else {
        const { error } = await supabase
          .from('empresas')
          .update(empresaData)
          .eq('id', empresa!.id);

        if (error) throw error;
        toast.success('Empresa atualizada com sucesso!');
      }
      
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao salvar empresa:', error);
      toast.error('Erro ao salvar empresa');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{isCreating ? 'Nova Empresa' : 'Editar Empresa'}</CardTitle>
        <CardDescription>
          {isCreating ? 'Cadastre uma nova empresa no grupo empresarial' : 'Atualize as informações da empresa'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="fantasia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Fantasia *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome fantasia da empresa" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="razao_social"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Razão Social</FormLabel>
                    <FormControl>
                      <Input placeholder="Razão social da empresa" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cnpj"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CNPJ</FormLabel>
                    <FormControl>
                      <Input placeholder="XX.XXX.XXX/XXXX-XX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <FormLabel>Logo da Empresa</FormLabel>
                <div className="mt-2">
                  <ImageUpload
                    currentImageUrl={logoUrl}
                    onImageChange={setLogoUrl}
                    folder="empresas"
                    disabled={saving}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={saving}>
                {saving ? 'Salvando...' : (isCreating ? 'Cadastrar' : 'Atualizar')}
              </Button>
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};