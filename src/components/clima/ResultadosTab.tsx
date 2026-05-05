import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Cell,
} from "recharts";
import { TrendingUp, TrendingDown, Users, Star, AlertTriangle } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

interface Props {
  campanha: any;
  campanhasAnteriores?: any[];
}

function getClimaClass(score: number) {
  if (score < 60) return { label: "Crítico", className: "text-red-600 bg-red-50" };
  if (score < 75) return { label: "Atenção", className: "text-amber-600 bg-amber-50" };
  return { label: "Saudável", className: "text-green-600 bg-green-50" };
}

const PILARES_CORES = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#14b8a6", "#f97316", "#6366f1",
  "#84cc16", "#e11d48", "#0ea5e9",
];

export function ResultadosTab({ campanha }: Props) {
  const db = supabase as any;
  const [setorFilter, setSetorFilter] = useState("todos");
  const [unidadeFilter, setUnidadeFilter] = useState("todos");

  const { data: respostas = [] } = useQuery({
    queryKey: ["clima_respostas_completas", campanha.id],
    queryFn: async () => {
      const { data, error } = await db
        .from("clima_respostas")
        .select(`
          *,
          cabecalho:clima_respostas_cabecalho(unidade, setor, turno, campanha_id)
        `)
        .eq("cabecalho.campanha_id", campanha.id);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: cabecalhos = [] } = useQuery({
    queryKey: ["clima_cabecalhos", campanha.id],
    queryFn: async () => {
      const { data, error } = await db
        .from("clima_respostas_cabecalho")
        .select("*")
        .eq("campanha_id", campanha.id);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: participantes = [] } = useQuery({
    queryKey: ["clima_participantes", campanha.id],
    queryFn: async () => {
      const { data } = await db
        .from("clima_participantes")
        .select("status, unidade, setor, turno")
        .eq("campanha_id", campanha.id);
      return data || [];
    },
  });

  const unidades = useMemo(() => {
    const s = new Set(cabecalhos.map((c: any) => c.unidade).filter(Boolean));
    return Array.from(s) as string[];
  }, [cabecalhos]);

  const setores = useMemo(() => {
    const s = new Set(cabecalhos.map((c: any) => c.setor).filter(Boolean));
    return Array.from(s) as string[];
  }, [cabecalhos]);

  const respostasFiltradas = useMemo(() => {
    return respostas.filter((r: any) => {
      const cab = r.cabecalho;
      if (!cab) return false;
      if (setorFilter !== "todos" && cab.setor !== setorFilter) return false;
      if (unidadeFilter !== "todos" && cab.unidade !== unidadeFilter) return false;
      return true;
    });
  }, [respostas, setorFilter, unidadeFilter]);

  const numericas = respostasFiltradas.filter((r: any) => r.valor_numerico != null);

  // Clima geral
  const climaGeral = numericas.length > 0
    ? Math.round(numericas.reduce((s: number, r: any) => s + r.valor_numerico, 0) / numericas.length)
    : null;

  // eNPS (perguntas tipo enps, escala 0-10)
  const enpsRespostas = respostasFiltradas.filter((r: any) => r.valor_numerico != null && r.tipo === "enps");
  let eNPS: number | null = null;
  if (enpsRespostas.length > 0) {
    const promotores = enpsRespostas.filter((r: any) => r.valor_numerico >= 9).length;
    const detratores = enpsRespostas.filter((r: any) => r.valor_numerico <= 6).length;
    eNPS = Math.round(((promotores - detratores) / enpsRespostas.length) * 100);
  }

  // Participação
  const totalPart = participantes.length;
  const respondidos = participantes.filter((p: any) => p.status === "respondido").length;
  const participacaoPct = totalPart > 0 ? Math.round((respondidos / totalPart) * 100) : 0;

  // Score por pilar
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
    })).sort((a, b) => b.score - a.score);
  }, [numericas]);

  const pillarCritico = scoresPorPilar[scoresPorPilar.length - 1];
  const pillarMelhor = scoresPorPilar[0];

  // Score por setor
  const scoresPorSetor = useMemo(() => {
    const agrupados: Record<string, number[]> = {};
    respostasFiltradas.forEach((r: any) => {
      if (r.valor_numerico == null) return;
      const setor = r.cabecalho?.setor || "Sem setor";
      if (!agrupados[setor]) agrupados[setor] = [];
      agrupados[setor].push(r.valor_numerico);
    });
    return Object.entries(agrupados).map(([setor, vals]) => ({
      setor,
      score: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
    })).sort((a, b) => b.score - a.score);
  }, [respostasFiltradas]);

  const climaInfo = climaGeral != null ? getClimaClass(climaGeral) : null;

  const hasData = numericas.length > 0;

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex gap-3">
        <Select value={unidadeFilter} onValueChange={setUnidadeFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Unidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as unidades</SelectItem>
            {unidades.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={setorFilter} onValueChange={setSetorFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Setor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os setores</SelectItem>
            {setores.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {!hasData ? (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
          <TrendingUp className="h-10 w-10 opacity-30 mb-3" />
          <p className="font-medium">Nenhuma resposta coletada ainda</p>
          <p className="text-sm mt-1">Os dados aparecerão aqui quando os participantes responderem.</p>
        </div>
      ) : (
        <>
          {/* Cards KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Clima Geral</p>
              {climaGeral != null ? (
                <>
                  <p className="text-3xl font-bold text-primary">{climaGeral}%</p>
                  {climaInfo && (
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${climaInfo.className}`}>
                      {climaInfo.label}
                    </span>
                  )}
                </>
              ) : <p className="text-2xl font-bold text-muted-foreground">—</p>}
            </Card>

            <Card className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">eNPS</p>
              {eNPS != null ? (
                <p className={`text-3xl font-bold ${eNPS >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {eNPS > 0 ? "+" : ""}{eNPS}
                </p>
              ) : <p className="text-2xl font-bold text-muted-foreground">—</p>}
            </Card>

            <Card className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Participação</p>
              <p className="text-3xl font-bold text-primary">{participacaoPct}%</p>
              <p className="text-xs text-muted-foreground mt-1">{respondidos}/{totalPart}</p>
            </Card>

            <Card className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Pilar Crítico</p>
              {pillarCritico ? (
                <>
                  <p className="font-semibold text-sm text-red-600 leading-tight mt-1">{pillarCritico.pilar}</p>
                  <p className="text-xl font-bold text-red-600">{pillarCritico.score}%</p>
                </>
              ) : <p className="text-muted-foreground text-sm mt-2">—</p>}
            </Card>

            <Card className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Melhor Pilar</p>
              {pillarMelhor ? (
                <>
                  <p className="font-semibold text-sm text-green-600 leading-tight mt-1">{pillarMelhor.pilar}</p>
                  <p className="text-xl font-bold text-green-600">{pillarMelhor.score}%</p>
                </>
              ) : <p className="text-muted-foreground text-sm mt-2">—</p>}
            </Card>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ranking por setor */}
            {scoresPorSetor.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Ranking por Setor</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={scoresPorSetor}
                      layout="vertical"
                      margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="setor" tick={{ fontSize: 11 }} width={90} />
                      <Tooltip formatter={(v: any) => [`${v}%`, "Score"]} />
                      <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                        {scoresPorSetor.map((entry, idx) => {
                          const info = getClimaClass(entry.score);
                          const color = entry.score < 60 ? "#ef4444" : entry.score < 75 ? "#f59e0b" : "#10b981";
                          return <Cell key={idx} fill={color} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Clima por pilar */}
            {scoresPorPilar.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Score por Pilar</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={scoresPorPilar.slice(0, 8)}
                      margin={{ top: 0, right: 16, bottom: 40, left: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="pilar"
                        tick={{ fontSize: 10 }}
                        angle={-35}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: any) => [`${v}%`, "Score"]} />
                      <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                        {scoresPorPilar.slice(0, 8).map((entry, idx) => {
                          const color = entry.score < 60 ? "#ef4444" : entry.score < 75 ? "#f59e0b" : "#10b981";
                          return <Cell key={idx} fill={color} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Heatmap Pilar x Setor */}
          {scoresPorPilar.length > 0 && scoresPorSetor.length > 1 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Heatmap — Pilar × Setor</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <HeatmapPilarSetor respostas={respostasFiltradas} />
              </CardContent>
            </Card>
          )}

          {/* Legenda classificação */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
              Saudável (≥ 75)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
              Atenção (60–74)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
              Crítico (&lt; 60)
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function HeatmapPilarSetor({ respostas }: { respostas: any[] }) {
  const pilares = [...new Set(respostas.map((r: any) => r.pilar_nome).filter(Boolean))] as string[];
  const setores = [...new Set(respostas.map((r: any) => r.cabecalho?.setor).filter(Boolean))] as string[];

  if (pilares.length === 0 || setores.length === 0) return null;

  const getScore = (pilar: string, setor: string) => {
    const vals = respostas
      .filter((r: any) => r.pilar_nome === pilar && r.cabecalho?.setor === setor && r.valor_numerico != null)
      .map((r: any) => r.valor_numerico);
    if (vals.length === 0) return null;
    return Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length);
  };

  const getBg = (score: number | null) => {
    if (score == null) return "bg-muted/30 text-muted-foreground";
    if (score < 60) return "bg-red-100 text-red-800 font-semibold";
    if (score < 75) return "bg-amber-100 text-amber-800 font-semibold";
    return "bg-green-100 text-green-800 font-semibold";
  };

  return (
    <table className="text-xs w-full border-collapse">
      <thead>
        <tr>
          <th className="text-left p-2 text-muted-foreground font-medium min-w-[140px]">Pilar \ Setor</th>
          {setores.map((s) => (
            <th key={s} className="p-2 text-center text-muted-foreground font-medium min-w-[80px]">
              {s}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {pilares.map((pilar) => (
          <tr key={pilar}>
            <td className="p-2 font-medium text-foreground border-t">{pilar}</td>
            {setores.map((setor) => {
              const score = getScore(pilar, setor);
              return (
                <td key={setor} className={`p-2 text-center border-t rounded ${getBg(score)}`}>
                  {score != null ? `${score}%` : "—"}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
