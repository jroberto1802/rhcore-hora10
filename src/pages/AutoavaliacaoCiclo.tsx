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

const ESCALA_OPTIONS = [
  { value: "acima_esperado",   label: "Acima do esperado" },
  { value: "atende_plenamente",label: "Atende plenamente" },
  { value: "atende_melhoria",  label: "Atende com oportunidade de melhoria" },
  { value: "abaixo_esperado",  label: "Abaixo do esperado" },
  { value: "muito_abaixo",     label: "Muito abaixo do esperado" },
];

export default function AutoavaliacaoCiclo() {
  const { token } = useParams<{ token: string }>();
  const db = supabase as any;

  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: avaliacao, isLoading, error } = useQuery({
    queryKey: ["ciclo_autoavaliacao_public", token],
    queryFn: async () => {
      const { data, error } = await db
        .from("ciclo_avaliacao_desempenho")
        .select(`
          *,
          participante:ciclo_gente_participantes(
            *,
            funcionario:funcionarios!ciclo_gente_participantes_funcionario_id_fkey(nome_completo, cargo_atual),
            ciclo:ciclo_gente(nome, tipo, empresa_id)
          )
        `)
        .eq("token", token)
        .eq("tipo", "auto")
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!token,
  });

  const { data: questoes = [] } = useQuery({
    queryKey: ["ciclo_questoes_public", avaliacao?.participante?.ciclo?.empresa_id, avaliacao?.participante?.ciclo?.tipo],
    queryFn: async () => {
      const { data, error } = await db
        .from("ciclo_gente_questoes")
        .select("*")
        .eq("empresa_id", avaliacao.participante.ciclo.empresa_id)
        .eq("tipo_ciclo", avaliacao.participante.ciclo.tipo)
        .in("tipo_avaliacao", ["auto", "ambos"])
        .eq("ativo", true)
        .order("ordem");
      if (error) throw error;
      return data || [];
    },
    enabled: !!avaliacao?.participante?.ciclo?.empresa_id,
  });

  useEffect(() => {
    if (avaliacao?.concluido) {
      setSubmitted(true);
      const map: Record<string, string> = {};
      (avaliacao.respostas || []).forEach((r: any) => {
        map[r.item_numero] = r.resposta;
      });
      setRespostas(map);
    }
  }, [avaliacao]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const respostasArr = questoes.map((q: any) => ({
        questao_id: q.id,
        item_numero: q.item_numero,
        grupo_nome: q.grupo_nome,
        descricao: q.descricao,
        tipo_resposta: q.tipo_resposta,
        resposta: respostas[q.item_numero] || "",
      }));

      const { error } = await db
        .from("ciclo_avaliacao_desempenho")
        .update({
          respostas: respostasArr,
          concluido: true,
          concluido_em: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("token", token);
      if (error) throw error;
    },
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Autoavaliação enviada com sucesso!");
    },
    onError: () => toast.error("Erro ao enviar. Tente novamente."),
  });

  const escalasRespondidas = questoes
    .filter((q: any) => q.tipo_resposta === "escala")
    .every((q: any) => respostas[q.item_numero]);

  const grupos = questoes.reduce((acc: any, q: any) => {
    const key = q.grupo_numero;
    if (!acc[key]) acc[key] = { nome: q.grupo_nome, questoes: [] };
    acc[key].questoes.push(q);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !avaliacao) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <p className="text-lg font-semibold">Link inválido ou expirado</p>
            <p className="text-sm text-muted-foreground mt-2">
              Este link de autoavaliação não existe ou expirou. Entre em contato com seu gestor.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isExpired =
    avaliacao.token_expires_at && new Date(avaliacao.token_expires_at) < new Date();

  if (isExpired && !avaliacao.concluido) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <p className="text-lg font-semibold">Link expirado</p>
            <p className="text-sm text-muted-foreground mt-2">
              O prazo para preencher esta autoavaliação expirou. Entre em contato com seu gestor.
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
              <p className="text-xl font-semibold">Autoavaliação enviada!</p>
              <p className="text-sm text-muted-foreground mt-2">
                Obrigado, {avaliacao.participante?.funcionario?.nome_completo?.split(" ")[0]}.
                Sua autoavaliação foi registrada com sucesso.
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

  const { participante } = avaliacao;

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <img src={rhcoreLogo} alt="RHCore" className="h-10 mx-auto" />
          <h1 className="text-2xl font-bold">Autoavaliação de Desempenho</h1>
          <p className="text-muted-foreground">{participante?.ciclo?.nome}</p>
          <div className="inline-flex items-center gap-2 bg-muted rounded-full px-4 py-1.5 text-sm">
            <span className="font-medium">{participante?.funcionario?.nome_completo}</span>
            {participante?.funcionario?.cargo_atual && (
              <>
                <span className="text-muted-foreground">—</span>
                <span className="text-muted-foreground">{participante.funcionario.cargo_atual}</span>
              </>
            )}
          </div>
        </div>

        <p className="text-sm text-center text-muted-foreground">
          Avalie <strong>seu próprio desempenho</strong> com honestidade. Sua resposta é individual
          e o gestor não terá acesso a ela até após a reunião de feedback.
        </p>

        {/* Questões */}
        {Object.values(grupos).map((grupo: any) => (
          <Card key={grupo.nome}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold shrink-0">
                  {grupo.questoes[0].grupo_numero}
                </span>
                {grupo.nome}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {grupo.questoes.map((q: any) => (
                <div key={q.id}>
                  <p className="text-sm font-medium mb-3">
                    <span className="text-muted-foreground">{q.item_numero}</span> {q.descricao}
                  </p>
                  {q.tipo_resposta === "escala" ? (
                    <div className="flex flex-wrap gap-2">
                      {ESCALA_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            setRespostas((prev) => ({ ...prev, [q.item_numero]: opt.value }))
                          }
                          className={`px-3 py-2 rounded-full text-xs font-medium border-2 transition-all ${
                            respostas[q.item_numero] === opt.value
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-border hover:border-primary/50 text-muted-foreground"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <Textarea
                      rows={3}
                      placeholder="Registre seus comentários..."
                      value={respostas[q.item_numero] || ""}
                      onChange={(e) =>
                        setRespostas((prev) => ({ ...prev, [q.item_numero]: e.target.value }))
                      }
                    />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        <Button
          className="w-full"
          size="lg"
          onClick={() => setConfirmOpen(true)}
          disabled={!escalasRespondidas || submitMutation.isPending}
        >
          Enviar Autoavaliação
        </Button>

        <p className="text-center text-xs text-muted-foreground pb-4">
          Após o envio, suas respostas não poderão ser alteradas.
        </p>
      </div>

      {/* Confirmação antes de enviar */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar envio da autoavaliação</AlertDialogTitle>
            <AlertDialogDescription>
              Após o envio, <strong>suas respostas não poderão ser editadas</strong>.
              Tem certeza que deseja enviar sua autoavaliação?
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
