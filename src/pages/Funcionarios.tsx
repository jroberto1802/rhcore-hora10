import { useState, useEffect, useMemo } from 'react';
import removeAccents from 'remove-accents';
import { Link } from 'react-router-dom';
import { Plus, Eye, Edit, Trash2, Search, Filter, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { type Empresa } from '@/hooks/useUserEmpresas';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';

interface Funcionario {
  id: string;
  codigo: string;
  nome_completo: string;
  nome_abreviado: string;
  cargo_atual: string;
  setor_atual: string;
  telefone: string;
  email: string;
  data_admissao: string;
  data_demissao?: string;
  empresa_id: string;
  empresa_nome?: string;
  foto_url?: string;
}

interface FuncionariosProps {
  currentEmpresa: Empresa | null;
  isGroupView: boolean;
  currentGroupId: string | null;
}

export function Funcionarios({ currentEmpresa, isGroupView, currentGroupId }: FuncionariosProps) {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCargo, setFilterCargo] = useState('');
  const [filterSetor, setFilterSetor] = useState('');
  const [filterStatus, setFilterStatus] = useState('ativo');
  const { toast } = useToast();
  const { hasPermission, isSuperAdmin, isLoading: permissionsLoading } = usePermissions(currentEmpresa?.id);
  
  // Permissões específicas
  const canCreate = isSuperAdmin || hasPermission('func.cadastrar');
  const canEdit = isSuperAdmin || hasPermission('func.editar');
  const canDelete = isSuperAdmin || hasPermission('func.excluir');

  useEffect(() => {
    loadFuncionarios();
  }, [currentEmpresa, isGroupView, currentGroupId]);

  const loadFuncionarios = async () => {
    try {
      setLoading(true);
      
      // Usar função segura que aplica mascaramento baseado em role
      const { data: allData, error } = await supabase
        .rpc('funcionarios_safe');
      
      if (error) {
        console.error('Erro ao buscar funcionários:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os funcionários.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      let empresasMap: { [key: string]: string } = {};
      let filteredData = allData || [];

      if (isGroupView && currentGroupId) {
        // Buscar funcionários de todas as empresas do grupo
        const { data: empresas } = await supabase
          .from('empresas')
          .select('id, fantasia')
          .eq('grupo_empresarial_id', currentGroupId);
        
        if (empresas) {
          // Criar mapa de empresas
          empresasMap = empresas.reduce((acc, empresa) => {
            acc[empresa.id] = empresa.fantasia;
            return acc;
          }, {} as { [key: string]: string });
          
          const empresaIds = empresas.map(e => e.id);
          filteredData = filteredData.filter(f => empresaIds.includes(f.empresa_id));
        }
      } else if (currentEmpresa) {
        // Buscar dados da empresa atual
        const { data: empresaData } = await supabase
          .from('empresas')
          .select('id, fantasia')
          .eq('id', currentEmpresa.id)
          .single();
        
        if (empresaData) {
          empresasMap[empresaData.id] = empresaData.fantasia;
        }
        
        filteredData = filteredData.filter(f => f.empresa_id === currentEmpresa.id);
      }
      
      // Adicionar nome da empresa e ordenar
      const funcionariosComEmpresa = filteredData
        .map(funcionario => ({
          ...funcionario,
          empresa_nome: empresasMap[funcionario.empresa_id] || 'Empresa não encontrada'
        }))
        .sort((a, b) => a.nome_completo.localeCompare(b.nome_completo));
      
      setFuncionarios(funcionariosComEmpresa);
      
    } catch (error) {
      console.error('Erro ao buscar funcionários:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os funcionários.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFuncionario = async (funcionarioId: string, nome: string) => {
    try {
      const { error } = await supabase
        .from('funcionarios')
        .delete()
        .eq('id', funcionarioId);

      if (error) {
        console.error('Erro ao excluir funcionário:', error);
        toast({
          title: "Erro",
          description: "Não foi possível excluir o funcionário.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Sucesso",
          description: `Funcionário ${nome} excluído com sucesso.`,
        });
        loadFuncionarios(); // Recarrega a lista
      }
    } catch (error) {
      console.error('Erro ao excluir funcionário:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o funcionário.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const calculateWorkTime = (admissionDate: string) => {
    if (!admissionDate) return '-';
    
    const admission = new Date(admissionDate);
    const today = new Date();
    
    let years = today.getFullYear() - admission.getFullYear();
    let months = today.getMonth() - admission.getMonth();
    
    if (months < 0) {
      years--;
      months += 12;
    }
    
    if (years > 0 && months > 0) {
      return `${years} ano${years > 1 ? 's' : ''} e ${months} ${months > 1 ? 'meses' : 'mês'}`;
    } else if (years > 0) {
      return `${years} ano${years > 1 ? 's' : ''}`;
    } else if (months > 0) {
      return `${months} ${months > 1 ? 'meses' : 'mês'}`;
    } else {
      return 'Menos de 1 mês';
    }
  };

  // Funcionários ativos (sem data de demissão)
  const funcionariosAtivos = useMemo(() => {
    return funcionarios.filter(funcionario => !funcionario.data_demissao);
  }, [funcionarios]);

  // Filtros e busca
  const filteredFuncionarios = useMemo(() => {
    return funcionarios.filter((funcionario) => {
      const normalizedSearchTerm = removeAccents(searchTerm.toLowerCase());
      const matchesSearch = searchTerm === '' || 
        removeAccents(funcionario.nome_completo.toLowerCase()).includes(normalizedSearchTerm) ||
        removeAccents(funcionario.cargo_atual?.toLowerCase() || '').includes(normalizedSearchTerm) ||
        removeAccents(funcionario.setor_atual?.toLowerCase() || '').includes(normalizedSearchTerm);
      
      const matchesCargo = filterCargo === '' || filterCargo === 'all' || funcionario.cargo_atual === filterCargo;
      const matchesSetor = filterSetor === '' || filterSetor === 'all' || funcionario.setor_atual === filterSetor;
      
      const matchesStatus = filterStatus === 'todos' || 
        (filterStatus === 'ativo' && !funcionario.data_demissao) ||
        (filterStatus === 'desativado' && funcionario.data_demissao);
      
      return matchesSearch && matchesCargo && matchesSetor && matchesStatus;
    });
  }, [funcionarios, searchTerm, filterCargo, filterSetor, filterStatus]);

  // Obter cargos únicos para o filtro
  const uniqueCargos = useMemo(() => {
    const cargos = funcionarios
      .map(f => f.cargo_atual)
      .filter(cargo => cargo && cargo.trim() !== '')
      .filter((cargo, index, arr) => arr.indexOf(cargo) === index)
      .sort();
    return cargos;
  }, [funcionarios]);

  // Obter setores únicos para o filtro
  const uniqueSetores = useMemo(() => {
    const setores = funcionarios
      .map(f => f.setor_atual)
      .filter(setor => setor && setor.trim() !== '')
      .filter((setor, index, arr) => arr.indexOf(setor) === index)
      .sort();
    return setores;
  }, [funcionarios]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Carregando funcionários...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Funcionários</h1>
          <p className="text-muted-foreground">
            {isGroupView 
              ? `Visualizando funcionários de todas as empresas do grupo`
              : `Gerenciar funcionários ${currentEmpresa ? `da ${currentEmpresa.fantasia}` : ''}`
            }
          </p>
        </div>
        {(currentEmpresa || isGroupView) && canCreate && (
          <Button asChild>
            <Link to="/funcionarios/novo">
              <Plus className="h-4 w-4 mr-2" />
              Novo Funcionário
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Lista de Funcionários</CardTitle>
            <div className="text-sm text-muted-foreground">
              Total de funcionários ativos: <span className="font-semibold text-foreground">{funcionariosAtivos.length}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtros e Busca */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Buscar por nome, cargo ou setor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[150px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativado</SelectItem>
                    <SelectItem value="desativado">Desativado</SelectItem>
                    <SelectItem value="todos">Todos</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterCargo} onValueChange={setFilterCargo}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filtrar por cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os cargos</SelectItem>
                    {uniqueCargos.map((cargo) => (
                      <SelectItem key={cargo} value={cargo}>
                        {cargo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterSetor} onValueChange={setFilterSetor}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filtrar por setor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os setores</SelectItem>
                    {uniqueSetores.map((setor) => (
                      <SelectItem key={setor} value={setor}>
                        {setor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {funcionarios.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum funcionário encontrado.</p>
              {(currentEmpresa || isGroupView) && (
                <Button asChild className="mt-4">
                  <Link to="/funcionarios/novo">
                    <Plus className="h-4 w-4 mr-2" />
                    Cadastrar Primeiro Funcionário
                  </Link>
                </Button>
              )}
            </div>
          ) : filteredFuncionarios.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum funcionário encontrado com os filtros aplicados.</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => {
                  setSearchTerm('');
                  setFilterCargo('all');
                  setFilterSetor('all');
                  setFilterStatus('ativo');
                }}
              >
                Limpar Filtros
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-muted-foreground text-xs">#</TableHead>
                  <TableHead>Foto</TableHead>
                  {isGroupView && <TableHead>Empresa</TableHead>}
                  <TableHead>Nome</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Tempo de Empresa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFuncionarios.map((funcionario, index) => (
                  <TableRow key={funcionario.id}>
                    <TableCell className="w-10 text-xs text-muted-foreground">{index + 1}</TableCell>
                    <TableCell>
                      {funcionario.foto_url ? (
                        <img
                          src={funcionario.foto_url}
                          alt={`Foto de ${funcionario.nome_completo}`}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <User className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    {isGroupView && (
                      <TableCell>
                        <span className="font-medium text-primary">
                          {funcionario.empresa_nome || 'Empresa não encontrada'}
                        </span>
                      </TableCell>
                    )}
                    <TableCell>
                      <div>
                        <p className="font-medium uppercase">{funcionario.nome_completo}</p>
                        {funcionario.nome_abreviado && (
                          <p className="text-sm text-muted-foreground">{funcionario.nome_abreviado}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{funcionario.cargo_atual || '-'}</TableCell>
                    <TableCell>{funcionario.setor_atual || '-'}</TableCell>
                    <TableCell>{calculateWorkTime(funcionario.data_admissao)}</TableCell>
                    <TableCell>
                      {funcionario.data_demissao ? (
                        <Badge variant="destructive">Desativado</Badge>
                      ) : (
                        <Badge variant="default">Ativo</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <Link to={`/funcionarios/${funcionario.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <Link to={`/funcionarios/${funcionario.id}/editar`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                        {canDelete && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir o funcionário "{funcionario.nome_completo}"? 
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteFuncionario(funcionario.id, funcionario.nome_completo)}
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}