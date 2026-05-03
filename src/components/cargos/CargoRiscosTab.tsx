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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ViewItemModal } from './ViewItemModal';
import { ViewObservacaoModal } from './ViewObservacaoModal';

interface CargoRiscosTabProps {
  cargoId: string;
  empresaId: string;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

interface Risco {
  id: string;
  grupo: string;
  risco: string;
  possiveis_lesoes: string | null;
  medidas_controle: string | null;
}

const GRUPOS_RISCO = [
  { value: 'Físico', label: 'Físico' },
  { value: 'Químico', label: 'Químico' },
  { value: 'Biológico', label: 'Biológico' },
  { value: 'Ergonômico', label: 'Ergonômico' },
  { value: 'Acidente/Mecânico', label: 'Acidente / Mecânico' },
];

export function CargoRiscosTab({ cargoId, empresaId, canCreate = true, canEdit = true, canDelete = true }: CargoRiscosTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRisco, setEditingRisco] = useState<Risco | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingRisco, setViewingRisco] = useState<Risco | null>(null);
  const [obsModalOpen, setObsModalOpen] = useState(false);
  const [viewingObs, setViewingObs] = useState<{ title: string; obs: string | null }>({ title: '', obs: null });
  const [formData, setFormData] = useState({ 
    grupo: '', 
    risco: '', 
    possiveis_lesoes: '', 
    medidas_controle: '' 
  });

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

  const { data: riscos = [], isLoading } = useQuery({
    queryKey: ['riscos-cargo', segurancaCargoId],
    queryFn: async () => {
      if (!segurancaCargoId) return [];
      const { data, error } = await supabase
        .from('riscos_ocupacionais')
        .select('*')
        .eq('seguranca_cargo_id', segurancaCargoId)
        .order('grupo');
      if (error) throw error;
      return data as Risco[];
    },
    enabled: !!segurancaCargoId
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase
          .from('riscos_ocupacionais')
          .update({
            grupo: data.grupo,
            risco: data.risco,
            possiveis_lesoes: data.possiveis_lesoes || null,
            medidas_controle: data.medidas_controle || null
          })
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('riscos_ocupacionais')
          .insert({ ...data, seguranca_cargo_id: segurancaCargoId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['riscos-cargo', segurancaCargoId] });
      toast({ 
        title: 'Sucesso', 
        description: editingRisco ? 'Risco atualizado com sucesso!' : 'Risco ocupacional adicionado com sucesso!' 
      });
      resetForm();
      setDialogOpen(false);
    },
    onError: () => toast({ title: 'Erro', description: 'Não foi possível salvar o risco.', variant: 'destructive' })
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('riscos_ocupacionais').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['riscos-cargo', segurancaCargoId] });
      toast({ title: 'Sucesso', description: 'Risco removido com sucesso!' });
    }
  });

  const resetForm = () => {
    setFormData({ grupo: '', risco: '', possiveis_lesoes: '', medidas_controle: '' });
    setEditingRisco(null);
  };

  const handleEdit = (risco: Risco) => {
    setEditingRisco(risco);
    setFormData({
      grupo: risco.grupo,
      risco: risco.risco,
      possiveis_lesoes: risco.possiveis_lesoes || '',
      medidas_controle: risco.medidas_controle || ''
    });
    setDialogOpen(true);
  };

  const handleView = (risco: Risco) => {
    setViewingRisco(risco);
    setViewModalOpen(true);
  };

  const handleViewObs = (risco: Risco) => {
    const obsText = [
      risco.possiveis_lesoes && `Possíveis Lesões:\n${risco.possiveis_lesoes}`,
      risco.medidas_controle && `\n\nMedidas de Controle:\n${risco.medidas_controle}`
    ].filter(Boolean).join('') || null;
    setViewingObs({ title: `Detalhes - ${risco.risco}`, obs: obsText });
    setObsModalOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.grupo || !formData.risco.trim()) {
      toast({ title: 'Erro', description: 'Grupo e risco são obrigatórios.', variant: 'destructive' });
      return;
    }
    saveMutation.mutate({ ...formData, id: editingRisco?.id });
  };

  const getGrupoBadgeColor = (grupo: string) => {
    switch (grupo) {
      case 'Físico': return 'bg-blue-100 text-blue-800';
      case 'Químico': return 'bg-purple-100 text-purple-800';
      case 'Biológico': return 'bg-green-100 text-green-800';
      case 'Ergonômico': return 'bg-yellow-100 text-yellow-800';
      case 'Acidente/Mecânico': return 'bg-red-100 text-red-800';
      default: return '';
    }
  };

  const getViewData = (risco: Risco) => ({
    grupo: { label: 'Grupo', value: <Badge className={getGrupoBadgeColor(risco.grupo)}>{risco.grupo}</Badge> },
    risco: { label: 'Risco', value: risco.risco },
    possiveis_lesoes: { label: 'Possíveis Lesões', value: risco.possiveis_lesoes || '-' },
    medidas_controle: { label: 'Medidas de Controle', value: risco.medidas_controle || '-' }
  });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Riscos Ocupacionais</CardTitle>
            {canCreate && (
              <Dialog open={dialogOpen} onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-2" />Adicionar Risco</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{editingRisco ? 'Editar Risco Ocupacional' : 'Adicionar Risco Ocupacional'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Grupo *</Label>
                      <Select value={formData.grupo} onValueChange={(value) => setFormData(p => ({ ...p, grupo: value }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione o grupo" /></SelectTrigger>
                        <SelectContent>
                          {GRUPOS_RISCO.map((g) => (
                            <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Risco *</Label>
                      <Input 
                        value={formData.risco} 
                        onChange={(e) => setFormData(p => ({ ...p, risco: e.target.value }))} 
                        placeholder="Ex: Ruído excessivo" 
                      />
                    </div>
                    <div>
                      <Label>Possíveis Lesões</Label>
                      <Textarea 
                        value={formData.possiveis_lesoes} 
                        onChange={(e) => setFormData(p => ({ ...p, possiveis_lesoes: e.target.value }))} 
                        placeholder="Descreva as possíveis lesões..." 
                      />
                    </div>
                    <div>
                      <Label>Medidas de Controle</Label>
                      <Textarea 
                        value={formData.medidas_controle} 
                        onChange={(e) => setFormData(p => ({ ...p, medidas_controle: e.target.value }))} 
                        placeholder="Descreva as medidas de controle..." 
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
                      {saveMutation.isPending ? 'Salvando...' : editingRisco ? 'Salvar Alterações' : 'Adicionar'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-muted-foreground">Carregando...</p> : riscos.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Nenhum risco ocupacional cadastrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Risco</TableHead>
                  <TableHead>Possíveis Lesões</TableHead>
                  <TableHead>Medidas de Controle</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {riscos.map((risco) => (
                  <TableRow key={risco.id}>
                    <TableCell><Badge className={getGrupoBadgeColor(risco.grupo)}>{risco.grupo}</Badge></TableCell>
                    <TableCell className="font-medium">{risco.risco}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{risco.possiveis_lesoes || '-'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{risco.medidas_controle || '-'}</TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <div className="flex space-x-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => handleView(risco)}><Eye className="h-4 w-4" /></Button>
                            </TooltipTrigger>
                            <TooltipContent>Visualizar</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => handleViewObs(risco)}><FileText className="h-4 w-4" /></Button>
                            </TooltipTrigger>
                            <TooltipContent>Ver Detalhes</TooltipContent>
                          </Tooltip>
                          {canEdit && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => handleEdit(risco)}><Pencil className="h-4 w-4" /></Button>
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
                                    Tem certeza que deseja excluir o risco "{risco.risco}"?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteMutation.mutate(risco.id)}>Excluir</AlertDialogAction>
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

      {viewingRisco && (
        <ViewItemModal
          open={viewModalOpen}
          onOpenChange={setViewModalOpen}
          title={`Visualizar Risco - ${viewingRisco.risco}`}
          data={getViewData(viewingRisco)}
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
