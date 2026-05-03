import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Calendar, Clock, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDateForInput, formatDateForDatabase } from '@/lib/utils';
import { useAuditLog } from '@/hooks/useAuditLog';
import { AuditLogFooter } from '@/components/AuditLogFooter';

interface Exame {
  id: string;
  nome_exame: string;
  clinica?: string;
  data_realizacao: string;
  data_validade?: string;
  resultado?: string;
  observacoes?: string;
  renovado?: boolean;
  created_at: string;
}

interface ExameCargo {
  id: string;
  nome_exame: string;
  periodicidade_meses: number;
  obrigatorio: boolean;
  observacao?: string;
}

interface ExameParaCadastro {
  exameCargo: ExameCargo;
  selecionado: boolean;
  data_realizacao: string;
  data_validade: string;
}

interface ExamesManagerProps {
  funcionarioId?: string;
  empresaId?: string;
  cargoAtual?: string;
  disabled?: boolean;
}

const TIPOS_EVENTO = [
  { value: 'Admissional', label: 'Admissional' },
  { value: 'Periódico', label: 'Periódico' },
  { value: 'Demissional', label: 'Demissional' },
  { value: 'Retorno ao Trabalho', label: 'Retorno ao Trabalho' },
  { value: 'Mudança de Riscos Ocupacionais', label: 'Mudança de Riscos Ocupacionais' },
  { value: 'Exame Avulso', label: 'Exame Avulso' },
];

