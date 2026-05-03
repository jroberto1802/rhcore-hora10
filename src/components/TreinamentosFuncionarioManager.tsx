import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, GraduationCap, Calendar, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDateForInput, formatDateForDatabase } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TreinamentoFuncionario {
  id: string;
  nome_treinamento: string;
  norma?: string;
  data_realizacao: string;
  data_validade?: string;
  carga_horaria?: number;
  instrutor?: string;
  certificado_url?: string;
  observacoes?: string;
  status?: string;
  created_at: string;
}

interface TreinamentoCargo {
  id: string;
  nome_treinamento: string;
  norma?: string;
  periodicidade_meses: number;
  obrigatorio: boolean;
}

interface TreinamentoParaCadastro {
  treinamentoCargo: TreinamentoCargo;
  selecionado: boolean;
  data_realizacao: string;
  data_validade: string;
  carga_horaria: string;
  instrutor: string;
}

interface TreinamentosFuncionarioManagerProps {
  funcionarioId?: string;
  empresaId?: string;
  cargoAtual?: string;
  disabled?: boolean;
}

export function TreinamentosFuncionarioManager({ 
  funcionarioId, 
  empresaId, 
  cargoAtual, 
  disabled = false 
}: TreinamentosFuncionarioManagerProps) {
  const { toast } = useToast();
  const [treinamentos, setTreinamentos] = useState<TreinamentoFuncionario[]>([]);
  const [treinamentosCargo, setTreinamentosCargo] = useState<TreinamentoCargo[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isRenovarDialogOpen, setIsRenovarDialogOpen] = useState(false);
  const [viewingTreinamento, setViewingTreinamento] = useState<TreinamentoFuncionario | null>(null);
  const [editingTreinamento, setEditingTreinamento] = useState<TreinamentoFuncionario | null>(null);
  const [renovandoTreinamento, setRenovandoTreinamento] = useState<TreinamentoFuncionario | null>(null);
  const [modoAvulso, setModoAvulso] = useState(false);
  const [treinamentosParaCadastro, setTreinamentosParaCadastro] = useState<TreinamentoParaCadastro[]>([]);
  const [renovacaoData, setRenovacaoData] = useState({
    data_realizacao: formatDateForInput(new Date().toISOString()),
    data_validade: '',
    carga_horaria: '',
    instrutor: '',
    observacoes: ''
  });
  
  const [formData, setFormData] = useState({
    nome_treinamento: '',
    norma: '',
    data_realizacao: formatDateForInput(new Date().toISOString()),
    data_validade: '',
    carga_horaria: '',
    instrutor: '',
    observacoes: ''
  });

  const resetForm = () => {
    setFormData({
      nome_treinamento: '',
      norma: '',
      data_realizacao: formatDateForInput(new Date().toISOString()),
      data_validade: '',
      carga_horaria: '',
      instrutor: '',
      observacoes: ''
    });
    setEditingTreinamento(null);
    setModoAvulso(false);
    setTreinamentosParaCadastro([]);
  };

  const loadTreinamentos = async () => {
    if (!funcionarioId || !empresaId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('treinamentos_funcionario')
        .select('*')
        .eq('funcionario_id', funcionarioId)
        .eq('empresa_id', empresaId)
        .order('data_realizacao', { ascending: false });

      if (error) throw error;
      setTreinamentos(data || []);
    } catch (error) {
      console.error('Erro ao carregar treinamentos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os treinamentos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTreinamentosCargo = async () => {
    if (!empresaId || !cargoAtual) {
      setTreinamentosCargo([]);
      setTreinamentosParaCadastro([]);
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
        setTreinamentosCargo([]);
        setTreinamentosParaCadastro([]);
        return;
      }

      // Buscar treinamentos do cargo
      const { data: treinamentosCargoData, error } = await supabase
        .from('treinamentos_cargo')
        .select('id, nome_treinamento, norma, periodicidade_meses, obrigatorio')
        .eq('cargo_id', cargoData.id)
        .eq('empresa_id', empresaId);

      if (error) throw error;

      const treinamentosList = treinamentosCargoData?.map(t => ({
        id: t.id,
        nome_treinamento: t.nome_treinamento,
        norma: t.norma || undefined,
        periodicidade_meses: t.periodicidade_meses,
        obrigatorio: t.obrigatorio
      })) || [];

      setTreinamentosCargo(treinamentosList);

      // Criar lista para cadastro com checkboxes
      const hoje = new Date();
      const treinamentosParaCadastrar = treinamentosList.map(treinamentoCargo => {
        const dataValidade = new Date(hoje);
        dataValidade.setMonth(dataValidade.getMonth() + treinamentoCargo.periodicidade_meses);
        return {
          treinamentoCargo,
          selecionado: treinamentoCargo.obrigatorio,
          data_realizacao: formatDateForInput(hoje.toISOString()),
          data_validade: formatDateForInput(dataValidade.toISOString()),
          carga_horaria: '',
          instrutor: ''
        };
      });
      setTreinamentosParaCadastro(treinamentosParaCadastrar);
    } catch (error) {
      console.error('Erro ao carregar treinamentos do cargo:', error);
      setTreinamentosCargo([]);
      setTreinamentosParaCadastro([]);
    }
  };

  useEffect(() => {
    if (funcionarioId && empresaId) {
      loadTreinamentos();
    }
  }, [funcionarioId, empresaId]);

  useEffect(() => {
    if (isDialogOpen && !editingTreinamento && !modoAvulso) {
      loadTreinamentosCargo();
    }
  }, [isDialogOpen, cargoAtual, empresaId, editingTreinamento, modoAvulso]);

  const calcularDataValidade = (dataRealizacao: string, periodicidadeMeses: number): string => {
    if (!dataRealizacao) return '';
    const data = new Date(dataRealizacao);
    data.setMonth(data.getMonth() + periodicidadeMeses);
    return formatDateForInput(data.toISOString());
  };

  const handleDataRealizacaoChange = (index: number, novaData: string) => {
    setTreinamentosParaCadastro(prev => prev.map((item, i) => {
      if (i === index) {
        return {
          ...item,
          data_realizacao: novaData,
          data_validade: calcularDataValidade(novaData, item.treinamentoCargo.periodicidade_meses)
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

    // Se estiver editando ou for avulso
    if (editingTreinamento || modoAvulso) {
      if (!formData.nome_treinamento || !formData.data_realizacao) {
        toast({
          title: "Erro",
          description: "Nome do treinamento e data de realização são obrigatórios.",
          variant: "destructive",
        });
        return;
      }

      try {
        setLoading(true);

        const treinamentoData = {
          funcionario_id: funcionarioId,
          empresa_id: empresaId,
          nome_treinamento: formData.nome_treinamento,
          norma: formData.norma || null,
          data_realizacao: formatDateForDatabase(formData.data_realizacao),
          data_validade: formData.data_validade ? formatDateForDatabase(formData.data_validade) : null,
          carga_horaria: formData.carga_horaria ? parseInt(formData.carga_horaria) : null,
          instrutor: formData.instrutor || null,
          observacoes: formData.observacoes || null
        };

        if (editingTreinamento) {
          const { error } = await supabase
            .from('treinamentos_funcionario')
            .update(treinamentoData)
            .eq('id', editingTreinamento.id);

          if (error) throw error;

          toast({
            title: "Sucesso",
            description: "Treinamento atualizado com sucesso!",
          });
        } else {
          const { error } = await supabase
            .from('treinamentos_funcionario')
            .insert(treinamentoData);

          if (error) throw error;

          toast({
            title: "Sucesso",
            description: "Treinamento cadastrado com sucesso!",
          });
        }

        resetForm();
        setIsDialogOpen(false);
        loadTreinamentos();
      } catch (error) {
        console.error('Erro ao salvar treinamento:', error);
        toast({
          title: "Erro",
          description: "Não foi possível salvar o treinamento.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    } else {
      // Cadastro múltiplo de treinamentos do cargo
      const treinamentosSelecionados = treinamentosParaCadastro.filter(t => t.selecionado);
      
      if (treinamentosSelecionados.length === 0) {
        toast({
          title: "Erro",
          description: "Selecione pelo menos um treinamento para cadastrar.",
          variant: "destructive",
        });
        return;
      }

      try {
        setLoading(true);

        const treinamentosData = treinamentosSelecionados.map(t => ({
          funcionario_id: funcionarioId,
          empresa_id: empresaId,
          nome_treinamento: t.treinamentoCargo.nome_treinamento,
          norma: t.treinamentoCargo.norma || null,
          data_realizacao: formatDateForDatabase(t.data_realizacao),
          data_validade: t.data_validade ? formatDateForDatabase(t.data_validade) : null,
          carga_horaria: t.carga_horaria ? parseInt(t.carga_horaria) : null,
          instrutor: t.instrutor || null
        }));

        const { error } = await supabase
          .from('treinamentos_funcionario')
          .insert(treinamentosData);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: `${treinamentosSelecionados.length} treinamento(s) cadastrado(s) com sucesso!`,
        });

        resetForm();
        setIsDialogOpen(false);
        loadTreinamentos();
      } catch (error) {
        console.error('Erro ao salvar treinamentos:', error);
        toast({
          title: "Erro",
          description: "Não foi possível salvar os treinamentos.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleEdit = (treinamento: TreinamentoFuncionario) => {
    setFormData({
      nome_treinamento: treinamento.nome_treinamento,
      norma: treinamento.norma || '',
      data_realizacao: formatDateForInput(treinamento.data_realizacao),
      data_validade: treinamento.data_validade ? formatDateForInput(treinamento.data_validade) : '',
      carga_horaria: treinamento.carga_horaria?.toString() || '',
      instrutor: treinamento.instrutor || '',
      observacoes: treinamento.observacoes || ''
    });
    setEditingTreinamento(treinamento);
    setModoAvulso(false);
    setTreinamentosParaCadastro([]);
    setIsDialogOpen(true);
  };

  const handleView = (treinamento: TreinamentoFuncionario) => {
    setViewingTreinamento(treinamento);
    setIsViewDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este treinamento?')) return;

    try {
      const { error } = await supabase
        .from('treinamentos_funcionario')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Treinamento excluído com sucesso!",
      });

      loadTreinamentos();
    } catch (error) {
      console.error('Erro ao excluir treinamento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o treinamento.",
        variant: "destructive",
      });
    }
  };

  const handleRenovar = (treinamento: TreinamentoFuncionario) => {
    setRenovandoTreinamento(treinamento);
    // Calcular nova data de validade baseada na periodicidade do cargo (se existir)
    const treinamentoCargo = treinamentosCargo.find(t => t.nome_treinamento === treinamento.nome_treinamento);
    const hoje = new Date();
    let novaValidade = '';
    if (treinamentoCargo) {
      const dataValidade = new Date(hoje);
      dataValidade.setMonth(dataValidade.getMonth() + treinamentoCargo.periodicidade_meses);
      novaValidade = formatDateForInput(dataValidade.toISOString());
    } else if (treinamento.data_validade && treinamento.data_realizacao) {
      // Calcular diferença em meses entre data_realizacao e data_validade do treinamento original
      const dataRealizacaoOriginal = new Date(treinamento.data_realizacao);
      const dataValidadeOriginal = new Date(treinamento.data_validade);
      const mesesDiff = (dataValidadeOriginal.getFullYear() - dataRealizacaoOriginal.getFullYear()) * 12 + 
                        (dataValidadeOriginal.getMonth() - dataRealizacaoOriginal.getMonth());
      const dataValidade = new Date(hoje);
      dataValidade.setMonth(dataValidade.getMonth() + mesesDiff);
      novaValidade = formatDateForInput(dataValidade.toISOString());
    }
    
    setRenovacaoData({
      data_realizacao: formatDateForInput(hoje.toISOString()),
      data_validade: novaValidade,
      carga_horaria: treinamento.carga_horaria?.toString() || '',
      instrutor: treinamento.instrutor || '',
      observacoes: ''
    });
    setIsRenovarDialogOpen(true);
  };

  const handleConfirmarRenovacao = async () => {
    if (!renovandoTreinamento || !funcionarioId || !empresaId) return;

    if (!renovacaoData.data_realizacao) {
      toast({
        title: "Erro",
        description: "Data de realização é obrigatória.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // 1. Marcar treinamento antigo como "Renovado"
      const { error: updateError } = await supabase
        .from('treinamentos_funcionario')
        .update({ status: 'Renovado' })
        .eq('id', renovandoTreinamento.id);

      if (updateError) throw updateError;

      // 2. Criar novo treinamento com os novos dados
      const novoTreinamento = {
        funcionario_id: funcionarioId,
        empresa_id: empresaId,
        nome_treinamento: renovandoTreinamento.nome_treinamento,
        norma: renovandoTreinamento.norma || null,
        data_realizacao: formatDateForDatabase(renovacaoData.data_realizacao),
        data_validade: renovacaoData.data_validade ? formatDateForDatabase(renovacaoData.data_validade) : null,
        carga_horaria: renovacaoData.carga_horaria ? parseInt(renovacaoData.carga_horaria) : null,
        instrutor: renovacaoData.instrutor || null,
        observacoes: renovacaoData.observacoes || null
      };

      const { error: insertError } = await supabase
        .from('treinamentos_funcionario')
        .insert(novoTreinamento);

      if (insertError) throw insertError;

      toast({
        title: "Sucesso",
        description: "Treinamento renovado com sucesso!",
      });

      setIsRenovarDialogOpen(false);
      setRenovandoTreinamento(null);
      loadTreinamentos();
    } catch (error) {
      console.error('Erro ao renovar treinamento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível renovar o treinamento.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isVencido = (dataValidade?: string) => {
    if (!dataValidade) return false;
    return new Date(dataValidade) < new Date();
  };

  const isVencendoEm30Dias = (dataValidade?: string) => {
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

  const getStatusBadge = (treinamento: TreinamentoFuncionario) => {
    if (treinamento.status === 'Renovado') {
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Renovado</Badge>;
    }
    if (isVencido(treinamento.data_validade)) {
      return <Badge variant="destructive">Vencido</Badge>;
    }
    if (isVencendoEm30Dias(treinamento.data_validade)) {
      return <Badge className="bg-orange-600 text-white hover:bg-orange-700">Vencendo</Badge>;
    }
    if (treinamento.data_validade) {
      return <Badge className="bg-green-600 text-white hover:bg-green-700">Válido</Badge>;
    }
    return <Badge variant="outline">Sem validade</Badge>;
  };

  if (!funcionarioId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Treinamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Salve o funcionário primeiro para gerenciar os treinamentos.
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
            <GraduationCap className="h-5 w-5" />
            Treinamentos
          </CardTitle>
          <Button 
            onClick={() => {
              resetForm();
              setIsDialogOpen(true);
            }} 
            disabled={disabled || loading}
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Treinamento
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && treinamentos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Carregando treinamentos...
          </div>
        ) : treinamentos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum treinamento cadastrado</p>
            <p className="text-sm">Clique em "Novo Treinamento" para adicionar.</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Treinamento</TableHead>
                  <TableHead>Norma</TableHead>
                  <TableHead>Realização</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Carga Horária</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {treinamentos.map((treinamento) => (
                  <TableRow key={treinamento.id}>
                    <TableCell className="font-medium">{treinamento.nome_treinamento}</TableCell>
                    <TableCell>
                      {treinamento.norma ? (
                        <Badge variant="outline">{treinamento.norma}</Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell>{formatDateForDisplay(treinamento.data_realizacao)}</TableCell>
                    <TableCell>{formatDateForDisplay(treinamento.data_validade)}</TableCell>
                    <TableCell>{treinamento.carga_horaria ? `${treinamento.carga_horaria}h` : '-'}</TableCell>
                    <TableCell>{getStatusBadge(treinamento)}</TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <div className="flex gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleView(treinamento)}
                                disabled={disabled}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Visualizar</TooltipContent>
                          </Tooltip>
                          {treinamento.status !== 'Renovado' && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRenovar(treinamento)}
                                  disabled={disabled}
                                >
                                  <RefreshCcw className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Renovar</TooltipContent>
                            </Tooltip>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(treinamento)}
                                disabled={disabled}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Editar</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(treinamento.id)}
                                disabled={disabled}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Excluir</TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Dialog de Cadastro/Edição */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTreinamento ? 'Editar Treinamento' : 'Novo Treinamento'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Seleção de modo */}
            {!editingTreinamento && (
              <div className="flex gap-2 mb-4">
                <Button 
                  variant={!modoAvulso ? "default" : "outline"} 
                  onClick={() => setModoAvulso(false)}
                >
                  Treinamentos do Cargo
                </Button>
                <Button 
                  variant={modoAvulso ? "default" : "outline"} 
                  onClick={() => setModoAvulso(true)}
                >
                  Treinamento Avulso
                </Button>
              </div>
            )}

            {/* Treinamentos do cargo para seleção */}
            {!editingTreinamento && !modoAvulso && treinamentosParaCadastro.length > 0 && (
              <div className="border rounded-lg p-4 space-y-4">
                <Label className="text-base font-semibold">
                  Treinamentos Obrigatórios do Cargo
                </Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">Selecionar</TableHead>
                      <TableHead>Treinamento</TableHead>
                      <TableHead>Norma</TableHead>
                      <TableHead>Data de Realização</TableHead>
                      <TableHead>Data de Validade</TableHead>
                      <TableHead>Instrutor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {treinamentosParaCadastro.map((item, index) => (
                      <TableRow key={item.treinamentoCargo.id}>
                        <TableCell>
                          <Checkbox
                            checked={item.selecionado}
                            onCheckedChange={(checked) => {
                              setTreinamentosParaCadastro(prev => prev.map((t, i) => 
                                i === index ? { ...t, selecionado: checked === true } : t
                              ));
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {item.treinamentoCargo.nome_treinamento}
                          {item.treinamentoCargo.obrigatorio && (
                            <Badge variant="secondary" className="ml-2 text-xs">Obrigatório</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.treinamentoCargo.norma ? (
                            <Badge variant="outline">{item.treinamentoCargo.norma}</Badge>
                          ) : '-'}
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
                          <Input
                            value={item.instrutor}
                            onChange={(e) => {
                              setTreinamentosParaCadastro(prev => prev.map((t, i) => 
                                i === index ? { ...t, instrutor: e.target.value } : t
                              ));
                            }}
                            placeholder="Nome"
                            className="w-[120px]"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Mensagem quando não há treinamentos configurados */}
            {!editingTreinamento && !modoAvulso && treinamentosParaCadastro.length === 0 && (
              <div className="text-center py-4 text-muted-foreground border rounded-lg">
                Nenhum treinamento configurado para o cargo atual.
                <br />
                <Button 
                  variant="link" 
                  onClick={() => setModoAvulso(true)}
                  className="mt-2"
                >
                  Cadastrar treinamento avulso
                </Button>
              </div>
            )}

            {/* Formulário para treinamento avulso ou edição */}
            {(editingTreinamento || modoAvulso) && (
              <div className="space-y-4 border rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Nome do Treinamento *</Label>
                    <Input
                      value={formData.nome_treinamento}
                      onChange={(e) => setFormData(prev => ({ ...prev, nome_treinamento: e.target.value }))}
                      placeholder="Ex: NR-35 Trabalho em Altura"
                    />
                  </div>
                  <div>
                    <Label>Norma</Label>
                    <Input
                      value={formData.norma}
                      onChange={(e) => setFormData(prev => ({ ...prev, norma: e.target.value }))}
                      placeholder="Ex: NR-35"
                    />
                  </div>
                  <div>
                    <Label>Instrutor</Label>
                    <Input
                      value={formData.instrutor}
                      onChange={(e) => setFormData(prev => ({ ...prev, instrutor: e.target.value }))}
                      placeholder="Nome do instrutor"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Data de Realização *</Label>
                    <Input
                      type="date"
                      value={formData.data_realizacao}
                      onChange={(e) => setFormData(prev => ({ ...prev, data_realizacao: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Data de Validade</Label>
                    <Input
                      type="date"
                      value={formData.data_validade}
                      onChange={(e) => setFormData(prev => ({ ...prev, data_validade: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Carga Horária (h)</Label>
                    <Input
                      type="number"
                      value={formData.carga_horaria}
                      onChange={(e) => setFormData(prev => ({ ...prev, carga_horaria: e.target.value }))}
                      placeholder="Ex: 8"
                    />
                  </div>
                </div>
                <div>
                  <Label>Observações</Label>
                  <Textarea
                    value={formData.observacoes}
                    onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                    placeholder="Informações adicionais..."
                    rows={3}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={loading}
            >
              {loading ? 'Salvando...' : (editingTreinamento ? 'Atualizar' : 'Salvar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Visualização */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes do Treinamento</DialogTitle>
          </DialogHeader>
          {viewingTreinamento && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label className="text-muted-foreground text-xs">Treinamento</Label>
                  <p className="font-medium">{viewingTreinamento.nome_treinamento}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Norma</Label>
                  <p className="font-medium">{viewingTreinamento.norma || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Instrutor</Label>
                  <p className="font-medium">{viewingTreinamento.instrutor || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Data de Realização</Label>
                  <p className="font-medium">{formatDateForDisplay(viewingTreinamento.data_realizacao)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Data de Validade</Label>
                  <p className="font-medium">{formatDateForDisplay(viewingTreinamento.data_validade)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Carga Horária</Label>
                  <p className="font-medium">{viewingTreinamento.carga_horaria ? `${viewingTreinamento.carga_horaria}h` : '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Status</Label>
                  <div className="mt-1">{getStatusBadge(viewingTreinamento)}</div>
                </div>
              </div>
              {viewingTreinamento.observacoes && (
                <div>
                  <Label className="text-muted-foreground text-xs">Observações</Label>
                  <p className="text-sm whitespace-pre-wrap">{viewingTreinamento.observacoes}</p>
                </div>
              )}
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)} className="w-full">
                Fechar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Renovação */}
      <Dialog open={isRenovarDialogOpen} onOpenChange={(open) => {
        setIsRenovarDialogOpen(open);
        if (!open) setRenovandoTreinamento(null);
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Renovar Treinamento</DialogTitle>
            <DialogDescription>
              O treinamento anterior será marcado como "Renovado" e um novo registro será criado.
            </DialogDescription>
          </DialogHeader>
          {renovandoTreinamento && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{renovandoTreinamento.nome_treinamento}</p>
                {renovandoTreinamento.norma && (
                  <Badge variant="outline" className="mt-1">{renovandoTreinamento.norma}</Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data de Realização *</Label>
                  <Input
                    type="date"
                    value={renovacaoData.data_realizacao}
                    onChange={(e) => {
                      const novaData = e.target.value;
                      setRenovacaoData(prev => {
                        // Recalcular validade se houver treinamento do cargo
                        const treinamentoCargo = treinamentosCargo.find(t => t.nome_treinamento === renovandoTreinamento.nome_treinamento);
                        let novaValidade = prev.data_validade;
                        if (treinamentoCargo && novaData) {
                          const data = new Date(novaData);
                          data.setMonth(data.getMonth() + treinamentoCargo.periodicidade_meses);
                          novaValidade = formatDateForInput(data.toISOString());
                        }
                        return { ...prev, data_realizacao: novaData, data_validade: novaValidade };
                      });
                    }}
                  />
                </div>
                <div>
                  <Label>Data de Validade</Label>
                  <Input
                    type="date"
                    value={renovacaoData.data_validade}
                    onChange={(e) => setRenovacaoData(prev => ({ ...prev, data_validade: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Carga Horária (h)</Label>
                  <Input
                    type="number"
                    value={renovacaoData.carga_horaria}
                    onChange={(e) => setRenovacaoData(prev => ({ ...prev, carga_horaria: e.target.value }))}
                    placeholder="Ex: 8"
                  />
                </div>
                <div>
                  <Label>Instrutor</Label>
                  <Input
                    value={renovacaoData.instrutor}
                    onChange={(e) => setRenovacaoData(prev => ({ ...prev, instrutor: e.target.value }))}
                    placeholder="Nome do instrutor"
                  />
                </div>
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea
                  value={renovacaoData.observacoes}
                  onChange={(e) => setRenovacaoData(prev => ({ ...prev, observacoes: e.target.value }))}
                  placeholder="Observações sobre a renovação..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenovarDialogOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmarRenovacao} disabled={loading}>
              {loading ? 'Renovando...' : 'Confirmar Renovação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
