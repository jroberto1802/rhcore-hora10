import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { RotateCcw, Copy, FileText, CalendarIcon, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Pencil, Trash2, Eye, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";
import { formatDateForDisplay } from "@/lib/utils";
import { AuditLogFooter } from "@/components/AuditLogFooter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EntrevistaModal } from "@/components/EntrevistaModal";
import { RoteiroEntrevistaModal } from "@/components/RoteiroEntrevistaModal";
import { ProcessoSeletivoDetalhamentoForm } from "@/components/ProcessoSeletivoDetalhamentoForm";
import { Badge } from "@/components/ui/badge";

const statusColors: Record<string, string> = {
  "Aguardando": "bg-gray-100 text-gray-800",
  "Entrevistar": "bg-blue-100 text-blue-800",
  "Em análise": "bg-yellow-100 text-yellow-800",
  "Aprovado": "bg-green-100 text-green-800",
  "Reprovado": "bg-red-100 text-red-800",
  "Desistente": "bg-orange-100 text-orange-800",
  "Contratado": "bg-green-100 text-green-800",
};

export default function ProcessoSeletivoDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEntrevista, setSelectedEntrevista] = useState<any>(null);
  const [entrevistaToDelete, setEntrevistaToDelete] = useState<string | null>(null);
  const [observacaoDialog, setObservacaoDialog] = useState<{open: boolean, text: string}>({
    open: false,
    text: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [isRoteiroModalOpen, setIsRoteiroModalOpen] = useState(false);
  const [selectedRoteiro, setSelectedRoteiro] = useState<any>(null);
  const [roteiroToDelete, setRoteiroToDelete] = useState<string | null>(null);
  const [searchRoteiroTerm, setSearchRoteiroTerm] = useState("");
  const [tipoRoteiroFilter, setTipoRoteiroFilter] = useState<string>("todos");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [roteiroViewDialog, setRoteiroViewDialog] = useState<{open: boolean, roteiro: any}>({
    open: false,
    roteiro: null,
  });

  const { data: processo } = useQuery({
    queryKey: ["processo-seletivo", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("processos_seletivos")
        .select(`
          *,
          cargo:cargos(nome, nome_completo_cargo)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: roteiros, isLoading: isLoadingRoteiros } = useQuery({
    queryKey: ["roteiros", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roteiros_entrevista")
        .select("*")
        .eq("processo_seletivo_id", id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const { data: entrevistas, isLoading } = useQuery({
    queryKey: ["entrevistas", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entrevistas")
        .select(`
          *,
          candidato:candidatos(nome_completo, funcoes, bairro, cidade)
        `)
        .eq("processo_seletivo_id", id)
        .order("data_entrevista", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: async (entrevistaId: string) => {
      const { error } = await supabase
        .from("entrevistas")
        .delete()
        .eq("id", entrevistaId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entrevistas", id] });
      toast.success("Entrevista excluída com sucesso");
      setEntrevistaToDelete(null);
    },
    onError: () => {
      toast.error("Erro ao excluir entrevista");
    },
  });

  const reabrirProcessoMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("processos_seletivos")
        .update({ data_final: null })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processo-seletivo", id] });
      queryClient.invalidateQueries({ queryKey: ["processos-seletivos"] });
      toast.success("Processo reaberto com sucesso");
    },
    onError: () => {
      toast.error("Erro ao reabrir processo");
    },
  });

  const deleteRoteiroMutation = useMutation({
    mutationFn: async (roteiroId: string) => {
      const { error } = await supabase
        .from("roteiros_entrevista")
        .delete()
        .eq("id", roteiroId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roteiros", id] });
      toast.success("Roteiro excluído com sucesso");
      setRoteiroToDelete(null);
    },
    onError: () => {
      toast.error("Erro ao excluir roteiro");
    },
  });

  const duplicarRoteiroMutation = useMutation({
    mutationFn: async (roteiro: any) => {
      const { error } = await supabase
        .from("roteiros_entrevista")
        .insert([{
          processo_seletivo_id: roteiro.processo_seletivo_id,
          empresa_id: roteiro.empresa_id,
          nome_roteiro: `${roteiro.nome_roteiro} (Cópia)`,
          tipo: roteiro.tipo,
          perguntas: roteiro.perguntas,
          criador_id: (await supabase.auth.getUser()).data.user?.id,
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roteiros", id] });
      toast.success("Roteiro duplicado com sucesso");
    },
    onError: () => {
      toast.error("Erro ao duplicar roteiro");
    },
  });

  const handleEdit = (entrevista: any) => {
    setSelectedEntrevista(entrevista);
    setIsModalOpen(true);
  };

  const handleNew = () => {
    setSelectedEntrevista(null);
    setIsModalOpen(true);
  };

  const handleViewObservacao = (observacao: string) => {
    setObservacaoDialog({ open: true, text: observacao });
  };

  const handleEditRoteiro = (roteiro: any) => {
    setSelectedRoteiro(roteiro);
    setIsRoteiroModalOpen(true);
  };

  const handleNewRoteiro = () => {
    setSelectedRoteiro(null);
    setIsRoteiroModalOpen(true);
  };

  const handleViewRoteiro = (roteiro: any) => {
    setRoteiroViewDialog({ open: true, roteiro });
  };

  const filteredEntrevistas = useMemo(() => {
    if (!entrevistas) return [];

    return entrevistas
      .filter((entrevista: any) => {
        const matchesSearch = entrevista.candidato?.nome_completo
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "todos" || entrevista.status === statusFilter;
        const matchesDate = !dateFilter || (() => {
          const entrevistaDate = toZonedTime(new Date(entrevista.data_entrevista), "America/Sao_Paulo");
          return (
            entrevistaDate.getFullYear() === dateFilter.getFullYear() &&
            entrevistaDate.getMonth() === dateFilter.getMonth() &&
            entrevistaDate.getDate() === dateFilter.getDate()
          );
        })();
        
        return matchesSearch && matchesStatus && matchesDate;
      })
      .sort((a: any, b: any) => {
        // Ordenação cronológica crescente (mais antigas primeiro)
        return new Date(a.data_entrevista).getTime() - new Date(b.data_entrevista).getTime();
      });
  }, [entrevistas, searchTerm, statusFilter, dateFilter]);

  const filteredRoteiros = useMemo(() => {
    if (!roteiros) return [];

    return roteiros.filter((roteiro: any) => {
      const matchesSearch = roteiro.nome_roteiro
        ?.toLowerCase()
        .includes(searchRoteiroTerm.toLowerCase());
      const matchesTipo = tipoRoteiroFilter === "todos" || roteiro.tipo === tipoRoteiroFilter;
      
      return matchesSearch && matchesTipo;
    });
  }, [roteiros, searchRoteiroTerm, tipoRoteiroFilter]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/processos-seletivos")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Detalhes do Processo Seletivo</h1>
          <p className="text-muted-foreground">
            Gerencie as entrevistas deste processo
          </p>
        </div>
      </div>

      {processo && (
        <Card>
          <CardHeader>
            <CardTitle>Informações do Processo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Função/Cargo</p>
                <p className="font-medium">{processo.cargo?.nome || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tipo</p>
                <p className="font-medium">{processo.tipo}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Turno</p>
                <p className="font-medium">{processo.turno_vaga}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vagas</p>
                <p className="font-medium">{processo.quantidade_vagas}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Solicitante</p>
                <p className="font-medium">{processo.solicitante || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data Início</p>
                <p className="font-medium">
                  {formatDateForDisplay(processo.data_inicio)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data Final</p>
                <p className="font-medium">
                  {processo.data_final
                    ? formatDateForDisplay(processo.data_final)
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="flex items-center gap-2">
                  <Badge
                    className={
                      processo.data_final
                        ? "bg-green-100 text-green-800"
                        : "bg-blue-100 text-blue-800"
                    }
                  >
                    {processo.data_final ? "Concluído" : "Em andamento"}
                  </Badge>
                  {processo.data_final && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => reabrirProcessoMutation.mutate()}
                      disabled={reabrirProcessoMutation.isPending}
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Reabrir
                    </Button>
                  )}
                </div>
              </div>
            </div>
            {processo.observacoes && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">Observações</p>
                <p className="whitespace-pre-wrap">{processo.observacoes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="entrevistas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="entrevistas">Entrevistas</TabsTrigger>
          <TabsTrigger value="roteiros">Roteiros</TabsTrigger>
          <TabsTrigger value="detalhamento">Detalhamento</TabsTrigger>
        </TabsList>

        <TabsContent value="entrevistas" className="space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle>Entrevistas</CardTitle>
            <Button onClick={handleNew}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Entrevista
            </Button>
          </div>
          <Card>
            <CardHeader>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Buscar por candidato..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os status</SelectItem>
                    <SelectItem value="Aguardando">Aguardando</SelectItem>
                    <SelectItem value="Entrevistar">Entrevistar</SelectItem>
                    <SelectItem value="Em análise">Em análise</SelectItem>
                    <SelectItem value="Aprovado">Aprovado</SelectItem>
                    <SelectItem value="Reprovado">Reprovado</SelectItem>
                    <SelectItem value="Desistente">Desistente</SelectItem>
                    <SelectItem value="Contratado">Contratado</SelectItem>
                  </SelectContent>
                </Select>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[200px] justify-start text-left font-normal",
                        !dateFilter && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFilter
                        ? format(dateFilter, "dd/MM/yyyy", { locale: ptBR })
                        : "Data da entrevista"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFilter}
                      onSelect={setDateFilter}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
                {dateFilter && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDateFilter(undefined)}
                    title="Limpar filtro de data"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p>Carregando...</p>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Candidato</TableHead>
                        <TableHead>Bairro/Cidade</TableHead>
                        <TableHead>Funções</TableHead>
                        <TableHead>Data da Entrevista</TableHead>
                        <TableHead className="text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEntrevistas && filteredEntrevistas.length > 0 ? (
                        filteredEntrevistas.map((entrevista: any) => (
                          <TableRow key={entrevista.id}>
                            <TableCell>
                              <Badge className={statusColors[entrevista.status] || ""}>
                                {entrevista.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              {entrevista.candidato?.nome_completo}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {[entrevista.candidato?.bairro, entrevista.candidato?.cidade]
                                .filter(Boolean)
                                .join(" / ") || "-"}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {entrevista.candidato?.funcoes && entrevista.candidato.funcoes.length > 0 ? (
                                  entrevista.candidato.funcoes.map((funcao: string, idx: number) => (
                                    <Badge key={idx} variant="secondary" className="text-xs">
                                      {funcao}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-muted-foreground text-sm">-</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {format(
                                toZonedTime(new Date(entrevista.data_entrevista), "America/Sao_Paulo"),
                                "dd/MM/yyyy 'às' HH:mm",
                                { locale: ptBR }
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => navigate(`/banco-talentos/${entrevista.candidato_id}`)}
                                  title="Ver perfil do candidato"
                                >
                                  <User className="w-4 h-4" />
                                </Button>
                                {entrevista.observacao && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleViewObservacao(entrevista.observacao)}
                                    title="Ver observação"
                                  >
                                    <FileText className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(entrevista)}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setEntrevistaToDelete(entrevista.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-6">
                            Nenhuma entrevista cadastrada
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roteiros" className="space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle>Roteiros de Entrevista</CardTitle>
            <Button onClick={handleNewRoteiro}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Roteiro
            </Button>
          </div>
          <Card>
            <CardHeader>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Buscar roteiro..."
                    value={searchRoteiroTerm}
                    onChange={(e) => setSearchRoteiroTerm(e.target.value)}
                  />
                </div>
                <Select value={tipoRoteiroFilter} onValueChange={setTipoRoteiroFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os tipos</SelectItem>
                    <SelectItem value="Técnico">Técnico</SelectItem>
                    <SelectItem value="RH">RH</SelectItem>
                    <SelectItem value="Comportamental">Comportamental</SelectItem>
                    <SelectItem value="Líder">Líder</SelectItem>
                    <SelectItem value="Cultura">Cultura</SelectItem>
                    <SelectItem value="Case">Case</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingRoteiros ? (
                <p>Carregando...</p>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome do Roteiro</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Nº Perguntas</TableHead>
                        <TableHead>Criado em</TableHead>
                        <TableHead className="text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRoteiros && filteredRoteiros.length > 0 ? (
                        filteredRoteiros.map((roteiro: any) => (
                          <TableRow key={roteiro.id}>
                            <TableCell className="font-medium">
                              {roteiro.nome_roteiro}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{roteiro.tipo}</Badge>
                            </TableCell>
                            <TableCell>
                              {Array.isArray(roteiro.perguntas) ? roteiro.perguntas.length : 0}
                            </TableCell>
                            <TableCell>
                              {format(new Date(roteiro.created_at), "dd/MM/yyyy", { locale: ptBR })}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleViewRoteiro(roteiro)}
                                  title="Visualizar"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditRoteiro(roteiro)}
                                  title="Editar"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => duplicarRoteiroMutation.mutate(roteiro)}
                                  disabled={duplicarRoteiroMutation.isPending}
                                  title="Duplicar"
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setRoteiroToDelete(roteiro.id)}
                                  title="Excluir"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-6">
                            Nenhum roteiro cadastrado
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detalhamento">
          {processo && <ProcessoSeletivoDetalhamentoForm processo={processo} />}
        </TabsContent>
      </Tabs>

      {processo && (
        <>
          <EntrevistaModal
            open={isModalOpen}
            onOpenChange={setIsModalOpen}
            entrevista={selectedEntrevista}
            processoSeletivoId={id!}
            empresaId={processo.empresa_id}
          />
          <RoteiroEntrevistaModal
            open={isRoteiroModalOpen}
            onOpenChange={setIsRoteiroModalOpen}
            roteiro={selectedRoteiro}
            processoSeletivoId={id!}
            empresaId={processo.empresa_id}
          />
        </>
      )}

      <AlertDialog
        open={!!entrevistaToDelete}
        onOpenChange={() => setEntrevistaToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta entrevista? Esta ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => entrevistaToDelete && deleteMutation.mutate(entrevistaToDelete)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!roteiroToDelete}
        onOpenChange={() => setRoteiroToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este roteiro? Esta ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => roteiroToDelete && deleteRoteiroMutation.mutate(roteiroToDelete)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={observacaoDialog.open} onOpenChange={(open) => setObservacaoDialog({...observacaoDialog, open})}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Observação</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="whitespace-pre-wrap">{observacaoDialog.text}</p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={roteiroViewDialog.open} onOpenChange={(open) => setRoteiroViewDialog({...roteiroViewDialog, open})}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{roteiroViewDialog.roteiro?.nome_roteiro}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Tipo</p>
              <Badge variant="outline">{roteiroViewDialog.roteiro?.tipo}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Perguntas ({roteiroViewDialog.roteiro?.perguntas?.length || 0})
              </p>
              <div className="space-y-2">
                {roteiroViewDialog.roteiro?.perguntas?.map((pergunta: string, index: number) => (
                  <div key={index} className="p-3 bg-muted rounded-lg">
                    <span className="text-sm">
                      {index + 1}. {pergunta}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rodapé de Auditoria */}
      {processo && (
        <AuditLogFooter 
          tabela="processos_seletivos" 
          registroId={processo.id} 
          updatedAt={processo.updated_at}
          empresaId={processo.empresa_id}
        />
      )}
    </div>
  );
}
