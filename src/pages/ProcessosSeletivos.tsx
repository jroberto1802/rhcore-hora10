import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserEmpresas } from "@/hooks/useUserEmpresas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Eye, Pencil, Trash2, CheckCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { formatDateForDisplay } from "@/lib/utils";
import { Card } from "@/components/ui/card";
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
import { ProcessoSeletivoModal } from "@/components/ProcessoSeletivoModal";

interface ProcessosSeletivosProps {
  currentEmpresa: any;
  isGroupView: boolean;
  currentGroupId: string | null;
}

export default function ProcessosSeletivos({ currentEmpresa, isGroupView, currentGroupId }: ProcessosSeletivosProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProcesso, setSelectedProcesso] = useState<any>(null);
  const [processoToDelete, setProcessoToDelete] = useState<string | null>(null);
  const [processoToFinalize, setProcessoToFinalize] = useState<string | null>(null);

  const { data: processos, isLoading } = useQuery({
    queryKey: ["processos-seletivos", currentEmpresa?.id],
    queryFn: async () => {
      if (!currentEmpresa) return [];
      
      const { data, error } = await supabase
        .from("processos_seletivos")
        .select(`
          *,
          cargo:cargos(nome, nome_completo_cargo)
        `)
        .eq("empresa_id", currentEmpresa.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentEmpresa,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Primeiro deletar todas as entrevistas do processo
      const { error: entrevistasError } = await supabase
        .from("entrevistas")
        .delete()
        .eq("processo_seletivo_id", id);

      if (entrevistasError) throw entrevistasError;

      // Depois deletar o processo
      const { error } = await supabase
        .from("processos_seletivos")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processos-seletivos"] });
      toast.success("Processo seletivo excluído com sucesso");
      setProcessoToDelete(null);
    },
    onError: () => {
      toast.error("Erro ao excluir processo seletivo");
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("processos_seletivos")
        .update({ 
          data_final: new Date().toISOString().split("T")[0],
          status: "concluido"
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processos-seletivos"] });
      toast.success("Processo seletivo finalizado com sucesso");
      setProcessoToFinalize(null);
    },
    onError: () => {
      toast.error("Erro ao finalizar processo seletivo");
    },
  });

  const reabrirMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("processos_seletivos")
        .update({ 
          data_final: null,
          status: "em_andamento"
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processos-seletivos"] });
      toast.success("Processo reaberto com sucesso");
    },
    onError: () => {
      toast.error("Erro ao reabrir processo");
    },
  });

  const filteredProcessos = processos?.filter((processo) => {
    const matchesSearch = 
      (processo.cargo?.nome || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (processo.solicitante || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (processo.tipo || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "todos" ||
      (statusFilter === "andamento" && processo.status === "em_andamento") ||
      (statusFilter === "concluido" && processo.status === "concluido") ||
      (statusFilter === "cancelado" && processo.status === "cancelado");
    return matchesSearch && matchesStatus;
  });

  const handleEdit = (processo: any) => {
    setSelectedProcesso(processo);
    setIsModalOpen(true);
  };

  const handleNew = () => {
    setSelectedProcesso(null);
    setIsModalOpen(true);
  };

  if (!currentEmpresa) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">
          Selecione uma empresa para visualizar os processos seletivos.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Processos Seletivos</h1>
          <p className="text-muted-foreground">
            Gerencie os processos seletivos da empresa
          </p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Processo Seletivo
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex gap-4 mb-6">
          <Input
            placeholder="Buscar por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="andamento">Em andamento</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <p>Carregando...</p>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Função</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Turno</TableHead>
                  <TableHead>Vagas</TableHead>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Data Início</TableHead>
                  <TableHead>Data Final</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProcessos && filteredProcessos.length > 0 ? (
                  filteredProcessos.map((processo) => (
                    <TableRow key={processo.id}>
                      <TableCell className="font-medium">
                        {processo.cargo?.nome || "-"}
                      </TableCell>
                      <TableCell>{processo.tipo}</TableCell>
                      <TableCell>{processo.turno_vaga}</TableCell>
                      <TableCell>{processo.quantidade_vagas}</TableCell>
                      <TableCell>{processo.solicitante || "-"}</TableCell>
                      <TableCell>
                        {formatDateForDisplay(processo.data_inicio)}
                      </TableCell>
                      <TableCell>
                        {processo.data_final
                          ? formatDateForDisplay(processo.data_final)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            processo.status === "concluido"
                              ? "bg-green-100 text-green-800"
                              : processo.status === "cancelado"
                              ? "bg-red-100 text-red-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {processo.status === "concluido" 
                            ? "Concluído" 
                            : processo.status === "cancelado" 
                            ? "Cancelado" 
                            : "Em andamento"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/processos-seletivos/${processo.id}`)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(processo)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          {processo.status === "concluido" || processo.status === "cancelado" ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => reabrirMutation.mutate(processo.id)}
                              title="Reabrir Processo"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setProcessoToFinalize(processo.id)}
                              title="Finalizar Processo"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setProcessoToDelete(processo.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-6">
                      Nenhum processo seletivo encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <ProcessoSeletivoModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        processo={selectedProcesso}
        empresaId={currentEmpresa.id}
      />

      <AlertDialog
        open={!!processoToDelete}
        onOpenChange={() => setProcessoToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este processo seletivo? Todas as
              entrevistas vinculadas também serão excluídas. Esta ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => processoToDelete && deleteMutation.mutate(processoToDelete)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!processoToFinalize}
        onOpenChange={() => setProcessoToFinalize(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar processo seletivo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja finalizar este processo seletivo? A data
              final será definida como a data atual.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                processoToFinalize && finalizeMutation.mutate(processoToFinalize)
              }
            >
              Finalizar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
