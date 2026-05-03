import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, RefreshCcw, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDateForInput, formatDateForDatabase } from '@/lib/utils';

interface ASO {
  id: string;
  tipo_aso: string;
  data_emissao: string;
  data_validade?: string;
  clinica?: string;
  resultado?: string;
  status?: string;
  observacoes?: string;
  created_at: string;
  exames?: ExameASO[];
}

interface ExameASO {
  id: string;
  nome_exame: string;
  data_realizacao: string;
  data_validade?: string;
  resultado?: string;
  observacoes?: string;
}

interface ExameCargo {
  id: string;
  nome_exame: string;
  periodicidade_meses: number;
  obrigatorio: boolean;
}

interface ExameParaCadastro {
  exameCargo: ExameCargo;
  selecionado: boolean;
  data_realizacao: string;
  data_validade: string;
  resultado: string;
}

interface ExameParaEditar {
  id: string;
  nome_exame: string;
  data_realizacao: string;
  data_validade: string;
  resultado: string;
  periodicidade_meses?: number;
}

interface ASOsManagerProps {
  funcionarioId?: string;
  empresaId?: string;
  cargoAtual?: string;
  disabled?: boolean;
}

const TIPOS_ASO = [
  { value: 'Admissional', label: 'Admissional' },
  { value: 'Periódico', label: 'Periódico' },
  { value: 'Demissional', label: 'Demissional' },
  { value: 'Retorno ao Trabalho', label: 'Retorno ao Trabalho' },
  { value: 'Mudança de Riscos Ocupacionais', label: 'Mudança de Riscos Ocupacionais' },
];

const STATUS_ASO = [
  { value: 'Válido', label: 'Válido' },
  { value: 'Vencido', label: 'Vencido' },
  { value: 'Renovado', label: 'Renovado' },
];

