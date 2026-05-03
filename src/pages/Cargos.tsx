import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, ArrowLeft, Eye, Save, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { type Empresa } from '@/hooks/useUserEmpresas';
import { CargoExamesTab } from '@/components/cargos/CargoExamesTab';
import { CargoTreinamentosTab } from '@/components/cargos/CargoTreinamentosTab';
import { CargoRiscosTab } from '@/components/cargos/CargoRiscosTab';
import { CargoEPIsTab } from '@/components/cargos/CargoEPIsTab';
import { TrilhaCarreiraManager } from '@/components/cargos/TrilhaCarreiraManager';
import { usePermissions } from '@/hooks/usePermissions';

interface Cargo {
  id: string;
  nome: string;
  nome_completo_cargo: string;
  tipo_cargo: string;
  nivel: string;
  salario: number;
  cbo: string | null;
  grau: string | null;
  descricao_cargo: string | null;
  atividades_responsabilidades: string | null;
  sistemas_acessos: string | null;
  competencias_exigidas: string | null;
  requisitos: string | null;
  posicao_hierarquica: string | null;
  empresa_id: string;
  created_at: string;
  updated_at: string;
}

interface CargosProps {
  currentEmpresa: Empresa | null;
}

export function Cargos({ currentEmpresa }: CargosProps) {
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterNivel, setFilterNivel] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCargo, setEditingCargo] = useState<Cargo | null>(null);
  const [selectedCargo, setSelectedCargo] = useState<Cargo | null>(null);
  const [mainTab, setMainTab] = useState('listagem');
  const [detailTab, setDetailTab] = useState('dados');
  const [savingDescritivo, setSavingDescritivo] = useState(false);
  const [isEditingDescritivo, setIsEditingDescritivo] = useState(false);
  const [filterObrigatorio, setFilterObrigatorio] = useState<string>('todos');
  const [formData, setFormData] = useState({
    nome: '',
    tipo_cargo: '',
    nivel: '',
    salario: '',
    cbo: ''
  });
  const [descritivoData, setDescritivoData] = useState({
    grau: '',
    descricao_cargo: '',
    atividades_responsabilidades: '',
    sistemas_acessos: '',
    competencias_exigidas: '',
    requisitos: '',
    posicao_hierarquica: ''
  });
  const { toast } = useToast();
  const { hasPermission, isSuperAdmin, isLoading: permissionsLoading } = usePermissions(currentEmpresa?.id);

  // Permissões de cargos
  const canView = isSuperAdmin || hasPermission('cargo.visualizar');
  const canCreate = isSuperAdmin || hasPermission('cargo.criar');
  const canEdit = isSuperAdmin || hasPermission('cargo.editar');
  const canDelete = isSuperAdmin || hasPermission('cargo.excluir');
  const canViewSalary = isSuperAdmin || hasPermission('cargo.dados.salario');
  const canViewDados = isSuperAdmin || hasPermission('cargo.dados.visualizar');
  const canEditDados = isSuperAdmin || hasPermission('cargo.dados.editar');
  const canViewExames = isSuperAdmin || hasPermission('cargo.exames.visualizar');
  const canViewTreinamentos = isSuperAdmin || hasPermission('cargo.treinamentos.visualizar');
  const canViewRiscos = isSuperAdmin || hasPermission('cargo.riscos.visualizar');
  const canViewEpis = isSuperAdmin || hasPermission('cargo.epis.visualizar');
  const canViewCarreira = isSuperAdmin || hasPermission('cargo.carreira.visualizar');

  useEffect(() => {
    if (currentEmpresa) {
      loadCargos();
    }
  }, [currentEmpresa]);

  useEffect(() => {
    if (selectedCargo) {
      setDescritivoData({
        grau: selectedCargo.grau || '',
        descricao_cargo: selectedCargo.descricao_cargo || '',
        atividades_responsabilidades: selectedCargo.atividades_responsabilidades || '',
        sistemas_acessos: selectedCargo.sistemas_acessos || '',
        competencias_exigidas: selectedCargo.competencias_exigidas || '',
        requisitos: selectedCargo.requisitos || '',
        posicao_hierarquica: selectedCargo.posicao_hierarquica || ''
      });
    }
  }, [selectedCargo]);

  const loadCargos = async () => {
    if (!currentEmpresa) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cargos')
        .select('*')
        .eq('empresa_id', currentEmpresa.id)
        .order('nome');

      if (error) {
        console.error('Erro ao buscar cargos:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os cargos.",
          variant: "destructive",
        });
      } else {
        setCargos(data || []);
      }
    } catch (error) {
      console.error('Erro ao buscar cargos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCargo = async () => {
    if (!currentEmpresa) return;

    try {
      const nomeCompleto = `${formData.nome}${formData.nivel ? ` ${formData.nivel}` : ''}`;
      
      const cargoData = {
        nome: formData.nome,
        nome_completo_cargo: nomeCompleto,
        tipo_cargo: formData.tipo_cargo,
        nivel: formData.nivel,
        salario: parseFloat(formData.salario) || 0,
        cbo: formData.cbo || null,
        empresa_id: currentEmpresa.id
      };

      if (editingCargo) {
        const { error } = await supabase
          .from('cargos')
          .update(cargoData)
          .eq('id', editingCargo.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Cargo atualizado com sucesso!",
        });
        
        if (selectedCargo?.id === editingCargo.id) {
          setSelectedCargo({ ...selectedCargo, ...cargoData });
        }
      } else {
        const { error } = await supabase
          .from('cargos')
          .insert(cargoData);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Cargo criado com sucesso!",
        });
      }

      setDialogOpen(false);
      setEditingCargo(null);
      resetForm();
      loadCargos();
    } catch (error) {
      console.error('Erro ao salvar cargo:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o cargo.",
        variant: "destructive",
      });
    }
  };

  const handleSaveDescritivo = async () => {
    if (!selectedCargo) return;

    try {
      setSavingDescritivo(true);
      
      const { error } = await supabase
        .from('cargos')
        .update({
          grau: descritivoData.grau || null,
          descricao_cargo: descritivoData.descricao_cargo || null,
          atividades_responsabilidades: descritivoData.atividades_responsabilidades || null,
          sistemas_acessos: descritivoData.sistemas_acessos || null,
          competencias_exigidas: descritivoData.competencias_exigidas || null,
          requisitos: descritivoData.requisitos || null,
          posicao_hierarquica: descritivoData.posicao_hierarquica || null
        })
        .eq('id', selectedCargo.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Descritivo do cargo atualizado com sucesso!'
      });
      
      loadCargos();
      setSelectedCargo({ ...selectedCargo, ...descritivoData });
      setIsEditingDescritivo(false);
    } catch (error) {
      console.error('Erro ao salvar descritivo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o descritivo do cargo.',
        variant: 'destructive'
      });
    } finally {
      setSavingDescritivo(false);
    }
  };

  const handleEditCargo = (cargo: Cargo) => {
    setEditingCargo(cargo);
    setFormData({
      nome: cargo.nome,
      tipo_cargo: cargo.tipo_cargo,
      nivel: cargo.nivel,
      salario: cargo.salario.toString(),
      cbo: cargo.cbo || ''
    });
    setDialogOpen(true);
  };

  const handleDeleteCargo = async (cargoId: string, cargoNome: string) => {
    try {
      const { error } = await supabase
        .from('cargos')
        .delete()
        .eq('id', cargoId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Cargo "${cargoNome}" excluído com sucesso!`,
      });
      
      if (selectedCargo?.id === cargoId) {
        setSelectedCargo(null);
        setMainTab('listagem');
      }
      
      loadCargos();
    } catch (error) {
      console.error('Erro ao excluir cargo:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o cargo.",
        variant: "destructive",
      });
    }
  };

  const handleViewCargo = (cargo: Cargo) => {
    setSelectedCargo(cargo);
    setDetailTab('dados');
    setMainTab('detalhes');
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      tipo_cargo: '',
      nivel: '',
      salario: '',
      cbo: ''
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const filteredCargos = cargos.filter((cargo) => {
    const matchesSearch = searchTerm === '' || 
      cargo.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cargo.cbo?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTipo = filterTipo === '' || filterTipo === 'all' || cargo.tipo_cargo === filterTipo;
    const matchesNivel = filterNivel === '' || filterNivel === 'all' || cargo.nivel === filterNivel;
    
    return matchesSearch && matchesTipo && matchesNivel;
  });

  const uniqueTipos = [...new Set(cargos.map(c => c.tipo_cargo))].filter(tipo => tipo).sort();
  const uniqueNiveis = [...new Set(cargos.map(c => c.nivel))].filter(nivel => nivel).sort();

  if (!currentEmpresa) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Selecione uma empresa para gerenciar os cargos.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading || permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gerenciamento de Cargos</h1>
          <p className="text-muted-foreground">
            Gerenciar cargos da {currentEmpresa.fantasia}
          </p>
        </div>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingCargo(null); }}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Cargo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingCargo ? 'Editar Cargo' : 'Novo Cargo'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="nome">Nome do Cargo *</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                      placeholder="Ex: Analista de Sistemas"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cbo">CBO</Label>
                    <Input
                      id="cbo"
                      value={formData.cbo}
                      onChange={(e) => setFormData(prev => ({ ...prev, cbo: e.target.value }))}
                      placeholder="Ex: 2124-05"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tipo_cargo">Tipo</Label>
                    <Select value={formData.tipo_cargo} onValueChange={(value) => setFormData(prev => ({ ...prev, tipo_cargo: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Efetivo">Efetivo</SelectItem>
                        <SelectItem value="Terceirizado">Terceirizado</SelectItem>
                        <SelectItem value="Temporário">Temporário</SelectItem>
                        <SelectItem value="Estagiário">Estagiário</SelectItem>
                        <SelectItem value="Aprendiz">Aprendiz</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="nivel">Nível</Label>
                    <Select value={formData.nivel} onValueChange={(value) => setFormData(prev => ({ ...prev, nivel: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Júnior">Júnior</SelectItem>
                        <SelectItem value="Pleno">Pleno</SelectItem>
                        <SelectItem value="Sênior">Sênior</SelectItem>
                        <SelectItem value="Especialista">Especialista</SelectItem>
                        <SelectItem value="Coordenador">Coordenador</SelectItem>
                        <SelectItem value="Gerente">Gerente</SelectItem>
                        <SelectItem value="Diretor">Diretor</SelectItem>
                        <SelectItem value="Nível I">Nível I</SelectItem>
                        <SelectItem value="Nível II">Nível II</SelectItem>
                        <SelectItem value="Nível III">Nível III</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="salario">Salário (R$)</Label>
                    <Input
                      id="salario"
                      type="number"
                      step="0.01"
                      value={formData.salario}
                      onChange={(e) => setFormData(prev => ({ ...prev, salario: e.target.value }))}
                      placeholder="0,00"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveCargo} disabled={!formData.nome}>
                  {editingCargo ? 'Salvar Alterações' : 'Criar Cargo'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList>
          <TabsTrigger value="listagem">Listagem de Cargos</TabsTrigger>
          {selectedCargo && (
            <TabsTrigger value="detalhes">Detalhes: {selectedCargo.nome}</TabsTrigger>
          )}
          {canViewCarreira && (
            <TabsTrigger value="plano-carreira">Plano de Carreira</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="listagem" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Lista de Cargos</CardTitle>
                <div className="text-sm text-muted-foreground">
                  Total: <span className="font-semibold text-foreground">{filteredCargos.length}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-6 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Buscar por nome ou CBO..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Select value={filterTipo} onValueChange={setFilterTipo}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os tipos</SelectItem>
                        {uniqueTipos.map((tipo) => (
                          <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={filterNivel} onValueChange={setFilterNivel}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Nível" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os níveis</SelectItem>
                        {uniqueNiveis.map((nivel) => (
                          <SelectItem key={nivel} value={nivel}>{nivel}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {filteredCargos.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {cargos.length === 0 ? 'Nenhum cargo cadastrado.' : 'Nenhum cargo encontrado.'}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>CBO</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Nível</TableHead>
                      {canViewSalary && <TableHead>Salário</TableHead>}
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCargos.map((cargo) => (
                      <TableRow key={cargo.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell className="font-medium">{cargo.nome}</TableCell>
                        <TableCell>{cargo.cbo || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{cargo.tipo_cargo}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{cargo.nivel}</Badge>
                        </TableCell>
                        {canViewSalary ? (
                          <TableCell className="font-medium">{formatCurrency(cargo.salario)}</TableCell>
                        ) : null}
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewCargo(cargo)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditCargo(cargo)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja excluir o cargo "{cargo.nome}"?
                                      Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteCargo(cargo.id, cargo.nome)}
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
        </TabsContent>

        <TabsContent value="detalhes">
          {selectedCargo && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Button variant="ghost" size="sm" onClick={() => setMainTab('listagem')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar para Listagem
                </Button>
                <div>
                  <h2 className="text-xl font-bold">{selectedCargo.nome}</h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedCargo.tipo_cargo} • {selectedCargo.nivel} {canViewSalary && <>• {formatCurrency(selectedCargo.salario)}</>}
                  </p>
                </div>
              </div>

              <Tabs value={detailTab} onValueChange={(val) => { setDetailTab(val); }}>
                <TabsList className="flex flex-wrap">
                  {canViewDados && <TabsTrigger value="dados">Dados / Descritivo</TabsTrigger>}
                  {canViewExames && <TabsTrigger value="exames">Exames</TabsTrigger>}
                  {canViewTreinamentos && <TabsTrigger value="treinamentos">Treinamentos</TabsTrigger>}
                  {canViewRiscos && <TabsTrigger value="riscos">Riscos Ocupacionais</TabsTrigger>}
                  {canViewEpis && <TabsTrigger value="epis">EPIs</TabsTrigger>}
                </TabsList>

                {(detailTab === 'exames' || detailTab === 'treinamentos') && (
                  <div className="flex items-center gap-3 mt-4 mb-2">
                    <Label className="text-sm text-muted-foreground whitespace-nowrap">Obrigatório:</Label>
                    <Select value={filterObrigatorio} onValueChange={setFilterObrigatorio}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="sim">Sim</SelectItem>
                        <SelectItem value="nao">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {canViewDados && (
                <TabsContent value="dados">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Descritivo do Cargo</CardTitle>
                        <div className="flex gap-2">
                          {canEdit && (
                            <Button variant="outline" onClick={() => handleEditCargo(selectedCargo)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar Dados Básicos
                            </Button>
                          )}
                          {canEditDados && (
                            isEditingDescritivo ? (
                              <>
                                <Button variant="outline" onClick={() => setIsEditingDescritivo(false)}>
                                  Cancelar
                                </Button>
                                <Button onClick={handleSaveDescritivo} disabled={savingDescritivo}>
                                  <Save className="h-4 w-4 mr-2" />
                                  {savingDescritivo ? 'Salvando...' : 'Salvar'}
                                </Button>
                              </>
                            ) : (
                              <Button onClick={() => setIsEditingDescritivo(true)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar Descritivo
                              </Button>
                            )
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Dados Básicos */}
                      <div className={`grid grid-cols-2 md:grid-cols-${canViewSalary ? '5' : '4'} gap-4 pb-6 border-b`}>
                        <div>
                          <Label className="text-muted-foreground">Nome</Label>
                          <p className="font-medium">{selectedCargo.nome}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">CBO</Label>
                          <p className="font-medium">{selectedCargo.cbo || '-'}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Tipo</Label>
                          <p className="font-medium">{selectedCargo.tipo_cargo}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Nível</Label>
                          <p className="font-medium">{selectedCargo.nivel}</p>
                        </div>
                        {canViewSalary ? (
                          <div>
                            <Label className="text-muted-foreground">Salário</Label>
                            <p className="font-medium">{formatCurrency(selectedCargo.salario)}</p>
                          </div>
                        ) : (
                          <div>
                            <Label className="text-muted-foreground">Salário</Label>
                            <p className="font-medium text-muted-foreground flex items-center gap-1">
                              <Lock className="h-3 w-3" /> Acesso restrito
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Descritivo - Modo Edição */}
                      {isEditingDescritivo ? (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="grau">Grau / Classificação</Label>
                              <Input
                                id="grau"
                                value={descritivoData.grau}
                                onChange={(e) => setDescritivoData(prev => ({ ...prev, grau: e.target.value }))}
                                placeholder="Ex: Nível Superior, Técnico..."
                              />
                            </div>
                            <div>
                              <Label htmlFor="posicao_hierarquica">Posição Hierárquica</Label>
                              <Input
                                id="posicao_hierarquica"
                                value={descritivoData.posicao_hierarquica}
                                onChange={(e) => setDescritivoData(prev => ({ ...prev, posicao_hierarquica: e.target.value }))}
                                placeholder="Ex: Reporta ao Gerente de TI"
                              />
                            </div>
                          </div>

                          <div>
                            <Label htmlFor="descricao_cargo">Descrição do Cargo</Label>
                            <Textarea
                              id="descricao_cargo"
                              value={descritivoData.descricao_cargo}
                              onChange={(e) => setDescritivoData(prev => ({ ...prev, descricao_cargo: e.target.value }))}
                              placeholder="Descrição detalhada do cargo e suas responsabilidades gerais..."
                              rows={4}
                            />
                          </div>

                          <div>
                            <Label htmlFor="atividades_responsabilidades">Atividades e Responsabilidades</Label>
                            <Textarea
                              id="atividades_responsabilidades"
                              value={descritivoData.atividades_responsabilidades}
                              onChange={(e) => setDescritivoData(prev => ({ ...prev, atividades_responsabilidades: e.target.value }))}
                              placeholder="Liste as principais atividades e responsabilidades do cargo..."
                              rows={5}
                            />
                          </div>

                          <div>
                            <Label htmlFor="sistemas_acessos">Sistemas e Acessos</Label>
                            <Textarea
                              id="sistemas_acessos"
                              value={descritivoData.sistemas_acessos}
                              onChange={(e) => setDescritivoData(prev => ({ ...prev, sistemas_acessos: e.target.value }))}
                              placeholder="Sistemas, ferramentas e acessos necessários para o cargo..."
                              rows={3}
                            />
                          </div>

                          <div>
                            <Label htmlFor="competencias_exigidas">Competências Exigidas</Label>
                            <Textarea
                              id="competencias_exigidas"
                              value={descritivoData.competencias_exigidas}
                              onChange={(e) => setDescritivoData(prev => ({ ...prev, competencias_exigidas: e.target.value }))}
                              placeholder="Competências técnicas e comportamentais necessárias..."
                              rows={4}
                            />
                          </div>

                          <div>
                            <Label htmlFor="requisitos">Requisitos</Label>
                            <Textarea
                              id="requisitos"
                              value={descritivoData.requisitos}
                              onChange={(e) => setDescritivoData(prev => ({ ...prev, requisitos: e.target.value }))}
                              placeholder="Formação, experiência, certificações e outros requisitos..."
                              rows={4}
                            />
                          </div>
                        </>
                      ) : (
                        /* Descritivo - Modo Visualização */
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <Label className="text-muted-foreground text-sm">Grau / Classificação</Label>
                              <p className="mt-1">{selectedCargo.grau || '-'}</p>
                            </div>
                            <div>
                              <Label className="text-muted-foreground text-sm">Posição Hierárquica</Label>
                              <p className="mt-1">{selectedCargo.posicao_hierarquica || '-'}</p>
                            </div>
                          </div>

                          <div>
                            <Label className="text-muted-foreground text-sm">Descrição do Cargo</Label>
                            <p className="mt-1 whitespace-pre-wrap">{selectedCargo.descricao_cargo || '-'}</p>
                          </div>

                          <div>
                            <Label className="text-muted-foreground text-sm">Atividades e Responsabilidades</Label>
                            <p className="mt-1 whitespace-pre-wrap">{selectedCargo.atividades_responsabilidades || '-'}</p>
                          </div>

                          <div>
                            <Label className="text-muted-foreground text-sm">Sistemas e Acessos</Label>
                            <p className="mt-1 whitespace-pre-wrap">{selectedCargo.sistemas_acessos || '-'}</p>
                          </div>

                          <div>
                            <Label className="text-muted-foreground text-sm">Competências Exigidas</Label>
                            <p className="mt-1 whitespace-pre-wrap">{selectedCargo.competencias_exigidas || '-'}</p>
                          </div>

                          <div>
                            <Label className="text-muted-foreground text-sm">Requisitos</Label>
                            <p className="mt-1 whitespace-pre-wrap">{selectedCargo.requisitos || '-'}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                )}

                {canViewExames && (
                <TabsContent value="exames">
                  <CargoExamesTab 
                    cargoId={selectedCargo.id} 
                    empresaId={currentEmpresa.id}
                    canCreate={isSuperAdmin || hasPermission('cargo.exames.criar')}
                    canEdit={isSuperAdmin || hasPermission('cargo.exames.editar')}
                    canDelete={isSuperAdmin || hasPermission('cargo.exames.excluir')}
                    filterObrigatorio={filterObrigatorio}
                  />
                </TabsContent>
                )}

                {canViewTreinamentos && (
                <TabsContent value="treinamentos">
                  <CargoTreinamentosTab 
                    cargoId={selectedCargo.id} 
                    empresaId={currentEmpresa.id}
                    canCreate={isSuperAdmin || hasPermission('cargo.treinamentos.criar')}
                    canEdit={isSuperAdmin || hasPermission('cargo.treinamentos.editar')}
                    canDelete={isSuperAdmin || hasPermission('cargo.treinamentos.excluir')}
                    filterObrigatorio={filterObrigatorio}
                  />
                </TabsContent>
                )}

                {canViewRiscos && (
                <TabsContent value="riscos">
                  <CargoRiscosTab 
                    cargoId={selectedCargo.id} 
                    empresaId={currentEmpresa.id}
                    canCreate={isSuperAdmin || hasPermission('cargo.riscos.criar')}
                    canEdit={isSuperAdmin || hasPermission('cargo.riscos.editar')}
                    canDelete={isSuperAdmin || hasPermission('cargo.riscos.excluir')}
                  />
                </TabsContent>
                )}

                {canViewEpis && (
                <TabsContent value="epis">
                  <CargoEPIsTab 
                    cargoId={selectedCargo.id} 
                    empresaId={currentEmpresa.id}
                    canCreate={isSuperAdmin || hasPermission('cargo.epis.criar')}
                    canEdit={isSuperAdmin || hasPermission('cargo.epis.editar')}
                    canDelete={isSuperAdmin || hasPermission('cargo.epis.excluir')}
                  />
                </TabsContent>
                )}
              </Tabs>
            </div>
          )}
        </TabsContent>

        <TabsContent value="plano-carreira">
          <TrilhaCarreiraManager 
            empresaId={currentEmpresa.id}
            canCreate={isSuperAdmin || hasPermission('cargo.carreira.criar')}
            canEdit={isSuperAdmin || hasPermission('cargo.carreira.editar')}
            canDelete={isSuperAdmin || hasPermission('cargo.carreira.excluir')}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
