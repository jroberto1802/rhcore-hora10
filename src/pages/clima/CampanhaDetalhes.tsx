import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Wind } from "lucide-react";
import { VizaoGeralTab } from "@/components/clima/VizaoGeralTab";
import { ParticipacaoTab } from "@/components/clima/ParticipacaoTab";
import { ResultadosTab } from "@/components/clima/ResultadosTab";
import { DiagnosticoTab } from "@/components/clima/DiagnosticoTab";
import { PlanosAcaoTab } from "@/components/clima/PlanosAcaoTab";
import { ConfiguracoesTab } from "@/components/clima/ConfiguracoesTab";

interface Props {
  currentEmpresa: any;
  isGroupView?: boolean;
  currentGroupId?: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  rascunho: { label: "Rascunho", className: "bg-gray-100 text-gray-700 border-gray-200" },
  ativa: { label: "Ativa", className: "bg-green-100 text-green-700 border-green-200" },
  encerrada: { label: "Encerrada", className: "bg-blue-100 text-blue-700 border-blue-200" },
};

export function CampanhaDetalhes({ currentEmpresa }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const db = supabase as any;

  const { data: campanha, isLoading } = useQuery({
    queryKey: ["clima_campanha", id],
    queryFn: async () => {
      const { data, error } = await db
        .from("clima_campanhas")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: participantes = [] } = useQuery({
    queryKey: ["clima_participantes", id],
    queryFn: async () => {
      const { data } = await db
        .from("clima_participantes")
        .select("status")
        .eq("campanha_id", id);
      return data || [];
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!campanha) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <p>Campanha não encontrada.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/clima/pesquisas")}>
          Voltar
        </Button>
      </div>
    );
  }

  const total = participantes.length;
  const respondidos = participantes.filter((p: any) => p.status === "respondido").length;
  const cfg = STATUS_CONFIG[campanha.status] || STATUS_CONFIG.rascunho;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/clima/pesquisas")} className="flex-shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
          <Wind className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold truncate">{campanha.nome}</h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border flex-shrink-0 ${cfg.className}`}>
              {cfg.label}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {campanha.ano} · {campanha.tipo === "anonima" ? "Pesquisa anônima" : "Pesquisa identificada"}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="visao-geral" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="visao-geral" className="text-xs sm:text-sm">Visão Geral</TabsTrigger>
          <TabsTrigger value="participacao" className="text-xs sm:text-sm">
            Participação
            {total > 0 && (
              <span className="ml-1.5 bg-primary/10 text-primary text-xs font-bold px-1.5 py-0.5 rounded-full">
                {respondidos}/{total}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="resultados" className="text-xs sm:text-sm">Resultados</TabsTrigger>
          <TabsTrigger value="diagnostico" className="text-xs sm:text-sm">Diagnóstico</TabsTrigger>
          <TabsTrigger value="planos" className="text-xs sm:text-sm">Planos de Ação</TabsTrigger>
          <TabsTrigger value="configuracoes" className="text-xs sm:text-sm">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral">
          <VizaoGeralTab
            campanha={campanha}
            participacaoStats={{ total, respondidos }}
          />
        </TabsContent>

        <TabsContent value="participacao">
          <ParticipacaoTab campanha={campanha} />
        </TabsContent>

        <TabsContent value="resultados">
          <ResultadosTab campanha={campanha} />
        </TabsContent>

        <TabsContent value="diagnostico">
          <DiagnosticoTab campanha={campanha} />
        </TabsContent>

        <TabsContent value="planos">
          <PlanosAcaoTab campanha={campanha} currentEmpresa={currentEmpresa} />
        </TabsContent>

        <TabsContent value="configuracoes">
          <ConfiguracoesTab campanha={campanha} currentEmpresa={currentEmpresa} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
