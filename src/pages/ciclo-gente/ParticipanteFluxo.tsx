import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, Lock, Circle, ChevronRight } from "lucide-react";
import { AvaliacaoDesempenhoStep } from "@/components/ciclo-gente/steps/AvaliacaoDesempenhoStep";
import { ReuniaoGenteStep } from "@/components/ciclo-gente/steps/ReuniaoGenteStep";
import { FeedbackStep } from "@/components/ciclo-gente/steps/FeedbackStep";
import { PDIStep } from "@/components/ciclo-gente/steps/PDIStep";
import { FollowStep } from "@/components/ciclo-gente/steps/FollowStep";
import { toast } from "sonner";

const CLASSIF_CONFIG: Record<string, { label: string; className: string }> = {
  desligar: { label: "Desligar", className: "bg-red-100 text-red-700 border-red-200" },
  recuperar: { label: "Recuperar", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  bom: { label: "Bom", className: "bg-blue-100 text-blue-700 border-blue-200" },
  muito_bom: { label: "Muito Bom", className: "bg-sky-100 text-sky-700 border-sky-200" },
  preparar: { label: "Preparar", className: "bg-green-100 text-green-700 border-green-200" },
};

const ETAPAS_ORDER = ["avaliacao_desempenho", "reuniao_gente", "feedback", "pdi", "follow", "concluido"];

type StepKey = "avaliacao_desempenho" | "reuniao_gente" | "feedback" | "pdi" | "follow";

const STEP_CONFIG: Record<StepKey, { label: string; sublabel: string }> = {
  avaliacao_desempenho: { label: "Avaliação de Desempenho", sublabel: "Gestor avalia o colaborador" },
  reuniao_gente: { label: "Reunião de Gente", sublabel: "Análise e classificação" },
  feedback: { label: "Feedback", sublabel: "Devolutiva ao colaborador" },
  pdi: { label: "PDI / Plano de Reversão", sublabel: "Plano de desenvolvimento" },
  follow: { label: "Follow", sublabel: "Acompanhamento das ações" },
};

const STEPS: StepKey[] = ["avaliacao_desempenho", "reuniao_gente", "feedback", "pdi", "follow"];

interface Props {
  currentEmpresa: any;
}

export function ParticipanteFluxo({ currentEmpresa }: Props) {
  const { cicloId, participanteId } = useParams<{ cicloId: string; participanteId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedStep, setSelectedStep] = useState<StepKey>("avaliacao_desempenho");

  const db = supabase as any;

  const { data: participante, isLoading: loadingPart } = useQuery({
    queryKey: ["ciclo_participante", participanteId],
    queryFn: async () => {
      const { data, error } = await db
        .from("ciclo_gente_participantes")
        .select(`
          *,
          funcionario:funcionarios!ciclo_gente_participantes_funcionario_id_fkey(id, nome_completo, cargo_atual, data_admissao),
          gestor:funcionarios!ciclo_gente_participantes_gestor_id_fkey(id, nome_completo),
          ciclo:ciclo_gente(*)
        `)
        .eq("id", participanteId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!participanteId,
  });

  const { data: questoes = [] } = useQuery({
    queryKey: ["ciclo_questoes", participante?.ciclo?.empresa_id, participante?.ciclo?.tipo],
    queryFn: async () => {
      if (!participante?.ciclo) return [];
      const { data, error } = await db
        .from("ciclo_gente_questoes")
        .select("*")
        .eq("empresa_id", participante.ciclo.empresa_id)
        .eq("tipo_ciclo", participante.ciclo.tipo)
        .eq("ativo", true)
        .order("ordem");
      if (error) throw error;
      return data || [];
    },
    enabled: !!participante?.ciclo,
  });

  const { data: avaliacoes = [] } = useQuery({
    queryKey: ["ciclo_avaliacao", participanteId],
    queryFn: async () => {
      const { data, error } = await db
        .from("ciclo_avaliacao_desempenho")
        .select("*")
        .eq("participante_id", participanteId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!participanteId,
  });

  const { data: pdi } = useQuery({
    queryKey: ["ciclo_pdi", participanteId],
    queryFn: async () => {
      const { data } = await db
        .from("ciclo_pdi")
        .select("*")
        .eq("participante_id", participanteId)
        .maybeSingle();
      return data;
    },
    enabled: !!participanteId,
  });

  const advanceMutation = useMutation({
    mutationFn: async (nextEtapa: string) => {
      const { error } = await db
        .from("ciclo_gente_participantes")
        .update({ etapa_atual: nextEtapa, updated_at: new Date().toISOString() })
        .eq("id", participanteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ciclo_participante", participanteId] });
      queryClient.invalidateQueries({ queryKey: ["ciclo_participantes", cicloId] });
    },
    onError: () => toast.error("Erro ao avançar etapa."),
  });

  const handleStepComplete = (currentStep: StepKey) => {
    const classificacao = participante?.classificacao;

    // Determine next step based on classification
    let nextStep = "";
    if (currentStep === "avaliacao_desempenho") {
      nextStep = "reuniao_gente";
    } else if (currentStep === "reuniao_gente") {
      if (classificacao === "desligar") {
        nextStep = "concluido";
      } else {
        nextStep = "feedback";
      }
    } else if (currentStep === "feedback") {
      nextStep = "pdi";
    } else if (currentStep === "pdi") {
      nextStep = "follow";
    } else if (currentStep === "follow") {
      nextStep = "concluido";
    }

    if (nextStep) {
      advanceMutation.mutate(nextStep);
      if (nextStep !== "concluido") {
        setSelectedStep(nextStep as StepKey);
      }
    }
  };

  if (loadingPart) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!participante) return null;

  const ciclo = participante.ciclo;
  const etapaAtual = participante.etapa_atual;
  const etapaIndex = ETAPAS_ORDER.indexOf(etapaAtual);
  const classificacao = participante.classificacao;
  const classifConf = classificacao ? CLASSIF_CONFIG[classificacao] : null;
  const avaliacaoGestor = avaliacoes.find((a: any) => a.tipo === "gestor");

  // Steps availability
  const getStepStatus = (step: StepKey): "done" | "current" | "locked" => {
    const stepIdx = STEPS.indexOf(step);
    const currentIdx = ETAPAS_ORDER.indexOf(etapaAtual);
    const stepInOrderIdx = ETAPAS_ORDER.indexOf(step);

    if (etapaAtual === "concluido") return "done";
    if (stepInOrderIdx < currentIdx) return "done";
    if (stepInOrderIdx === currentIdx) return "current";
    return "locked";
  };

  const isStepVisible = (step: StepKey) => {
    const cl = participante.classificacao;
    if (step === "feedback" && cl === "desligar") return false;
    if (step === "pdi" && cl === "desligar") return false;
    if (step === "follow" && cl === "desligar") return false;
    return true;
  };

  const isLideranca = ciclo?.tipo === "lideranca";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/ciclo-gente/${cicloId}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-semibold">{participante.funcionario?.nome_completo}</h1>
            {classifConf && (
              <Badge variant="outline" className={classifConf.className}>
                {classifConf.label}
              </Badge>
            )}
            {etapaAtual === "concluido" && (
              <Badge className="bg-green-100 text-green-700 border-green-200">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Concluído
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
            <span>{participante.funcionario?.cargo_atual}</span>
            {participante.gestor && (
              <>
                <span>•</span>
                <span>Gestor: {participante.gestor.nome_completo}</span>
              </>
            )}
            <span>•</span>
            <span>{ciclo?.nome}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Stepper sidebar */}
        <div className="w-56 shrink-0 space-y-1">
          {STEPS.filter(isStepVisible).map((step, idx, arr) => {
            const status = getStepStatus(step);
            const isSelected = selectedStep === step;
            const stepConf = STEP_CONFIG[step];

            return (
              <button
                key={step}
                onClick={() => status !== "locked" && setSelectedStep(step)}
                disabled={status === "locked"}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-all border ${
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary"
                    : status === "locked"
                    ? "opacity-40 cursor-not-allowed border-transparent"
                    : "hover:bg-muted/60 border-transparent"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    isSelected ? "bg-primary-foreground/20" : ""
                  }`}>
                    {status === "done" ? (
                      <CheckCircle2 className={`h-4 w-4 ${isSelected ? "text-primary-foreground" : "text-green-500"}`} />
                    ) : status === "locked" ? (
                      <Lock className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      <Circle className={`h-4 w-4 ${isSelected ? "text-primary-foreground" : "text-primary"}`} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold truncate ${isSelected ? "text-primary-foreground" : ""}`}>
                      {stepConf.label}
                    </p>
                    <p className={`text-xs truncate ${isSelected ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {stepConf.sublabel}
                      {step === "pdi" && classificacao === "recuperar" && " (Reversão)"}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}

          {classificacao === "desligar" && (
            <div className="mt-2 p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-xs text-red-600 font-medium">Classificação: Desligar</p>
              <p className="text-xs text-red-500 mt-1">
                As etapas de Feedback, PDI e Follow não se aplicam.
              </p>
            </div>
          )}
        </div>

        {/* Step content */}
        <div className="flex-1 min-w-0">
          {selectedStep === "avaliacao_desempenho" && (
            <AvaliacaoDesempenhoStep
              participante={participante}
              ciclo={ciclo}
              questoes={questoes}
              onStepComplete={() => handleStepComplete("avaliacao_desempenho")}
              readOnly={etapaAtual !== "avaliacao_desempenho" && etapaAtual !== "concluido"}
            />
          )}
          {selectedStep === "reuniao_gente" && (
            <ReuniaoGenteStep
              participante={participante}
              ciclo={ciclo}
              avaliacaoGestor={avaliacaoGestor}
              onStepComplete={() => handleStepComplete("reuniao_gente")}
              readOnly={etapaAtual !== "reuniao_gente"}
            />
          )}
          {selectedStep === "feedback" && (
            <FeedbackStep
              participante={participante}
              ciclo={ciclo}
              onStepComplete={() => handleStepComplete("feedback")}
              readOnly={etapaAtual !== "feedback"}
            />
          )}
          {selectedStep === "pdi" && (
            <PDIStep
              participante={participante}
              ciclo={ciclo}
              onStepComplete={() => handleStepComplete("pdi")}
              readOnly={etapaAtual !== "pdi"}
            />
          )}
          {selectedStep === "follow" && (
            <FollowStep
              participante={participante}
              ciclo={ciclo}
              pdi={pdi}
              onStepComplete={() => handleStepComplete("follow")}
              readOnly={etapaAtual !== "follow"}
            />
          )}
        </div>
      </div>
    </div>
  );
}
