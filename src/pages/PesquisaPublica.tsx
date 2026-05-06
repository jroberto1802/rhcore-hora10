import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { CheckCircle, Wind, ShieldCheck, ArrowRight, ArrowLeft, AlertCircle } from "lucide-react";

const db = supabase as any;

type Pergunta = {
  id: string;
  texto: string;
  tipo: "escala" | "texto_livre" | "enps";
  pilar_nome: string;
  ordem: number;
};

type PerguntaGrupo = {
  pilar: string;
  perguntas: Pergunta[];
};

const ESCALA_OPCOES = [
  { valor: 100, label: "Concordo totalmente", color: "border-green-500 bg-green-50 hover:bg-green-100 text-green-800" },
  { valor: 75, label: "Concordo", color: "border-emerald-400 bg-emerald-50 hover:bg-emerald-100 text-emerald-800" },
  { valor: 50, label: "Discordo", color: "border-amber-400 bg-amber-50 hover:bg-amber-100 text-amber-800" },
  { valor: 0, label: "Discordo totalmente", color: "border-red-400 bg-red-50 hover:bg-red-100 text-red-800" },
];

export default function PesquisaPublica() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [etapa, setEtapa] = useState<"intro" | "contexto" | "perguntas" | "fim">("intro");
  const [contexto, setContexto] = useState({ unidade: "", setor: "", turno: "" });
  const [grupoAtual, setGrupoAtual] = useState(0);
  const [respostas, setRespostas] = useState<Record<string, { numerico?: number; texto?: string }>>({});
  const [salvando, setSalvando] = useState(false);

  // Buscar participante pelo token
  const { data: participante, isLoading: loadingPart, error: partError } = useQuery({
    queryKey: ["participante_token", token],
    queryFn: async () => {
      if (!token) return null;
      const { data, error } = await db
        .from("clima_participantes")
        .select("*, campanha:clima_campanhas(*)")
        .eq("token", token)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!token,
  });

  // Buscar perguntas da campanha
  const { data: perguntas = [], isLoading: loadingPerguntas } = useQuery({
    queryKey: ["perguntas_publicas", participante?.campanha_id],
    queryFn: async () => {
      const { data, error } = await db
        .from("clima_perguntas")
        .select("*")
        .eq("campanha_id", participante.campanha_id)
        .eq("ativo", true)
        .order("ordem");
      if (error) throw error;
      return data || [];
    },
    enabled: !!participante?.campanha_id,
  });

  // Pré-preencher contexto do participante
  useEffect(() => {
    if (participante) {
      setContexto({
        unidade: participante.unidade || "",
        setor: participante.setor || "",
        turno: participante.turno || "",
      });
    }
  }, [participante]);

  // Agrupar perguntas por pilar
  const grupos: PerguntaGrupo[] = Object.values(
    perguntas.reduce((acc: Record<string, PerguntaGrupo>, p: Pergunta) => {
      const pilar = p.pilar_nome || "Geral";
      if (!acc[pilar]) acc[pilar] = { pilar, perguntas: [] };
      acc[pilar].perguntas.push(p);
      return acc;
    }, {})
  );

  const totalGrupos = grupos.length;
  const progresso = totalGrupos > 0 ? Math.round(((grupoAtual) / totalGrupos) * 100) : 0;

  const grupoCompleto = () => {
    const grupo = grupos[grupoAtual];
    if (!grupo) return true;
    return grupo.perguntas.every((p) => {
      const r = respostas[p.id];
      if (p.tipo === "texto_livre") return true;
      return r?.numerico != null;
    });
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      setSalvando(true);

      // Criar cabeçalho
      const { data: cab, error: cabErr } = await db
        .from("clima_respostas_cabecalho")
        .insert({
          campanha_id: participante.campanha_id,
          participante_id: participante.id,
          unidade: contexto.unidade || null,
          setor: contexto.setor || null,
          turno: contexto.turno || null,
        })
        .select()
        .single();

      if (cabErr) throw cabErr;

      // Inserir respostas
      const respostasArr = perguntas.map((p: Pergunta) => ({
        cabecalho_id: cab.id,
        pergunta_id: p.id,
        pilar_nome: p.pilar_nome,
        valor_numerico: respostas[p.id]?.numerico ?? null,
        valor_texto: respostas[p.id]?.texto ?? null,
      }));

      const { error: resErr } = await db.from("clima_respostas").insert(respostasArr);
      if (resErr) throw resErr;

      // Marcar participante como respondido
      await db
        .from("clima_participantes")
        .update({ status: "respondido", data_resposta: new Date().toISOString() })
        .eq("id", participante.id);
    },
    onSuccess: () => {
      setEtapa("fim");
      setSalvando(false);
    },
    onError: () => {
      setSalvando(false);
    },
  });

  const handleResponder = (perguntaId: string, valor: { numerico?: number; texto?: string }) => {
    setRespostas((prev) => ({ ...prev, [perguntaId]: { ...prev[perguntaId], ...valor } }));
  };

  const avancarGrupo = () => {
    if (grupoAtual < totalGrupos - 1) {
      setGrupoAtual((g) => g + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      submitMutation.mutate();
    }
  };

  const voltarGrupo = () => {
    setGrupoAtual((g) => Math.max(0, g - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Estados de carregamento e erro
  if (!token) {
    return <TelaErro mensagem="Link inválido. Solicite um novo convite à sua empresa." />;
  }

  if (loadingPart) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (!participante || participante.campanha?.status !== "ativa") {
    return <TelaErro mensagem="Esta pesquisa não está disponível ou o token é inválido." />;
  }

  if (participante.status === "respondido") {
    return (
      <TelaCentral>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold">Você já respondeu!</h2>
          <p className="text-muted-foreground">Sua resposta foi registrada anteriormente. Obrigado pela participação!</p>
        </div>
      </TelaCentral>
    );
  }

  if (participante.token_expira_em && new Date(participante.token_expira_em) < new Date()) {
    return <TelaErro mensagem="Este link expirou. Solicite um novo convite à sua empresa." />;
  }

  // Tela de introdução
  if (etapa === "intro") {
    return (
      <TelaCentral>
        <div className="space-y-6">
          <div className="text-center space-y-3">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
              <Wind className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Pesquisa de Clima Organizacional</h1>
            <p className="text-lg font-medium text-muted-foreground">{participante.campanha?.nome}</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
            <ShieldCheck className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-800 text-sm">Sua privacidade é protegida</p>
              <p className="text-blue-700 text-sm mt-1">
                {participante.campanha?.tipo === "anonima"
                  ? "Esta pesquisa é completamente anônima. Suas respostas individuais nunca serão associadas ao seu nome. Os resultados são analisados de forma agregada."
                  : "Suas respostas serão registradas de forma confidencial e usadas apenas para análise de clima organizacional."}
              </p>
            </div>
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Responda com sinceridade — isso ajuda a empresa a melhorar</p>
            <p>• Não há respostas certas ou erradas</p>
            <p>• Leva aproximadamente {Math.ceil(perguntas.length * 0.5)} minutos</p>
            <p>• {perguntas.length} perguntas no total</p>
          </div>

          <Button className="w-full h-12 text-base" onClick={() => setEtapa("contexto")}>
            Começar pesquisa <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </TelaCentral>
    );
  }

  // Tela de contexto
  if (etapa === "contexto") {
    return (
      <TelaCentral>
        <div className="space-y-5">
          <div>
            <h2 className="text-xl font-bold">Identificação contextual</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Essas informações são usadas apenas para análise por grupo. Não identificam você individualmente.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1.5">Unidade / Filial</label>
              <Input
                placeholder="Ex: Unidade São Paulo"
                value={contexto.unidade}
                onChange={(e) => setContexto({ ...contexto, unidade: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Setor / Departamento</label>
              <Input
                placeholder="Ex: Financeiro, TI, Produção..."
                value={contexto.setor}
                onChange={(e) => setContexto({ ...contexto, setor: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Turno</label>
              <Input
                placeholder="Ex: Manhã, Tarde, Noturno..."
                value={contexto.turno}
                onChange={(e) => setContexto({ ...contexto, turno: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setEtapa("intro")}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
            </Button>
            <Button className="flex-1" onClick={() => setEtapa("perguntas")}>
              Continuar <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </TelaCentral>
    );
  }

  // Tela de agradecimento
  if (etapa === "fim") {
    return (
      <TelaCentral>
        <div className="text-center space-y-5">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Obrigado pela sua participação!</h2>
            <p className="text-muted-foreground mt-2">
              Sua resposta foi registrada com sucesso.
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
            Suas respostas contribuem para um ambiente de trabalho melhor para todos.
            Os resultados serão analisados de forma agregada pela equipe de RH.
          </div>
        </div>
      </TelaCentral>
    );
  }

  // Tela de perguntas — sem perguntas cadastradas
  if (etapa === "perguntas" && !loadingPerguntas && totalGrupos === 0) {
    return (
      <TelaCentral>
        <div className="text-center space-y-4">
          <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="h-7 w-7 text-amber-600" />
          </div>
          <h2 className="text-lg font-bold">Pesquisa sem perguntas</h2>
          <p className="text-muted-foreground text-sm">
            Esta campanha ainda não possui perguntas configuradas. Entre em contato com o RH da sua empresa.
          </p>
        </div>
      </TelaCentral>
    );
  }

  // Tela de perguntas — carregando
  if (etapa === "perguntas" && loadingPerguntas) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  const grupo = grupos[grupoAtual];
  if (!grupo) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Header fixo */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium">
              Pilar {grupoAtual + 1} de {totalGrupos}
            </span>
            <span className="text-xs font-semibold text-primary">{progresso}% concluído</span>
          </div>
          <Progress value={progresso} className="h-2" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5 pb-24">
        {/* Nome do pilar */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-semibold">
            <Wind className="h-4 w-4" />
            {grupo.pilar}
          </div>
        </div>

        {/* Perguntas do grupo */}
        {grupo.perguntas.map((pergunta, idx) => (
          <Card key={pergunta.id} className="p-5 shadow-sm">
            <div className="space-y-4">
              <p className="font-medium text-base leading-relaxed">
                <span className="text-muted-foreground text-sm mr-2">{idx + 1}.</span>
                {pergunta.texto}
              </p>

              {pergunta.tipo === "escala" && (
                <div className="grid grid-cols-1 gap-2">
                  {ESCALA_OPCOES.map(({ valor, label, color }) => {
                    const selecionado = respostas[pergunta.id]?.numerico === valor;
                    return (
                      <button
                        key={valor}
                        onClick={() => handleResponder(pergunta.id, { numerico: valor })}
                        className={`w-full p-3 rounded-xl border-2 text-sm font-medium text-left transition-all ${
                          selecionado
                            ? color.replace("hover:", "") + " border-4 shadow-sm ring-1 ring-offset-1 ring-current"
                            : "border-gray-200 bg-white hover:border-gray-300 text-gray-700"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}

              {pergunta.tipo === "enps" && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">0 = Não recomendaria nada · 10 = Recomendaria com certeza</p>
                  <div className="grid grid-cols-11 gap-1">
                    {Array.from({ length: 11 }, (_, i) => i).map((val) => {
                      const selecionado = respostas[pergunta.id]?.numerico === val;
                      const color = val <= 6 ? "bg-red-100 border-red-300 text-red-800" :
                        val <= 8 ? "bg-amber-100 border-amber-300 text-amber-800" :
                          "bg-green-100 border-green-300 text-green-800";
                      return (
                        <button
                          key={val}
                          onClick={() => handleResponder(pergunta.id, { numerico: val })}
                          className={`aspect-square rounded-lg border-2 text-sm font-bold transition-all ${
                            selecionado ? color + " border-4 shadow-sm" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {val}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {pergunta.tipo === "texto_livre" && (
                <Textarea
                  placeholder="Escreva sua resposta aqui (opcional)..."
                  rows={3}
                  value={respostas[pergunta.id]?.texto || ""}
                  onChange={(e) => handleResponder(pergunta.id, { texto: e.target.value })}
                  className="resize-none"
                />
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Footer fixo com navegação */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-3 flex gap-3">
          {grupoAtual > 0 && (
            <Button variant="outline" onClick={voltarGrupo} className="flex-1">
              <ArrowLeft className="h-4 w-4 mr-2" /> Anterior
            </Button>
          )}
          <Button
            className="flex-1"
            onClick={avancarGrupo}
            disabled={!grupoCompleto() || salvando || submitMutation.isPending}
          >
            {salvando || submitMutation.isPending ? (
              "Enviando..."
            ) : grupoAtual < totalGrupos - 1 ? (
              <>Próximo <ArrowRight className="h-4 w-4 ml-2" /></>
            ) : (
              <>Enviar respostas <CheckCircle className="h-4 w-4 ml-2" /></>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function TelaCentral({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 sm:p-8">
        {children}
      </div>
    </div>
  );
}

function TelaErro({ mensagem }: { mensagem: string }) {
  return (
    <TelaCentral>
      <div className="text-center space-y-4">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="h-7 w-7 text-red-600" />
        </div>
        <h2 className="text-lg font-bold">Link inválido</h2>
        <p className="text-muted-foreground text-sm">{mensagem}</p>
      </div>
    </TelaCentral>
  );
}
