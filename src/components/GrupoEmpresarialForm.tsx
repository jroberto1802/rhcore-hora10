import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from './ImageUpload';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const grupoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  descricao: z.string().optional(),
});

type GrupoFormData = z.infer<typeof grupoSchema>;

interface GrupoEmpresarial {
  id: string;
  nome: string;
  descricao: string | null;
  logo_url?: string | null;
}

interface GrupoEmpresarialFormProps {
  grupo?: GrupoEmpresarial;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const GrupoEmpresarialForm: React.FC<GrupoEmpresarialFormProps> = ({
  grupo,
  onSuccess,
  onCancel
}) => {
  const [logoUrl, setLogoUrl] = useState<string | null>(grupo?.logo_url || null);
  const [saving, setSaving] = useState(false);

  const form = useForm<GrupoFormData>({
    resolver: zodResolver(grupoSchema),
    defaultValues: {
      nome: grupo?.nome || '',
      descricao: grupo?.descricao || '',
    },
  });

  const onSubmit = async (data: GrupoFormData) => {
    setSaving(true);

    try {
      const grupoData = {
        nome: data.nome,
        descricao: data.descricao || null,
        logo_url: logoUrl,
      };

      if (grupo) {
        // Atualizar grupo existente
        const { error } = await supabase
          .from('grupos_empresariais')
          .update(grupoData)
          .eq('id', grupo.id);

        if (error) throw error;
        toast.success('Grupo empresarial atualizado com sucesso!');
      } else {
        // Criar novo grupo
        const { error } = await supabase
          .from('grupos_empresariais')
          .insert(grupoData);

        if (error) throw error;
        toast.success('Grupo empresarial criado com sucesso!');
      }

      onSuccess?.();
    } catch (error) {
      console.error('Erro ao salvar grupo:', error);
      toast.error('Erro ao salvar grupo empresarial');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {grupo ? 'Editar Grupo Empresarial' : 'Novo Grupo Empresarial'}
        </CardTitle>
        <CardDescription>
          Preencha as informações do grupo empresarial
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do grupo empresarial" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descrição do grupo empresarial"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <FormLabel>Logo do Grupo</FormLabel>
                <div className="mt-2">
                  <ImageUpload
                    currentImageUrl={logoUrl}
                    onImageChange={setLogoUrl}
                    folder="grupos"
                    disabled={saving}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={saving}>
                {saving ? 'Salvando...' : grupo ? 'Atualizar' : 'Criar'}
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