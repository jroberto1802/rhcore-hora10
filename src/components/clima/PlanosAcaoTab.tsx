import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Trash2, Clock, PlayCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  campanha: any;
  currentEmpresa: any;
}

const planoSchema = z.object({
  unidade: z.string().optional(),
  setor: z.string().optional(),
  indicador_afetado: z.string().min(2, "Obrigatório"),
  problema_identificado: z.string().min(5, "Descreva o problema"),
  acao_corretiva: z.string().min(5, "Descreva a ação"),
  responsavel: z.string().optional(),
  prazo: z.string().optional(),
  evidencia: z.string().optional(),
  status: z.enum(["pendente", "em_andamento", "concluido"]),
});

type PlanoForm = z.infer<typeof planoSchema>;

const COLUNAS = [
  { id: "pendente", label: "Pendente", icon: Clock, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
  { id: "em_andamento", label: "Em Andamento", icon: PlayCircle, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
  { id: "concluido", label: "Concluído", icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50 border-green-200" },
] as const;

export function PlanosAcaoTab({ campanha, currentEmpresa }: Props) {
  const queryClient = useQueryClient();
  const db = supabase as any;
  const [modalOpen, setModalOpen] = useState(false);
  const [editPlano, setEditPlano] = useState<any>(null);

  const form = useForm<PlanoForm>({
    resolver: zodResolver(planoSchema),
    defaultValues: {
      unidade: "", setor: "", indicador_afetado: "", problema_identificado: "",
      acao_corretiva: "", responsavel: "", prazo: "", evidencia: "", status: "pendente",
    },
  });

  const { data: planos = [], isLoading } = useQuery({
    queryKey: ["clima_planos", campanha.id],
    queryFn: async () => {
      const { data, error } = await db
        .from("clima_planos_acao")
        .select("*")
        .eq("campanha_id", campanha.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: PlanoForm) => {
      const payload = {
        ...values,
        prazo: values.prazo || null,
        campanha_id: campanha.id,
        empresa_id: currentEmpresa.id,
        updated_at: new Date().toISOString(),
      };
      if (editPlano) {
        const { error } = await db.from("clima_planos_acao").update(payload).eq("id", editPlano.id);
        if (error) throw error;
      } else {
        const { error } = await db.from("clima_planos_acao").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clima_planos", campanha.id] });
      toast.success(editPlano ? "Plano atualizado" : "Plano criado");
      setModalOpen(false);
      setEditPlano(null);
    },
    onError: () => toast.error("Erro ao salvar plano"),
  });

  const moverMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await db
        .from("clima_planos_acao")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clima_planos", campanha.id] }),
    onError: () => toast.error("Erro ao mover plano"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("clima_planos_acao").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clima_planos", campanha.id] });
      toast.success("Plano excluído");
    },
    onError: () => toast.error("Erro ao excluir plano"),
  });

  const abrirNovo = () => {
    setEditPlano(null);
    form.reset({ status: "pendente" });
    setModalOpen(true);
  };

  const abrirEditar = (plano: any) => {
    setEditPlano(plano);
    form.reset({
      unidade: plano.unidade || "",
      setor: plano.setor || "",
      indicador_afetado: plano.indicador_afetado || "",
      problema_identificado: plano.problema_identificado || "",
      acao_corretiva: plano.acao_corretiva || "",
      responsavel: plano.responsavel || "",
      prazo: plano.prazo || "",
      evidencia: plano.evidencia || "",
      status: plano.status,
    });
    setModalOpen(true);
  };

  const getProximoStatus = (atual: string) => {
    if (atual === "pendente") return "em_andamento";
    if (atual === "em_andamento") return "concluido";
    return null;
  };

  const formatPrazo = (d: string | null) =>
    d ? format(new Date(d + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR }) : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Planos de Ação</h3>
          <p className="text-sm text-muted-foreground">
            {planos.length} plano(s) registrado(s)
          </p>
        </div>
        <Button onClick={abrirNovo}>
          <Plus className="h-4 w-4 mr-2" /> Novo Plano
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center h-32 items-center">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUNAS.map((coluna) => {
            const Icon = coluna.icon;
            const planosColuna = planos.filter((p: any) => p.status === coluna.id);
            return (
              <div key={coluna.id} className="space-y-3">
                <div className={`flex items-center gap-2 p-2.5 rounded-lg border ${coluna.bg}`}>
                  <Icon className={`h-4 w-4 ${coluna.color}`} />
                  <span className={`text-sm font-semibold ${coluna.color}`}>{coluna.label}</span>
                  <span className={`ml-auto text-xs font-bold ${coluna.color} bg-white rounded-full w-5 h-5 flex items-center justify-center`}>
                    {planosColuna.length}
                  </span>
                </div>

                {planosColuna.length === 0 ? (
                  <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center text-muted-foreground text-xs">
                    Nenhum plano
                  </div>
                ) : (
                  <div className="space-y-2">
                    {planosColuna.map((plano: any) => {
                      const proximo = getProximoStatus(plano.status);
                      const prazoVencido = plano.prazo && new Date(plano.prazo) < new Date() && plano.status !== "concluido";
                      return (
                        <Card key={plano.id} className="shadow-sm hover:shadow-md transition-shadow">
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-primary truncate">
                                  {plano.indicador_afetado}
                                </p>
                                {(plano.setor || plano.unidade) && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {[plano.setor, plano.unidade].filter(Boolean).join(" · ")}
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-0.5 flex-shrink-0">
                                <Button
                                  variant="ghost" size="icon" className="h-6 w-6"
                                  onClick={() => abrirEditar(plano)}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive"
                                  onClick={() => deleteMutation.mutate(plano.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>

                            <p className="text-xs text-foreground line-clamp-2">
                              {plano.acao_corretiva}
                            </p>

                            {plano.responsavel && (
                              <p className="text-xs text-muted-foreground">
                                Resp.: <span className="font-medium text-foreground">{plano.responsavel}</span>
                              </p>
                            )}

                            {plano.prazo && (
                              <p className={`text-xs font-medium ${prazoVencido ? "text-red-600" : "text-muted-foreground"}`}>
                                Prazo: {formatPrazo(plano.prazo)}
                                {prazoVencido && " ⚠️"}
                              </p>
                            )}

                            {proximo && (
                              <Button
                                variant="outline" size="sm" className="w-full h-7 text-xs mt-1"
                                onClick={() => moverMutation.mutate({ id: plano.id, status: proximo })}
                              >
                                <ArrowRight className="h-3 w-3 mr-1" />
                                Mover para {proximo === "em_andamento" ? "Em Andamento" : "Concluído"}
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={(v) => { setModalOpen(v); if (!v) setEditPlano(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editPlano ? "Editar Plano de Ação" : "Novo Plano de Ação"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="unidade" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidade</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="setor" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Setor</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="indicador_afetado" render={({ field }) => (
                <FormItem>
                  <FormLabel>Indicador afetado *</FormLabel>
                  <FormControl><Input placeholder="Ex: Liderança, Comunicação..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="problema_identificado" render={({ field }) => (
                <FormItem>
                  <FormLabel>Problema identificado *</FormLabel>
                  <FormControl><Textarea rows={2} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="acao_corretiva" render={({ field }) => (
                <FormItem>
                  <FormLabel>Ação corretiva *</FormLabel>
                  <FormControl><Textarea rows={2} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="responsavel" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsável</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="prazo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prazo</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="em_andamento">Em Andamento</SelectItem>
                      <SelectItem value="concluido">Concluído</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />

              <FormField control={form.control} name="evidencia" render={({ field }) => (
                <FormItem>
                  <FormLabel>Evidência / Observação</FormLabel>
                  <FormControl><Textarea rows={2} {...field} /></FormControl>
                </FormItem>
              )} />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Salvando..." : editPlano ? "Salvar" : "Criar plano"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
