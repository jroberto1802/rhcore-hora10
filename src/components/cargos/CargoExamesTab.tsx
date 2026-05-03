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
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EventosPopover } from './EventosPopover';
import { ViewItemModal } from './ViewItemModal';
import { ViewObservacaoModal } from './ViewObservacaoModal';

interface CargoExamesTabProps {
  cargoId: string;
  empresaId: string;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  filterObrigatorio?: string;
}

interface ExameCargo {
  id: string;
  nome_exame: string;
  periodicidade_meses: number;
  obrigatorio: boolean;
  observacao: string | null;
  eventos?: string[];
}

const TIPOS_EVENTO = [
  { value: 'Admissional', label: 'Admissional' },
  { value: 'Periódico', label: 'Periódico' },
  { value: 'Demissional', label: 'Demissional' },
  { value: 'Retorno ao Trabalho', label: 'Retorno ao Trabalho' },
  { value: 'Mudança de Riscos Ocupacionais', label: 'Mudança de Riscos Ocupacionais' },
];

export function CargoExamesTab({ cargoId, empresaId, canCreate = true, canEdit = true, canDelete = true, filterObrigatorio = 'todos' }: CargoExamesTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExame, setEditingExame] = useState<ExameCargo | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingExame, setViewingExame] = useState<ExameCargo | null>(null);
  const [obsModalOpen, setObsModalOpen] = useState(false);
  const [viewingObs, setViewingObs] = useState<{ title: string; obs: string | null }>({ title: '', obs: null });
  const [formData, setFormData] = useState({
    nome_exame: '',
    periodicidade_meses: 12,
    obrigatorio: true,
    observacao: '',
    eventos: [] as string[]
  });

  const { data: exames = [], isLoading } = useQuery({
    queryKey: ['exames-cargo', cargoId],
    queryFn: async () => {
      const { data: examesData, error } = await supabase
        .from('exames_cargo')
        .select('*')
        .eq('cargo_id', cargoId)
        .order('nome_exame');

      if (error) throw error;

      const examesComEventos = await Promise.all(
        (examesData || []).map(async (exame) => {
          const { data: eventosData } = await supabase
            .from('exames_cargo_eventos')
            .select('tipo_evento')
            .eq('exame_cargo_id', exame.id);
          
          return {
            ...exame,
            eventos: eventosData?.map(e => e.tipo_evento) || []
          };
        })
      );

      return examesComEventos as ExameCargo[];
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      if (data.id) {
        const { error: updateError } = await supabase
          .from('exames_cargo')
          .update({
            nome_exame: data.nome_exame,
            periodicidade_meses: data.periodicidade_meses,
            obrigatorio: data.obrigatorio,
            observacao: data.observacao || null
          })
          .eq('id', data.id);

        if (updateError) throw updateError;

        await supabase
          .from('exames_cargo_eventos')
          .delete()
          .eq('exame_cargo_id', data.id);

        if (data.eventos.length > 0) {
          const eventosData = data.eventos.map(tipo_evento => ({
            exame_cargo_id: data.id,
            tipo_evento,
            empresa_id: empresaId
          }));
          
          const { error: eventosError } = await supabase
            .from('exames_cargo_eventos')
            .insert(eventosData);

          if (eventosError) throw eventosError;
        }
      } else {
        const { data: novoExame, error: insertError } = await supabase
          .from('exames_cargo')
          .insert({
            cargo_id: cargoId,
            empresa_id: empresaId,
            nome_exame: data.nome_exame,
            periodicidade_meses: data.periodicidade_meses,
            obrigatorio: data.obrigatorio,
            observacao: data.observacao || null
          })
          .select()
          .single();

        if (insertError) throw insertError;

        if (data.eventos.length > 0) {
          const eventosData = data.eventos.map(tipo_evento => ({
            exame_cargo_id: novoExame.id,
            tipo_evento,
            empresa_id: empresaId
          }));
          
          const { error: eventosError } = await supabase
            .from('exames_cargo_eventos')
            .insert(eventosData);

          if (eventosError) throw eventosError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exames-cargo', cargoId] });
      toast({
        title: 'Sucesso',
        description: editingExame ? 'Exame atualizado com sucesso!' : 'Exame cadastrado com sucesso!'
      });
      resetForm();
      setDialogOpen(false);
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível salvar o exame.', variant: 'destructive' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (exameId: string) => {
      const { error } = await supabase.from('exames_cargo').delete().eq('id', exameId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exames-cargo', cargoId] });
      toast({ title: 'Sucesso', description: 'Exame excluído com sucesso!' });
    }
  });

  const resetForm = () => {
    setFormData({ nome_exame: '', periodicidade_meses: 12, obrigatorio: true, observacao: '', eventos: [] });
    setEditingExame(null);
  };

  const handleEdit = (exame: ExameCargo) => {
    setEditingExame(exame);
    setFormData({
      nome_exame: exame.nome_exame,
      periodicidade_meses: exame.periodicidade_meses,
      obrigatorio: exame.obrigatorio,
      observacao: exame.observacao || '',
      eventos: exame.eventos || []
    });
    setDialogOpen(true);
  };

  const handleView = (exame: ExameCargo) => {
    setViewingExame(exame);
    setViewModalOpen(true);
  };

  const handleViewObs = (exame: ExameCargo) => {
    setViewingObs({ title: `Observação - ${exame.nome_exame}`, obs: exame.observacao });
    setObsModalOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.nome_exame.trim()) {
      toast({ title: 'Erro', description: 'O nome do exame é obrigatório.', variant: 'destructive' });
      return;
    }
    saveMutation.mutate({ ...formData, id: editingExame?.id });
  };

  const toggleEvento = (evento: string) => {
    setFormData(prev => ({
      ...prev,
      eventos: prev.eventos.includes(evento)
        ? prev.eventos.filter(e => e !== evento)
        : [...prev.eventos, evento]
    }));
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

  const getViewData = (exame: ExameCargo) => ({
    nome: { label: 'Nome do Exame', value: exame.nome_exame },
    periodicidade: { label: 'Periodicidade', value: formatPeriodicidade(exame.periodicidade_meses) },
    obrigatorio: {
      label: 'Obrigatório',
      value: <Badge variant={exame.obrigatorio ? 'default' : 'secondary'}>{exame.obrigatorio ? 'Sim' : 'Não'}</Badge>
    },
    eventos: {
      label: 'Eventos Vinculados',
      value: exame.eventos && exame.eventos.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {exame.eventos.map(e => <Badge key={e} variant="outline">{e}</Badge>)}
        </div>
      ) : 'Nenhum evento vinculado'
    },
    observacao: { label: 'Observação', value: exame.observacao || '-' }
  });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Exames Ocupacionais</CardTitle>
            {canCreate && (
              <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-2" />Novo Exame</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{editingExame ? 'Editar Exame' : 'Novo Exame Ocupacional'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="nome_exame">Nome do Exame *</Label>
                      <Input id="nome_exame" value={formData.nome_exame} onChange={(e) => setFormData(prev => ({ ...prev, nome_exame: e.target.value }))} placeholder="Ex: Audiometria" />
                    </div>
                    <div>
                      <Label htmlFor="periodicidade">Periodicidade (em meses)</Label>
                      <Input id="periodicidade" type="number" min={1} value={formData.periodicidade_meses} onChange={(e) => setFormData(prev => ({ ...prev, periodicidade_meses: parseInt(e.target.value) || 12 }))} />
                      <p className="text-xs text-muted-foreground mt-1">{formatPeriodicidade(formData.periodicidade_meses)}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="obrigatorio" checked={formData.obrigatorio} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, obrigatorio: checked }))} />
                      <Label htmlFor="obrigatorio">Exame Obrigatório</Label>
                    </div>
                    <div>
                      <Label>Tipos de Evento Aplicáveis</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {TIPOS_EVENTO.map((evento) => (
                          <div key={evento.value} className="flex items-center space-x-2">
                            <Checkbox id={evento.value} checked={formData.eventos.includes(evento.value)} onCheckedChange={() => toggleEvento(evento.value)} />
                            <Label htmlFor={evento.value} className="text-sm font-normal cursor-pointer">{evento.label}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="observacao">Observação</Label>
                      <Textarea id="observacao" value={formData.observacao} onChange={(e) => setFormData(prev => ({ ...prev, observacao: e.target.value }))} placeholder="Observações sobre o exame..." rows={3} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
                      {saveMutation.isPending ? 'Salvando...' : editingExame ? 'Salvar Alterações' : 'Cadastrar'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando exames...</div>
          ) : (() => {
            const filteredExames = exames.filter(e => {
              if (filterObrigatorio === 'sim') return e.obrigatorio;
              if (filterObrigatorio === 'nao') return !e.obrigatorio;
              return true;
            });
            return filteredExames.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {exames.length === 0 ? 'Nenhum exame ocupacional cadastrado para este cargo.' : 'Nenhum exame encontrado com o filtro selecionado.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exame</TableHead>
                  <TableHead>Periodicidade</TableHead>
                  <TableHead>Obrigatório</TableHead>
                  <TableHead>Eventos</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExames.map((exame) => (
                  <TableRow key={exame.id}>
                    <TableCell className="font-medium">{exame.nome_exame}</TableCell>
                    <TableCell>{formatPeriodicidade(exame.periodicidade_meses)}</TableCell>
                    <TableCell>
                      <Badge variant={exame.obrigatorio ? 'default' : 'secondary'}>{exame.obrigatorio ? 'Sim' : 'Não'}</Badge>
                    </TableCell>
                    <TableCell>
                      <EventosPopover eventos={exame.eventos || []} />
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <div className="flex space-x-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => handleView(exame)}><Eye className="h-4 w-4" /></Button>
                            </TooltipTrigger>
                            <TooltipContent>Visualizar</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => handleViewObs(exame)}><FileText className="h-4 w-4" /></Button>
                            </TooltipTrigger>
                            <TooltipContent>Ver Observação</TooltipContent>
                          </Tooltip>
                          {canEdit && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => handleEdit(exame)}><Pencil className="h-4 w-4" /></Button>
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
                                  <AlertDialogDescription>Tem certeza que deseja excluir o exame "{exame.nome_exame}"?</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteMutation.mutate(exame.id)}>Excluir</AlertDialogAction>
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

      {viewingExame && (
        <ViewItemModal open={viewModalOpen} onOpenChange={setViewModalOpen} title={`Visualizar Exame - ${viewingExame.nome_exame}`} data={getViewData(viewingExame)} />
      )}

      <ViewObservacaoModal open={obsModalOpen} onOpenChange={setObsModalOpen} title={viewingObs.title} observacao={viewingObs.obs} />
    </>
  );
}
