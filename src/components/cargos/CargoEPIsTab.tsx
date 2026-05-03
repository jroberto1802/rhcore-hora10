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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ViewItemModal } from './ViewItemModal';
import { ViewObservacaoModal } from './ViewObservacaoModal';

interface CargoEPIsTabProps {
  cargoId: string;
  empresaId: string;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

interface EPI {
  id: string;
  nome_epi: string;
  descricao: string | null;
  obrigatorio: boolean;
}

export function CargoEPIsTab({ cargoId, empresaId, canCreate = true, canEdit = true, canDelete = true }: CargoEPIsTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEPI, setEditingEPI] = useState<EPI | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingEPI, setViewingEPI] = useState<EPI | null>(null);
  const [obsModalOpen, setObsModalOpen] = useState(false);
  const [viewingObs, setViewingObs] = useState<{ title: string; obs: string | null }>({ title: '', obs: null });
  const [formData, setFormData] = useState({ nome_epi: '', descricao: '', obrigatorio: true });

  const { data: segurancaCargo } = useQuery({
    queryKey: ['seguranca-cargo', cargoId],
    queryFn: async () => {
      let { data, error } = await supabase
        .from('seguranca_trabalho_cargo')
        .select('*')
        .eq('cargo_id', cargoId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (!data) {
        const { data: novoRegistro, error: insertError } = await supabase
          .from('seguranca_trabalho_cargo')
          .insert({ cargo_id: cargoId, empresa_id: empresaId })
          .select()
          .single();

        if (insertError) throw insertError;
        data = novoRegistro;
      }

      return data;
    }
  });

  const segurancaCargoId = segurancaCargo?.id;

  const { data: epis = [], isLoading } = useQuery({
    queryKey: ['epis-cargo', segurancaCargoId],
    queryFn: async () => {
      if (!segurancaCargoId) return [];
      const { data, error } = await supabase
        .from('epis_cargo')
        .select('*')
        .eq('seguranca_cargo_id', segurancaCargoId)
        .order('nome_epi');
      if (error) throw error;
      return data as EPI[];
    },
    enabled: !!segurancaCargoId
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase
          .from('epis_cargo')
          .update({
            nome_epi: data.nome_epi,
            descricao: data.descricao || null,
            obrigatorio: data.obrigatorio
          })
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('epis_cargo')
          .insert({ ...data, seguranca_cargo_id: segurancaCargoId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epis-cargo', segurancaCargoId] });
      toast({ title: 'Sucesso', description: editingEPI ? 'EPI atualizado com sucesso!' : 'EPI adicionado com sucesso!' });
      resetForm();
      setDialogOpen(false);
    },
    onError: () => toast({ title: 'Erro', description: 'Não foi possível salvar o EPI.', variant: 'destructive' })
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('epis_cargo').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epis-cargo', segurancaCargoId] });
      toast({ title: 'Sucesso', description: 'EPI removido com sucesso!' });
    }
  });

  const resetForm = () => {
    setFormData({ nome_epi: '', descricao: '', obrigatorio: true });
    setEditingEPI(null);
  };

  const handleEdit = (epi: EPI) => {
    setEditingEPI(epi);
    setFormData({
      nome_epi: epi.nome_epi,
      descricao: epi.descricao || '',
      obrigatorio: epi.obrigatorio
    });
    setDialogOpen(true);
  };

  const handleView = (epi: EPI) => {
    setViewingEPI(epi);
    setViewModalOpen(true);
  };

  const handleViewObs = (epi: EPI) => {
    setViewingObs({ title: `Descrição - ${epi.nome_epi}`, obs: epi.descricao });
    setObsModalOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.nome_epi.trim()) {
      toast({ title: 'Erro', description: 'O nome do EPI é obrigatório.', variant: 'destructive' });
      return;
    }
    saveMutation.mutate({ ...formData, id: editingEPI?.id });
  };

  const getViewData = (epi: EPI) => ({
    nome: { label: 'Nome do EPI', value: epi.nome_epi },
    obrigatorio: {
      label: 'Obrigatório',
      value: <Badge variant={epi.obrigatorio ? 'default' : 'secondary'}>{epi.obrigatorio ? 'Sim' : 'Não'}</Badge>
    },
    descricao: { label: 'Descrição', value: epi.descricao || '-' }
  });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>EPIs Obrigatórios</CardTitle>
            {canCreate && (
              <Dialog open={dialogOpen} onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-2" />Adicionar EPI</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingEPI ? 'Editar EPI' : 'Adicionar EPI'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Nome do EPI *</Label>
                      <Input 
                        value={formData.nome_epi} 
                        onChange={(e) => setFormData(p => ({ ...p, nome_epi: e.target.value }))} 
                        placeholder="Ex: Capacete de Segurança" 
                      />
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Textarea 
                        value={formData.descricao} 
                        onChange={(e) => setFormData(p => ({ ...p, descricao: e.target.value }))} 
                        placeholder="Descrição do EPI..." 
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch 
                        checked={formData.obrigatorio} 
                        onCheckedChange={(checked) => setFormData(p => ({ ...p, obrigatorio: checked }))} 
                      />
                      <Label>Obrigatório</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
                      {saveMutation.isPending ? 'Salvando...' : editingEPI ? 'Salvar Alterações' : 'Adicionar'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-muted-foreground">Carregando...</p> : epis.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Nenhum EPI cadastrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>EPI</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Obrigatório</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {epis.map((epi) => (
                  <TableRow key={epi.id}>
                    <TableCell className="font-medium">{epi.nome_epi}</TableCell>
                    <TableCell className="max-w-[300px] truncate">{epi.descricao || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={epi.obrigatorio ? 'default' : 'secondary'}>{epi.obrigatorio ? 'Sim' : 'Não'}</Badge>
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <div className="flex space-x-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => handleView(epi)}><Eye className="h-4 w-4" /></Button>
                            </TooltipTrigger>
                            <TooltipContent>Visualizar</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => handleViewObs(epi)}><FileText className="h-4 w-4" /></Button>
                            </TooltipTrigger>
                            <TooltipContent>Ver Descrição</TooltipContent>
                          </Tooltip>
                          {canEdit && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => handleEdit(epi)}><Pencil className="h-4 w-4" /></Button>
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
                                    Tem certeza que deseja excluir o EPI "{epi.nome_epi}"?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteMutation.mutate(epi.id)}>Excluir</AlertDialogAction>
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
          )}
        </CardContent>
      </Card>

      {viewingEPI && (
        <ViewItemModal
          open={viewModalOpen}
          onOpenChange={setViewModalOpen}
          title={`Visualizar EPI - ${viewingEPI.nome_epi}`}
          data={getViewData(viewingEPI)}
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
