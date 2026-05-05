import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Plus, X, Info } from "lucide-react";
import { toast } from "sonner";

interface Props {
  participante: any;
  ciclo: any;
  avaliacaoGestor: any;
  onStepComplete: () => void;
  readOnly?: boolean;
}

const CLASSIFICACOES = [
  {
    value: "desligar",
    label: "Desligar",
    color: "bg-red-500 text-white",
    border: "border-red-500",
    desc: "Desligamento involuntário",
  },
  {
    value: "recuperar",
    label: "Recuperar",
    color: "bg-yellow-400 text-white",
    border: "border-yellow-400",
    desc: "Sem performance e/ou comportamento esperado — Plano de Reversão",
  },
  {
    value: "bom",
    label: "Bom",
    color: "bg-blue-500 text-white",
    border: "border-blue-500",
    desc: "Demonstra boa performance com oportunidade de melhoria — PDI",
  },
  {
    value: "muito_bom",
    label: "Muito Bom",
    color: "bg-sky-400 text-white",
    border: "border-sky-400",
    desc: "Demonstra boa performance e bom resultado — PDI",
  },
  {
    value: "preparar",
    label: "Preparar",
    color: "bg-green-500 text-white",
    border: "border-green-500",
    desc: "Pronto para assumir novo cargo, desafios ou responsabilidades — PDI",
  },
];

const ESCALA_LABELS: Record<string, string> = {
  acima_esperado: "Acima do esperado",
  atende_plenamente: "Atende plenamente",
  atende_melhoria: "Atende com oportunidade de melhoria",
  abaixo_esperado: "Abaixo do esperado",
  muito_abaixo: "Muito abaixo do esperado",
};

