import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { TrendingDown, TrendingUp, Minus, AlertTriangle, MessageSquare, Search } from "lucide-react";

interface Props {
  campanha: any;
}

function getClassificacao(score: number) {
  if (score < 60) return { label: "Crítico", className: "bg-red-100 text-red-700 border-red-200" };
  if (score < 75) return { label: "Atenção", className: "bg-amber-100 text-amber-700 border-amber-200" };
  return { label: "Saudável", className: "bg-green-100 text-green-700 border-green-200" };
}

function ScoreBadge({ score }: { score: number }) {
  const cls = getClassificacao(score);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls.className}`}>
      {cls.label} — {score}%
    </span>
  );
}

function ProgressBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  const color = value < 60 ? "bg-red-500" : value < 75 ? "bg-amber-500" : "bg-green-500";
  return (
    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function DiagnosticoTab({ campanha }: Props) {
  const db = supabase as any;
  const [setorSelecionado, setSetorSelecionado] = useState("todos");
  const [searchComentario, setSearchComentario] = useState("");

  const { data: respostas = [] } = useQuery({
    queryKey: ["clima_respostas_diag", campanha.id],
    queryFn: async () => {
      const { data, error } = await db
        .from("clima_respostas")
        .select("*, cabecalho:clima_respostas_cabecalho(unidade, setor, turno, campanha_id)")
        .eq("cabecalho.campanha_id", campanha.id);
      if (error) throw error;
      return data || [];
    },
  });

  const setores = useMemo(() => {
    const s = new Set(respostas.map((r: any) => r.cabecalho?.setor).filter(Boolean));
    return Array.from(s) as string[];
  }, [respostas]);

  const respostasFiltradas = useMemo(() => {
    if (setorSelecionado === "todos") return respostas;
    return respostas.filter((r: any) => r.cabecalho?.setor === setorSelecionado);
  }, [respostas, setorSelecionado]);

  const numericas = respostasFiltradas.filter((r: any) => r.valor_numerico != null);

  const scoreGeral = numericas.length > 0
    ? Math.round(numericas.reduce((s: number, r: any) => s + r.valor_numerico, 0) / numericas.length)
    : null;

  const scoreGeralEmpresa = useMemo(() => {
    const all = respostas.filter((r: any) => r.valor_numerico != null);
    if (all.length === 0) return null;
    return Math.round(all.reduce((s: number, r: any) => s + r.valor_numerico, 0) / all.length);
  }, [respostas]);

  const scoresPorPilar = useMemo(() => {
    const agrupados: Record<string, number[]> = {};
    numericas.forEach((r: any) => {
      const pilar = r.pilar_nome || "Sem pilar";
      if (!agrupados[pilar]) agrupados[pilar] = [];
      agrupados[pilar].push(r.valor_numerico);
    });
    return Object.entries(agrupados).map(([pilar, vals]) => ({
      pilar,
      score: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
      total: vals.length,
    })).sort((a, b) => a.score - b.score);
  }, [numericas]);

  const mediaEmpresaPorPilar = useMemo(() => {
    const agrupados: Record<string, number[]> = {};
    respostas.filter((r: any) => r.valor_numerico != null).forEach((r: any) => {
      const pilar = r.pilar_nome || "Sem pilar";
      if (!agrupados[pilar]) agrupados[pilar] = [];
      agrupados[pilar].push(r.valor_numerico);
    });
    const result: Record<string, number> = {};
    Object.entries(agrupados).forEach(([pilar, vals]) => {
      result[pilar] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    });
    return result;
  }, [respostas]);

  const insights = useMemo(() => {
    const list: { tipo: "critico" | "atencao" | "positivo"; mensagem: string }[] = [];
    scoresPorPilar.forEach(({ pilar, score }) => {
      const mediaEmp = mediaEmpresaPorPilar[pilar];
      if (score < 60) {
        list.push({ tipo: "critico", mensagem: `Pilar "${pilar}" está em estado crítico (${score}%)` });
      } else if (score < 75) {
        list.push({ tipo: "atencao", mensagem: `Pilar "${pilar}" merece atenção (${score}%)` });
      }
      if (mediaEmp && score < mediaEmp - 10) {
        list.push({
          tipo: "atencao",
          mensagem: `"${pilar}" está ${mediaEmp - score}% abaixo da média da empresa (${mediaEmp}%)`,
        });
      }
    });
    if (scoreGeral != null && scoreGeralEmpresa != null && scoreGeral < scoreGeralEmpresa - 10) {
      const setor = setorSelecionado !== "todos" ? setorSelecionado : "este grupo";
      list.push({
        tipo: "critico",
        mensagem: `${setor} está ${scoreGeralEmpresa - scoreGeral}% abaixo da média geral da empresa`,
      });
    }
    return list;
  }, [scoresPorPilar, mediaEmpresaPorPilar, scoreGeral, scoreGeralEmpresa, setorSelecionado]);

  const comentarios = useMemo(() => {
    return respostasFiltradas
      .filter((r: any) => r.valor_texto && r.valor_texto.trim())
      .filter((r: any) =>
        !searchComentario || r.valor_texto.toLowerCase().includes(searchComentario.toLowerCase())
      );
  }, [respostasFiltradas, searchComentario]);

  if (numericas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
        <AlertTriangle className="h-10 w-10 opacity-30 mb-3" />
        <p className="font-medium">Nenhum dado disponível para diagnóstico</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtro de setor */}
      <div className="flex items-center gap-3">
        <Select value={setorSelecionado} onValueChange={setSetorSelecionado}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Filtrar por setor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os setores</SelectItem>
            {setores.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        {setorSelecionado !== "todos" && (
          <span className="text-sm text-muted-foreground">
            Analisando: <strong>{setorSelecionado}</strong>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score geral */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Score Geral</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {scoreGeral != null && (
              <>
                <div className="text-center">
                  <p className="text-5xl font-bold text-primary">{scoreGeral}%</p>
                  <div className="mt-2">
                    <ScoreBadge score={scoreGeral} />
                  </div>
                </div>
                {scoreGeralEmpresa != null && setorSelecionado !== "todos" && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Vs. média da empresa</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{scoreGeralEmpresa}%</span>
                      {scoreGeral > scoreGeralEmpresa ? (
                        <span className="flex items-center gap-0.5 text-green-600 text-xs">
                          <TrendingUp className="h-3 w-3" />
                          +{scoreGeral - scoreGeralEmpresa}%
                        </span>
                      ) : scoreGeral < scoreGeralEmpresa ? (
                        <span className="flex items-center gap-0.5 text-red-600 text-xs">
                          <TrendingDown className="h-3 w-3" />
                          {scoreGeral - scoreGeralEmpresa}%
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5 text-muted-foreground text-xs">
                          <Minus className="h-3 w-3" /> igual
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Insights automáticos */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Insights automáticos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {insights.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum alerta identificado. Clima em bom estado.</p>
            ) : (
              <div className="space-y-2">
                {insights.map((insight, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                      insight.tipo === "critico"
                        ? "bg-red-50 text-red-800 border border-red-200"
                        : "bg-amber-50 text-amber-800 border border-amber-200"
                    }`}
                  >
                    {insight.tipo === "critico" ? (
                      <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 text-red-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-600" />
                    )}
                    {insight.mensagem}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Score por pilares */}
      {scoresPorPilar.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Score por Pilar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scoresPorPilar.map(({ pilar, score }) => {
                const mediaEmp = mediaEmpresaPorPilar[pilar];
                const diff = mediaEmp != null ? score - mediaEmp : null;
                return (
                  <div key={pilar} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{pilar}</span>
                        <ScoreBadge score={score} />
                      </div>
                      <div className="flex items-center gap-3">
                        {diff != null && (
                          <span className={`text-xs flex items-center gap-0.5 ${diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                            {diff > 0 ? <TrendingUp className="h-3 w-3" /> : diff < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                            {diff > 0 ? "+" : ""}{diff}% vs empresa
                          </span>
                        )}
                        <span className="text-sm font-bold w-12 text-right">{score}%</span>
                      </div>
                    </div>
                    <ProgressBar value={score} />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comentários */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Comentários abertos ({comentarios.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filtrar comentários..."
              value={searchComentario}
              onChange={(e) => setSearchComentario(e.target.value)}
              className="pl-9"
            />
          </div>
          {comentarios.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum comentário disponível
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {comentarios.map((r: any, i: number) => (
                <div key={i} className="p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    {r.pilar_nome && (
                      <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        {r.pilar_nome}
                      </span>
                    )}
                    {r.cabecalho?.setor && (
                      <span className="text-xs text-muted-foreground">{r.cabecalho.setor}</span>
                    )}
                  </div>
                  <p className="text-sm text-foreground">{r.valor_texto}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
