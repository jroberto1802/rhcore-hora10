import { useState } from 'react';
import { Plus, Pencil, Trash2, Eye, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ViewItemModal } from './ViewItemModal';
import { ViewObservacaoModal } from './ViewObservacaoModal';

interface CargoTreinamentosTabProps {
  cargoId: string;
  empresaId: string;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  filterObrigatorio?: string;
}

interface TreinamentoCargo {
  id: string;
  nome_treinamento: string;
  norma: string | null;
  periodicidade_meses: number;
  obrigatorio: boolean;
  observacao: string | null;
}

const NORMAS_OPTIONS = [
  { value: 'NR-01', label: 'NR-01 - Disposições Gerais' },
  { value: 'NR-05', label: 'NR-05 - CIPA' },
  { value: 'NR-06', label: 'NR-06 - EPI' },
  { value: 'NR-10', label: 'NR-10 - Segurança em Instalações Elétricas' },
  { value: 'NR-11', label: 'NR-11 - Transporte e Movimentação de Materiais' },
  { value: 'NR-12', label: 'NR-12 - Segurança em Máquinas' },
  { value: 'NR-13', label: 'NR-13 - Caldeiras e Vasos de Pressão' },
  { value: 'NR-17', label: 'NR-17 - Ergonomia' },
  { value: 'NR-18', label: 'NR-18 - Construção Civil' },
  { value: 'NR-20', label: 'NR-20 - Inflamáveis e Combustíveis' },
  { value: 'NR-23', label: 'NR-23 - Proteção Contra Incêndios' },
  { value: 'NR-33', label: 'NR-33 - Espaços Confinados' },
  { value: 'NR-35', label: 'NR-35 - Trabalho em Altura' },
  { value: 'Interno', label: 'Treinamento Interno' },
  { value: 'Outro', label: 'Outro' },
];

