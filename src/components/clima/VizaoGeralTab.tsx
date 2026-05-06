import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle, XCircle, Key, Calendar, Users, Lock, Globe, AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  campanha: any;
  participacaoStats: { total: number; respondidos: number };
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  rascunho: { label: "Rascunho", color: "bg-gray-100 text-gray-700 border-gray-200" },
  ativa: { label: "Ativa", color: "bg-green-100 text-green-700 border-green-200" },
  encerrada: { label: "Encerrada", color: "bg-blue-100 text-blue-700 border-blue-200" },
};

export function VizaoGeralTab({ campanha, participacaoStats }: Props) {
  const queryClient = useQueryClient();
  const db = supabase as any;

  const { data: numPerguntas = 0 } = useQuery({
    queryKey: ["clima_perguntas_count", campanha.id],
    queryFn: async () => {
      const { count } = await db
        .from("clima_perguntas")
        .select("id", { count: "exact", head: true })
        .eq("campanha_id", campanha.id)
        .eq("ativo", true);
      return count || 0;
    },
  });

  const pct = participacaoStats.total > 0
    ? Math.round((participacaoStats.respondidos / participacaoStats.total) * 100)
    : 0;

  const publicarMutation = useMutation({
    mutationFn: async () => {
      const { error } = await db
        .from("clima_campanhas")
        .update({ status: "ativa", updated_at: new Date().toISOString() })
        .eq("id", campanha.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clima_campanha", campanha.id] });
      queryClient.invalidateQueries({ queryKey: ["clima_campanhas"] });
      toast.success("Campanha publicada e ativa!");
    },
    onError: () => toast.error("Erro ao publicar campanha"),
  });

  const encerrarMutation = useMutation({
    mutationFn: async () => {
      const { error } = await db
        .from("clima_campanhas")
        .update({ status: "encerrada", updated_at: new Date().toISOString() })
        .eq("id", campanha.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clima_campanha", campanha.id] });
      queryClient.invalidateQueries({ queryKey: ["clima_campanhas"] });
      toast.success("Campanha encerrada");
    },
    onError: () => toast.error("Erro ao encerrar campanha"),
  });

  const gerarTokensMutation = useMutation({
    mutationFn: async () => {
      const { data: existentes } = await db
        .from("clima_participantes")
        .select("id")
        .eq("campanha_id", campanha.id);

      if (existentes && existentes.length > 0) {
        toast.info("Tokens já gerados para esta campanha. Use a aba Participação.");
        return;
      }
      toast.info("Use a aba Participação para importar colaboradores e gerar tokens individuais.");
    },
    onSuccess: () => {},
  });

  const formatDate = (d: string | null) =>
    d ? format(new Date(d + "T12:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "—";

  const cfg = STATUS_CONFIG[campanha.status] || STATUS_CONFIG.rascunho;

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      {campanha.status === "rascunho" && numPerguntas === 0 && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Nenhuma pergunta configurada</p>
            <p className="text-xs text-red-700 mt-0.5">
              Vá até a aba <strong>Configurações</strong>, crie os pilares e adicione as perguntas antes de publicar. Sem perguntas, os colaboradores verão uma tela em branco.
            </p>
          </div>
        </div>
      )}

      {campanha.status === "rascunho" && numPerguntas > 0 && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">Campanha em rascunho</p>
            <p className="text-xs text-amber-700 mt-0.5">
              {numPerguntas} pergunta{numPerguntas !== 1 ? "s" : ""} configurada{numPerguntas !== 1 ? "s" : ""}. Importe os participantes e publique quando estiver pronto.
            </p>
          </div>
          <Button size="sm" onClick={() => publicarMutation.mutate()} disabled={publicarMutation.isPending}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Publicar campanha
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informações principais */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Detalhes da campanha</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Nome</p>
                  <p className="font-semibold text-lg">{campanha.nome}</p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.color}`}>
                  {cfg.label}
                </span>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Ano</p>
                    <p className="font-medium">{campanha.ano}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    {campanha.tipo === "anonima" ? (
                      <Lock className="h-4 w-4 text-primary" />
                    ) : (
                      <Globe className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tipo</p>
                    <p className="font-medium capitalize">
                      {campanha.tipo === "anonima" ? "Anônima" : "Identificada"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Público-alvo</p>
                    <p className="font-medium capitalize">
                      {campanha.publico_alvo === "todos"
                        ? "Todos os colaboradores"
                        : campanha.publico_alvo === "unidade"
                        ? "Por Unidade"
                        : "Por Setor"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Key className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Expiração do token</p>
                    <p className="font-medium">{campanha.token_expiracao_horas}h</p>
                  </div>
                </div>
              </div>

              {(campanha.periodo_inicio || campanha.periodo_fim) && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Período de coleta</p>
                    <p className="font-medium">
                      {campanha.periodo_inicio && formatDate(campanha.periodo_inicio)}
                      {campanha.periodo_inicio && campanha.periodo_fim && " até "}
                      {campanha.periodo_fim && formatDate(campanha.periodo_fim)}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Progresso da coleta */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Progresso da coleta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-4xl font-bold text-primary">{pct}%</p>
                <p className="text-sm text-muted-foreground mt-1">de participação</p>
              </div>
              <Progress value={pct} className="h-3" />
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">{participacaoStats.respondidos}</p>
                  <p className="text-xs text-muted-foreground">Responderam</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">
                    {participacaoStats.total - participacaoStats.respondidos}
                  </p>
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                </div>
              </div>
              <div className="text-center pt-1">
                <p className="text-sm text-muted-foreground">
                  Total: <span className="font-medium text-foreground">{participacaoStats.total}</span> participantes
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Ações rápidas */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Ações rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {campanha.status === "rascunho" && (
                <Button
                  className="w-full"
                  onClick={() => publicarMutation.mutate()}
                  disabled={publicarMutation.isPending || numPerguntas === 0}
                  title={numPerguntas === 0 ? "Configure as perguntas antes de publicar" : undefined}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Publicar campanha
                </Button>
              )}
              {campanha.status === "ativa" && (
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => encerrarMutation.mutate()}
                  disabled={encerrarMutation.isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Encerrar campanha
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => gerarTokensMutation.mutate()}
              >
                <Key className="h-4 w-4 mr-2" />
                Gerar tokens
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