export function ReuniaoGenteStep({ participante, ciclo, avaliacaoGestor, onStepComplete, readOnly }: Props) {
  const db = supabase as any;
  const queryClient = useQueryClient();

  const [classificacaoSugerida, setClassificacaoSugerida] = useState("");
  const [classificacaoFinal, setClassificacaoFinal] = useState("");
  const [participantesNomes, setParticipantesNomes] = useState<string[]>([""]);
  const [comentarios, setComentarios] = useState("");

  const { data: reuniao, isLoading } = useQuery({
    queryKey: ["ciclo_reuniao", participante?.id],
    queryFn: async () => {
      const { data, error } = await db
        .from("ciclo_reuniao_gente")
        .select("*")
        .eq("participante_id", participante.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!participante?.id,
  });

  useEffect(() => {
    if (reuniao) {
      setClassificacaoSugerida(reuniao.classificacao_sugerida || "");
      setClassificacaoFinal(reuniao.classificacao_final || "");
      setParticipantesNomes(reuniao.participantes_nomes?.length ? reuniao.participantes_nomes : [""]);
      setComentarios(reuniao.comentarios || "");
    }
  }, [reuniao]);

  const mutation = useMutation({
    mutationFn: async (concluir: boolean) => {
      const payload = {
        participante_id: participante.id,
        classificacao_anterior: participante.classificacao || null,
        classificacao_sugerida: classificacaoSugerida || null,
        classificacao_final: classificacaoFinal || null,
        participantes_nomes: participantesNomes.filter((n) => n.trim()),
        comentarios,
        concluido: concluir,
        concluido_em: concluir ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      if (reuniao) {
        const { error } = await db
          .from("ciclo_reuniao_gente")
          .update(payload)
          .eq("id", reuniao.id);
        if (error) throw error;
      } else {
        const { error } = await db.from("ciclo_reuniao_gente").insert(payload);
        if (error) throw error;
      }

      if (concluir && classificacaoFinal) {
        const { error } = await db
          .from("ciclo_gente_participantes")
          .update({
            classificacao: classificacaoFinal,
            updated_at: new Date().toISOString(),
          })
          .eq("id", participante.id);
        if (error) throw error;
      }
    },
    onSuccess: (_, concluir) => {
      queryClient.invalidateQueries({ queryKey: ["ciclo_reuniao", participante.id] });
      queryClient.invalidateQueries({ queryKey: ["ciclo_participante", participante.id] });
      toast.success(concluir ? "Reunião de Gente concluída!" : "Rascunho salvo.");
      if (concluir) onStepComplete();
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar."),
  });

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Carregando...</div>;

  const isDone = reuniao?.concluido || readOnly;

  // Summary of avaliação scores
  const respostas = avaliacaoGestor?.respostas || [];
  const escalas = respostas.filter((r: any) => r.tipo_resposta === "escala");
  const escalaGroups = escalas.reduce((acc: any, r: any) => {
    if (!acc[r.grupo_nome]) acc[r.grupo_nome] = [];
    acc[r.grupo_nome].push(r);
    return acc;
  }, {});

  if (isDone) {
    const cl = CLASSIFICACOES.find((c) => c.value === reuniao?.classificacao_final);
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-green-600 font-medium">
          <CheckCircle2 className="h-5 w-5" />
          Reunião de Gente concluída
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Classificação sugerida</p>
            <p className="font-medium">
              {CLASSIFICACOES.find((c) => c.value === reuniao?.classificacao_sugerida)?.label || "—"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Classificação final</p>
            {cl && <Badge className={cl.color}>{cl.label}</Badge>}
          </div>
        </div>
        {reuniao?.participantes_nomes?.length > 0 && (
          <div>
            <p className="text-sm text-muted-foreground">Participantes da reunião</p>
            <p>{reuniao.participantes_nomes.join(", ")}</p>
          </div>
        )}
        {reuniao?.comentarios && (
          <div>
            <p className="text-sm text-muted-foreground">Comentários</p>
            <p className="text-sm">{reuniao.comentarios}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumo da avaliação */}
      {escalas.length > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Resumo da Avaliação de Desempenho</span>
            </div>
            <div className="space-y-2">
              {Object.entries(escalaGroups).map(([grupo, qs]: any) => (
                <div key={grupo} className="text-sm">
                  <span className="font-medium">{grupo}:</span>{" "}
                  {qs.map((r: any, i: number) => (
                    <span key={i} className="text-muted-foreground">
                      {r.item_numero}: {ESCALA_LABELS[r.resposta] || r.resposta}
                      {i < qs.length - 1 ? " | " : ""}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Árvore de decisão info */}
      <Card className="border-dashed">
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">
            <strong>Árvore de Decisão:</strong> Analise os resultados da avaliação de desempenho e a
            compatibilidade cultural do colaborador para definir a classificação. Consulte a planilha
            de Árvore de Decisão para orientação.
          </p>
        </CardContent>
      </Card>

      {/* Classificação sugerida */}
      <div>
        <Label className="text-sm font-medium">Classificação sugerida</Label>
        <div className="grid grid-cols-5 gap-2 mt-2">
          {CLASSIFICACOES.map((cl) => (
            <button
              key={cl.value}
              type="button"
              onClick={() => setClassificacaoSugerida(cl.value)}
              className={`p-2 rounded-lg border-2 text-xs font-medium text-center transition-all ${
                classificacaoSugerida === cl.value
                  ? `${cl.color} ${cl.border}`
                  : "border-border hover:border-primary/50"
              }`}
            >
              {cl.label}
            </button>
          ))}
        </div>
      </div>

      {/* Classificação final */}
      <div>
        <Label className="text-sm font-medium">Classificação final (após debate)</Label>
        <div className="grid grid-cols-5 gap-2 mt-2">
          {CLASSIFICACOES.map((cl) => (
            <button
              key={cl.value}
              type="button"
              onClick={() => setClassificacaoFinal(cl.value)}
              className={`p-3 rounded-lg border-2 text-center transition-all ${
                classificacaoFinal === cl.value
                  ? `${cl.color} ${cl.border}`
                  : "border-border hover:border-primary/50"
              }`}
            >
              <p className="text-xs font-bold">{cl.label}</p>
              <p className="text-xs opacity-75 mt-1 leading-tight">{cl.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Participantes da reunião */}
      <div>
        <Label className="text-sm font-medium">Participantes da reunião de gente</Label>
        <div className="space-y-2 mt-2">
          {participantesNomes.map((nome, idx) => (
            <div key={idx} className="flex gap-2">
              <Input
                value={nome}
                onChange={(e) => {
                  const next = [...participantesNomes];
                  next[idx] = e.target.value;
                  setParticipantesNomes(next);
                }}
                placeholder={`Participante ${idx + 1}`}
              />
              {participantesNomes.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setParticipantesNomes(participantesNomes.filter((_, i) => i !== idx))
                  }
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setParticipantesNomes([...participantesNomes, ""])}
          >
            <Plus className="h-4 w-4 mr-1" /> Adicionar participante
          </Button>
        </div>
      </div>

      {/* Comentários */}
      <div>
        <Label className="text-sm font-medium">Comentários da reunião</Label>
        <Textarea
          className="mt-2"
          rows={4}
          placeholder="Registre as observações, alinhamentos e decisões da reunião de gente..."
          value={comentarios}
          onChange={(e) => setComentarios(e.target.value)}
        />
      </div>

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
          disabled={!classificacaoFinal || mutation.isPending}
        >
          Concluir Reunião de Gente
        </Button>
      </div>
    </div>
  );
}
