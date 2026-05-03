import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Eye, Pencil, Trash2, Plus, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { type Empresa } from "@/hooks/useUserEmpresas";
import { CandidatoModal } from "@/components/CandidatoModal";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BancoTalentosProps {
  currentEmpresa: Empresa | null;
  isGroupView?: boolean;
  currentGroupId?: string | null;
}

interface CandidatoComStatus {
  id: string;
  empresa_id: string;
  nome_completo: string;
  cpf: string | null;
  contato_whatsapp: string | null;
  curriculo_url: string | null;
  cep: string | null;
  logradouro: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  complemento: string | null;
  formacao: string | null;
  funcoes: string[] | null;
  created_at: string;
  updated_at: string;
  ultimo_status: string | null;
}

export default function BancoTalentos({
  currentEmpresa,
  isGroupView,
  currentGroupId,
}: BancoTalentosProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCidade, setFilterCidade] = useState("");
  const [filterUF, setFilterUF] = useState("");
  const [filterFuncao, setFilterFuncao] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCandidato, setSelectedCandidato] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [candidatoToDelete, setCandidatoToDelete] = useState<any>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: candidatos, isLoading } = useQuery<CandidatoComStatus[]>({
    queryKey: ["banco-talentos", currentEmpresa?.id, currentGroupId],
    queryFn: async (): Promise<CandidatoComStatus[]> => {
      let query = supabase
        .from("candidatos")
        .select("*")
        .order("nome_completo");

      if (isGroupView && currentGroupId) {
        const { data: empresasData } = await supabase
          .from("empresas")
          .select("id")
          .eq("grupo_empresarial_id", currentGroupId);

        if (empresasData && empresasData.length > 0) {
          const empresaIds = empresasData.map((e) => e.id);
          query = query.in("empresa_id", empresaIds);
        }
      } else if (currentEmpresa) {
        query = query.eq("empresa_id", currentEmpresa.id);
      }

      const { data: candidatosData, error } = await query;
      if (error) throw error;
      if (!candidatosData) return [];

      // Buscar status da última entrevista de cada candidato
      const candidatosComStatus = await Promise.all(
        candidatosData.map(async (candidato) => {
          const { data: ultimaEntrevista } = await supabase
            .from("entrevistas")
            .select("status")
            .eq("candidato_id", candidato.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            ...candidato,
            ultimo_status: ultimaEntrevista?.status || null,
          };
        })
      );
      
      return candidatosComStatus;
    },
    enabled: !!(currentEmpresa || (isGroupView && currentGroupId)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("candidatos")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banco-talentos"] });
      toast.success("Candidato excluído com sucesso");
      setDeleteDialogOpen(false);
      setCandidatoToDelete(null);
    },
    onError: (error) => {
      toast.error("Erro ao excluir candidato");
      console.error(error);
    },
  });

  // Obter valores únicos para filtros
  const uniqueCidades = useMemo(() => {
    const cidades = candidatos
      ?.map((c) => c.cidade)
      .filter((cidade) => cidade && cidade.trim() !== "")
      .filter((cidade, index, arr) => arr.indexOf(cidade) === index)
      .sort();
    return cidades || [];
  }, [candidatos]);

  const uniqueUFs = useMemo(() => {
    const ufs = candidatos
      ?.map((c) => c.uf)
      .filter((uf) => uf && uf.trim() !== "")
      .filter((uf, index, arr) => arr.indexOf(uf) === index)
      .sort();
    return ufs || [];
  }, [candidatos]);

  const uniqueFuncoes = useMemo(() => {
    const funcoes = candidatos
      ?.flatMap((c) => c.funcoes || [])
      .filter((funcao, index, arr) => arr.indexOf(funcao) === index)
      .sort();
    return funcoes || [];
  }, [candidatos]);

  const uniqueStatus = useMemo(() => {
    const status = candidatos
      ?.map((c) => c.ultimo_status)
      .filter((status) => status && status.trim() !== "")
      .filter((status, index, arr) => arr.indexOf(status) === index)
      .sort();
    return status || [];
  }, [candidatos]);

  const filteredCandidatos = useMemo(() => {
    return candidatos?.filter((candidato) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        searchTerm === "" ||
        candidato.nome_completo.toLowerCase().includes(searchLower) ||
        candidato.funcoes?.some((f: string) => f.toLowerCase().includes(searchLower));

      const matchesCidade =
        filterCidade === "" || filterCidade === "all" || candidato.cidade === filterCidade;
      const matchesUF = filterUF === "" || filterUF === "all" || candidato.uf === filterUF;
      const matchesFuncao =
        filterFuncao === "" ||
        filterFuncao === "all" ||
        candidato.funcoes?.includes(filterFuncao);
      const matchesStatus =
        filterStatus === "" || filterStatus === "all" || candidato.ultimo_status === filterStatus;

      return matchesSearch && matchesCidade && matchesUF && matchesFuncao && matchesStatus;
    });
  }, [candidatos, searchTerm, filterCidade, filterUF, filterFuncao, filterStatus]);

  const handleEdit = (candidato: any) => {
    setSelectedCandidato(candidato);
    setIsModalOpen(true);
  };

  const handleDelete = (candidato: any) => {
    setCandidatoToDelete(candidato);
    setDeleteDialogOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedCandidato(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Banco de Talentos</h1>
          <p className="text-muted-foreground mt-1">
            Repositório central de candidatos para futuros recrutamentos
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} disabled={!currentEmpresa}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Candidato
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Candidatos</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filtros e Busca */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Pesquisar por nome ou função..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={filterCidade} onValueChange={setFilterCidade}>
                  <SelectTrigger className="w-[150px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Cidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {uniqueCidades.map((cidade) => (
                      <SelectItem key={cidade} value={cidade}>
                        {cidade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterUF} onValueChange={setFilterUF}>
                  <SelectTrigger className="w-[120px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="UF" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {uniqueUFs.map((uf) => (
                      <SelectItem key={uf} value={uf}>
                        {uf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterFuncao} onValueChange={setFilterFuncao}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Função" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {uniqueFuncoes.map((funcao) => (
                      <SelectItem key={funcao} value={funcao}>
                        {funcao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[150px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {uniqueStatus.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {filteredCandidatos?.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum candidato encontrado.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cidade-UF</TableHead>
                  <TableHead>Bairro</TableHead>
                  <TableHead>Funções</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCandidatos?.map((candidato) => (
                  <TableRow key={candidato.id}>
                    <TableCell className="font-medium">
                      {candidato.nome_completo}
                    </TableCell>
                    <TableCell>
                      {candidato.cidade && candidato.uf
                        ? `${candidato.cidade}-${candidato.uf}`
                        : candidato.cidade || candidato.uf || "-"}
                    </TableCell>
                    <TableCell>
                      {candidato.bairro || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {candidato.funcoes && candidato.funcoes.length > 0 ? (
                          candidato.funcoes.map((funcao: string, idx: number) => (
                            <Badge key={idx} variant="secondary">
                              {funcao}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {candidato.ultimo_status ? (
                        <Badge
                          variant={
                            candidato.ultimo_status === "Aprovado"
                              ? "default"
                              : candidato.ultimo_status === "Reprovado"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {candidato.ultimo_status}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/banco-talentos/${candidato.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(candidato)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(candidato)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CandidatoModal
        open={isModalOpen}
        onOpenChange={handleModalClose}
        candidato={selectedCandidato}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["banco-talentos"] });
        }}
        empresaId={currentEmpresa?.id || ""}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o candidato{" "}
              <strong>{candidatoToDelete?.nome_completo}</strong>? Esta ação não
              pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(candidatoToDelete?.id)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
