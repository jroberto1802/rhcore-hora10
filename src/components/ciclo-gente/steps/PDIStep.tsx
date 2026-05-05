import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, Plus, Trash2, TrendingUp, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { nanoid } from "nanoid";

interface Acao {
  id: string;
  competencia: string;
  motivo: string;
  tipo_acao: string;
  porque: string;
  o_que: string;
  como: string;
  quem_ajuda: string;
  data_inicio: string;
  data_fim: string;
}

const emptyAcao = (): Acao => ({
  id: nanoid(),
  competencia: "",
  motivo: "",
  tipo_acao: "",
  porque: "",
  o_que: "",
  como: "",
  quem_ajuda: "",
  data_inicio: "",
  data_fim: "",
});

const TIPOS_ACAO = ["On the job", "Leitura", "Curso", "Mentoria", "Projeto", "Treinamento", "Outros"];

const CAUSAS_OPCOES = [
  "Falta de habilidade técnica",
  "Falta de motivação",
  "Problemas de comunicação",
  "Dificuldade de adaptação",
  "Comportamento inadequado",
  "Ausências recorrentes",
  "Conflitos interpessoais",
  "Falta de alinhamento com cultura",
];

interface Props {
  participante: any;
  ciclo: any;
  onStepComplete: () => void;
  readOnly?: boolean;
}

