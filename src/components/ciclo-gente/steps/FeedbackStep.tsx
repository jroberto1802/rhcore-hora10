import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Copy, Send, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { nanoid } from "nanoid";

interface Props {
  participante: any;
  ciclo: any;
  onStepComplete: () => void;
  readOnly?: boolean;
}

// Questões fixas do Registro de Feedback (preenchido pelo gestor)
const QUESTOES_FEEDBACK_GESTOR = [
  {
    grupo: "1. Preparação e Condução do Feedback",
    items: [
      {
        numero: "1.1",
        texto: "O feedback foi realizado em ambiente adequado, com tempo dedicado e foco na conversa?",
        opcoes: [
          { value: "sim", label: "Sim" },
          { value: "parcialmente", label: "Parcialmente" },
          { value: "nao", label: "Não" },
        ],
      },
      {
        numero: "1.2",
        texto: "Houve alinhamento claro entre a autoavaliação do colaborador e a avaliação da liderança?",
        opcoes: [
          { value: "sim_alinhamento", label: "Sim, houve alinhamento" },
          { value: "parcialmente", label: "Parcialmente" },
          { value: "nao_divergencias", label: "Não, houve divergências relevantes" },
        ],
      },
    ],
  },
  {
    grupo: "2. Receptividade do Colaborador",
    items: [
      {
        numero: "2.1",
        texto: "Qual foi a percepção sobre a receptividade do colaborador em relação ao feedback recebido?",
        opcoes: [
          { value: "alta", label: "Alta" },
          { value: "media", label: "Média" },
          { value: "baixa", label: "Baixa" },
        ],
      },
      {
        numero: "2.2",
        texto: "O colaborador demonstrou abertura para ouvir, refletir e dialogar sobre os pontos apresentados?",
        opcoes: [
          { value: "sim", label: "Sim" },
          { value: "parcialmente", label: "Parcialmente" },
          { value: "nao", label: "Não" },
        ],
      },
    ],
  },
  {
    grupo: "3. Clareza de Expectativas e Direcionamento",
    items: [
      {
        numero: "3.1",
        texto: "As expectativas de desempenho, comportamentos e entregas ficaram claras após o feedback?",
        opcoes: [
          { value: "sim", label: "Sim" },
          { value: "parcialmente", label: "Parcialmente" },
          { value: "nao", label: "Não" },
        ],
      },
    ],
  },
  {
    grupo: "4. Engajamento Pós-Feedback",
    items: [
      {
        numero: "4.1",
        texto: "Como você avalia o atual grau de engajamento do colaborador com a função após o feedback?",
        opcoes: [
          { value: "alta", label: "Alta" },
          { value: "media", label: "Média" },
          { value: "baixa", label: "Baixa" },
        ],
      },
      {
        numero: "4.2",
        texto: "Como você avalia o atual grau de engajamento do colaborador com a Revenda após o feedback?",
        opcoes: [
          { value: "alta", label: "Alta" },
          { value: "media", label: "Média" },
          { value: "baixa", label: "Baixa" },
        ],
      },
    ],
  },
];

