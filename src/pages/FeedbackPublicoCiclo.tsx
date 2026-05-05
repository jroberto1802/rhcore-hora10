import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckCircle2, Heart } from "lucide-react";
import { toast } from "sonner";
import rhcoreLogo from "@/assets/rhcore-logo.png";

// Questões do colaborador no feedback
const QUESTOES_COLABORADOR = [
  {
    grupo: "1. Experiência no Feedback",
    items: [
      {
        numero: "1.1",
        texto: "A conversa de feedback foi realizada em um ambiente adequado e com atenção dedicada?",
        opcoes: [
          { value: "sim", label: "Sim" },
          { value: "parcialmente", label: "Parcialmente" },
          { value: "nao", label: "Não" },
        ],
      },
      {
        numero: "1.2",
        texto: "Você se sentiu à vontade para expressar sua opinião durante o feedback?",
        opcoes: [
          { value: "sim", label: "Sim" },
          { value: "parcialmente", label: "Parcialmente" },
          { value: "nao", label: "Não" },
        ],
      },
    ],
  },
  {
    grupo: "2. Clareza e Direcionamento",
    items: [
      {
        numero: "2.1",
        texto: "As expectativas e os pontos de desenvolvimento ficaram claros para você após o feedback?",
        opcoes: [
          { value: "sim", label: "Sim" },
          { value: "parcialmente", label: "Parcialmente" },
          { value: "nao", label: "Não" },
        ],
      },
      {
        numero: "2.2",
        texto: "Você se sentiu reconhecido(a) pelos seus pontos positivos durante a conversa?",
        opcoes: [
          { value: "sim", label: "Sim" },
          { value: "parcialmente", label: "Parcialmente" },
          { value: "nao", label: "Não" },
        ],
      },
    ],
  },
  {
    grupo: "3. Perspectiva",
    items: [
      {
        numero: "3.1",
        texto: "Após o feedback, você se sente motivado(a) a trabalhar no seu desenvolvimento?",
        opcoes: [
          { value: "muito_motivado", label: "Muito motivado(a)" },
          { value: "motivado", label: "Motivado(a)" },
          { value: "pouco_motivado", label: "Pouco motivado(a)" },
          { value: "nao_motivado", label: "Não motivado(a)" },
        ],
      },
    ],
  },
];

export default function FeedbackPublicoCiclo() {
  const { token } = useParams<{ token: string }>();
  const db = supabase as any;

  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [observacoes, setObservacoes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: feedbackData, isLoading, error } = useQuery({
    queryKey: ["ciclo_feedback_colab_public", token],
    queryFn: async () => {
      const { data, error } = await db
        .from("ciclo_feedback_colaborador")
        .select(`
          *,
          participante:ciclo_gente_participantes(
            *,
            funcionario:funcionarios!ciclo_gente_participantes_funcionario_id_fkey(nome_completo, cargo_atual),
            ciclo:ciclo_gente(nome, empresa_id)
          )
        `)
        .eq("token", token)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!token,
  });

  useEffect(() => {
    if (feedbackData?.preenchido) {
      setSubmitted(true);
      const map: Record<string, string> = {};
      (feedbackData.respostas || []).forEach((r: any) => {
        map[r.numero] = r.resposta;
      });
      setRespostas(map);
      setObservacoes(feedbackData.observacoes || "");
    }
  }, [feedbackData]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const respostasArr = QUESTOES_COLABORADOR.flatMap((g) =>
        g.items.map((item) => ({
          numero: item.numero,
          grupo: g.grupo,
          texto: item.texto,
          resposta: respostas[item.numero] || "",
        }))
      );

      const { error } = await db
        .from("ciclo_feedback_colaborador")
        .update({
          respostas: respostasArr,
          observacoes,
          preenchido: true,
          preenchido_em: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("token", token);
      if (error) throw error;
    },
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Feedback enviado com sucesso!");
    },
    onError: () => toast.error("Erro ao enviar feedback. Tente novamente."),
  });

  const allAnswered = QUESTOES_COLABORADOR.every((g) =>
    g.items.every((item) => respostas[item.numero])
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !feedbackData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <p className="text-lg font-semibold">Link inválido ou expirado</p>
            <p className="text-sm text-muted-foreground mt-2">
              Este link de feedback não existe ou expirou. Entre em contato com seu gestor.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { participante } = feedbackData;
  const isExpired =
    feedbackData.token_expires_at && new Date(feedbackData.token_expires_at) < new Date();

  if (isExpired && !feedbackData.preenchido) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <p className="text-lg font-semibold">Link expirado</p>
            <p className="text-sm text-muted-foreground mt-2">
              O prazo para preencher este formulário expirou. Entre em contato com seu gestor.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center space-y-4">
            <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto" />
            <div>
              <p className="text-xl font-semibold">Feedback enviado!</p>
              <p className="text-sm text-muted-foreground mt-2">
                Obrigado por preencher o formulário de feedback, {participante?.funcionario?.nome_completo?.split(" ")[0]}.
                Sua contribuição é muito importante.
              </p>
            </div>
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <Heart className="h-3 w-3 text-red-400" />
              <span>By RHCore</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <img src={rhcoreLogo} alt="RHCore" className="h-10 mx-auto" />
          <h1 className="text-2xl font-bold">Registro de Feedback</h1>
          <p className="text-muted-foreground">
            Ciclo de Gente — {participante?.ciclo?.nome}
          </p>
          <div className="inline-flex items-center gap-2 bg-muted rounded-full px-4 py-1.5 text-sm">
            <span className="font-medium">{participante?.funcionario?.nome_completo}</span>
            {participante?.funcionario?.cargo_atual && (
              <>
                <span className="text-muted-foreground">—</span>
                <span className="text-muted-foreground">{participante?.funcionario?.cargo_atual}</span>
              </>
            )}
          </div>
        </div>

        <p className="text-sm text-center text-muted-foreground">
          Por favor, responda às perguntas abaixo sobre a sua experiência no feedback.
          Suas respostas são confidenciais e ajudam a melhorar o processo.
        </p>

        {/* Questions */}
        {QUESTOES_COLABORADOR.map((grupo) => (
          <Card key={grupo.grupo}>
            <CardHeader>
              <CardTitle className="text-base">{grupo.grupo}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {grupo.items.map((item) => (
                <div key={item.numero}>
                  <p className="text-sm font-medium mb-3">
                    <span className="text-muted-foreground">{item.numero}</span> {item.texto}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {item.opcoes.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setRespostas((prev) => ({ ...prev, [item.numero]: opt.value }))
                        }
                        className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-all ${
                          respostas[item.numero] === opt.value
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border hover:border-primary/50 text-muted-foreground"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        {/* Observações */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">4. Observações (opcional)</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              rows={4}
              placeholder="Compartilhe livremente como foi sua experiência no feedback, sugestões de melhoria ou qualquer outro comentário..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </CardContent>
        </Card>

        <Button
          className="w-full"
          size="lg"
          onClick={() => setConfirmOpen(true)}
          disabled={!allAnswered || submitMutation.isPending}
        >
          {submitMutation.isPending ? "Enviando..." : "Enviar Feedback"}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Suas respostas são registradas de forma segura e associadas ao seu ciclo de avaliação.
        </p>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar envio do feedback</AlertDialogTitle>
            <AlertDialogDescription>
              Após o envio, <strong>suas respostas não poderão ser editadas</strong>.
              Tem certeza que deseja enviar seu feedback?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Revisar respostas</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                submitMutation.mutate();
              }}
            >
              Sim, enviar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