function AcaoForm({
  acao,
  index,
  onChange,
  onRemove,
  disabled,
}: {
  acao: Acao;
  index: number;
  onChange: (updated: Acao) => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const update = (field: keyof Acao, value: string) =>
    onChange({ ...acao, [field]: value });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Ação {index + 1}</CardTitle>
          {!disabled && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRemove}>
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Competência</Label>
            <Input
              value={acao.competencia}
              onChange={(e) => update("competencia", e.target.value)}
              placeholder="Ex: Gestão da Rota"
              disabled={disabled}
              className="mt-1 h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Motivo da ação</Label>
            <Input
              value={acao.motivo}
              onChange={(e) => update("motivo", e.target.value)}
              placeholder="Ex: Potencializar a competência"
              disabled={disabled}
              className="mt-1 h-8 text-sm"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs">Tipo de ação</Label>
          {disabled ? (
            <p className="text-sm mt-1">{acao.tipo_acao || "—"}</p>
          ) : (
            <Select value={acao.tipo_acao} onValueChange={(v) => update("tipo_acao", v)}>
              <SelectTrigger className="mt-1 h-8 text-sm">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_ACAO.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div>
          <Label className="text-xs">Por que vou fazer essa ação?</Label>
          <Textarea
            value={acao.porque}
            onChange={(e) => update("porque", e.target.value)}
            rows={2}
            disabled={disabled}
            className="mt-1 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">O que vou fazer para desenvolver/potencializar a competência?</Label>
          <Textarea
            value={acao.o_que}
            onChange={(e) => update("o_que", e.target.value)}
            rows={2}
            disabled={disabled}
            className="mt-1 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">Como vou realizar essa ação?</Label>
          <Textarea
            value={acao.como}
            onChange={(e) => update("como", e.target.value)}
            rows={2}
            disabled={disabled}
            className="mt-1 text-sm"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Quem pode me ajudar?</Label>
            <Input
              value={acao.quem_ajuda}
              onChange={(e) => update("quem_ajuda", e.target.value)}
              disabled={disabled}
              className="mt-1 h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Data de início</Label>
            <Input
              type="date"
              value={acao.data_inicio}
              onChange={(e) => update("data_inicio", e.target.value)}
              disabled={disabled}
              className="mt-1 h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Data final</Label>
            <Input
              type="date"
              value={acao.data_fim}
              onChange={(e) => update("data_fim", e.target.value)}
              disabled={disabled}
              className="mt-1 h-8 text-sm"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function PDIStep({ participante, ciclo, onStepComplete, readOnly }: Props) {
  const db = supabase as any;
  const queryClient = useQueryClient();

  const classificacao = participante?.classificacao;
  const isReversao = classificacao === "recuperar";
  const tipo = isReversao ? "reversao" : "pdi";

  const [acoes, setAcoes] = useState<Acao[]>([emptyAcao()]);
  const [causasSelecionadas, setCausasSelecionadas] = useState<string[]>([]);
  const [habilidadeGrupo, setHabilidadeGrupo] = useState("");
  const [usoUniformes, setUsoUniformes] = useState("");
  const [culturaSeg, setCulturaSeg] = useState("");
  const [pontoAdicional, setPontoAdicional] = useState("");
  const [cincoPs, setCincoPs] = useState<string[]>(["", "", "", "", ""]);

  const { data: pdi, isLoading } = useQuery({
    queryKey: ["ciclo_pdi", participante?.id],
    queryFn: async () => {
      const { data, error } = await db
        .from("ciclo_pdi")
        .select("*")
        .eq("participante_id", participante.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!participante?.id,
  });

  useEffect(() => {
    if (pdi) {
      setAcoes(pdi.acoes?.length ? pdi.acoes : [emptyAcao()]);
      setCausasSelecionadas(pdi.causas_baixo_desempenho || []);
      setHabilidadeGrupo(pdi.habilidade_trabalho_grupo || "");
      setUsoUniformes(pdi.uso_uniformes || "");
      setCulturaSeg(pdi.cultura_seguranca || "");
      setPontoAdicional(pdi.ponto_adicional || "");
      setCincoPs(pdi.cinco_porques?.length === 5 ? pdi.cinco_porques : ["", "", "", "", ""]);
    }
  }, [pdi]);

  const mutation = useMutation({
    mutationFn: async (concluir: boolean) => {
      const payload: any = {
        participante_id: participante.id,
        tipo,
        acoes,
        concluido: concluir,
        concluido_em: concluir ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      if (isReversao) {
        payload.causas_baixo_desempenho = causasSelecionadas;
        payload.habilidade_trabalho_grupo = habilidadeGrupo || null;
        payload.uso_uniformes = usoUniformes || null;
        payload.cultura_seguranca = culturaSeg || null;
        payload.ponto_adicional = pontoAdicional;
        payload.cinco_porques = cincoPs;
      }

      if (pdi) {
        const { error } = await db.from("ciclo_pdi").update(payload).eq("id", pdi.id);
        if (error) throw error;
      } else {
        const { error } = await db.from("ciclo_pdi").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_, concluir) => {
      queryClient.invalidateQueries({ queryKey: ["ciclo_pdi", participante.id] });
      toast.success(concluir ? (isReversao ? "Plano de Reversão concluído!" : "PDI concluído!") : "Rascunho salvo.");
      if (concluir) onStepComplete();
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar."),
  });

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Carregando...</div>;

  const isDone = pdi?.concluido || readOnly;

  const simNaoOpts = [
    { value: "sim", label: "Sim" },
    { value: "parcialmente", label: "Parcialmente" },
    { value: "nao", label: "Não" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        {isReversao ? (
          <div className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-yellow-600" />
            <div>
              <h3 className="font-semibold">Plano de Reversão</h3>
              <p className="text-sm text-muted-foreground">
                Colaborador classificado como <strong>Recuperar</strong> — preencha o plano de reversão com análise de causas e 5 Porquês.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="font-semibold">Plano de Desenvolvimento Individual (PDI)</h3>
              <p className="text-sm text-muted-foreground">
                Defina as ações de desenvolvimento para o colaborador.
              </p>
            </div>
          </div>
        )}
        {isDone && <CheckCircle2 className="h-5 w-5 text-green-500 ml-auto" />}
      </div>

      {/* Análise de Causa — apenas para Reversão */}
      {isReversao && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Análise de Causa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Causas do baixo desempenho (marque todas que se aplicam)</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {CAUSAS_OPCOES.map((causa) => (
                    <label key={causa} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={causasSelecionadas.includes(causa)}
                        disabled={isDone}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCausasSelecionadas([...causasSelecionadas, causa]);
                          } else {
                            setCausasSelecionadas(causasSelecionadas.filter((c) => c !== causa));
                          }
                        }}
                        className="rounded"
                      />
                      {causa}
                    </label>
                  ))}
                </div>
              </div>

              {[
                {
                  key: "habilidadeGrupo",
                  state: habilidadeGrupo,
                  setter: setHabilidadeGrupo,
                  label: "O(a) colaborador(a) tem habilidade para trabalho em grupo, boa convivência social e profissional e valoriza opiniões e críticas?",
                },
                {
                  key: "usoUniformes",
                  state: usoUniformes,
                  setter: setUsoUniformes,
                  label: "O(a) colaborador(a) faz uso correto de uniformes, EPIs e EPCs?",
                },
                {
                  key: "culturaSeg",
                  state: culturaSeg,
                  setter: setCulturaSeg,
                  label: "O(a) colaborador(a) tem a cultura de segurança como valor e não apresentou advertência por descumprimento de regras?",
                },
              ].map(({ key, state, setter, label }) => (
                <div key={key}>
                  <Label className="text-sm">{label}</Label>
                  <div className="flex gap-2 mt-1.5">
                    {simNaoOpts.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={isDone}
                        onClick={() => setter(opt.value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          state === opt.value
                            ? "bg-primary text-primary-foreground border-transparent"
                            : "border-border hover:border-primary/50 text-muted-foreground"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div>
                <Label className="text-sm">Algum ponto adicional da avaliação?</Label>
                <Textarea
                  value={pontoAdicional}
                  onChange={(e) => setPontoAdicional(e.target.value)}
                  rows={2}
                  disabled={isDone}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* 5 Porquês */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Os 5 Porquês</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Use a técnica dos 5 Porquês para identificar a causa raiz do baixo desempenho.
              </p>
              {cincoPs.map((p, idx) => (
                <div key={idx}>
                  <Label className="text-xs text-muted-foreground">Pergunta 0{idx + 1}</Label>
                  <Textarea
                    value={p}
                    onChange={(e) => {
                      const next = [...cincoPs];
                      next[idx] = e.target.value;
                      setCincoPs(next);
                    }}
                    rows={2}
                    disabled={isDone}
                    placeholder={`${idx === 0 ? "Por que o desempenho está abaixo do esperado?" : `Por que ${idx}?`}`}
                    className="mt-1 text-sm"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}

      {/* Ações (PDI e Reversão) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-sm">
            {isReversao ? "Plano de Ação" : "Ações de Desenvolvimento"}
          </h4>
          {!isDone && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAcoes([...acoes, emptyAcao()])}
            >
              <Plus className="h-4 w-4 mr-1" /> Nova ação
            </Button>
          )}
        </div>
        <div className="space-y-4">
          {acoes.map((acao, idx) => (
            <AcaoForm
              key={acao.id}
              acao={acao}
              index={idx}
              disabled={isDone}
              onChange={(updated) => {
                const next = [...acoes];
                next[idx] = updated;
                setAcoes(next);
              }}
              onRemove={() => setAcoes(acoes.filter((_, i) => i !== idx))}
            />
          ))}
        </div>
      </div>

      {!isDone && (
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
              disabled={acoes.some((a) => !a.competencia || !a.tipo_acao) || mutation.isPending}
            >
              {isReversao ? "Concluir Plano de Reversão" : "Concluir PDI"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