export function ExamesManager({ funcionarioId, empresaId, cargoAtual, disabled = false }: ExamesManagerProps) {
  const { toast } = useToast();
  const { logChanges } = useAuditLog();
  const [exames, setExames] = useState<Exame[]>([]);
  const [examesCargo, setExamesCargo] = useState<ExameCargo[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewingExame, setViewingExame] = useState<Exame | null>(null);
  const [editingExame, setEditingExame] = useState<Exame | null>(null);
  const [tipoEventoSelecionado, setTipoEventoSelecionado] = useState<string>('');
  const [examesParaCadastro, setExamesParaCadastro] = useState<ExameParaCadastro[]>([]);
  const [formData, setFormData] = useState({
    nome_exame: '',
    clinica: '',
    data_realizacao: '',
    data_validade: '',
    resultado: '',
    observacoes: '',
    renovado: false
  });

  const resetForm = () => {
    setFormData({
      nome_exame: '',
      clinica: '',
      data_realizacao: '',
      data_validade: '',
      resultado: '',
      observacoes: '',
      renovado: false
    });
    setEditingExame(null);
    setTipoEventoSelecionado('');
    setExamesParaCadastro([]);
  };

  const loadExames = async () => {
    if (!funcionarioId || !empresaId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('exames')
        .select('*')
        .eq('funcionario_id', funcionarioId)
        .eq('empresa_id', empresaId)
        .order('data_realizacao', { ascending: false });

      if (error) throw error;
      setExames(data || []);
    } catch (error) {
      console.error('Erro ao carregar exames:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os exames.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadExamesCargo = async (tipoEvento: string) => {
    if (!empresaId || !cargoAtual || tipoEvento === 'Exame Avulso') {
      setExamesCargo([]);
      setExamesParaCadastro([]);
      return;
    }

    try {
      // Buscar cargo pelo nome
      const { data: cargoData } = await supabase
        .from('cargos')
        .select('id')
        .eq('empresa_id', empresaId)
        .eq('nome_completo_cargo', cargoAtual)
        .maybeSingle();

      if (!cargoData) {
        setExamesCargo([]);
        setExamesParaCadastro([]);
        return;
      }

      // Buscar exames do cargo vinculados ao tipo de evento
      const { data: examesCargoData, error } = await supabase
        .from('exames_cargo')
        .select(`
          id,
          nome_exame,
          periodicidade_meses,
          obrigatorio,
          observacao,
          exames_cargo_eventos!inner(tipo_evento)
        `)
        .eq('cargo_id', cargoData.id)
        .eq('empresa_id', empresaId)
        .eq('exames_cargo_eventos.tipo_evento', tipoEvento);

      if (error) throw error;

      const examesList = examesCargoData?.map(e => ({
        id: e.id,
        nome_exame: e.nome_exame,
        periodicidade_meses: e.periodicidade_meses,
        obrigatorio: e.obrigatorio,
        observacao: e.observacao || undefined
      })) || [];

      setExamesCargo(examesList);

      // Criar lista para cadastro com checkboxes
      const hoje = new Date();
      const examesParaCadastrar = examesList.map(exameCargo => {
        const dataValidade = new Date(hoje);
        dataValidade.setMonth(dataValidade.getMonth() + exameCargo.periodicidade_meses);
        return {
          exameCargo,
          selecionado: exameCargo.obrigatorio,
          data_realizacao: formatDateForInput(hoje.toISOString()),
          data_validade: formatDateForInput(dataValidade.toISOString())
        };
      });
      setExamesParaCadastro(examesParaCadastrar);
    } catch (error) {
      console.error('Erro ao carregar exames do cargo:', error);
      setExamesCargo([]);
      setExamesParaCadastro([]);
    }
  };

  useEffect(() => {
    if (funcionarioId && empresaId) {
      loadExames();
    }
  }, [funcionarioId, empresaId]);

  useEffect(() => {
    if (tipoEventoSelecionado && !editingExame) {
      loadExamesCargo(tipoEventoSelecionado);
    }
  }, [tipoEventoSelecionado, cargoAtual, empresaId]);

  const calcularDataValidade = (dataRealizacao: string, periodicidadeMeses: number): string => {
    if (!dataRealizacao) return '';
    const data = new Date(dataRealizacao);
    data.setMonth(data.getMonth() + periodicidadeMeses);
    return formatDateForInput(data.toISOString());
  };

  const handleDataRealizacaoChange = (index: number, novaData: string) => {
    setExamesParaCadastro(prev => prev.map((item, i) => {
      if (i === index) {
        return {
          ...item,
          data_realizacao: novaData,
          data_validade: calcularDataValidade(novaData, item.exameCargo.periodicidade_meses)
        };
      }
      return item;
    }));
  };

  const handleSubmit = async () => {
    if (!funcionarioId || !empresaId) {
      toast({
        title: "Erro",
        description: "Dados do funcionário não disponíveis.",
        variant: "destructive",
      });
      return;
    }

    // Se estiver editando ou for exame avulso
    if (editingExame || tipoEventoSelecionado === 'Exame Avulso') {
      if (!formData.nome_exame || !formData.data_realizacao) {
        toast({
          title: "Erro",
          description: "Nome do exame e data de realização são obrigatórios.",
          variant: "destructive",
        });
        return;
      }

      try {
        setLoading(true);

        const examData = {
          funcionario_id: funcionarioId,
          empresa_id: empresaId,
          nome_exame: formData.nome_exame,
          clinica: formData.clinica || null,
          data_realizacao: formatDateForDatabase(formData.data_realizacao),
          data_validade: formatDateForDatabase(formData.data_validade),
          resultado: formData.resultado || null,
          observacoes: formData.observacoes || null,
          renovado: formData.renovado || false,
        };

        if (editingExame) {
          await logChanges(
            empresaId,
            'exames',
            editingExame.id,
            editingExame,
            examData
          );

          const { error } = await supabase
            .from('exames')
            .update(examData)
            .eq('id', editingExame.id);

          if (error) throw error;

          toast({
            title: "Sucesso",
            description: "Exame atualizado com sucesso!",
          });
        } else {
          const { error } = await supabase
            .from('exames')
            .insert(examData);

          if (error) throw error;

          toast({
            title: "Sucesso",
            description: "Exame cadastrado com sucesso!",
          });
        }

        resetForm();
        setIsDialogOpen(false);
        loadExames();
      } catch (error) {
        console.error('Erro ao salvar exame:', error);
        toast({
          title: "Erro",
          description: "Não foi possível salvar o exame.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    } else {
      // Cadastro múltiplo de exames do cargo
      const examesSelecionados = examesParaCadastro.filter(e => e.selecionado);
      
      if (examesSelecionados.length === 0) {
        toast({
          title: "Erro",
          description: "Selecione pelo menos um exame para cadastrar.",
          variant: "destructive",
        });
        return;
      }

      try {
        setLoading(true);

        const examesToInsert = examesSelecionados.map(e => ({
          funcionario_id: funcionarioId,
          empresa_id: empresaId,
          nome_exame: e.exameCargo.nome_exame,
          clinica: formData.clinica || null,
          data_realizacao: formatDateForDatabase(e.data_realizacao),
          data_validade: formatDateForDatabase(e.data_validade),
          resultado: formData.resultado || null,
          observacoes: e.exameCargo.observacao || null,
          renovado: false,
        }));

        const { error } = await supabase
          .from('exames')
          .insert(examesToInsert);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: `${examesSelecionados.length} exame(s) cadastrado(s) com sucesso!`,
        });

        resetForm();
        setIsDialogOpen(false);
        loadExames();
      } catch (error) {
        console.error('Erro ao salvar exames:', error);
        toast({
          title: "Erro",
          description: "Não foi possível salvar os exames.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleEdit = (exame: Exame) => {
    setFormData({
      nome_exame: exame.nome_exame,
      clinica: exame.clinica || '',
      data_realizacao: formatDateForInput(exame.data_realizacao),
      data_validade: formatDateForInput(exame.data_validade),
      resultado: exame.resultado || '',
      observacoes: exame.observacoes || '',
      renovado: exame.renovado || false
    });
    setEditingExame(exame);
    setTipoEventoSelecionado('');
    setExamesParaCadastro([]);
    setIsDialogOpen(true);
  };

  const handleView = (exame: Exame) => {
    setViewingExame(exame);
    setIsViewDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este exame?')) return;

    try {
      const { error } = await supabase
        .from('exames')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Exame excluído com sucesso!",
      });

      loadExames();
    } catch (error) {
      console.error('Erro ao excluir exame:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o exame.",
        variant: "destructive",
      });
    }
  };

  const isExameVencido = (dataValidade?: string) => {
    if (!dataValidade) return false;
    return new Date(dataValidade) < new Date();
  };

  const isExameVencendoEm30Dias = (dataValidade?: string) => {
    if (!dataValidade) return false;
    const dataVenc = new Date(dataValidade);
    const hoje = new Date();
    const diasDiferenca = Math.ceil((dataVenc.getTime() - hoje.getTime()) / (1000 * 3600 * 24));
    return diasDiferenca <= 30 && diasDiferenca > 0;
  };

  const formatDateForDisplay = (dateString?: string): string => {
    if (!dateString) return '-';
    const dateOnly = dateString.includes('T') ? dateString.split('T')[0] : dateString;
    const [year, month, day] = dateOnly.split('-');
    return `${day}/${month}/${year}`;
  };

  const getStatusBadge = (exame: Exame) => {
    if (exame.renovado) {
      return <Badge className="bg-green-600 text-white hover:bg-green-700">Renovado</Badge>;
    }
    if (isExameVencido(exame.data_validade)) {
      return <Badge variant="destructive">Vencido</Badge>;
    }
    if (isExameVencendoEm30Dias(exame.data_validade)) {
      return (
        <Badge className="bg-orange-600 text-white hover:bg-orange-700">
          <Clock className="h-3 w-3 mr-1" />
          Vencendo
        </Badge>
      );
    }
    if (exame.data_validade) {
      return <Badge className="bg-blue-600 text-white hover:bg-blue-700">Válido</Badge>;
    }
    return <Badge variant="outline">Sem validade</Badge>;
  };

  if (!funcionarioId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Exames Médicos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Salve o funcionário primeiro para gerenciar os exames.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Exames Médicos
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => {
                  resetForm();
                  setIsDialogOpen(true);
                }} 
                disabled={disabled || loading}
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Exame
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingExame ? 'Editar Exame' : 'Novo Exame'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {!editingExame && (
                  <div>
                    <Label>Tipo de Evento *</Label>
                    <Select value={tipoEventoSelecionado} onValueChange={setTipoEventoSelecionado}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo de evento" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_EVENTO.map((tipo) => (
                          <SelectItem key={tipo.value} value={tipo.value}>
                            {tipo.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Exames do cargo para seleção */}
                {!editingExame && tipoEventoSelecionado && tipoEventoSelecionado !== 'Exame Avulso' && examesParaCadastro.length > 0 && (
                  <div className="border rounded-lg p-4 space-y-4">
                    <Label className="text-base font-semibold">
                      Exames para {tipoEventoSelecionado}
                    </Label>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">Selecionar</TableHead>
                          <TableHead>Exame</TableHead>
                          <TableHead>Data de Realização</TableHead>
                          <TableHead>Data de Validade</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {examesParaCadastro.map((item, index) => (
                          <TableRow key={item.exameCargo.id}>
                            <TableCell>
                              <Checkbox
                                checked={item.selecionado}
                                onCheckedChange={(checked) => {
                                  setExamesParaCadastro(prev => prev.map((e, i) => 
                                    i === index ? { ...e, selecionado: checked === true } : e
                                  ));
                                }}
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              {item.exameCargo.nome_exame}
                              {item.exameCargo.obrigatorio && (
                                <Badge variant="secondary" className="ml-2 text-xs">Obrigatório</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Input
                                type="date"
                                value={item.data_realizacao}
                                onChange={(e) => handleDataRealizacaoChange(index, e.target.value)}
                                className="w-[150px]"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="date"
                                value={item.data_validade}
                                readOnly
                                className="w-[150px] bg-muted"
                              />
                            </TableCell>
                            <TableCell>
                              {item.data_validade ? (
                                <Badge className="bg-blue-600 text-white">
                                  Válido por {item.exameCargo.periodicidade_meses} meses
                                </Badge>
                              ) : (
                                <Badge variant="outline">-</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <Label htmlFor="clinica_multiplo">Clínica (para todos)</Label>
                        <Input
                          id="clinica_multiplo"
                          value={formData.clinica}
                          onChange={(e) => setFormData(prev => ({ ...prev, clinica: e.target.value }))}
                          placeholder="Nome da clínica"
                        />
                      </div>
                      <div>
                        <Label htmlFor="resultado_multiplo">Resultado (para todos)</Label>
                        <Input
                          id="resultado_multiplo"
                          value={formData.resultado}
                          onChange={(e) => setFormData(prev => ({ ...prev, resultado: e.target.value }))}
                          placeholder="Ex: Apto, Inapto"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Mensagem quando não há exames configurados */}
                {!editingExame && tipoEventoSelecionado && tipoEventoSelecionado !== 'Exame Avulso' && examesParaCadastro.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground border rounded-lg">
                    Nenhum exame configurado para este tipo de evento no cargo atual.
                  </div>
                )}

                {/* Formulário para exame avulso ou edição */}
                {(editingExame || tipoEventoSelecionado === 'Exame Avulso') && (
                  <div className="space-y-4 border rounded-lg p-4">
                    <div>
                      <Label htmlFor="nome_exame">Nome do Exame *</Label>
                      <Input
                        id="nome_exame"
                        value={formData.nome_exame}
                        onChange={(e) => setFormData(prev => ({ ...prev, nome_exame: e.target.value }))}
                        placeholder="Ex: Exame Admissional, Audiometria"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="clinica">Clínica</Label>
                        <Input
                          id="clinica"
                          value={formData.clinica}
                          onChange={(e) => setFormData(prev => ({ ...prev, clinica: e.target.value }))}
                          placeholder="Nome da clínica"
                        />
                      </div>
                      <div>
                        <Label htmlFor="resultado">Resultado</Label>
                        <Input
                          id="resultado"
                          value={formData.resultado}
                          onChange={(e) => setFormData(prev => ({ ...prev, resultado: e.target.value }))}
                          placeholder="Ex: Apto, Inapto"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="data_realizacao">Data de Realização *</Label>
                        <Input
                          id="data_realizacao"
                          type="date"
                          value={formData.data_realizacao}
                          onChange={(e) => setFormData(prev => ({ ...prev, data_realizacao: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="data_validade">Data de Validade</Label>
                        <Input
                          id="data_validade"
                          type="date"
                          value={formData.data_validade}
                          onChange={(e) => setFormData(prev => ({ ...prev, data_validade: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="observacoes">Observações</Label>
                      <Textarea
                        id="observacoes"
                        value={formData.observacoes}
                        onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                        placeholder="Informações adicionais sobre o exame..."
                        rows={3}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="exame_renovado"
                        checked={formData.renovado}
                        onCheckedChange={(checked) => 
                          setFormData(prev => ({ ...prev, renovado: checked === true }))
                        }
                      />
                      <Label htmlFor="exame_renovado" className="cursor-pointer">
                        Exame Renovado
                      </Label>
                    </div>
                  </div>
                )}

                {editingExame && empresaId && (
                  <AuditLogFooter
                    tabela="exames"
                    registroId={editingExame.id}
                    updatedAt={editingExame.created_at}
                    empresaId={empresaId}
                  />
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={loading}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={loading || (!editingExame && !tipoEventoSelecionado)}
                >
                  {loading ? 'Salvando...' : (editingExame ? 'Atualizar' : 'Salvar Exames')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {exames.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum exame cadastrado</p>
            <p className="text-sm">Clique em "Novo Exame" para adicionar o primeiro exame.</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exame</TableHead>
                  <TableHead>Clínica</TableHead>
                  <TableHead>Data Realização</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exames.map((exame) => (
                  <TableRow key={exame.id}>
                    <TableCell className="font-medium">{exame.nome_exame}</TableCell>
                    <TableCell>{exame.clinica || '-'}</TableCell>
                    <TableCell>
                      {formatDateForDisplay(exame.data_realizacao)}
                    </TableCell>
                    <TableCell>
                      {formatDateForDisplay(exame.data_validade)}
                    </TableCell>
                    <TableCell>{exame.resultado || '-'}</TableCell>
                    <TableCell>{getStatusBadge(exame)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleView(exame)}
                          disabled={disabled}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(exame)}
                          disabled={disabled}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(exame.id)}
                          disabled={disabled}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Dialog de Visualização */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes do Exame</DialogTitle>
          </DialogHeader>
          {viewingExame && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Nome do Exame</Label>
                  <p className="font-medium">{viewingExame.nome_exame}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Clínica</Label>
                  <p className="font-medium">{viewingExame.clinica || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Data de Realização</Label>
                  <p className="font-medium">{formatDateForDisplay(viewingExame.data_realizacao)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Data de Validade</Label>
                  <p className="font-medium">{formatDateForDisplay(viewingExame.data_validade)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Resultado</Label>
                  <p className="font-medium">{viewingExame.resultado || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Status</Label>
                  <div className="mt-1">{getStatusBadge(viewingExame)}</div>
                </div>
              </div>
              {viewingExame.observacoes && (
                <div>
                  <Label className="text-muted-foreground text-xs">Observações</Label>
                  <p className="text-sm whitespace-pre-wrap">{viewingExame.observacoes}</p>
                </div>
              )}
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)} className="w-full">
                Fechar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
