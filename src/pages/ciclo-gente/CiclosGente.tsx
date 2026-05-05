import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus, MoreHorizontal, Eye, XCircle, Search, Users2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { NovoCicloModal } from "@/components/ciclo-gente/NovoCicloModal";

interface Props {
  currentEmpresa: any;
  isGroupView: boolean;
  currentGroupId: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  rascunho: { label: "Rascunho", className: "bg-gray-100 text-gray-700 border-gray-200" },
  ativo: { label: "Ativo", className: "bg-green-100 text-green-700 border-green-200" },
  encerrado: { label: "Encerrado", className: "bg-blue-100 text-blue-700 border-blue-200" },
};

const TIPO_CONFIG: Record<string, { label: string; className: string }> = {
  administrativo_operacional: { label: "Adm./Operacional", className: "bg-purple-100 text-purple-700" },
  lideranca: { label: "Lideranças", className: "bg-orange-100 text-orange-700" },
};

export function CiclosGente({ currentEmpresa, isGroupView, currentGroupId }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editCiclo, setEditCiclo] = useState<any>(null);
  const [encerrarId, setEncerrarId] = useState<string | null>(null);

  const db = supabase as any;

  const { data: ciclos = [], isLoading } = useQuery({
    queryKey: ["ciclo_gente", currentEmpresa?.id],
    queryFn: async () => {
      if (!currentEmpresa) return [];
      const { data, error } = await db
        .from("ciclo_gente")
        .select("*")
        .eq("empresa_id", currentEmpresa.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentEmpresa,
  });

  const { data: participantesCounts = {} } = useQuery({
    queryKey: ["ciclo_gente_counts", currentEmpresa?.id, ciclos.length],
    queryFn: async () => {
      if (!currentEmpresa || ciclos.length === 0) return {};
      const counts: Record<string, number> = {};
      for (const c of ciclos) {
        const { count } = await db
          .from("ciclo_gente_participantes")
          .select("id", { count: "exact", head: true })
          .eq("ciclo_id", c.id);
        counts[c.id] = count || 0;
      }
      return counts;
    },
    enabled: !!currentEmpresa && ciclos.length > 0,
  });

  const encerrarMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from("ciclo_gente")
        .update({ status: "encerrado", updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ciclo_gente"] });
      toast.success("Ciclo encerrado com sucesso.");
      setEncerrarId(null);
    },
    onError: () => toast.error("Erro ao encerrar ciclo."),
  });

  const filtered = ciclos.filter((c: any) =>
    c.nome.toLowerCase().includes(search.toLowerCase())
  );

  if (!currentEmpresa && !isGroupView) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Selecione uma empresa para visualizar os ciclos.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Ciclo de Gente</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie os ciclos de avaliação de desempenho e desenvolvimento
          </p>
        </div>
        <Button onClick={() => { setEditCiclo(null); setModalOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Ciclo
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar ciclo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Ano</TableHead>
              <TableHead>Participantes</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Users2 className="h-10 w-10 opacity-30" />
                    <p className="font-medium">Nenhum ciclo encontrado</p>
                    <p className="text-sm">Crie o primeiro ciclo de gente</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((ciclo: any) => {
                const statusConf = STATUS_CONFIG[ciclo.status] || STATUS_CONFIG.rascunho;
                const tipoConf = TIPO_CONFIG[ciclo.tipo] || TIPO_CONFIG.administrativo_operacional;
                return (
                  <TableRow
                    key={ciclo.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/ciclo-gente/${ciclo.id}`)}
                  >
                    <TableCell className="font-medium">{ciclo.nome}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={tipoConf.className}>
                        {tipoConf.label}
                      </Badge>
                    </TableCell>
                    <TableCell>{ciclo.ano}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm">
                        <Users2 className="h-3 w-3" />
                        {participantesCounts[ciclo.id] ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusConf.className}>
                        {statusConf.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(ciclo.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/ciclo-gente/${ciclo.id}`)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver detalhes
                          </DropdownMenuItem>
                          {ciclo.status !== "encerrado" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setEncerrarId(ciclo.id)}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Encerrar ciclo
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

      <NovoCicloModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditCiclo(null); }}
        currentEmpresa={currentEmpresa}
        editData={editCiclo}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["ciclo_gente"] })}
      />

      <AlertDialog open={!!encerrarId} onOpenChange={() => setEncerrarId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar ciclo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja encerrar este ciclo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => encerrarId && encerrarMutation.mutate(encerrarId)}
            >
              Encerrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
