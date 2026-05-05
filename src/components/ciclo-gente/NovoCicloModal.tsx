import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const schema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  tipo: z.enum(["administrativo_operacional", "lideranca"]),
  ano: z.coerce.number().min(2020).max(2099),
  descricao: z.string().optional(),
  status: z.enum(["rascunho", "ativo"]),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  currentEmpresa: any;
  editData?: any;
  onSuccess: () => void;
}

export function NovoCicloModal({ open, onClose, currentEmpresa, editData, onSuccess }: Props) {
  const db = supabase as any;

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: "",
      tipo: "administrativo_operacional",
      ano: new Date().getFullYear(),
      descricao: "",
      status: "rascunho",
    },
  });

  useEffect(() => {
    if (editData) {
      form.reset({
        nome: editData.nome,
        tipo: editData.tipo,
        ano: editData.ano,
        descricao: editData.descricao || "",
        status: editData.status,
      });
    } else {
      form.reset({
        nome: "",
        tipo: "administrativo_operacional",
        ano: new Date().getFullYear(),
        descricao: "",
        status: "rascunho",
      });
    }
  }, [editData, open]);

  const mutation = useMutation({
    mutationFn: async (values: FormData) => {
      if (editData) {
        const { error } = await db
          .from("ciclo_gente")
          .update({ ...values, updated_at: new Date().toISOString() })
          .eq("id", editData.id);
        if (error) throw error;
      } else {
        const { data: newCiclo, error } = await db
          .from("ciclo_gente")
          .insert({ ...values, empresa_id: currentEmpresa.id })
          .select()
          .single();
        if (error) throw error;
        // Seed default questões for this empresa and tipo
        await db.rpc("inserir_questoes_padrao_ciclo", {
          p_empresa_id: currentEmpresa.id,
          p_tipo_ciclo: values.tipo,
        });
      }
    },
    onSuccess: () => {
      toast.success(editData ? "Ciclo atualizado." : "Ciclo criado com sucesso.");
      onSuccess();
      onClose();
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar ciclo."),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editData ? "Editar Ciclo" : "Novo Ciclo de Gente"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do ciclo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Ciclo de Gente 2026 - 1º Semestre" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="administrativo_operacional">Adm./Operacional</SelectItem>
                        <SelectItem value="lideranca">Lideranças</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ano"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ano</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status inicial</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="rascunho">Rascunho</SelectItem>
                      <SelectItem value="ativo">Ativo</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="Observações sobre o ciclo..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Salvando..." : editData ? "Salvar" : "Criar ciclo"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
