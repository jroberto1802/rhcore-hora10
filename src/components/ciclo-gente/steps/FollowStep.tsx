import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, Calendar, User, Layers } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  participante: any;
  ciclo: any;
  pdi: any;
  onStepComplete: () => void;
  readOnly?: boolean;
}

const STATUS_ACAO = [
  { value: "nao_iniciada", label: "Não iniciada", className: "bg-gray-100 text-gray-700" },
  { value: "em_andamento", label: "Em andamento", className: "bg-blue-100 text-blue-700" },
  { value: "concluida", label: "Concluída", className: "bg-green-100 text-green-700" },
  { value: "cancelada", label: "Cancelada", className: "bg-red-100 text-red-700" },
];

export function FollowStep({ participante, ciclo, pdi, onStepComplete, readOnly }: Props) {
  const db = supabase as any;
  const queryClient = useQueryClient();

  const [followAtivo, setFollowAtivo] = useState<1 | 2>(1);
  const [statusAcoes, setStatusAcoes] = useState<Record<number, string>>({});
  const [comentariosAcoes, setComentariosAcoes] = useState<Record<number, string>>({});
  const [comentarios, setComentarios] = useState("");

  const { data: follows = [], isLoading } = useQuery({
    queryKey: ["ciclo_follow", participante?.id],
    queryFn: async () => {
      const { data, error } = await db
        .from("ciclo_follow")
        .select("*")
        .eq("participante_id", participante.id)
        .order("numero");
      if (error) throw error;
      return data || [];
    },
    enabled: !!participante?.id,
  });

  const follow1 = follows.find((f: any) => f.numero === 1);
  const follow2 = follows.find((f: any) => f.numero === 2);
  const followCurrent = followAtivo === 1 ? follow1 : follow2;

  useEffect(() => {
    if (followCurrent) {
      const statusMap: Record<number, string> = {};
      const comentMap: Record<number, string> = {};
      (followCurrent.status_acoes || []).forEach((s: any) => {
        statusMap[s.acao_index] = s.status;
        comentMap[s.acao_index] = s.comentario || "";
      });
      setStatusAcoes(statusMap);
      setComentariosAcoes(comentMap);
      setComentarios(followCurrent.comentarios || "");
    } else {
      setStatusAcoes({});
      setComentariosAcoes({});
      setComentarios("");
    }
  }, [followCurrent, followAtivo]);

  const acoes: any[] = pdi?.acoes || [];

  const mutation = useMutation({
    mutationFn: async (concluir: boolean) => {
      const statusAcoesArr = acoes.map((_, idx) => ({
        acao_index: idx,
        status: statusAcoes[idx] || "nao_iniciada",
        comentario: comentariosAcoes[idx] || "",
      }));

      const payload = {
        participante_id: participante.id,
        numero: followAtivo,
        status_acoes: statusAcoesArr,
        comentarios,
        concluido: concluir,
        concluido_em: concluir ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      if (followCurrent) {
        const { error } = await db
          .from("ciclo_follow")
          .update(payload)
          .eq("id", followCurrent.id);
        if (error) throw error;
      } else {
        const { error } = await db.from("ciclo_follow").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_, concluir) => {
      queryClient.invalidateQueries({ queryKey: ["ciclo_follow", participante.id] });
      toast.success(concluir ? `${followAtivo}º Follow concluído!` : "Rascunho salvo.");
      if (concluir && followAtivo === 2) onStepComplete();
      if (concluir && followAtivo === 1) setFollowAtivo(2);
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar."),
  });

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Carregando...</div>;

  const isDone = followCurrent?.concluido || readOnly;
  const follow1Done = follow1?.concluido;

  return (
    <div className="space-y-6">
      {/* Seletor de Follow */}
      <div className="flex gap-3">
        {[1, 2].map((num) => {
          const fw = num === 1 ? follow1 : follow2;
          const isDisabled = num === 2 && !follow1Done;
          return (
            <button
              key={num}
              onClick={() => !isDisabled && setFollowAtivo(num as 1 | 2)}
              disabled={isDisabled}
              className={`flex-1 p-3 rounded-lg border-2 text-center transition-all ${
                isDisabled
                  ? "opacity-40 cursor-not-allowed border-border"
                  : followAtivo === num
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <p className="font-semibold text-sm">{num}º Follow</p>
              {fw?.concluido ? (
                <div className="flex items-center justify-center gap-1 mt-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-green-600">Concluído</span>
                </div>
              ) : fw ? (
                <span className="text-xs text-muted-foreground">Em andamento</span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {isDisabled ? "Aguardando 1º follow" : "Não iniciado"}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Ações */}
      {acoes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhuma ação encontrada no PDI/Plano de Reversão.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {acoes.map((acao: any, idx: number) => {
            const statusAtual = isDone
              ? followCurrent?.status_acoes?.find((s: any) => s.acao_index === idx)?.status || "nao_iniciada"
              : statusAcoes[idx] || "";
            const statusConf = STATUS_ACAO.find((s) => s.value === statusAtual);

            return (
              <Card key={idx}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-sm">{acao.competencia}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{acao.motivo} — {acao.tipo_acao}</p>
                    </div>
                    {isDone && statusConf && (
                      <Badge variant="outline" className={statusConf.className}>
                        {statusConf.label}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground">
                    {acao.porque && (
                      <div>
                        <p className="font-medium text-foreground">Por quê</p>
                        <p>{acao.porque}</p>
                      </div>
                    )}
                    {acao.quem_ajuda && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{acao.quem_ajuda}</span>
                      </div>
                    )}
                    {(acao.data_inicio || acao.data_fim) && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {acao.data_inicio && format(new Date(acao.data_inicio), "dd/MM/yy", { locale: ptBR })}
                          {acao.data_fim && ` até ${format(new Date(acao.data_fim), "dd/MM/yy", { locale: ptBR })}`}
                        </span>
                      </div>
                    )}
                  </div>

                  {!isDone && (
                    <div className="space-y-2 pt-1">
                      <div>
                        <Label className="text-xs">Status da ação</Label>
                        <Select
                          value={statusAcoes[idx] || ""}
                          onValueChange={(v) =>
                            setStatusAcoes((prev) => ({ ...prev, [idx]: v }))
                          }
                        >
                          <SelectTrigger className="mt-1 h-8 text-sm">
                            <SelectValue placeholder="Selecione o status" />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_ACAO.map((s) => (
                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Comentário sobre esta ação</Label>
                        <Textarea
                          value={comentariosAcoes[idx] || ""}
                          onChange={(e) =>
                            setComentariosAcoes((prev) => ({ ...prev, [idx]: e.target.value }))
                          }
                          rows={2}
                          placeholder="Descreva o andamento, resultados ou pendências..."
                          className="mt-1 text-sm"
                        />
                      </div>
                    </div>
                  )}

                  {isDone && followCurrent?.status_acoes?.find((s: any) => s.acao_index === idx)?.comentario && (
                    <p className="text-xs text-muted-foreground italic">
                      "{followCurrent.status_acoes.find((s: any) => s.acao_index === idx).comentario}"
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Comentários gerais */}
      <div>
        <Label className="text-sm font-medium">Comentários gerais do {followAtivo}º Follow</Label>
        <Textarea
          value={comentarios}
          onChange={(e) => setComentarios(e.target.value)}
          rows={3}
          disabled={isDone}
          placeholder="Observações gerais sobre o andamento do plano..."
          className="mt-2"
        />
      </div>

      {!isDone && !readOnly && (
        <>
          <Separator />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => mutation.mutate(false)}
              disabled={mutation.isPending}
            >
              Salvar rascunho
            </Button>
            <Button
              onClick={() => mutation.mutate(true)}
              disabled={acoes.some((_, idx) => !statusAcoes[idx]) || mutation.isPending}
            >
              Concluir {followAtivo}º Follow
              {followAtivo === 2 && " (Finalizar ciclo)"}
            </Button>
          </div>
        </>
      )}

      {follow2?.concluido && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-green-50 border border-green-200">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <div>
            <p className="font-medium text-green-700">Ciclo concluído!</p>
            <p className="text-sm text-green-600">Ambos os follows foram realizados.</p>
          </div>
        </div>
      )}
    </div>
  );
}
