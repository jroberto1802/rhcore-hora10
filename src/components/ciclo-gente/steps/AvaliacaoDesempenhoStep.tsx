import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, ClipboardList, Link2, Copy, Clock } from "lucide-react";
import { toast } from "sonner";
import { nanoid } from "nanoid";

interface Props {
  participante: any;
  ciclo: any;
  questoes: any[];
  onStepComplete: () => void;
  readOnly?: boolean;
}

const ESCALA_OPTIONS = [
  { value: "acima_esperado", label: "Acima do esperado", color: "bg-emerald-500" },
  { value: "atende_plenamente", label: "Atende plenamente", color: "bg-green-400" },
  { value: "atende_melhoria", label: "Atende com oportunidade de melhoria", color: "bg-yellow-400" },
  { value: "abaixo_esperado", label: "Abaixo do esperado", color: "bg-orange-400" },
  { value: "muito_abaixo", label: "Muito abaixo do esperado", color: "bg-red-500" },
];

function AvaliacaoForm({
  tipo,
  participanteId,
  questoes,
  existingData,
  readOnly,
  onSaved,
}: {
  tipo: "gestor" | "auto";
  participanteId: string;
  questoes: any[];
  existingData: any;
  readOnly?: boolean;
  onSaved: () => void;
}) {
  const db = supabase as any;
  const queryClient = useQueryClient();

  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [comentarios, setComentarios] = useState("");

  useEffect(() => {
    if (existingData) {
      const map: Record<string, string> = {};
      (existingData.respostas || []).forEach((r: any) => {
        map[r.item_numero] = r.resposta;
      });
      setRespostas(map);
      setComentarios(existingData.comentarios || "");
    }
  }, [existingData]);

  const grupos = questoes.reduce((acc: any, q: any) => {
    const key = q.grupo_numero;
    if (!acc[key]) acc[key] = { nome: q.grupo_nome, questoes: [] };
    acc[key].questoes.push(q);
    return acc;
  }, {});

  const mutation = useMutation({
    mutationFn: async (concluir: boolean) => {
      const respostasArr = questoes.map((q) => ({
        questao_id: q.id,
        item_numero: q.item_numero,
        grupo_nome: q.grupo_nome,
        descricao: q.descricao,
        tipo_resposta: q.tipo_resposta,
        resposta: respostas[q.item_numero] || "",
      }));

      if (existingData) {
        const { error } = await db
          .from("ciclo_avaliacao_desempenho")
          .update({
            respostas: respostasArr,
            comentarios,
            concluido: concluir,
            concluido_em: concluir ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingData.id);
        if (error) throw error;
      } else {
        const { error } = await db.from("ciclo_avaliacao_desempenho").insert({
          participante_id: participanteId,
          tipo,
          respostas: respostasArr,
          comentarios,
          concluido: concluir,
          concluido_em: concluir ? new Date().toISOString() : null,
        });
        if (error) throw error;
      }
    },
    onSuccess: (_, concluir) => {
      queryClient.invalidateQueries({ queryKey: ["ciclo_avaliacao", participanteId] });
      toast.success(concluir ? "Avaliação concluída!" : "Rascunho salvo.");
      if (concluir) onSaved();
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar avaliação."),
  });

  const allEscalaAnswered = questoes
    .filter((q) => q.tipo_resposta === "escala")
    .every((q) => respostas[q.item_numero]);

  if (existingData?.concluido || readOnly) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-green-600 font-medium">
          <CheckCircle2 className="h-5 w-5" />
          {tipo === "gestor" ? "Avaliação do gestor concluída" : "Autoavaliação concluída"}
        </div>
        {Object.values(grupos).map((grupo: any) => (
          <div key={grupo.nome}>
            <h4 className="font-medium text-sm text-muted-foreground mb-2">{grupo.nome}</h4>
            <div className="space-y-2">
              {grupo.questoes.map((q: any) => {
                const resp = existingData?.respostas?.find((r: any) => r.item_numero === q.item_numero);
                const opt = ESCALA_OPTIONS.find((o) => o.value === resp?.resposta);
                return (
                  <div key={q.id} className="text-sm">
                    <span className="text-muted-foreground">{q.item_numero}</span>{" "}
                    {q.descricao}
                    {q.tipo_resposta === "escala" && opt && (
                      <Badge variant="outline" className="ml-2 text-xs">{opt.label}</Badge>
                    )}
                    {q.tipo_resposta === "texto" && resp?.resposta && (
                      <p className="mt-1 text-muted-foreground italic">"{resp.resposta}"</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.values(grupos).map((grupo: any) => (
        <div key={grupo.nome}>
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">
              {grupo.questoes[0].grupo_numero}
            </span>
            {grupo.nome}
          </h4>
          <div className="space-y-4">
            {grupo.questoes.map((q: any) => (
              <div key={q.id} className="pl-4 border-l-2 border-muted">
                <p className="text-sm mb-2">
                  <span className="font-medium text-muted-foreground">{q.item_numero}</span>{" "}
                  {q.descricao}
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
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          respostas[q.item_numero] === opt.value
                            ? `${opt.color} text-white border-transparent shadow-sm`
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
                    placeholder="Comentários do avaliador..."
                    value={respostas[q.item_numero] || ""}
                    onChange={(e) =>
                      setRespostas((prev) => ({ ...prev, [q.item_numero]: e.target.value }))
                    }
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <Separator />

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {Object.keys(respostas).filter((k) => respostas[k]).length} / {questoes.filter((q) => q.tipo_resposta === "escala").length} questões respondidas
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => mutation.mutate(false)}
            disabled={mutation.isPending}
          >
            Salvar rascunho
          </Button>
          <Button
            onClick={() => mutation.mutate(true)}
            disabled={!allEscalaAnswered || mutation.isPending}
          >
            Concluir avaliação
          </Button>
        </div>
      </div>
    </div>
  );
}

function AutoavaliacaoLinkPanel({
  participanteId,
  avaliacaoAuto,
  readOnly,
  onCompleted,
}: {
  participanteId: string;
  avaliacaoAuto: any;
  readOnly?: boolean;
  onCompleted: () => void;
}) {
  const db = supabase as any;
  const queryClient = useQueryClient();

  const generateMutation = useMutation({
    mutationFn: async () => {
      const token = nanoid(32);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      if (avaliacaoAuto) {
        const { error } = await db
          .from("ciclo_avaliacao_desempenho")
          .update({ token, token_expires_at: expiresAt.toISOString(), updated_at: new Date().toISOString() })
          .eq("id", avaliacaoAuto.id);
        if (error) throw error;
      } else {
        const { error } = await db.from("ciclo_avaliacao_desempenho").insert({
          participante_id: participanteId,
          tipo: "auto",
          token,
          token_expires_at: expiresAt.toISOString(),
          concluido: false,
        });
        if (error) throw error;
      }
      return token;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ciclo_avaliacao", participanteId] });
      toast.success("Link gerado! Compartilhe com o colaborador.");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao gerar link."),
  });

  const link = avaliacaoAuto?.token
    ? `${window.location.origin}/autoavaliacao/ciclo/${avaliacaoAuto.token}`
    : null;

  const copyLink = () => {
    if (link) {
      navigator.clipboard.writeText(link);
      toast.success("Link copiado!");
    }
  };

  if (avaliacaoAuto?.concluido) {
    return (
      <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
        <CheckCircle2 className="h-5 w-5" />
        Autoavaliação respondida pelo colaborador.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        O colaborador precisa responder a autoavaliação através de um link externo.
        Gere o link e compartilhe com ele. O gestor{" "}
        <strong>não visualiza</strong> as respostas até após o feedback.
      </p>

      {link ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-amber-600 text-sm">
            <Clock className="h-4 w-4" />
            <span>Aguardando resposta do colaborador</span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg border text-sm font-mono break-all">
            <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="flex-1">{link}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={copyLink}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar link
            </Button>
            {!readOnly && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
              >
                Gerar novo link
              </Button>
            )}
          </div>
        </div>
      ) : (
        !readOnly && (
          <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
            <Link2 className="h-4 w-4 mr-2" />
            Gerar link de autoavaliação
          </Button>
        )
      )}
    </div>
  );
}

export function AvaliacaoDesempenhoStep({ participante, ciclo, questoes, onStepComplete, readOnly }: Props) {
  const db = supabase as any;
  const isLideranca = ciclo?.tipo === "lideranca";

  const { data: avaliacoes = [], isLoading } = useQuery({
    queryKey: ["ciclo_avaliacao", participante?.id],
    queryFn: async () => {
      const { data, error } = await db
        .from("ciclo_avaliacao_desempenho")
        .select("*")
        .eq("participante_id", participante.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!participante?.id,
  });

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Carregando...</div>;
  }

  const avaliacaoGestor = avaliacoes.find((a: any) => a.tipo === "gestor");
  const avaliacaoAuto = avaliacoes.find((a: any) => a.tipo === "auto");

  const gestorConcluido = avaliacaoGestor?.concluido;
  const autoConcluido = !isLideranca || avaliacaoAuto?.concluido;
  const allDone = gestorConcluido && autoConcluido;

  const questoesGestor = questoes.filter(
    (q) => q.tipo_avaliacao === "gestor" || q.tipo_avaliacao === "ambos"
  );
  const questoesAuto = questoes.filter(
    (q) => q.tipo_avaliacao === "auto" || q.tipo_avaliacao === "ambos"
  );

  return (
    <div className="space-y-6">
      {/* Avaliação do Gestor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-5 w-5" />
            Avaliação do Gestor
            {gestorConcluido && <CheckCircle2 className="h-5 w-5 text-green-500 ml-auto" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AvaliacaoForm
            tipo="gestor"
            participanteId={participante.id}
            questoes={questoesGestor}
            existingData={avaliacaoGestor}
            readOnly={readOnly}
            onSaved={() => {
              if (!isLideranca || avaliacaoAuto?.concluido) onStepComplete();
            }}
          />
        </CardContent>
      </Card>

      {/* Autoavaliação — apenas para Lideranças (link externo) */}
      {isLideranca && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-5 w-5" />
              Autoavaliação (colaborador)
              {avaliacaoAuto?.concluido && <CheckCircle2 className="h-5 w-5 text-green-500 ml-auto" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AutoavaliacaoLinkPanel
              participanteId={participante.id}
              avaliacaoAuto={avaliacaoAuto}
              readOnly={readOnly}
              onCompleted={() => {
                if (avaliacaoGestor?.concluido) onStepComplete();
              }}
            />
          </CardContent>
        </Card>
      )}

      {allDone && !readOnly && (
        <div className="flex justify-end">
          <Button onClick={onStepComplete}>
            Avançar para Reunião de Gente →
          </Button>
        </div>
      )}
    </div>
  );
}
