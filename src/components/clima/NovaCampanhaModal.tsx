import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const schema = z.object({
  nome: z.string().min(3, "Mínimo 3 caracteres"),
  ano: z.coerce.number().min(2020).max(2100),
  periodo_inicio: z.string().optional(),
  periodo_fim: z.string().optional(),
  tipo: z.enum(["anonima", "identificada"]),
  publico_alvo: z.enum(["todos", "unidade", "setor"]),
  token_expiracao_horas: z.coerce.number().min(1).max(8760),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentEmpresa: any;
  editData?: any;
}

export function NovaCampanhaModal({ open, onOpenChange, currentEmpresa, editData }: Props) {
  const queryClient = useQueryClient();
  const db = supabase as any;
  const isEdit = !!editData;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: "",
      ano: new Date().getFullYear(),
      periodo_inicio: "",
      periodo_fim: "",
      tipo: "anonima",
      publico_alvo: "todos",
      token_expiracao_horas: 168,
    },
  });

  useEffect(() => {
    if (editData) {
      form.reset({
        nome: editData.nome,
        ano: editData.ano,
        periodo_inicio: editData.periodo_inicio || "",
        periodo_fim: editData.periodo_fim || "",
        tipo: editData.tipo,
        publico_alvo: editData.publico_alvo,
        token_expiracao_horas: editData.token_expiracao_horas,
      });
    } else {
      form.reset({
        nome: "",
        ano: new Date().getFullYear(),
        periodo_inicio: "",
        periodo_fim: "",
        tipo: "anonima",
        publico_alvo: "todos",
        token_expiracao_horas: 168,
      });
    }
  }, [editData, open]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        ...values,
        periodo_inicio: values.periodo_inicio || null,
        periodo_fim: values.periodo_fim || null,
        empresa_id: currentEmpresa.id,
        updated_at: new Date().toISOString(),
      };

      if (isEdit) {
        const { error } = await db.from("clima_campanhas").update(payload).eq("id", editData.id);
        if (error) throw error;
      } else {
        const { error } = await db.from("clima_campanhas").insert({ ...payload, status: "rascunho" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clima_campanhas"] });
      toast.success(isEdit ? "Campanha atualizada" : "Campanha criada com sucesso");
      onOpenChange(false);
    },
    onError: () => toast.error("Erro ao salvar campanha"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Campanha" : "Nova Campanha de Clima"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Pesquisa</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Pesquisa de Clima 2025" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
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
              <FormField
                control={form.control}
                name="token_expiracao_horas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiração do token (horas)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="periodo_inicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Início do período</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="periodo_fim"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fim do período</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="anonima">Anônima</SelectItem>
                        <SelectItem value="identificada">Identificada</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="publico_alvo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Público-alvo</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="unidade">Por Unidade</SelectItem>
                        <SelectItem value="setor">Por Setor</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Salvando..." : isEdit ? "Salvar alterações" : "Criar campanha"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