export function ASOsManager({ funcionarioId, empresaId, cargoAtual, disabled = false }: ASOsManagerProps) {
  const { toast } = useToast();
  const [asos, setAsos] = useState<ASO[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewingASO, setViewingASO] = useState<ASO | null>(null);
  const [editingASO, setEditingASO] = useState<ASO | null>(null);
  const [examesParaCadastro, setExamesParaCadastro] = useState<ExameParaCadastro[]>([]);
  const [examesParaEditar, setExamesParaEditar] = useState<ExameParaEditar[]>([]);
  const [examesCargo, setExamesCargo] = useState<Map<string, number>>(new Map());
  
  const [formData, setFormData] = useState({
    tipo_aso: '',
    data_emissao: formatDateForInput(new Date().toISOString()),
    clinica: '',
    resultado: 'Apto',
    observacoes: '',
    status_manual: ''
  });

  const resetForm = () => {
    setFormData({
      tipo_aso: '',
      data_emissao: formatDateForInput(new Date().toISOString()),
      clinica: '',
      resultado: 'Apto',
      observacoes: '',
      status_manual: ''
    });
    setEditingASO(null);
    setExamesParaCadastro([]);
    setExamesParaEditar([]);
  };

  const loadASOs = async () => {
    if (!funcionarioId || !empresaId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('asos')
        .select(`
          *,
          exames:exames_aso(*)
        `)
        .eq('funcionario_id', funcionarioId)
        .eq('empresa_id', empresaId)
        .order('data_emissao', { ascending: false });

      if (error) throw error;
      setAsos((data as ASO[]) || []);
    } catch (error) {
      console.error('Erro ao carregar ASOs:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os exames ocupacionais.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadExamesCargo = async (tipoASO: string) => {
    if (!empresaId || !cargoAtual) {
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
          exames_cargo_eventos!inner(tipo_evento)
        `)
        .eq('cargo_id', cargoData.id)
        .eq('empresa_id', empresaId)
        .eq('exames_cargo_eventos.tipo_evento', tipoASO);

      if (error) throw error;

      const examesList = examesCargoData?.map(e => ({
        id: e.id,
        nome_exame: e.nome_exame,
        periodicidade_meses: e.periodicidade_meses,
        obrigatorio: e.obrigatorio
      })) || [];

      // Armazenar periodicidade para uso na edição
      const periodicidadeMap = new Map<string, number>();
      examesList.forEach(e => periodicidadeMap.set(e.nome_exame, e.periodicidade_meses));
      setExamesCargo(periodicidadeMap);

      // Criar lista para cadastro com checkboxes
      const hoje = new Date();
      const examesParaCadastrar = examesList.map(exameCargo => {
        const dataValidade = new Date(hoje);
        dataValidade.setMonth(dataValidade.getMonth() + exameCargo.periodicidade_meses);
        return {
          exameCargo,
          selecionado: exameCargo.obrigatorio,
          data_realizacao: formatDateForInput(hoje.toISOString()),
          data_validade: formatDateForInput(dataValidade.toISOString()),
          resultado: 'Normal'
        };
      });
      setExamesParaCadastro(examesParaCadastrar);
    } catch (error) {
      console.error('Erro ao carregar exames do cargo:', error);
      setExamesParaCadastro([]);
    }
  };

  const loadExamesCargoParaEdicao = async () => {
    if (!empresaId || !cargoAtual) return;

    try {
      const { data: cargoData } = await supabase
        .from('cargos')
        .select('id')
        .eq('empresa_id', empresaId)
        .eq('nome_completo_cargo', cargoAtual)
        .maybeSingle();

      if (!cargoData) return;

      const { data: examesCargoData } = await supabase
        .from('exames_cargo')
        .select('nome_exame, periodicidade_meses')
        .eq('cargo_id', cargoData.id)
        .eq('empresa_id', empresaId);

      if (examesCargoData) {
        const periodicidadeMap = new Map<string, number>();
        examesCargoData.forEach(e => periodicidadeMap.set(e.nome_exame, e.periodicidade_meses));
        setExamesCargo(periodicidadeMap);
      }
    } catch (error) {
      console.error('Erro ao carregar exames do cargo:', error);
    }
  };

  useEffect(() => {
    if (funcionarioId && empresaId) {
      loadASOs();
    }
  }, [funcionarioId, empresaId]);

  useEffect(() => {
    if (formData.tipo_aso && !editingASO) {
      loadExamesCargo(formData.tipo_aso);
    }
  }, [formData.tipo_aso, cargoAtual, empresaId]);

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

  const handleDataRealizacaoEditChange = (index: number, novaData: string) => {
    setExamesParaEditar(prev => prev.map((item, i) => {
      if (i === index) {
        const periodicidade = item.periodicidade_meses || examesCargo.get(item.nome_exame) || 12;
        return {
          ...item,
          data_realizacao: novaData,
          data_validade: calcularDataValidade(novaData, periodicidade)
        };
      }
      return item;
    }));
  };

  // Calcular a menor data de validade entre os exames
  const getMenorDataValidade = (exames?: ExameASO[]): string | undefined => {
    if (!exames || exames.length === 0) return undefined;
    
    const validDates = exames
      .filter(e => e.data_validade)
      .map(e => new Date(e.data_validade!));
    
    if (validDates.length === 0) return undefined;
    
    const menorData = new Date(Math.min(...validDates.map(d => d.getTime())));
    return menorData.toISOString().split('T')[0];
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

    if (!formData.tipo_aso || !formData.data_emissao) {
      toast({
        title: "Erro",
        description: "Tipo de ASO e data de emissão são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      if (editingASO) {
        // Atualizar exames vinculados
        for (const exame of examesParaEditar) {
          const { error } = await supabase
            .from('exames_aso')
            .update({
              data_realizacao: formatDateForDatabase(exame.data_realizacao),
              data_validade: exame.data_validade ? formatDateForDatabase(exame.data_validade) : null,
              resultado: exame.resultado || null
            })
            .eq('id', exame.id);

          if (error) throw error;
        }

        // Recalcular data de validade do ASO baseado nos exames atualizados
        const menorValidade = examesParaEditar.reduce((menor, atual) => {
          if (!menor || (atual.data_validade && atual.data_validade < menor)) {
            return atual.data_validade;
          }
          return menor;
        }, '' as string);

        const asoData: Record<string, any> = {
          tipo_aso: formData.tipo_aso,
          data_emissao: formatDateForDatabase(formData.data_emissao),
          data_validade: menorValidade ? formatDateForDatabase(menorValidade) : null,
          clinica: formData.clinica || null,
          resultado: formData.resultado || null,
          status: formData.status_manual === 'Renovado' ? 'Renovado' : null,
          observacoes: formData.observacoes || null
        };

        const { error } = await supabase
          .from('asos')
          .update(asoData)
          .eq('id', editingASO.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "ASO atualizado com sucesso!",
        });
      } else {
        const examesSelecionados = examesParaCadastro.filter(e => e.selecionado);
        
        if (examesSelecionados.length === 0) {
          toast({
            title: "Erro",
            description: "Selecione pelo menos um exame para o ASO.",
            variant: "destructive",
          });
          return;
        }

        // Calcular data de validade do ASO (menor validade entre os exames)
        let dataValidadeASO: string | null = null;
        if (examesSelecionados.length > 0) {
          const menorValidade = examesSelecionados.reduce((menor, atual) => {
            if (!menor) return atual.data_validade;
            return atual.data_validade < menor ? atual.data_validade : menor;
          }, '');
          dataValidadeASO = menorValidade;
        }

        const asoData = {
          funcionario_id: funcionarioId,
          empresa_id: empresaId,
          tipo_aso: formData.tipo_aso,
          data_emissao: formatDateForDatabase(formData.data_emissao),
          data_validade: dataValidadeASO ? formatDateForDatabase(dataValidadeASO) : null,
          clinica: formData.clinica || null,
          resultado: formData.resultado || null,
          observacoes: formData.observacoes || null
        };

        // Criar ASO
        const { data: newASO, error: asoError } = await supabase
          .from('asos')
          .insert(asoData)
          .select()
          .single();

        if (asoError) throw asoError;

        // Criar exames vinculados ao ASO
        if (examesSelecionados.length > 0) {
          const examesData = examesSelecionados.map(e => ({
            aso_id: newASO.id,
            empresa_id: empresaId,
            nome_exame: e.exameCargo.nome_exame,
            data_realizacao: formatDateForDatabase(e.data_realizacao),
            data_validade: e.data_validade ? formatDateForDatabase(e.data_validade) : null,
            resultado: e.resultado || null
          }));

          const { error: examesError } = await supabase
            .from('exames_aso')
            .insert(examesData);

          if (examesError) throw examesError;
        }

        toast({
          title: "Sucesso",
          description: `ASO ${formData.tipo_aso} criado com ${examesSelecionados.length} exame(s)!`,
        });
      }

      resetForm();
      setIsDialogOpen(false);
      loadASOs();
    } catch (error) {
      console.error('Erro ao salvar ASO:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o ASO.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (aso: ASO) => {
    await loadExamesCargoParaEdicao();
    
    setFormData({
      tipo_aso: aso.tipo_aso,
      data_emissao: formatDateForInput(aso.data_emissao),
      clinica: aso.clinica || '',
      resultado: aso.resultado || 'Apto',
      observacoes: aso.observacoes || '',
      status_manual: aso.status || ''
    });
    
    // Preparar exames para edição
    if (aso.exames && aso.exames.length > 0) {
      const examesEdit = aso.exames.map(e => ({
        id: e.id,
        nome_exame: e.nome_exame,
        data_realizacao: formatDateForInput(e.data_realizacao),
        data_validade: e.data_validade ? formatDateForInput(e.data_validade) : '',
        resultado: e.resultado || 'Normal',
        periodicidade_meses: examesCargo.get(e.nome_exame)
      }));
      setExamesParaEditar(examesEdit);
    }
    
    setEditingASO(aso);
    setExamesParaCadastro([]);
    setIsDialogOpen(true);
  };

  const handleRenovar = async (aso: ASO) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('asos')
        .update({ status: 'Renovado' })
        .eq('id', aso.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "ASO marcado como renovado!",
      });

      loadASOs();
    } catch (error) {
      console.error('Erro ao renovar ASO:', error);
      toast({
        title: "Erro",
        description: "Não foi possível renovar o ASO.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleView = (aso: ASO) => {
    setViewingASO(aso);
    setIsViewDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este ASO e todos os exames vinculados?')) return;

    try {
      const { error } = await supabase
        .from('asos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "ASO excluído com sucesso!",
      });

      loadASOs();
    } catch (error) {
      console.error('Erro ao excluir ASO:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o ASO.",
        variant: "destructive",
      });
    }
  };

  const isExameVencido = (dataValidade?: string) => {
    if (!dataValidade) return false;
    return new Date(dataValidade) < new Date();
  };

  const hasExameVencido = (aso: ASO): boolean => {
    if (!aso.exames || aso.exames.length === 0) {
      return aso.data_validade ? isExameVencido(aso.data_validade) : false;
    }
    return aso.exames.some(e => isExameVencido(e.data_validade));
  };

  const formatDateForDisplay = (dateString?: string): string => {
    if (!dateString) return '-';
    const dateOnly = dateString.includes('T') ? dateString.split('T')[0] : dateString;
    const [year, month, day] = dateOnly.split('-');
    return `${day}/${month}/${year}`;
  };

  const getStatusBadge = (aso: ASO) => {
    // Se foi marcado como renovado, mostrar
    if (aso.status === 'Renovado') {
      return <Badge className="bg-blue-600 text-white hover:bg-blue-700">Renovado</Badge>;
    }
    
    const vencido = hasExameVencido(aso);
    if (vencido) {
      return <Badge variant="destructive">Vencido</Badge>;
    }
    return <Badge className="bg-green-600 text-white hover:bg-green-700">Válido</Badge>;
  };

  const getExameStatusBadge = (dataValidade?: string) => {
    if (!dataValidade) return <Badge variant="outline">Sem validade</Badge>;
    if (isExameVencido(dataValidade)) {
      return <Badge variant="destructive">Vencido</Badge>;
    }
    return <Badge className="bg-green-600 text-white hover:bg-green-700">Válido</Badge>;
  };

  if (!funcionarioId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Exames Ocupacionais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Salve o funcionário primeiro para gerenciar os exames ocupacionais.
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
            <FileText className="h-5 w-5" />
            Exames Ocupacionais
          </CardTitle>
          <Button 
            onClick={() => {
              resetForm();
              setIsDialogOpen(true);
            }} 
            disabled={disabled || loading}
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo ASO
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && asos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Carregando exames ocupacionais...
          </div>
        ) : asos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum ASO cadastrado</p>
            <p className="text-sm">Clique em "Novo ASO" para adicionar o primeiro.</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data Emissão</TableHead>
                  <TableHead>Validade (Menor Exame)</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead>Exames</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {asos.map((aso) => {
                  const menorValidade = getMenorDataValidade(aso.exames) || aso.data_validade;
                  return (
                    <TableRow key={aso.id}>
                      <TableCell className="font-medium">{aso.tipo_aso}</TableCell>
                      <TableCell>{formatDateForDisplay(aso.data_emissao)}</TableCell>
                      <TableCell>{formatDateForDisplay(menorValidade)}</TableCell>
                      <TableCell>{aso.resultado || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{aso.exames?.length || 0} exame(s)</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(aso)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleView(aso)}
                            disabled={disabled}
                            title="Visualizar"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(aso)}
                            disabled={disabled}
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {hasExameVencido(aso) && aso.status !== 'Renovado' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRenovar(aso)}
                              disabled={disabled}
                              title="Marcar como Renovado"
                            >
                              <RefreshCcw className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(aso.id)}
                            disabled={disabled}
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
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
              {editingASO ? 'Editar ASO' : 'Novo ASO'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de ASO *</Label>
                <Select 
                  value={formData.tipo_aso} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, tipo_aso: value }))}
                  disabled={!!editingASO}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_ASO.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data de Emissão *</Label>
                <Input
                  type="date"
                  value={formData.data_emissao}
                  onChange={(e) => setFormData(prev => ({ ...prev, data_emissao: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Clínica</Label>
                <Input
                  value={formData.clinica}
                  onChange={(e) => setFormData(prev => ({ ...prev, clinica: e.target.value }))}
                  placeholder="Nome da clínica"
                />
              </div>
              <div>
                <Label>Resultado</Label>
                <Select 
                  value={formData.resultado} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, resultado: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Apto">Apto</SelectItem>
                    <SelectItem value="Inapto">Inapto</SelectItem>
                    <SelectItem value="Apto com Restrições">Apto com Restrições</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {editingASO && (
              <div>
                <Label>Status do ASO</Label>
                <Select 
                  value={formData.status_manual || 'auto'} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, status_manual: value === 'auto' ? '' : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Automático (baseado nos exames)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Automático</SelectItem>
                    <SelectItem value="Renovado">Renovado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Observações</Label>
              <Input
                value={formData.observacoes}
                onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                placeholder="Observações gerais"
              />
            </div>

            {/* Exames do cargo para seleção (novo ASO) */}
            {!editingASO && formData.tipo_aso && examesParaCadastro.length > 0 && (
              <div className="border rounded-lg p-4 space-y-4">
                <Label className="text-base font-semibold">
                  Exames para {formData.tipo_aso}
                </Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">Selecionar</TableHead>
                      <TableHead>Exame</TableHead>
                      <TableHead>Data de Realização</TableHead>
                      <TableHead>Data de Validade</TableHead>
                      <TableHead>Resultado</TableHead>
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
                          <Input
                            value={item.resultado}
                            onChange={(e) => {
                              setExamesParaCadastro(prev => prev.map((ex, i) => 
                                i === index ? { ...ex, resultado: e.target.value } : ex
                              ));
                            }}
                            placeholder="Normal"
                            className="w-[120px]"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Exames para edição (editar ASO) */}
            {editingASO && examesParaEditar.length > 0 && (
              <div className="border rounded-lg p-4 space-y-4">
                <Label className="text-base font-semibold">
                  Exames Vinculados
                </Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Exame</TableHead>
                      <TableHead>Data de Realização</TableHead>
                      <TableHead>Data de Validade</TableHead>
                      <TableHead>Resultado</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {examesParaEditar.map((exame, index) => (
                      <TableRow key={exame.id}>
                        <TableCell className="font-medium">{exame.nome_exame}</TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={exame.data_realizacao}
                            onChange={(e) => handleDataRealizacaoEditChange(index, e.target.value)}
                            className="w-[150px]"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={exame.data_validade}
                            readOnly
                            className="w-[150px] bg-muted"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={exame.resultado}
                            onChange={(e) => {
                              setExamesParaEditar(prev => prev.map((ex, i) => 
                                i === index ? { ...ex, resultado: e.target.value } : ex
                              ));
                            }}
                            placeholder="Normal"
                            className="w-[120px]"
                          />
                        </TableCell>
                        <TableCell>{getExameStatusBadge(exame.data_validade)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Mensagem quando não há exames configurados */}
            {!editingASO && formData.tipo_aso && examesParaCadastro.length === 0 && (
              <div className="text-center py-4 text-muted-foreground border rounded-lg">
                Nenhum exame configurado para este tipo de ASO no cargo atual.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={loading || !formData.tipo_aso}
            >
              {loading ? 'Salvando...' : (editingASO ? 'Atualizar' : 'Salvar ASO')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Visualização */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do ASO</DialogTitle>
          </DialogHeader>
          {viewingASO && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Tipo</Label>
                  <p className="font-medium">{viewingASO.tipo_aso}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Data de Emissão</Label>
                  <p className="font-medium">{formatDateForDisplay(viewingASO.data_emissao)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Validade (Menor Exame)</Label>
                  <p className="font-medium">{formatDateForDisplay(getMenorDataValidade(viewingASO.exames) || viewingASO.data_validade)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Status</Label>
                  <div className="mt-1">{getStatusBadge(viewingASO)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Resultado</Label>
                  <p className="font-medium">{viewingASO.resultado === 'Renovado' ? '-' : (viewingASO.resultado || '-')}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Clínica</Label>
                  <p className="font-medium">{viewingASO.clinica || '-'}</p>
                </div>
              </div>

              {/* Lista de exames */}
              {viewingASO.exames && viewingASO.exames.length > 0 && (
                <div className="border rounded-lg p-4">
                  <Label className="text-base font-semibold mb-4 block">
                    Exames Realizados ({viewingASO.exames.length})
                  </Label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Exame</TableHead>
                        <TableHead>Realização</TableHead>
                        <TableHead>Validade</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewingASO.exames.map((exame) => (
                        <TableRow key={exame.id}>
                          <TableCell className="font-medium">{exame.nome_exame}</TableCell>
                          <TableCell>{formatDateForDisplay(exame.data_realizacao)}</TableCell>
                          <TableCell>{formatDateForDisplay(exame.data_validade)}</TableCell>
                          <TableCell>{getExameStatusBadge(exame.data_validade)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {viewingASO.observacoes && (
                <div>
                  <Label className="text-muted-foreground text-xs">Observações</Label>
                  <p className="text-sm whitespace-pre-wrap">{viewingASO.observacoes}</p>
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
