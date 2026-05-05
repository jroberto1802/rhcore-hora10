import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Plus, MoreHorizontal, Eye, Trash2, Users2, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { AdicionarParticipanteModal } from "@/components/ciclo-gente/AdicionarParticipanteModal";

interface Props {
  currentEmpresa: any;
  isGroupView?: boolean;
  currentGroupId?: string | null;
}

const ETAPA_CONFIG: Record<string, { label: string; className: string }> = {
  avaliacao_desempenho: { label: "Avaliação", className: "bg-blue-100 text-blue-700" },
  reuniao_gente: { label: "Reunião de Gente", className: "bg-purple-100 text-purple-700" },
  feedback: { label: "Feedback", className: "bg-yellow-100 text-yellow-700" },
  pdi: { label: "PDI / Plano", className: "bg-orange-100 text-orange-700" },
  follow: { label: "Follow", className: "bg-cyan-100 text-cyan-700" },
  concluido: { label: "Concluído", className: "bg-green-100 text-green-700" },
};

const CLASSIF_CONFIG: Record<string, { label: string; className: string }> = {
  desligar: { label: "Desligar", className: "bg-red-100 text-red-700" },
  recuperar: { label: "Recuperar", className: "bg-yellow-100 text-yellow-700" },
  bom: { label: "Bom", className: "bg-blue-100 text-blue-700" },
  muito_bom: { label: "Muito Bom", className: "bg-sky-100 text-sky-700" },
  preparar: { label: "Preparar", className: "bg-green-100 text-green-700" },
};

export function CicloDetalhes({ currentEmpresa }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);

  const db = supabase as any;

  const { data: ciclo, isLoading: loadingCiclo } = useQuery({
    queryKey: ["ciclo_gente_single", id],
    queryFn: async () => {
      const { data, error } = await db
        .from("ciclo_gente")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: participantes = [], isLoading: loadingPart } = useQuery({
    queryKey: ["ciclo_participantes", id],
    queryFn: async () => {
      const { data, error } = await db
        .from("ciclo_gente_participantes")
        .select(`
          *,
          funcionario:funcionarios!ciclo_gente_participantes_funcionario_id_fkey(id, nome_completo, cargo_atual),
          gestor:funcionarios!ciclo_gente_participantes_gestor_id_fkey(id, nome_completo)
        `)
        .eq("ciclo_id", id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const ativarMutation = useMutation({
    mutationFn: async () => {
      const { error } = await db
        .from("ciclo_gente")
        .update({ status: "ativo", updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ciclo_gente_single", id] });
      queryClient.invalidateQueries({ queryKey: ["ciclo_gente"] });
      toast.success("Ciclo ativado.");
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (participanteId: string) => {
      const { error } = await db
        .from("ciclo_gente_participantes")
        .delete()
        .eq("id", participanteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ciclo_participantes", id] });
      toast.success("Participante removido.");
      setRemoveId(null);
    },
    onError: () => toast.error("Erro ao remover participante."),
  });

  const isLoading = loadingCiclo || loadingPart;
  const existingIds = participantes.map((p: any) => p.funcionario_id);

  const TIPO_LABEL: Record<string, string> = {
    administrativo_operacional: "Administrativo/Operacional",
    lideranca: "Lideranças",
  };

  const STATUS_CLS: Record<string, string> = {
    rascunho: "bg-gray-100 text-gray-700",
    ativo: "bg-green-100 text-green-700",
    encerrado: "bg-blue-100 text-blue-700",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!ciclo) return null;

  const concluidos = participantes.filter((p: any) => p.etapa_atual === "concluido").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/ciclo-gente")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold">{ciclo.nome}</h1>
            <Badge variant="outline" className={STATUS_CLS[ciclo.status]}>
              {ciclo.status === "rascunho" ? "Rascunho" : ciclo.status === "ativo" ? "Ativo" : "Encerrado"}
            </Badge>
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
            <span>{TIPO_LABEL[ciclo.tipo]}</span>
            <span>•</span>
            <span>{ciclo.ano}</span>
            {ciclo.descricao && (
              <>
                <span>•</span>
                <span>{ciclo.descricao}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {ciclo.status === "rascunho" && (
            <Button onClick={() => ativarMutation.mutate()} disabled={ativarMutation.isPending}>
              Ativar Ciclo
            </Button>
          )}
          {ciclo.status !== "encerrado" && (
            <Button onClick={() => setAddModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Participante
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold">{participantes.length}</p>
            <p className="text-sm text-muted-foreground mt-1">Participantes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-green-600">{concluidos}</p>
            <p className="text-sm text-muted-foreground mt-1">Concluídos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-blue-600">
              {participantes.length > 0
                ? Math.round((concluidos / participantes.length) * 100)
                : 0}%
            </p>
            <p className="text-sm text-muted-foreground mt-1">Progresso</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-red-600">
              {participantes.filter((p: any) => p.classificacao === "desligar").length}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Desligar</p>
          </CardContent>
        </Card>
      </div>

      {/* Participants Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Participantes</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Colaborador</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Gestor</TableHead>
              <TableHead>Etapa atual</TableHead>
              <TableHead>Classificação</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {participantes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Users2 className="h-10 w-10 opacity-30" />
                    <p>Nenhum participante adicionado</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              participantes.map((p: any) => {
                const etapa = ETAPA_CONFIG[p.etapa_atual] || ETAPA_CONFIG.avaliacao_desempenho;
                const classif = p.classificacao ? CLASSIF_CONFIG[p.classificacao] : null;
                return (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/ciclo-gente/${id}/participante/${p.id}`)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {p.etapa_atual === "concluido" && (
                          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        )}
                        {p.funcionario?.nome_completo || "—"}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.funcionario?.cargo_atual || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.gestor?.nome_completo || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={etapa.className}>
                        {etapa.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {classif ? (
                        <Badge variant="outline" className={classif.className}>
                          {classif.label}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => navigate(`/ciclo-gente/${id}/participante/${p.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver fluxo
                          </DropdownMenuItem>
                          {ciclo.status !== "encerrado" && p.etapa_atual === "avaliacao_desempenho" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setRemoveId(p.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remover
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <AdicionarParticipanteModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        cicloId={id!}
        empresaId={currentEmpresa?.id || ciclo.empresa_id}
        existingFuncionarioIds={existingIds}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["ciclo_participantes", id] })}
      />

      <AlertDialog open={!!removeId} onOpenChange={() => setRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover participante</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este participante do ciclo?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => removeId && removeMutation.mutate(removeId)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
