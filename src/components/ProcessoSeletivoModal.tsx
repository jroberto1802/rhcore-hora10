import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserEmpresas } from "@/hooks/useUserEmpresas";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatDateForInput, formatDateForDatabase } from "@/lib/utils";

interface ProcessoSeletivoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  processo?: any;
  empresaId: string;
}

export function ProcessoSeletivoModal({
  open,
  onOpenChange,
  processo,
  empresaId,
}: ProcessoSeletivoModalProps) {
  const queryClient = useQueryClient();
  
  const { data: cargos } = useQuery({
    queryKey: ["cargos", empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cargos")
        .select("id, nome, nome_completo_cargo")
        .eq("empresa_id", empresaId)
        .order("nome");

      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaId,
  });
  
  const form = useForm({
    defaultValues: {
      tipo: "",
      turno_vaga: "",
      quantidade_vagas: 1,
      data_inicio: "",
      cargo_id: "",
      solicitante: "",
      observacoes: "",
      status: "em_andamento",
    },
  });

  useEffect(() => {
    if (processo) {
      form.reset({
        tipo: processo.tipo,
        turno_vaga: processo.turno_vaga,
        quantidade_vagas: processo.quantidade_vagas,
        data_inicio: formatDateForInput(processo.data_inicio),
        cargo_id: processo.cargo_id || "",
        solicitante: processo.solicitante || "",
        observacoes: processo.observacoes || "",
        status: processo.status || "em_andamento",
      });
    } else {
      form.reset({
        tipo: "",
        turno_vaga: "",
        quantidade_vagas: 1,
        data_inicio: "",
        cargo_id: "",
        solicitante: "",
        observacoes: "",
        status: "em_andamento",
      });
    }
  }, [processo, form]);

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      if (processo) {
        const { error } = await supabase
          .from("processos_seletivos")
          .update(values)
          .eq("id", processo.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("processos_seletivos")
          .insert([{ ...values, empresa_id: empresaId }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processos-seletivos"] });
      toast.success(
        processo
          ? "Processo seletivo atualizado com sucesso"
          : "Processo seletivo criado com sucesso"
      );
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast.error("Erro ao salvar processo seletivo");
    },
  });

  const onSubmit = (values: any) => {
    const dataToSubmit = {
      ...values,
      data_inicio: formatDateForDatabase(values.data_inicio),
      // Se o status for concluído e não tiver data_final, definir a data atual
      data_final: values.status === "concluido" && !processo?.data_final 
        ? new Date().toISOString().split("T")[0] 
        : values.status === "em_andamento" || values.status === "cancelado" 
          ? null 
          : processo?.data_final,
    };
    mutation.mutate(dataToSubmit);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {processo ? "Editar" : "Novo"} Processo Seletivo
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tipo"
                rules={{ required: "Tipo é obrigatório" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-popover z-50">
                        <SelectItem value="Efetivo">Efetivo</SelectItem>
                        <SelectItem value="Estágio">Estágio</SelectItem>
                        <SelectItem value="Jovem Aprendiz">Jovem Aprendiz</SelectItem>
                        <SelectItem value="PCD">PCD</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cargo_id"
                rules={{ required: "Função/Cargo é obrigatória" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Função/Cargo</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-popover z-50">
                        {cargos?.map((cargo) => (
                          <SelectItem key={cargo.id} value={cargo.id}>
                            {cargo.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="turno_vaga"
              rules={{ required: "Turno é obrigatório" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Turno da Vaga</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="Manhã">Manhã</SelectItem>
                      <SelectItem value="Tarde">Tarde</SelectItem>
                      <SelectItem value="Noite">Noite</SelectItem>
                      <SelectItem value="Integral">Integral</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="solicitante"
              rules={{ required: "Solicitante é obrigatório" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Solicitante</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Nome do solicitante" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantidade_vagas"
                rules={{ required: "Quantidade é obrigatória", min: 1 }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade de Vagas</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="data_inicio"
                rules={{ required: "Data de início é obrigatória" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Início</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {processo && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-popover z-50">
                        <SelectItem value="em_andamento">Em andamento</SelectItem>
                        <SelectItem value="concluido">Concluído</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Observações sobre o processo seletivo"
                      rows={4}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
