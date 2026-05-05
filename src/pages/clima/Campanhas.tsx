import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, MoreHorizontal, Eye, Pencil, Copy, XCircle, Search, Wind,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { NovaCampanhaModal } from "@/components/clima/NovaCampanhaModal";

interface Props {
  currentEmpresa: any;
  isGroupView: boolean;
  currentGroupId: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  rascunho: { label: "Rascunho", className: "bg-gray-100 text-gray-700 border-gray-200" },
  ativa: { label: "Ativa", className: "bg-green-100 text-green-700 border-green-200" },
  encerrada: { label: "Encerrada", className: "bg-blue-100 text-blue-700 border-blue-200" },
};

export function Campanhas({ currentEmpresa, isGroupView, currentGroupId }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [anoFilter, setAnoFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [editCampanha, setEditCampanha] = useState<any>(null);
  const [encerrarId, setEncerrarId] = useState<string | null>(null);

  const db = supabase as any;

  const { data: campanhas = [], isLoading } = useQuery({
    queryKey: ["clima_campanhas", currentEmpresa?.id],
    queryFn: async () => {
      if (!currentEmpresa) return [];
      const { data, error } = await db
        .from("clima_campanhas")
        .select("*")
        .eq("empresa_id", currentEmpresa.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentEmpresa,
  });

  const { data: participacaoStats = {} } = useQuery({
    queryKey: ["clima_participacao_stats", currentEmpresa?.id],
    queryFn: async () => {
      if (!currentEmpresa || campanhas.length === 0) return {};
      const stats: Record<string, { total: number; respondidos: number }> = {};
      for (const c of campanhas) {
        const { data } = await db
          .from("clima_participantes")
          .select("status")
          .eq("campanha_id", c.id);
        const total = data?.length || 0;
        const respondidos = data?.filter((p: any) => p.status === "respondido").length || 0;
        stats[c.id] = { total, respondidos };
      }
      return stats;
    },
    enabled: !!currentEmpresa && campanhas.length > 0,
  });

  const encerrarMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from("clima_campanhas")
        .update({ status: "encerrada", updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clima_campanhas"] });
      toast.success("Campanha encerrada com sucesso");
      setEncerrarId(null);
    },
    onError: () => toast.error("Erro ao encerrar campanha"),
  });

  const duplicarMutation = useMutation({
    mutationFn: async (campanha: any) => {
      const { error } = await db.from("clima_campanhas").insert({
        empresa_id: campanha.empresa_id,
        nome: `${campanha.nome} (cópia)`,
        ano: campanha.ano,
        tipo: campanha.tipo,
        publico_alvo: campanha.publico_alvo,
        token_expiracao_horas: campanha.token_expiracao_horas,
        status: "rascunho",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clima_campanhas"] });
      toast.success("Campanha duplicada");
    },
    onError: () => toast.error("Erro ao duplicar campanha"),
  });

  const anos = [...new Set(campanhas.map((c: any) => String(c.ano)))].sort().reverse();

  const filtered = campanhas.filter((c: any) => {
    const matchSearch = c.nome.toLowerCase().includes(search.toLowerCase());
    const matchAno = anoFilter === "todos" || String(c.ano) === anoFilter;
    const matchStatus = statusFilter === "todos" || c.status === statusFilter;
    return matchSearch && matchAno && matchStatus;
  });

  const formatPeriodo = (inicio: string | null, fim: string | null) => {
    if (!inicio && !fim) return "—";
    const fmt = (d: string) => format(new Date(d + "T12:00:00"), "dd/MM/yy", { locale: ptBR });
    if (inicio && fim) return `${fmt(inicio)} – ${fmt(fim)}`;
    if (inicio) return `A partir de ${fmt(inicio)}`;
    return `Até ${fmt(fim!)}`;
  };

  const getParticipacao = (campanhaId: string) => {
    const stats = participacaoStats[campanhaId];
    if (!stats || stats.total === 0) return null;
    return {
      pct: Math.round((stats.respondidos / stats.total) * 100),
      total: stats.total,
      respondidos: stats.respondidos,
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Wind className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Campanhas de Clima Organizacional</h1>
            <p className="text-muted-foreground text-sm">Gerencie suas pesquisas de clima</p>
          </div>
        </div>
        <Button onClick={() => { setEditCampanha(null); setModalOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Pesquisa
        </Button>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar campanha..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={anoFilter} onValueChange={setAnoFilter}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os anos</SelectItem>
              {anos.map((ano) => (
                <SelectItem key={ano} value={ano}>{ano}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="rascunho">Rascunho</SelectItem>
              <SelectItem value="ativa">Ativa</SelectItem>
              <SelectItem value="encerrada">Encerrada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Tabela */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
            <Wind className="h-10 w-10 opacity-30" />
            <p className="font-medium">
              {campanhas.length === 0 ? "Nenhuma campanha criada ainda" : "Nenhuma campanha encontrada"}
            </p>
            {campanhas.length === 0 && (
              <Button variant="outline" onClick={() => setModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar primeira pesquisa
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Nome</TableHead>
                <TableHead>Ano</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Participação</TableHead>
                <TableHead className="text-center">Respostas</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((campanha: any) => {
                const part = getParticipacao(campanha.id);
                const cfg = STATUS_CONFIG[campanha.status] || STATUS_CONFIG.rascunho;
                return (
                  <TableRow
                    key={campanha.id}
                    className="cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => navigate(`/clima/pesquisas/${campanha.id}`)}
                  >
                    <TableCell className="font-medium">{campanha.nome}</TableCell>
                    <TableCell>{campanha.ano}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatPeriodo(campanha.periodo_inicio, campanha.periodo_fim)}
                    </TableCell>
                    <TableCell className="text-sm capitalize">
                      {campanha.tipo === "anonima" ? "Anônima" : "Identificada"}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.className}`}>
                        {cfg.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {part ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="font-semibold text-sm">{part.pct}%</span>
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${part.pct}%` }}
                            />
                          </div>
                        </div>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {part ? `${part.respondidos}/${part.total}` : "—"}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/clima/pesquisas/${campanha.id}`)}>
                            <Eye className="h-4 w-4 mr-2" /> Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setEditCampanha(campanha); setModalOpen(true); }}>
                            <Pencil className="h-4 w-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => duplicarMutation.mutate(campanha)}>
                            <Copy className="h-4 w-4 mr-2" /> Duplicar
                          </DropdownMenuItem>
                          {campanha.status !== "encerrada" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setEncerrarId(campanha.id)}
                              >
                                <XCircle className="h-4 w-4 mr-2" /> Encerrar
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <NovaCampanhaModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        currentEmpresa={currentEmpresa}
        editData={editCampanha}
      />

      <AlertDialog open={!!encerrarId} onOpenChange={() => setEncerrarId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar campanha?</AlertDialogTitle>
            <AlertDialogDescription>
              A campanha será encerrada e não aceitará mais respostas. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => encerrarId && encerrarMutation.mutate(encerrarId)}
            >
              Encerrar campanha
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
