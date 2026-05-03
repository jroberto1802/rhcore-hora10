import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, Search, Pencil, Trash2, Eye } from 'lucide-react';
import { format, startOfYear, endOfYear, subYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { type Empresa } from '@/hooks/useUserEmpresas';
import { formatDateForDisplay } from '@/lib/utils';
import removeAccents from 'remove-accents';

const TIPOS_OCORRENCIA = [
  'Compensação',
  'Operacional',
  'Terceirizados',
  'Jurídico',
  'Segurança',
  'Externo',
  'Outros',
];

interface OcorrenciasGeraisProps {
  currentEmpresa: Empresa | null;
  isGroupView?: boolean;
  currentGroupId?: string | null;
}

interface OcorrenciaGeral {
  id: string;
  empresa_id: string;
  titulo: string;
  tipo_ocorrencia: string;
  data: string;
  descricao: string;
  observacoes: string | null;
  criado_por_id: string | null;
  criado_por_nome: string | null;
  created_at: string;
  updated_at: string;
}

interface OcorrenciaForm {
  titulo: string;
  tipo_ocorrencia: string;
  data: string;
  descricao: string;
  observacoes: string;
}

const emptyForm: OcorrenciaForm = {
  titulo: '',
  tipo_ocorrencia: '',
  data: '',
  descricao: '',
  observacoes: '',
};

export function OcorrenciasGerais({ currentEmpresa, isGroupView, currentGroupId }: OcorrenciasGeraisProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('all');
  const [filterPeriodo, setFilterPeriodo] = useState('todos');
  const [dataInicial, setDataInicial] = useState('');
  const [dataFinal, setDataFinal] = useState('');

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [showView, setShowView] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedOcorrencia, setSelectedOcorrencia] = useState<OcorrenciaGeral | null>(null);
  const [formData, setFormData] = useState<OcorrenciaForm>(emptyForm);
  const [isEditing, setIsEditing] = useState(false);

  // Fetch ocorrências
  const { data: ocorrencias = [], isLoading } = useQuery({
    queryKey: ['ocorrencias_gerais', currentEmpresa?.id, isGroupView, currentGroupId],
    queryFn: async () => {
      let query = supabase
        .from('ocorrencias_gerais')
        .select('*')
        .order('data', { ascending: false });

      if (isGroupView && currentGroupId) {
        const { data: empresas } = await supabase
          .from('empresas')
          .select('id')
          .eq('grupo_empresarial_id', currentGroupId);
        const empresaIds = empresas?.map(e => e.id) || [];
        if (empresaIds.length > 0) {
          query = query.in('empresa_id', empresaIds);
        } else {
          return [];
        }
      } else if (currentEmpresa?.id) {
        query = query.eq('empresa_id', currentEmpresa.id);
      } else {
        return [];
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as OcorrenciaGeral[];
    },
    enabled: !!(currentEmpresa?.id || (isGroupView && currentGroupId)),
  });

  // Filtered data
  const filteredOcorrencias = useMemo(() => {
    let filtered = ocorrencias;

    // Filtro por tipo
    if (filterTipo && filterTipo !== 'all') {
      filtered = filtered.filter(o => o.tipo_ocorrencia === filterTipo);
    }

    // Filtro por período
    const now = new Date();
    if (filterPeriodo === 'ano_atual') {
      const start = startOfYear(now);
      const end = endOfYear(now);
      filtered = filtered.filter(o => {
        const d = new Date(o.data + 'T00:00:00');
        return d >= start && d <= end;
      });
    } else if (filterPeriodo === 'ano_passado') {
      const lastYear = subYears(now, 1);
      const start = startOfYear(lastYear);
      const end = endOfYear(lastYear);
      filtered = filtered.filter(o => {
        const d = new Date(o.data + 'T00:00:00');
        return d >= start && d <= end;
      });
    } else if (filterPeriodo === 'personalizado') {
      if (dataInicial) {
        filtered = filtered.filter(o => o.data >= dataInicial);
      }
      if (dataFinal) {
        filtered = filtered.filter(o => o.data <= dataFinal);
      }
    }

    // Filtro por palavra-chave
    if (searchTerm.trim()) {
      const term = removeAccents(searchTerm.toLowerCase());
      filtered = filtered.filter(o =>
        removeAccents(o.titulo.toLowerCase()).includes(term) ||
        removeAccents(o.descricao.toLowerCase()).includes(term) ||
        removeAccents(o.tipo_ocorrencia.toLowerCase()).includes(term)
      );
    }

    return filtered;
  }, [ocorrencias, filterTipo, filterPeriodo, dataInicial, dataFinal, searchTerm]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: OcorrenciaForm) => {
      const empresaId = currentEmpresa?.id;
      if (!empresaId) throw new Error('Empresa não selecionada');

      let userName: string | null = null;
      if (user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('nome')
          .eq('user_id', user.id)
          .maybeSingle();
        userName = profile?.nome || user?.user_metadata?.nome || user?.email || null;
      }

      const { error } = await supabase.from('ocorrencias_gerais').insert({
        empresa_id: empresaId,
        titulo: data.titulo,
        tipo_ocorrencia: data.tipo_ocorrencia,
        data: data.data,
        descricao: data.descricao,
        observacoes: data.observacoes || null,
        criado_por_id: user?.id || null,
        criado_por_nome: userName,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ocorrencias_gerais'] });
      toast.success('Ocorrência registrada com sucesso!');
      closeForm();
    },
    onError: () => {
      toast.error('Erro ao registrar ocorrência.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: OcorrenciaForm }) => {
      const { error } = await supabase
        .from('ocorrencias_gerais')
        .update({
          titulo: data.titulo,
          tipo_ocorrencia: data.tipo_ocorrencia,
          data: data.data,
          descricao: data.descricao,
          observacoes: data.observacoes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ocorrencias_gerais'] });
      toast.success('Ocorrência atualizada com sucesso!');
      closeForm();
    },
    onError: () => {
      toast.error('Erro ao atualizar ocorrência.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ocorrencias_gerais').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ocorrencias_gerais'] });
      toast.success('Ocorrência excluída com sucesso!');
      setShowDeleteConfirm(false);
      setSelectedOcorrencia(null);
    },
    onError: () => {
      toast.error('Erro ao excluir ocorrência.');
    },
  });

  const closeForm = () => {
    setShowForm(false);
    setFormData(emptyForm);
    setIsEditing(false);
    setSelectedOcorrencia(null);
  };

  const handleNew = () => {
    setFormData(emptyForm);
    setIsEditing(false);
    setSelectedOcorrencia(null);
    setShowForm(true);
  };

  const handleEdit = (ocorrencia: OcorrenciaGeral) => {
    setFormData({
      titulo: ocorrencia.titulo,
      tipo_ocorrencia: ocorrencia.tipo_ocorrencia,
      data: ocorrencia.data,
      descricao: ocorrencia.descricao,
      observacoes: ocorrencia.observacoes || '',
    });
    setSelectedOcorrencia(ocorrencia);
    setIsEditing(true);
    setShowForm(true);
  };

  const handleView = (ocorrencia: OcorrenciaGeral) => {
    setSelectedOcorrencia(ocorrencia);
    setShowView(true);
  };

  const handleDelete = (ocorrencia: OcorrenciaGeral) => {
    setSelectedOcorrencia(ocorrencia);
    setShowDeleteConfirm(true);
  };

  const handleSave = () => {
    if (!formData.titulo.trim() || !formData.tipo_ocorrencia || !formData.data || !formData.descricao.trim()) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    if (isEditing && selectedOcorrencia) {
      updateMutation.mutate({ id: selectedOcorrencia.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="space-y-6 bg-background p-6 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ocorrências Gerais</h1>
          <p className="text-muted-foreground">Histórico e registro de ocorrências relevantes</p>
        </div>
        {!isGroupView && (
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Ocorrência
          </Button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <Label>Palavra-chave</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por palavra-chave"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="w-[200px]">
          <Label>Tipo de Ocorrência</Label>
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {TIPOS_OCORRENCIA.map(tipo => (
                <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-[200px]">
          <Label>Período</Label>
          <Select value={filterPeriodo} onValueChange={setFilterPeriodo}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="ano_atual">Ano atual</SelectItem>
              <SelectItem value="ano_passado">Ano passado</SelectItem>
              <SelectItem value="personalizado">Período personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {filterPeriodo === 'personalizado' && (
          <>
            <div className="w-[160px]">
              <Label>Data Inicial</Label>
              <Input type="date" value={dataInicial} onChange={e => setDataInicial(e.target.value)} />
            </div>
            <div className="w-[160px]">
              <Label>Data Final</Label>
              <Input type="date" value={dataFinal} onChange={e => setDataFinal(e.target.value)} />
            </div>
          </>
        )}
      </div>

      {/* Tabela */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Tipo de Ocorrência</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Criado por</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filteredOcorrencias.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhuma ocorrência encontrada.
                </TableCell>
              </TableRow>
            ) : (
              filteredOcorrencias.map(ocorrencia => (
                <TableRow key={ocorrencia.id}>
                  <TableCell className="font-medium">{ocorrencia.titulo}</TableCell>
                  <TableCell>{ocorrencia.tipo_ocorrencia}</TableCell>
                  <TableCell>{formatDateForDisplay(ocorrencia.data)}</TableCell>
                  <TableCell>{ocorrencia.criado_por_nome || '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleView(ocorrencia)} title="Visualizar">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {!isGroupView && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(ocorrencia)} title="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(ocorrencia)} title="Apagar">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal Cadastro/Edição */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Ocorrência' : 'Nova Ocorrência'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título da Ocorrência *</Label>
              <Input
                value={formData.titulo}
                onChange={e => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                placeholder="Título da ocorrência"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Ocorrência *</Label>
                <Select value={formData.tipo_ocorrencia} onValueChange={v => setFormData(prev => ({ ...prev, tipo_ocorrencia: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_OCORRENCIA.map(tipo => (
                      <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={formData.data}
                  onChange={e => setFormData(prev => ({ ...prev, data: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>Descrição Completa *</Label>
              <Textarea
                value={formData.descricao}
                onChange={e => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Descreva a ocorrência detalhadamente"
                className="min-h-[150px]"
              />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                value={formData.observacoes}
                onChange={e => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                placeholder="Observações adicionais (opcional)"
                className="min-h-[80px]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={closeForm}>Cancelar</Button>
              <Button
                onClick={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Visualização */}
      <Dialog open={showView} onOpenChange={setShowView}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Ocorrência</DialogTitle>
          </DialogHeader>
          {selectedOcorrencia && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground text-xs">Título</Label>
                <p className="font-medium">{selectedOcorrencia.titulo}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Tipo de Ocorrência</Label>
                  <p>{selectedOcorrencia.tipo_ocorrencia}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Data</Label>
                  <p>{formatDateForDisplay(selectedOcorrencia.data)}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Descrição Completa</Label>
                <p className="whitespace-pre-wrap">{selectedOcorrencia.descricao}</p>
              </div>
              {selectedOcorrencia.observacoes && (
                <div>
                  <Label className="text-muted-foreground text-xs">Observações</Label>
                  <p className="whitespace-pre-wrap">{selectedOcorrencia.observacoes}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Criado por</Label>
                  <p>{selectedOcorrencia.criado_por_nome || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Data de Criação</Label>
                  <p>{format(new Date(selectedOcorrencia.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta ocorrência?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedOcorrencia && deleteMutation.mutate(selectedOcorrencia.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
