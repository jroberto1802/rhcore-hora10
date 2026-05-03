import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuditLogFooter } from "@/components/AuditLogFooter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";

export default function CandidatoDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: candidato, isLoading: loadingCandidato } = useQuery({
    queryKey: ["candidato", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidatos")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: entrevistas, isLoading: loadingEntrevistas } = useQuery({
    queryKey: ["entrevistas-candidato", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entrevistas")
        .select(`
          *,
          processos_seletivos (
            nome_processo,
            tipo,
            cargo:cargos(nome)
          )
        `)
        .eq("candidato_id", id)
        .order("data_entrevista", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  if (loadingCandidato) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!candidato) {
    return (
      <div className="text-center">
        <p className="text-muted-foreground">Candidato não encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/banco-talentos")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold">{candidato.nome_completo}</h1>
        <p className="text-muted-foreground mt-1">
          Detalhes completos do candidato
        </p>
      </div>

      <Tabs defaultValue="dados" className="w-full">
        <TabsList>
          <TabsTrigger value="dados">Dados Cadastrais</TabsTrigger>
          <TabsTrigger value="participacoes">Participações</TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Candidato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Linha principal */}
              <div className="flex flex-wrap items-center gap-4 text-lg">
                <span className="font-semibold">{candidato.nome_completo}</span>
                <span className="text-muted-foreground">•</span>
                <span>{candidato.contato_whatsapp || "-"}</span>
                <span className="text-muted-foreground">•</span>
                <span>{candidato.formacao || "-"}</span>
              </div>

              {/* Currículo e Endereço */}
              <div className="space-y-3">
                {candidato.curriculo_url && (
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(candidato.curriculo_url, "_blank")}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Visualizar Currículo
                    </Button>
                  </div>
                )}
                
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Endereço</p>
                  <p className="font-medium">
                    {[candidato.bairro, candidato.cidade, candidato.uf]
                      .filter(Boolean)
                      .join(", ") || "-"}
                  </p>
                </div>
              </div>

              {/* Funções que pode exercer */}
              {candidato.funcoes && candidato.funcoes.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Funções que pode exercer
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {candidato.funcoes.map((funcao: string, idx: number) => (
                      <Badge key={idx} variant="secondary">
                        {funcao}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* CPF - informação adicional */}
              {candidato.cpf && (
                <div>
                  <p className="text-sm text-muted-foreground">CPF</p>
                  <p className="font-medium">{candidato.cpf}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="participacoes">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Participações</CardTitle>
              <CardDescription>
                Entrevistas e processos seletivos em que o candidato participou
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingEntrevistas ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : entrevistas && entrevistas.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vaga/Função</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Data da Entrevista</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Observação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entrevistas.map((entrevista: any) => (
                      <TableRow key={entrevista.id}>
                        <TableCell className="font-medium">
                          {entrevista.processos_seletivos?.cargo?.nome || "-"}
                        </TableCell>
                        <TableCell>
                          {entrevista.processos_seletivos?.tipo || "-"}
                        </TableCell>
                        <TableCell>
                          {format(
                            toZonedTime(
                              new Date(entrevista.data_entrevista),
                              "America/Sao_Paulo"
                            ),
                            "dd/MM/yyyy 'às' HH:mm",
                            { locale: ptBR }
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              entrevista.status === "Aprovado"
                                ? "default"
                                : entrevista.status === "Reprovado"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {entrevista.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {entrevista.observacao || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma participação registrada
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Rodapé de Auditoria */}
      {candidato && (
        <AuditLogFooter 
          tabela="candidatos" 
          registroId={candidato.id} 
          updatedAt={candidato.updated_at}
          empresaId={candidato.empresa_id}
        />
      )}
    </div>
  );
}
