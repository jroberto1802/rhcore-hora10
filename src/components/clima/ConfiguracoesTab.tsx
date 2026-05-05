import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Pencil, Trash2, GripVertical, Settings2, HelpCircle } from "lucide-react";

interface Props {
  campanha: any;
  currentEmpresa: any;
}

const pilarSchema = z.object({
  nome: z.string().min(2, "Nome obrigatório"),
  descricao: z.string().optional(),
});

const perguntaSchema = z.object({
  pilar_nome: z.string().min(1, "Selecione um pilar"),
  texto: z.string().min(5, "Texto obrigatório"),
  tipo: z.enum(["escala", "texto_livre", "enps"]),
  ordem: z.coerce.number().optional(),
});

const PILARES_DEFAULT = [
  "Comunicação", "Liderança", "Recursos de Trabalho", "Metas e Objetivos",
  "Desenvolvimento", "Cooperação", "Reconhecimento", "Bem-estar",
  "Remuneração", "Diversidade e Inclusão", "Segurança Psicológica",
  "Saúde Mental", "Segurança Física",
];

export function ConfiguracoesTab({ campanha, currentEmpresa }: Props) {
  const queryClient = useQueryClient();
  const db = supabase as any;
  const [pilarModalOpen, setPilarModalOpen] = useState(false);
  const [editPilar, setEditPilar] = useState<any>(null);
  const [perguntaModalOpen, setPerguntaModalOpen] = useState(false);
  const [editPergunta, setEditPergunta] = useState<any>(null);

  const pilarForm = useForm({ resolver: zodResolver(pilarSchema), defaultValues: { nome: "", descricao: "" } });
  const perguntaForm = useForm({
    resolver: zodResolver(perguntaSchema),
    defaultValues: { pilar_nome: "", texto: "", tipo: "escala" as const, ordem: 0 },
  });

  const { data: pilares = [] } = useQuery({
    queryKey: ["clima_pilares", currentEmpresa?.id],
    queryFn: async () => {
      const { data, error } = await db
        .from("clima_pilares")
        .select("*")
        .eq("empresa_id", currentEmpresa.id)
        .order("ordem");
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentEmpresa,
  });

  const { data: perguntas = [] } = useQuery({
    queryKey: ["clima_perguntas", campanha.id],
    queryFn: async () => {
      const { data, error } = await db
        .from("clima_perguntas")
        .select("*")
        .eq("campanha_id", campanha.id)
        .order("ordem");
      if (error) throw error;
      return data || [];
    },
  });

  const criarPilaresPadrao = useMutation({
    mutationFn: async () => {
      const inserts = PILARES_DEFAULT.map((nome, i) => ({
        empresa_id: currentEmpresa.id,
        nome,
        ordem: i + 1,
        ativo: true,
      }));
      const { error } = await db.from("clima_pilares").insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clima_pilares", currentEmpresa?.id] });
      toast.success("Pilares padrão criados");
    },
    onError: () => toast.error("Erro ao criar pilares padrão"),
  });

  const savePilar = useMutation({
    mutationFn: async (values: z.infer<typeof pilarSchema>) => {
      if (editPilar) {
        const { error } = await db.from("clima_pilares").update(values).eq("id", editPilar.id);
        if (error) throw error;
      } else {
        const { error } = await db.from("clima_pilares").insert({
          ...values,
          empresa_id: currentEmpresa.id,
          ordem: pilares.length + 1,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clima_pilares", currentEmpresa?.id] });
      toast.success(editPilar ? "Pilar atualizado" : "Pilar criado");
      setPilarModalOpen(false);
      setEditPilar(null);
    },
    onError: () => toast.error("Erro ao salvar pilar"),
  });

  const togglePilar = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await db.from("clima_pilares").update({ ativo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clima_pilares", currentEmpresa?.id] }),
  });

  const deletePilar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("clima_pilares").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clima_pilares", currentEmpresa?.id] });
      toast.success("Pilar excluído");
    },
    onError: () => toast.error("Erro ao excluir pilar"),
  });

  const savePergunta = useMutation({
    mutationFn: async (values: z.infer<typeof perguntaSchema>) => {
      const payload = { ...values, campanha_id: campanha.id };
      if (editPergunta) {
        const { error } = await db.from("clima_perguntas").update(payload).eq("id", editPergunta.id);
        if (error) throw error;
      } else {
        const { error } = await db.from("clima_perguntas").insert({ ...payload, ordem: perguntas.length + 1, ativo: true });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clima_perguntas", campanha.id] });
      toast.success(editPergunta ? "Pergunta atualizada" : "Pergunta adicionada");
      setPerguntaModalOpen(false);
      setEditPergunta(null);
    },
    onError: () => toast.error("Erro ao salvar pergunta"),
  });

  const deletePergunta = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("clima_perguntas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clima_perguntas", campanha.id] });
      toast.success("Pergunta excluída");
    },
    onError: () => toast.error("Erro ao excluir pergunta"),
  });

  const abrirNovoPilar = () => {
    setEditPilar(null);
    pilarForm.reset({ nome: "", descricao: "" });
    setPilarModalOpen(true);
  };

  const abrirEditarPilar = (pilar: any) => {
    setEditPilar(pilar);
    pilarForm.reset({ nome: pilar.nome, descricao: pilar.descricao || "" });
    setPilarModalOpen(true);
  };

  const abrirNovaPergunta = () => {
    setEditPergunta(null);
    perguntaForm.reset({ pilar_nome: "", texto: "", tipo: "escala", ordem: perguntas.length + 1 });
    setPerguntaModalOpen(true);
  };

  const abrirEditarPergunta = (p: any) => {
    setEditPergunta(p);
    perguntaForm.reset({ pilar_nome: p.pilar_nome || "", texto: p.texto, tipo: p.tipo, ordem: p.ordem });
    setPerguntaModalOpen(true);
  };

  const tipoLabel = (t: string) => ({ escala: "Escala", texto_livre: "Texto livre", enps: "eNPS" })[t] || t;

  const perguntasPorPilar = pilares.reduce((acc: any, pilar: any) => {
    acc[pilar.nome] = perguntas.filter((p: any) => p.pilar_nome === pilar.nome);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-6">
      {/* Pilares */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings2 className="h-4 w-4" /> Pilares do Clima
            </CardTitle>
            <div className="flex gap-2">
              {pilares.length === 0 && (
                <Button variant="outline" size="sm" onClick={() => criarPilaresPadrao.mutate()} disabled={criarPilaresPadrao.isPending}>
                  Criar pilares padrão
                </Button>
              )}
              <Button size="sm" onClick={abrirNovoPilar}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Novo pilar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {pilares.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Settings2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum pilar configurado.</p>
              <p className="text-xs mt-1">Use "Criar pilares padrão" ou adicione manualmente.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pilares.map((pilar: any) => (
                <div
                  key={pilar.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-opacity ${pilar.ativo ? "bg-white" : "bg-muted/30 opacity-60"}`}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{pilar.nome}</p>
                    {pilar.descricao && <p className="text-xs text-muted-foreground truncate">{pilar.descricao}</p>}
                  </div>
                  <Switch
                    checked={pilar.ativo}
                    onCheckedChange={(v) => togglePilar.mutate({ id: pilar.id, ativo: v })}
                    className="flex-shrink-0"
                  />
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => abrirEditarPilar(pilar)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => deletePilar.mutate(pilar.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Perguntas */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <HelpCircle className="h-4 w-4" /> Perguntas ({perguntas.length})
            </CardTitle>
            <Button size="sm" onClick={abrirNovaPergunta} disabled={pilares.length === 0}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Nova pergunta
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {perguntas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <HelpCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">
                {pilares.length === 0
                  ? "Configure os pilares primeiro para adicionar perguntas."
                  : "Nenhuma pergunta cadastrada para esta campanha."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pilares.map((pilar: any) => {
                const qs = perguntasPorPilar[pilar.nome] || [];
                if (qs.length === 0) return null;
                return (
                  <div key={pilar.id}>
                    <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">
                      {pilar.nome}
                    </p>
                    <div className="space-y-1.5 pl-2 border-l-2 border-primary/20">
                      {qs.map((pergunta: any) => (
                        <div key={pergunta.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">{pergunta.texto}</p>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="outline" className="text-xs px-1.5 py-0">
                                {tipoLabel(pergunta.tipo)}
                              </Badge>
                              {!pergunta.ativo && (
                                <Badge variant="secondary" className="text-xs px-1.5 py-0">Inativa</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => abrirEditarPergunta(pergunta)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => deletePergunta.mutate(pergunta.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Escala de respostas */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Escala de Respostas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { valor: 100, label: "Concordo totalmente", color: "bg-green-100 border-green-300 text-green-800" },
              { valor: 75, label: "Concordo", color: "bg-emerald-100 border-emerald-300 text-emerald-800" },
              { valor: 50, label: "Discordo", color: "bg-amber-100 border-amber-300 text-amber-800" },
              { valor: 0, label: "Discordo totalmente", color: "bg-red-100 border-red-300 text-red-800" },
            ].map(({ valor, label, color }) => (
              <div key={valor} className={`p-3 rounded-lg border text-center ${color}`}>
                <p className="text-2xl font-bold">{valor}</p>
                <p className="text-xs mt-1">{label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modal Pilar */}
      <Dialog open={pilarModalOpen} onOpenChange={(v) => { setPilarModalOpen(v); if (!v) setEditPilar(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editPilar ? "Editar Pilar" : "Novo Pilar"}</DialogTitle>
          </DialogHeader>
          <Form {...pilarForm}>
            <form onSubmit={pilarForm.handleSubmit((v) => savePilar.mutate(v))} className="space-y-4">
              <FormField control={pilarForm.control} name="nome" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={pilarForm.control} name="descricao" render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl><Textarea rows={2} {...field} /></FormControl>
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setPilarModalOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={savePilar.isPending}>Salvar</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modal Pergunta */}
      <Dialog open={perguntaModalOpen} onOpenChange={(v) => { setPerguntaModalOpen(v); if (!v) setEditPergunta(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editPergunta ? "Editar Pergunta" : "Nova Pergunta"}</DialogTitle>
          </DialogHeader>
          <Form {...perguntaForm}>
            <form onSubmit={perguntaForm.handleSubmit((v) => savePergunta.mutate(v))} className="space-y-4">
              <FormField control={perguntaForm.control} name="pilar_nome" render={({ field }) => (
                <FormItem>
                  <FormLabel>Pilar *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione um pilar" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {pilares.filter((p: any) => p.ativo).map((p: any) => (
                        <SelectItem key={p.id} value={p.nome}>{p.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={perguntaForm.control} name="texto" render={({ field }) => (
                <FormItem>
                  <FormLabel>Texto da pergunta *</FormLabel>
                  <FormControl><Textarea rows={3} placeholder="Ex: Meu gestor me dá feedback claro sobre meu desempenho." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={perguntaForm.control} name="tipo" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de resposta</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="escala">Escala (0–100)</SelectItem>
                      <SelectItem value="texto_livre">Texto livre</SelectItem>
                      <SelectItem value="enps">eNPS (0–10)</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setPerguntaModalOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={savePergunta.isPending}>Salvar</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