export function FeedbackStep({ participante, ciclo, onStepComplete, readOnly }: Props) {
  const db = supabase as any;
  const queryClient = useQueryClient();

  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [observacoes, setObservacoes] = useState("");

  const { data: feedbackGestor, isLoading: loadingGestor } = useQuery({
    queryKey: ["ciclo_feedback_gestor", participante?.id],
    queryFn: async () => {
      const { data, error } = await db
        .from("ciclo_feedback_gestor")
        .select("*")
        .eq("participante_id", participante.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!participante?.id,
  });

  const { data: feedbackColab, isLoading: loadingColab } = useQuery({
    queryKey: ["ciclo_feedback_colaborador", participante?.id],
    queryFn: async () => {
      const { data, error } = await db
        .from("ciclo_feedback_colaborador")
        .select("*")
        .eq("participante_id", participante.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!participante?.id,
  });

  useEffect(() => {
    if (feedbackGestor) {
      const map: Record<string, string> = {};
      (feedbackGestor.respostas || []).forEach((r: any) => {
        map[r.numero] = r.resposta;
      });
      setRespostas(map);
      setObservacoes(feedbackGestor.observacoes || "");
    }
  }, [feedbackGestor]);

  const saveGestorMutation = useMutation({
    mutationFn: async (concluir: boolean) => {
      const respostasArr = QUESTOES_FEEDBACK_GESTOR.flatMap((g) =>
        g.items.map((item) => ({
          numero: item.numero,
          grupo: g.grupo,
          texto: item.texto,
          resposta: respostas[item.numero] || "",
        }))
      );

      const payload = {
        participante_id: participante.id,
        respostas: respostasArr,
        observacoes,
        concluido: concluir,
        concluido_em: concluir ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      if (feedbackGestor) {
        const { error } = await db
          .from("ciclo_feedback_gestor")
          .update(payload)
          .eq("id", feedbackGestor.id);
        if (error) throw error;
      } else {
        const { error } = await db.from("ciclo_feedback_gestor").insert(payload);
        if (error) throw error;
      }

      // Gerar token para colaborador se não existir
      if (!feedbackColab) {
        const token = nanoid(32);
        const { error } = await db.from("ciclo_feedback_colaborador").insert({
          participante_id: participante.id,
          token,
          token_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });
        if (error) throw error;
      }
    },
    onSuccess: (_, concluir) => {
      queryClient.invalidateQueries({ queryKey: ["ciclo_feedback_gestor", participante.id] });
      queryClient.invalidateQueries({ queryKey: ["ciclo_feedback_colaborador", participante.id] });
      toast.success(concluir ? "Registro de feedback salvo!" : "Rascunho salvo.");
      if (concluir) onStepComplete();
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar."),
  });

  const allAnswered = QUESTOES_FEEDBACK_GESTOR.every((g) =>
    g.items.every((item) => respostas[item.numero])
  );

  const feedbackLink = feedbackColab?.token
    ? `${window.location.origin}/feedback/ciclo/${feedbackColab.token}`
    : null;

  const copyLink = () => {
    if (feedbackLink) {
      navigator.clipboard.writeText(feedbackLink);
      toast.success("Link copiado!");
    }
  };

  const isLoading = loadingGestor || loadingColab;
  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Carregando...</div>;

  const gestorDone = feedbackGestor?.concluido || readOnly;

  return (
    <div className="space-y-6">
      {/* Link do colaborador */}
      {feedbackColab && (
        <Card className={feedbackColab.preenchido ? "border-green-200 bg-green-50" : "border-dashed"}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Send className="h-4 w-4" />
              Link de Feedback para o Colaborador
              {feedbackColab.preenchido && (
                <Badge className="bg-green-100 text-green-700 ml-auto">Preenchido</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {feedbackColab.preenchido ? (
              <p className="text-sm text-green-600">
                O colaborador já preencheu o formulário de feedback.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Envie este link para o colaborador preencher após a reunião de feedback:
                </p>
                <div className="flex gap-2">
                  <code className="flex-1 bg-muted rounded px-3 py-1.5 text-xs break-all">
                    {feedbackLink}
                  </code>
                  <Button variant="outline" size="icon" onClick={copyLink}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Registro de Feedback do Gestor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-5 w-5" />
            Registro de Feedback — Liderança
            {gestorDone && <CheckCircle2 className="h-5 w-5 text-green-500 ml-auto" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {QUESTOES_FEEDBACK_GESTOR.map((grupo) => (
              <div key={grupo.grupo}>
                <h4 className="font-semibold text-sm mb-3">{grupo.grupo}</h4>
                <div className="space-y-4">
                  {grupo.items.map((item) => (
                    <div key={item.numero} className="pl-4 border-l-2 border-muted">
                      <p className="text-sm mb-2">
                        <span className="font-medium text-muted-foreground">{item.numero}</span>{" "}
                        {item.texto}
                      </p>
                      {gestorDone ? (
                        <Badge variant="outline">
                          {item.opcoes.find((o) => o.value === (feedbackGestor?.respostas?.find((r: any) => r.numero === item.numero)?.resposta))?.label || "—"}
                        </Badge>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {item.opcoes.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() =>
                                setRespostas((prev) => ({ ...prev, [item.numero]: opt.value }))
                              }
                              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                respostas[item.numero] === opt.value
                                  ? "bg-primary text-primary-foreground border-transparent"
                                  : "border-border hover:border-primary/50 text-muted-foreground"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div>
              <Label className="text-sm font-medium">
                5. Observações gerais sobre a conversa de feedback
              </Label>
              <Textarea
                className="mt-2"
                rows={3}
                placeholder="Postura, entendimento, pontos de atenção ou acordos realizados..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                disabled={gestorDone}
              />
            </div>
          </div>

          {!gestorDone && (
            <>
              <Separator className="my-4" />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => saveGestorMutation.mutate(false)}
                  disabled={saveGestorMutation.isPending}
                >
                  Salvar rascunho
                </Button>
                <Button
                  onClick={() => saveGestorMutation.mutate(true)}
                  disabled={!allAnswered || saveGestorMutation.isPending}
                >
                  Concluir Feedback
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
