import { useState } from 'react';
import { Plus, Trash2, Pencil, ChevronRight, Target, GraduationCap, Clock, Award, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface TrilhaCarreiraManagerProps {
  empresaId: string;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

interface Cargo {
  id: string;
  nome: string;
  nome_completo_cargo: string;
  nivel: string;
}

interface Competencia {
  id: string;
  nome: string;
  tipo?: string;
}

interface Treinamento {
  id: string;
  nome_treinamento: string;
}

interface Criterio {
  id: string;
  etapa_id: string;
  tipo_criterio: string;
  treinamento_id: string | null;
  competencia_id: string | null;
  nota_minima: number | null;
  descricao: string | null;
  treinamento?: { id: string; nome_treinamento: string } | null;
  competencia?: { id: string; nome: string } | null;
}

interface TrilhaEtapa {
  id: string;
  cargo_id: string;
  ordem: number;
  tipo_progressao: string;
  tempo_minimo_meses: number | null;
  cargo?: Cargo;
  criterios?: Criterio[];
}

interface Trilha {
  id: string;
  nome: string;
  descricao: string | null;
  etapas?: TrilhaEtapa[];
}

const CRITERIOS_PREDEFINIDOS = [
  { value: 'tempo_minimo', label: 'Tempo Mínimo no Cargo' },
  { value: 'treinamento', label: 'Treinamento Concluído' },
  { value: 'avaliacao_desempenho', label: 'Avaliação de Desempenho' },
  { value: 'competencia', label: 'Competência Exigida' },
  { value: 'certificacao', label: 'Certificação Obrigatória' },
  { value: 'meta_atingida', label: 'Meta de Resultados Atingida' },
  { value: 'projeto_concluido', label: 'Projeto Estratégico Concluído' },
  { value: 'personalizado', label: 'Critério Personalizado' },
];

export function TrilhaCarreiraManager({ empresaId, canCreate = true, canEdit = true, canDelete = true }: TrilhaCarreiraManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTrilhaDialogOpen, setEditTrilhaDialogOpen] = useState(false);
  const [etapaDialogOpen, setEtapaDialogOpen] = useState(false);
  const [editEtapaDialogOpen, setEditEtapaDialogOpen] = useState(false);
  const [criterioDialogOpen, setCriterioDialogOpen] = useState(false);
  const [selectedTrilha, setSelectedTrilha] = useState<Trilha | null>(null);
  const [selectedEtapa, setSelectedEtapa] = useState<TrilhaEtapa | null>(null);
  const [formData, setFormData] = useState({ nome: '', descricao: '' });
  const [etapaFormData, setEtapaFormData] = useState({
    cargo_id: '',
    tipo_progressao: 'Vertical',
    tempo_minimo_meses: 12
  });
  const [criterioFormData, setCriterioFormData] = useState({
    tipo_criterio: 'tempo_minimo',
    treinamento_id: '',
    competencia_id: '',
    nota_minima: 0,
    descricao: ''
  });

  const { data: cargos = [] } = useQuery({
    queryKey: ['cargos', empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cargos')
        .select('id, nome, nome_completo_cargo, nivel')
        .eq('empresa_id', empresaId)
        .order('nome');
      if (error) throw error;
      return data as Cargo[];
    }
  });

  const { data: competencias = [] } = useQuery({
    queryKey: ['competencias', empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('competencias')
        .select('id, nome, tipo')
        .eq('empresa_id', empresaId)
        .order('nome');
      if (error) throw error;
      return data as Competencia[];
    }
  });

  const { data: treinamentosCargo = [] } = useQuery({
    queryKey: ['treinamentos-cargo', selectedEtapa?.cargo_id],
    queryFn: async () => {
      if (!selectedEtapa?.cargo_id) return [];
      const { data, error } = await supabase
        .from('treinamentos_cargo')
        .select('id, nome_treinamento')
        .eq('cargo_id', selectedEtapa.cargo_id)
        .order('nome_treinamento');
      if (error) throw error;
      return data as Treinamento[];
    },
    enabled: !!selectedEtapa?.cargo_id
  });

  const { data: trilhas = [], isLoading } = useQuery({
    queryKey: ['trilhas-carreira', empresaId],
    queryFn: async () => {
      const { data: trilhasData, error } = await supabase
        .from('trilha_carreira')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('nome');

      if (error) throw error;

      const trilhasComEtapas = await Promise.all(
        (trilhasData || []).map(async (trilha) => {
          const { data: etapasData } = await supabase
            .from('trilha_carreira_etapas')
            .select('*, cargo:cargos(id, nome, nome_completo_cargo, nivel)')
            .eq('trilha_id', trilha.id)
            .order('ordem');

          const etapasComCriterios = await Promise.all(
            (etapasData || []).map(async (etapa) => {
              const { data: criteriosData } = await supabase
                .from('criterios_evolucao')
                .select('*, treinamento:treinamentos_cargo(id, nome_treinamento), competencia:competencias(id, nome)')
                .eq('etapa_id', etapa.id);

              return { ...etapa, criterios: criteriosData || [] };
            })
          );

          return { ...trilha, etapas: etapasComCriterios };
        })
      );

      return trilhasComEtapas as Trilha[];
    }
  });

  // Mutations
  const saveTrilhaMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('trilha_carreira').insert({ ...data, empresa_id: empresaId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trilhas-carreira', empresaId] });
      toast({ title: 'Sucesso', description: 'Trilha de carreira criada com sucesso!' });
      setFormData({ nome: '', descricao: '' });
      setDialogOpen(false);
    },
    onError: () => toast({ title: 'Erro', description: 'Não foi possível criar a trilha.', variant: 'destructive' })
  });

  const updateTrilhaMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const { error } = await supabase.from('trilha_carreira').update({ nome: data.nome, descricao: data.descricao }).eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trilhas-carreira', empresaId] });
      toast({ title: 'Sucesso', description: 'Trilha atualizada com sucesso!' });
      setEditTrilhaDialogOpen(false);
    },
    onError: () => toast({ title: 'Erro', description: 'Não foi possível atualizar a trilha.', variant: 'destructive' })
  });

  const deleteTrilhaMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('trilha_carreira').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trilhas-carreira', empresaId] });
      toast({ title: 'Sucesso', description: 'Trilha removida com sucesso!' });
    }
  });

  const saveEtapaMutation = useMutation({
    mutationFn: async (data: typeof etapaFormData & { trilha_id: string; ordem: number }) => {
      const { error } = await supabase.from('trilha_carreira_etapas').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trilhas-carreira', empresaId] });
      toast({ title: 'Sucesso', description: 'Etapa adicionada com sucesso!' });
      setEtapaFormData({ cargo_id: '', tipo_progressao: 'Vertical', tempo_minimo_meses: 12 });
      setEtapaDialogOpen(false);
    },
    onError: () => toast({ title: 'Erro', description: 'Não foi possível adicionar a etapa.', variant: 'destructive' })
  });

  const updateEtapaMutation = useMutation({
    mutationFn: async (data: typeof etapaFormData & { id: string }) => {
      const { error } = await supabase.from('trilha_carreira_etapas').update({
        cargo_id: data.cargo_id,
        tipo_progressao: data.tipo_progressao,
        tempo_minimo_meses: data.tempo_minimo_meses
      }).eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trilhas-carreira', empresaId] });
      toast({ title: 'Sucesso', description: 'Etapa atualizada com sucesso!' });
      setEditEtapaDialogOpen(false);
    },
    onError: () => toast({ title: 'Erro', description: 'Não foi possível atualizar a etapa.', variant: 'destructive' })
  });

  const deleteEtapaMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('trilha_carreira_etapas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trilhas-carreira', empresaId] });
      toast({ title: 'Sucesso', description: 'Etapa removida com sucesso!' });
    }
  });

  const saveCriterioMutation = useMutation({
    mutationFn: async (data: { etapa_id: string; tipo_criterio: string; treinamento_id?: string | null; competencia_id?: string | null; nota_minima?: number | null; descricao?: string | null }) => {
      const { error } = await supabase.from('criterios_evolucao').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trilhas-carreira', empresaId] });
      toast({ title: 'Sucesso', description: 'Critério adicionado com sucesso!' });
      setCriterioFormData({ tipo_criterio: 'tempo_minimo', treinamento_id: '', competencia_id: '', nota_minima: 0, descricao: '' });
      setCriterioDialogOpen(false);
    },
    onError: () => toast({ title: 'Erro', description: 'Não foi possível adicionar o critério.', variant: 'destructive' })
  });

  const deleteCriterioMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('criterios_evolucao').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trilhas-carreira', empresaId] });
      toast({ title: 'Sucesso', description: 'Critério removido com sucesso!' });
    }
  });

  // Handlers
  const handleEditTrilha = (trilha: Trilha) => {
    setSelectedTrilha(trilha);
    setFormData({ nome: trilha.nome, descricao: trilha.descricao || '' });
    setEditTrilhaDialogOpen(true);
  };

  const handleAddEtapa = (trilha: Trilha) => {
    setSelectedTrilha(trilha);
    setEtapaFormData({ cargo_id: '', tipo_progressao: 'Vertical', tempo_minimo_meses: 12 });
    setEtapaDialogOpen(true);
  };

  const handleEditEtapa = (etapa: TrilhaEtapa) => {
    setSelectedEtapa(etapa);
    setEtapaFormData({
      cargo_id: etapa.cargo_id,
      tipo_progressao: etapa.tipo_progressao,
      tempo_minimo_meses: etapa.tempo_minimo_meses || 12
    });
    setEditEtapaDialogOpen(true);
  };

  const handleSaveEtapa = () => {
    if (!selectedTrilha || !etapaFormData.cargo_id) {
      toast({ title: 'Erro', description: 'Selecione um cargo.', variant: 'destructive' });
      return;
    }
    const novaOrdem = (selectedTrilha.etapas?.length || 0) + 1;
    saveEtapaMutation.mutate({ ...etapaFormData, trilha_id: selectedTrilha.id, ordem: novaOrdem });
  };

  const handleAddCriterio = (etapa: TrilhaEtapa) => {
    setSelectedEtapa(etapa);
    setCriterioFormData({ tipo_criterio: 'tempo_minimo', treinamento_id: '', competencia_id: '', nota_minima: 0, descricao: '' });
    setCriterioDialogOpen(true);
  };

  const handleSaveCriterio = () => {
    if (!selectedEtapa) return;

    const data: { etapa_id: string; tipo_criterio: string; treinamento_id?: string | null; competencia_id?: string | null; nota_minima?: number | null; descricao?: string | null } = {
      etapa_id: selectedEtapa.id,
      tipo_criterio: criterioFormData.tipo_criterio,
      descricao: criterioFormData.descricao || null
    };

    if (criterioFormData.tipo_criterio === 'treinamento' && criterioFormData.treinamento_id) {
      data.treinamento_id = criterioFormData.treinamento_id;
    }
    if (criterioFormData.tipo_criterio === 'competencia' && criterioFormData.competencia_id) {
      data.competencia_id = criterioFormData.competencia_id;
      data.nota_minima = criterioFormData.nota_minima || null;
    }
    if (criterioFormData.tipo_criterio === 'avaliacao_desempenho') {
      data.nota_minima = criterioFormData.nota_minima || null;
    }

    saveCriterioMutation.mutate(data);
  };

  const getCriterioIcon = (tipo: string) => {
    switch (tipo) {
      case 'tempo_minimo': return <Clock className="h-3 w-3" />;
      case 'treinamento': return <GraduationCap className="h-3 w-3" />;
      case 'avaliacao_desempenho': return <Target className="h-3 w-3" />;
      case 'competencia': return <Award className="h-3 w-3" />;
      default: return <FileText className="h-3 w-3" />;
    }
  };

  const getCriterioLabel = (criterio: Criterio) => {
    const baseLabel = CRITERIOS_PREDEFINIDOS.find(c => c.value === criterio.tipo_criterio)?.label || criterio.tipo_criterio;
    if (criterio.treinamento) return `${criterio.treinamento.nome_treinamento}`;
    if (criterio.competencia) return `${criterio.competencia.nome} (Nota mín: ${criterio.nota_minima})`;
    if (criterio.tipo_criterio === 'avaliacao_desempenho' && criterio.nota_minima) return `${baseLabel} (Nota mín: ${criterio.nota_minima})`;
    if (criterio.descricao) return criterio.descricao;
    return baseLabel;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Plano de Carreira</h2>
          <p className="text-muted-foreground">Defina as trilhas de evolução profissional e critérios de progressão</p>
        </div>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Nova Trilha</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova Trilha de Carreira</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome da Trilha</Label>
                  <Input value={formData.nome} onChange={(e) => setFormData(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Trilha Administrativa" />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea value={formData.descricao} onChange={(e) => setFormData(p => ({ ...p, descricao: e.target.value }))} placeholder="Descrição da trilha..." />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button onClick={() => saveTrilhaMutation.mutate(formData)} disabled={saveTrilhaMutation.isPending || !formData.nome}>Criar Trilha</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando trilhas...</div>
      ) : trilhas.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground mb-4">Nenhuma trilha de carreira cadastrada.</p>
            {canCreate && <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Criar Primeira Trilha</Button>}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {trilhas.map((trilha) => (
            <Card key={trilha.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{trilha.nome}</CardTitle>
                    <CardDescription>{trilha.descricao || 'Sem descrição'}</CardDescription>
                  </div>
                  <TooltipProvider>
                    <div className="flex space-x-1">
                      {canEdit && (
                        <>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => handleEditTrilha(trilha)}><Pencil className="h-4 w-4" /></Button>
                            </TooltipTrigger>
                            <TooltipContent>Editar Trilha</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => handleAddEtapa(trilha)}><Plus className="h-4 w-4" /></Button>
                            </TooltipTrigger>
                            <TooltipContent>Adicionar Etapa</TooltipContent>
                          </Tooltip>
                        </>
                      )}
                      {canDelete && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                              <AlertDialogDescription>Tem certeza que deseja excluir a trilha "{trilha.nome}"? Todas as etapas e critérios serão removidos.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteTrilhaMutation.mutate(trilha.id)}>Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TooltipProvider>
                </div>
              </CardHeader>
              <CardContent>
                {trilha.etapas && trilha.etapas.length > 0 ? (
                  <ScrollArea className="w-full">
                    <div className="flex items-start gap-2 pb-4 min-w-max">
                      {trilha.etapas.map((etapa, index) => (
                        <div key={etapa.id} className="flex items-center">
                          <div className="flex flex-col items-center min-w-[180px] max-w-[200px]">
                            <div className="w-full p-3 bg-muted rounded-lg border-2 border-primary/20 hover:border-primary/40 transition-colors">
                              <div className="flex items-center justify-between mb-2">
                                <Badge variant="secondary" className="text-xs">{etapa.ordem}</Badge>
                                <TooltipProvider>
                                  <div className="flex">
                                    {canEdit && (
                                      <>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleEditEtapa(etapa)}><Pencil className="h-3 w-3" /></Button>
                                          </TooltipTrigger>
                                          <TooltipContent>Editar</TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleAddCriterio(etapa)}><Target className="h-3 w-3" /></Button>
                                          </TooltipTrigger>
                                          <TooltipContent>Adicionar Critério</TooltipContent>
                                        </Tooltip>
                                      </>
                                    )}
                                    {canDelete && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => deleteEtapaMutation.mutate(etapa.id)}><Trash2 className="h-3 w-3" /></Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Excluir</TooltipContent>
                                      </Tooltip>
                                    )}
                                  </div>
                                </TooltipProvider>
                              </div>
                              <p className="font-medium text-sm truncate" title={etapa.cargo?.nome_completo_cargo}>{etapa.cargo?.nome_completo_cargo || 'Cargo não encontrado'}</p>
                              <div className="flex flex-wrap gap-1 mt-2">
                                <Badge variant="outline" className="text-xs">{etapa.tipo_progressao}</Badge>
                                {etapa.tempo_minimo_meses && <Badge variant="outline" className="text-xs">{etapa.tempo_minimo_meses}m</Badge>}
                              </div>
                              {etapa.criterios && etapa.criterios.length > 0 && (
                                <div className="mt-2 pt-2 border-t space-y-1">
                                  {etapa.criterios.map((criterio) => (
                                    <div key={criterio.id} className="flex items-center justify-between text-xs bg-background rounded px-1.5 py-1">
                                      <div className="flex items-center gap-1 flex-1 min-w-0">
                                        {getCriterioIcon(criterio.tipo_criterio)}
                                        <span className="truncate" title={getCriterioLabel(criterio)}>{getCriterioLabel(criterio)}</span>
                                      </div>
                                      {canDelete && (
                                        <Button variant="ghost" size="sm" className="h-4 w-4 p-0 ml-1 shrink-0" onClick={() => deleteCriterioMutation.mutate(criterio.id)}>
                                          <Trash2 className="h-2.5 w-2.5" />
                                        </Button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          {index < trilha.etapas!.length - 1 && (
                            <ChevronRight className="h-5 w-5 text-muted-foreground mx-1 shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                ) : (
                  <p className="text-center text-muted-foreground py-4">Nenhuma etapa definida. Clique em + para adicionar.</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog para editar trilha */}
      <Dialog open={editTrilhaDialogOpen} onOpenChange={setEditTrilhaDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Trilha de Carreira</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome da Trilha</Label>
              <Input value={formData.nome} onChange={(e) => setFormData(p => ({ ...p, nome: e.target.value }))} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={formData.descricao} onChange={(e) => setFormData(p => ({ ...p, descricao: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTrilhaDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => selectedTrilha && updateTrilhaMutation.mutate({ ...formData, id: selectedTrilha.id })} disabled={updateTrilhaMutation.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para adicionar etapa */}
      <Dialog open={etapaDialogOpen} onOpenChange={setEtapaDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar Etapa à Trilha</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Cargo</Label>
              <Select value={etapaFormData.cargo_id} onValueChange={(value) => setEtapaFormData(p => ({ ...p, cargo_id: value }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o cargo" /></SelectTrigger>
                <SelectContent>
                  {cargos.map((cargo) => (
                    <SelectItem key={cargo.id} value={cargo.id}>{cargo.nome_completo_cargo} ({cargo.nivel})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo de Progressão</Label>
              <Select value={etapaFormData.tipo_progressao} onValueChange={(value) => setEtapaFormData(p => ({ ...p, tipo_progressao: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vertical">Vertical (Promoção)</SelectItem>
                  <SelectItem value="Horizontal">Horizontal (Mudança de Nível)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tempo Mínimo (meses)</Label>
              <Input type="number" min={1} value={etapaFormData.tempo_minimo_meses} onChange={(e) => setEtapaFormData(p => ({ ...p, tempo_minimo_meses: parseInt(e.target.value) || 12 }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEtapaDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEtapa} disabled={saveEtapaMutation.isPending}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para editar etapa */}
      <Dialog open={editEtapaDialogOpen} onOpenChange={setEditEtapaDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Etapa</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Cargo</Label>
              <Select value={etapaFormData.cargo_id} onValueChange={(value) => setEtapaFormData(p => ({ ...p, cargo_id: value }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o cargo" /></SelectTrigger>
                <SelectContent>
                  {cargos.map((cargo) => (
                    <SelectItem key={cargo.id} value={cargo.id}>{cargo.nome_completo_cargo} ({cargo.nivel})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo de Progressão</Label>
              <Select value={etapaFormData.tipo_progressao} onValueChange={(value) => setEtapaFormData(p => ({ ...p, tipo_progressao: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vertical">Vertical (Promoção)</SelectItem>
                  <SelectItem value="Horizontal">Horizontal (Mudança de Nível)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tempo Mínimo (meses)</Label>
              <Input type="number" min={1} value={etapaFormData.tempo_minimo_meses} onChange={(e) => setEtapaFormData(p => ({ ...p, tempo_minimo_meses: parseInt(e.target.value) || 12 }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditEtapaDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => selectedEtapa && updateEtapaMutation.mutate({ ...etapaFormData, id: selectedEtapa.id })} disabled={updateEtapaMutation.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para adicionar critério */}
      <Dialog open={criterioDialogOpen} onOpenChange={setCriterioDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar Critério de Evolução</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo de Critério</Label>
              <Select value={criterioFormData.tipo_criterio} onValueChange={(value) => setCriterioFormData(p => ({ ...p, tipo_criterio: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CRITERIOS_PREDEFINIDOS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {criterioFormData.tipo_criterio === 'treinamento' && (
              <div>
                <Label>Treinamento</Label>
                <Select value={criterioFormData.treinamento_id} onValueChange={(value) => setCriterioFormData(p => ({ ...p, treinamento_id: value }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione o treinamento" /></SelectTrigger>
                  <SelectContent>
                    {treinamentosCargo.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome_treinamento}</SelectItem>)}
                  </SelectContent>
                </Select>
                {treinamentosCargo.length === 0 && <p className="text-xs text-muted-foreground mt-1">Nenhum treinamento cadastrado para este cargo.</p>}
              </div>
            )}

            {criterioFormData.tipo_criterio === 'competencia' && (
              <>
                <div>
                  <Label>Competência</Label>
                  <Select value={criterioFormData.competencia_id} onValueChange={(value) => setCriterioFormData(p => ({ ...p, competencia_id: value }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione a competência" /></SelectTrigger>
                    <SelectContent>
                      {competencias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome} ({c.tipo})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Nota Mínima (0-10)</Label>
                  <Input type="number" min={0} max={10} step={0.5} value={criterioFormData.nota_minima} onChange={(e) => setCriterioFormData(p => ({ ...p, nota_minima: parseFloat(e.target.value) || 0 }))} />
                </div>
              </>
            )}

            {criterioFormData.tipo_criterio === 'avaliacao_desempenho' && (
              <div>
                <Label>Nota Mínima (0-10)</Label>
                <Input type="number" min={0} max={10} step={0.5} value={criterioFormData.nota_minima} onChange={(e) => setCriterioFormData(p => ({ ...p, nota_minima: parseFloat(e.target.value) || 0 }))} />
              </div>
            )}

            {criterioFormData.tipo_criterio === 'personalizado' && (
              <div>
                <Label>Descrição do Critério Personalizado *</Label>
                <Textarea value={criterioFormData.descricao} onChange={(e) => setCriterioFormData(p => ({ ...p, descricao: e.target.value }))} placeholder="Descreva o critério personalizado..." />
              </div>
            )}

            {!['personalizado', 'treinamento', 'competencia', 'avaliacao_desempenho'].includes(criterioFormData.tipo_criterio) && (
              <div>
                <Label>Descrição (opcional)</Label>
                <Textarea value={criterioFormData.descricao} onChange={(e) => setCriterioFormData(p => ({ ...p, descricao: e.target.value }))} placeholder="Detalhes adicionais sobre o critério..." />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCriterioDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveCriterio} disabled={saveCriterioMutation.isPending}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