export function CargoTreinamentosTab({ cargoId, empresaId, canCreate = true, canEdit = true, canDelete = true, filterObrigatorio = 'todos' }: CargoTreinamentosTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTreinamento, setEditingTreinamento] = useState<TreinamentoCargo | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingTreinamento, setViewingTreinamento] = useState<TreinamentoCargo | null>(null);
  const [obsModalOpen, setObsModalOpen] = useState(false);
  const [viewingObs, setViewingObs] = useState<{ title: string; obs: string | null }>({ title: '', obs: null });
  const [formData, setFormData] = useState({
    nome_treinamento: '',
    norma: '',
    periodicidade_meses: 12,
    obrigatorio: true,
    observacao: ''
  });

  const { data: treinamentos = [], isLoading } = useQuery({
    queryKey: ['treinamentos-cargo', cargoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('treinamentos_cargo')
        .select('*')
        .eq('cargo_id', cargoId)
        .order('nome_treinamento');

      if (error) throw error;
      return data as TreinamentoCargo[];
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      const treinamentoData = {
        nome_treinamento: data.nome_treinamento,
        norma: data.norma || null,
        periodicidade_meses: data.periodicidade_meses,
        obrigatorio: data.obrigatorio,
        observacao: data.observacao || null,
        cargo_id: cargoId,
        empresa_id: empresaId
      };

      if (data.id) {
        const { error } = await supabase.from('treinamentos_cargo').update(treinamentoData).eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('treinamentos_cargo').insert(treinamentoData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treinamentos-cargo', cargoId] });
      toast({
        title: 'Sucesso',
        description: editingTreinamento ? 'Treinamento atualizado com sucesso!' : 'Treinamento cadastrado com sucesso!'
      });
      resetForm();
      setDialogOpen(false);
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível salvar o treinamento.', variant: 'destructive' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (treinamentoId: string) => {
      const { error } = await supabase.from('treinamentos_cargo').delete().eq('id', treinamentoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treinamentos-cargo', cargoId] });
      toast({ title: 'Sucesso', description: 'Treinamento excluído com sucesso!' });
    }
  });

  const resetForm = () => {
    setFormData({
      nome_treinamento: '',
      norma: '',
      periodicidade_meses: 12,
      obrigatorio: true,
      observacao: ''
    });
    setEditingTreinamento(null);
  };

  const handleEdit = (treinamento: TreinamentoCargo) => {
    setEditingTreinamento(treinamento);
    setFormData({
      nome_treinamento: treinamento.nome_treinamento,
      norma: treinamento.norma || '',
      periodicidade_meses: treinamento.periodicidade_meses,
      obrigatorio: treinamento.obrigatorio,
      observacao: treinamento.observacao || ''
    });
    setDialogOpen(true);
  };

  const handleView = (treinamento: TreinamentoCargo) => {
    setViewingTreinamento(treinamento);
    setViewModalOpen(true);
  };

  const handleViewObs = (treinamento: TreinamentoCargo) => {
    setViewingObs({ title: `Observação - ${treinamento.nome_treinamento}`, obs: treinamento.observacao });
    setObsModalOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.nome_treinamento.trim()) {
      toast({ title: 'Erro', description: 'O nome do treinamento é obrigatório.', variant: 'destructive' });
      return;
    }
    saveMutation.mutate({ ...formData, id: editingTreinamento?.id });
  };

  const formatPeriodicidade = (meses: number) => {
    if (meses === 12) return '1 ano';
    if (meses === 24) return '2 anos';
    if (meses === 6) return '6 meses';
    if (meses < 12) return `${meses} meses`;
    const anos = Math.floor(meses / 12);
    const mesesRestantes = meses % 12;
    if (mesesRestantes === 0) return `${anos} ano${anos > 1 ? 's' : ''}`;
    return `${anos} ano${anos > 1 ? 's' : ''} e ${mesesRestantes} meses`;
  };

  const getViewData = (treinamento: TreinamentoCargo) => ({
    nome: { label: 'Nome do Treinamento', value: treinamento.nome_treinamento },
    norma: { label: 'Norma', value: treinamento.norma ? <Badge variant="outline">{treinamento.norma}</Badge> : '-' },
    periodicidade: { label: 'Periodicidade', value: formatPeriodicidade(treinamento.periodicidade_meses) },
    obrigatorio: {
      label: 'Obrigatório',
      value: <Badge variant={treinamento.obrigatorio ? 'default' : 'secondary'}>{treinamento.obrigatorio ? 'Sim' : 'Não'}</Badge>
    },
    observacao: { label: 'Observação', value: treinamento.observacao || '-' }
  });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Treinamentos</CardTitle>
            {canCreate && (
              <Dialog open={dialogOpen} onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-2" />Novo Treinamento</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{editingTreinamento ? 'Editar Treinamento' : 'Novo Treinamento'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="nome_treinamento">Nome do Treinamento *</Label>
                      <Input
                        id="nome_treinamento"
                        value={formData.nome_treinamento}
                        onChange={(e) => setFormData(prev => ({ ...prev, nome_treinamento: e.target.value }))}
                        placeholder="Ex: Treinamento de Segurança"
                      />
                    </div>
                    <div>
                      <Label htmlFor="norma">Norma</Label>
                      <Select value={formData.norma} onValueChange={(value) => setFormData(prev => ({ ...prev, norma: value }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione a norma" /></SelectTrigger>
                        <SelectContent>
                          {NORMAS_OPTIONS.map((norma) => (
                            <SelectItem key={norma.value} value={norma.value}>{norma.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="periodicidade">Periodicidade (em meses)</Label>
                      <Input
                        id="periodicidade"
                        type="number"
                        min={1}
                        value={formData.periodicidade_meses}
                        onChange={(e) => setFormData(prev => ({ ...prev, periodicidade_meses: parseInt(e.target.value) || 12 }))}
                      />
                      <p className="text-xs text-muted-foreground mt-1">Validade: {formatPeriodicidade(formData.periodicidade_meses)}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="obrigatorio"
                        checked={formData.obrigatorio}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, obrigatorio: checked }))}
                      />
                      <Label htmlFor="obrigatorio">Treinamento Obrigatório</Label>
                    </div>
                    <div>
                      <Label htmlFor="observacao">Observação</Label>
                      <Textarea
                        id="observacao"
                        value={formData.observacao}
                        onChange={(e) => setFormData(prev => ({ ...prev, observacao: e.target.value }))}
                        placeholder="Observações sobre o treinamento..."
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
                      {saveMutation.isPending ? 'Salvando...' : editingTreinamento ? 'Salvar Alterações' : 'Cadastrar'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando treinamentos...</div>
          ) : (() => {
            const filteredTreinamentos = treinamentos.filter(t => {
              if (filterObrigatorio === 'sim') return t.obrigatorio;
              if (filterObrigatorio === 'nao') return !t.obrigatorio;
              return true;
            });
            return filteredTreinamentos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {treinamentos.length === 0 ? 'Nenhum treinamento cadastrado para este cargo.' : 'Nenhum treinamento encontrado com o filtro selecionado.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Treinamento</TableHead>
                  <TableHead>Norma</TableHead>
                  <TableHead>Periodicidade</TableHead>
                  <TableHead>Obrigatório</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTreinamentos.map((treinamento) => (
                  <TableRow key={treinamento.id}>
                    <TableCell className="font-medium">{treinamento.nome_treinamento}</TableCell>
                    <TableCell>
                      {treinamento.norma ? <Badge variant="outline">{treinamento.norma}</Badge> : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>{formatPeriodicidade(treinamento.periodicidade_meses)}</TableCell>
                    <TableCell>
                      <Badge variant={treinamento.obrigatorio ? 'default' : 'secondary'}>{treinamento.obrigatorio ? 'Sim' : 'Não'}</Badge>
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <div className="flex space-x-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => handleView(treinamento)}><Eye className="h-4 w-4" /></Button>
                            </TooltipTrigger>
                            <TooltipContent>Visualizar</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => handleViewObs(treinamento)}><FileText className="h-4 w-4" /></Button>
                            </TooltipTrigger>
                            <TooltipContent>Ver Observação</TooltipContent>
                          </Tooltip>
                          {canEdit && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => handleEdit(treinamento)}><Pencil className="h-4 w-4" /></Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar</TooltipContent>
                            </Tooltip>
                          )}
                          {canDelete && (
                            <AlertDialog>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4" /></Button>
                                  </AlertDialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent>Excluir</TooltipContent>
                              </Tooltip>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja excluir o treinamento "{treinamento.nome_treinamento}"?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteMutation.mutate(treinamento.id)}>Excluir</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          );
          })()}
        </CardContent>
      </Card>

      {viewingTreinamento && (
        <ViewItemModal
          open={viewModalOpen}
          onOpenChange={setViewModalOpen}
          title={`Visualizar Treinamento - ${viewingTreinamento.nome_treinamento}`}
          data={getViewData(viewingTreinamento)}
        />
      )}

      <ViewObservacaoModal
        open={obsModalOpen}
        onOpenChange={setObsModalOpen}
        title={viewingObs.title}
        observacao={viewingObs.obs}
      />
    </>
  );
}
